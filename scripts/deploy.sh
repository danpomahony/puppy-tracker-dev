#!/usr/bin/env bash
# Deploys a version of the app to production. Runs on the prod VM (ADR 0005).
#
# Backs up the data, pulls the images for VERSION, starts them, checks the health and
# the version, and if anything fails goes back to the version that was running.
#
# Usage:
#   ./deploy.sh VERSION            VERSION is an image tag: v1.2.3 or sha-<commit>
#
# Environment:
#   PUPPY_DIR     default /opt/puppy: holds compose.prod.yaml and backup-prod.sh
#   HEALTH_URL    default http://127.0.0.1:8080/api/health: answers when the whole stack is up
#
# The caller logs in to the registry first (CI does it with the job's token). This script
# stores no credentials.
#
# Exit codes: 0 deployed, 1 failed and rolled back (or nothing to roll back to), 2 bad usage

set -euo pipefail

PUPPY_DIR=${PUPPY_DIR:-/opt/puppy}
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:8080/api/health}
version=${1:-}
if [[ ! $version =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Usage: $0 VERSION (an image tag such as v1.2.3)" >&2
  exit 2
fi

compose() { docker compose -f "$PUPPY_DIR/compose.prod.yaml" "$@"; }

# Compose refuses to read the file without a version. Commands that only look at the
# running stack get this placeholder; commands that change it set the real one.
export APP_VERSION=unset

# The tag the backend container is running now, or nothing if there is none.
running_version() {
  local id
  id=$(compose ps -a -q backend)
  [[ -n $id ]] || return 0
  docker inspect --format '{{.Config.Image}}' "$id" | sed 's/.*://'
}

# Waits for the stack to answer through the proxy, as the phones will reach it.
wait_for_health() {
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 3 "$HEALTH_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  echo "No healthy answer from $HEALTH_URL after 60 seconds." >&2
  return 1
}

# Every service must be running the image tag that was asked for.
check_version() {
  local want=$1 service id state image
  for service in backend app; do
    id=$(compose ps -a -q "$service")
    [[ -n $id ]] || { echo "The $service container does not exist." >&2; return 1; }
    state=$(docker inspect --format '{{.State.Running}}' "$id")
    image=$(docker inspect --format '{{.Config.Image}}' "$id")
    if [[ $state != true || ${image##*:} != "$want" ]]; then
      echo "The $service container is not running version $want (running: $state, image: $image)." >&2
      return 1
    fi
  done
}

# Starts the stack at a version and checks it. Used for the deploy and for the rollback.
start_version() {
  local want=$1
  APP_VERSION=$want compose up -d --remove-orphans --wait --wait-timeout 120 || return 1
  APP_VERSION=$want wait_for_health || return 1
  APP_VERSION=$want check_version "$want"
}

previous=$(running_version)
echo "Running now: ${previous:-nothing}. Deploying: $version."

echo "--- Backing up"
"$PUPPY_DIR/backup-prod.sh" "${previous:-first}"

echo "--- Pulling images that are not on the VM yet"
if ! APP_VERSION=$version compose pull --policy missing; then
  echo "Could not pull version $version. Nothing was changed." >&2
  exit 1
fi

echo "--- Starting $version"
if start_version "$version"; then
  echo "Deployed $version."
  exit 0
fi

echo "Version $version failed its checks." >&2
compose logs --tail 40 >&2 || true

if [[ -z $previous ]]; then
  echo "There is no earlier version to go back to. The stack is left as it is." >&2
  exit 1
fi

echo "--- Rolling back to $previous" >&2
if start_version "$previous"; then
  echo "Rolled back to $previous. If the new version ran a migration, the backup taken before it is in $PUPPY_DIR/backups." >&2
else
  echo "The rollback to $previous failed too. Restore from the backup in $PUPPY_DIR/backups." >&2
fi
exit 1
