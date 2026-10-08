#!/usr/bin/env bash
# API smoke test for the puppy-tracker backend.
#
# Creates two throwaway family users and a throwaway dog, exercises the real
# HTTP API and API rules, then deletes everything it created.
#
# Usage:
#   PB_SUPERUSER_EMAIL=you@example.com ./scripts/smoke-test.sh
#
# Environment:
#   PB_URL                 default http://localhost:8090
#   PB_SUPERUSER_EMAIL     required
#   PB_SUPERUSER_PASSWORD  prompted for if unset and running in a terminal
#
# Requires: bash, curl, jq, openssl
# Exit codes: 0 all checks passed, 1 a check failed, 2 setup problem

set -euo pipefail

PB_URL=${PB_URL:-http://localhost:8090}
: "${PB_SUPERUSER_EMAIL:?Set PB_SUPERUSER_EMAIL}"
if [[ -z ${PB_SUPERUSER_PASSWORD:-} ]]; then
  [[ -t 0 ]] || { echo "Set PB_SUPERUSER_PASSWORD (no terminal to prompt on)" >&2; exit 2; }
  read -r -s -p "Superuser password: " PB_SUPERUSER_PASSWORD
  echo
fi
export PB_SUPERUSER_EMAIL PB_SUPERUSER_PASSWORD

TMP_BODY=$(mktemp)
STATUS=""
BODY=""
PASS=0
FAIL=0
TOKEN_SU="" DOG_ID="" ID_A="" ID_B=""

# ---------- helpers ----------

# api METHOD PATH [TOKEN] [JSON_BODY]  ->  sets STATUS and BODY
api() {
  local method=$1 path=$2 token=${3:-} data=${4:-}
  local args=(-s -o "$TMP_BODY" -w '%{http_code}' -X "$method" "$PB_URL$path"
    -H 'Content-Type: application/json')
  if [[ -n $token ]]; then args+=(-H "Authorization: $token"); fi
  if [[ -n $data ]]; then
    STATUS=$(curl "${args[@]}" --data-binary @- <<<"$data")
  else
    STATUS=$(curl "${args[@]}")
  fi
  BODY=$(<"$TMP_BODY")
}

# check "description" command [args...]  (uses STATUS / BODY from the last api call)
check() {
  local name=$1
  shift
  if "$@"; then
    echo "  PASS  $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name  [status=$STATUS body=$BODY]"
    FAIL=$((FAIL + 1))
  fi
}

is_2xx() { [[ $STATUS =~ ^2 ]]; }
is_rejected() { [[ $STATUS =~ ^[45] ]]; }
# What other family members may see of a profile. If a field is added to the users
# collection, this check fails until someone decides whether everyone should see it.
profile_shows_only_known_fields() {
  body_has '(keys - ["avatar","collectionId","collectionName","created","emailVisibility","id","name","updated","verified"]) == []'
}
# No email address other than the signed-in user's own (ID_A) shows in a list of users.
emails_hidden_from_others() {
  is_rejected || jq -e --arg me "$ID_A" '[.items[] | select(.id != $me) | (.email // "")] | all(. == "")' <<<"$BODY" >/dev/null
}
shows_nothing() { is_rejected || [[ $(jq '.items | length' <<<"$BODY") -eq 0 ]]; }
body_has() { jq -e "$1" <<<"$BODY" >/dev/null; }

now() { date -u +'%Y-%m-%d %H:%M:%S.000Z'; }
rand_id() { openssl rand -hex 8 | cut -c1-15; } # 15 chars, a-z0-9, like the phone will generate

# event_json ID TYPE LOGGED_BY DATA_JSON [ENDED_AT]
event_json() {
  jq -n --arg id "$1" --arg dog "$DOG_ID" --arg type "$2" --arg by "$3" \
    --argjson data "$4" --arg start "$(now)" --arg end "${5:-}" \
    '{id: $id, dog: $dog, type: $type, started_at: $start, logged_by: $by, data: $data, v: 1}
     + (if $end != "" then {ended_at: $end} else {} end)'
}

login() { # login EMAIL PASSWORD
  api POST /api/collections/users/auth-with-password "" \
    "$(jq -n --arg i "$1" --arg p "$2" '{identity: $i, password: $p}')"
}

mkuser() { # mkuser EMAIL PASSWORD
  api POST /api/collections/users/records "$TOKEN_SU" \
    "$(jq -n --arg e "$1" --arg p "$2" '{email: $e, password: $p, passwordConfirm: $p, verified: true}')"
}

cleanup() {
  set +e
  if [[ -n $TOKEN_SU ]]; then
    if [[ -n $DOG_ID ]]; then
      api GET "/api/collections/events/records?perPage=200&fields=id&filter=dog%3D%27${DOG_ID}%27" "$TOKEN_SU"
      for id in $(jq -r '.items[].id' <<<"$BODY" 2>/dev/null); do
        api DELETE "/api/collections/events/records/$id" "$TOKEN_SU"
      done
      api DELETE "/api/collections/dogs/records/$DOG_ID" "$TOKEN_SU"
    fi
    api GET "/api/collections/words/records?perPage=200&fields=id&filter=term~%27smoke-test-%27" "$TOKEN_SU"
    for id in $(jq -r '.items[].id' <<<"$BODY" 2>/dev/null); do
      api DELETE "/api/collections/words/records/$id" "$TOKEN_SU"
    done
    [[ -n $ID_A ]] && api DELETE "/api/collections/users/records/$ID_A" "$TOKEN_SU"
    [[ -n $ID_B ]] && api DELETE "/api/collections/users/records/$ID_B" "$TOKEN_SU"
  fi
  rm -f "$TMP_BODY"
}
trap cleanup EXIT

# ---------- setup ----------

echo "Setup"
api GET /api/health
is_2xx || { echo "Backend not reachable at $PB_URL (status=$STATUS)" >&2; exit 2; }

api POST /api/collections/_superusers/auth-with-password "" \
  "$(jq -n '{identity: env.PB_SUPERUSER_EMAIL, password: env.PB_SUPERUSER_PASSWORD}')"
is_2xx || { echo "Superuser login failed (status=$STATUS): $BODY" >&2; exit 2; }
TOKEN_SU=$(jq -r .token <<<"$BODY")

SUFFIX=$(openssl rand -hex 4)
PW=$(openssl rand -hex 16)
EMAIL_A="smoke-a-${SUFFIX}@example.test"
EMAIL_B="smoke-b-${SUFFIX}@example.test"

mkuser "$EMAIL_A" "$PW"
is_2xx || { echo "Could not create test user A (status=$STATUS): $BODY" >&2; exit 2; }
ID_A=$(jq -r .id <<<"$BODY")
mkuser "$EMAIL_B" "$PW"
is_2xx || { echo "Could not create test user B (status=$STATUS): $BODY" >&2; exit 2; }
ID_B=$(jq -r .id <<<"$BODY")

login "$EMAIL_A" "$PW"
is_2xx || { echo "Test user A login failed (status=$STATUS): $BODY" >&2; exit 2; }
TOKEN_A=$(jq -r .token <<<"$BODY")
login "$EMAIL_B" "$PW"
is_2xx || { echo "Test user B login failed (status=$STATUS): $BODY" >&2; exit 2; }
TOKEN_B=$(jq -r .token <<<"$BODY")

api POST /api/collections/dogs/records "$TOKEN_A" '{"name":"smoke-test-dog"}'
is_2xx || { echo "Could not create test dog (status=$STATUS): $BODY" >&2; exit 2; }
DOG_ID=$(jq -r .id <<<"$BODY")

# ---------- tests ----------

echo "Logging and reading events"
EID_A=$(rand_id)
api POST /api/collections/events/records "$TOKEN_A" \
  "$(event_json "$EID_A" outside "$ID_A" '{"pee":true,"tiko":false}')"
check "A logs an outside trip with a client-generated id" is_2xx
check "the server keeps that id" test "$(jq -r .id <<<"$BODY")" = "$EID_A"

api GET "/api/collections/events/records/$EID_A" "$TOKEN_A"
check "the event reads back with its data intact" \
  body_has '.data.pee == true and .data.tiko == false and .v == 1'
check "an untimed trip has no end time (empty string or null)" \
  body_has '(.ended_at // "") == ""'

echo "Sharing between family members"
api GET "/api/collections/events/records/$EID_A" "$TOKEN_B"
check "B can see A's entry" is_2xx

EID_B=$(rand_id)
api POST /api/collections/events/records "$TOKEN_B" \
  "$(event_json "$EID_B" feed "$ID_B" '{"food":"kibble","amount_g":40}')"
check "B logs a feed" is_2xx
api GET "/api/collections/events/records/$EID_B" "$TOKEN_A"
check "A can see B's feed" is_2xx

echo "Privacy between family members"
api GET "/api/collections/users/records/$ID_B" "$TOKEN_A"
check "A can view B's profile (so display names can show)" is_2xx
check "the profile has a name field" body_has 'has("name")'
check "B's email address is hidden from A" body_has '(.email // "") == ""'
check "B's profile shows no fields beyond the known, harmless ones" profile_shows_only_known_fields
api GET "/api/collections/users/records/$ID_A" "$TOKEN_A"
check "A can still see their own email address" body_has '(.email // "") != ""'
api GET "/api/collections/users/records?perPage=200" "$TOKEN_A"
check "no one else's email address shows when listing users" emails_hidden_from_others
api GET "/api/collections/users/records/$ID_B" ""
check "a logged-out visitor cannot view a profile" is_rejected

echo "API rules"
api POST /api/collections/events/records "" \
  "$(event_json "$(rand_id)" feed "$ID_A" '{}')"
check "a logged-out visitor cannot log events" is_rejected

api POST /api/collections/events/records "$TOKEN_A" \
  "$(event_json "$(rand_id)" feed "$ID_B" '{}')"
check "A cannot log an event as B" is_rejected

api POST /api/collections/events/records "$TOKEN_A" \
  "$(event_json "$EID_A" outside "$ID_A" '{"pee":true,"tiko":false}')"
check "re-sending an existing id is rejected (safe offline retries)" is_rejected

api GET "/api/collections/events/records" ""
check "a logged-out visitor cannot read events" shows_nothing

echo "Extensibility"
api POST /api/collections/events/records "$TOKEN_A" \
  "$(event_json "$(rand_id)" some-future-type "$ID_A" '{"anything":{"nested":1}}')"
check "an unknown event type with unknown data fields is accepted" is_2xx

api POST /api/collections/events/records "$TOKEN_A" \
  "$(event_json "$(rand_id)" outside "$ID_A" '{"pee":false,"tiko":false}' "$(now)")"
check "optional timing: ended_at is stored when given" \
  body_has '(.ended_at // "") != ""'

echo "Words"
api POST /api/collections/words/records "$TOKEN_A" \
  '{"term":"smoke-test-sit","description":"Sit down","status":"learning","agreed":"proposed"}'
check "A adds a word" is_2xx
WORD_ID=$(jq -r .id <<<"$BODY")
api GET "/api/collections/words/records/$WORD_ID" "$TOKEN_B"
check "B can see A's word" body_has '.term == "smoke-test-sit" and .status == "learning"'

api PATCH "/api/collections/words/records/$WORD_ID" "$TOKEN_B" '{"agreed":"confirmed"}'
check "B can confirm A's word" body_has '.agreed == "confirmed"'

api POST /api/collections/words/records "$TOKEN_A" '{"term":"","description":"no term"}'
check "a word with no term is rejected" is_rejected

api POST /api/collections/words/records "$TOKEN_A" '{"term":"smoke-test-bad","status":"nonsense"}'
check "an unknown status is rejected" is_rejected

api POST /api/collections/words/records "" '{"term":"smoke-test-anon"}'
check "a logged-out visitor cannot add a word" is_rejected
api GET "/api/collections/words/records" ""
check "a logged-out visitor cannot read words" shows_nothing

api DELETE "/api/collections/words/records/$WORD_ID" "$TOKEN_B"
check "B can delete a word" is_2xx

# ---------- summary ----------

echo
echo "$PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
