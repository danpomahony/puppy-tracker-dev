#!/usr/bin/env bash
# Creates the repo's labels and milestones, then seeds the starter backlog
# from scripts/backlog.psv (milestone|labels|title|body per line).
#
# Safe to re-run: labels are updated in place, and milestones and issues that
# already exist are skipped.
#
# Requires: the GitHub CLI (gh), signed in with `gh auth login`.
# Run it from anywhere inside the repository.

set -euo pipefail

cd "$(dirname "$0")/.."

command -v gh >/dev/null || { echo "Install the GitHub CLI first: https://cli.github.com" >&2; exit 2; }
gh auth status >/dev/null 2>&1 || { echo "Sign in first with: gh auth login" >&2; exit 2; }

echo "Labels"
while IFS='|' read -r name color description; do
  gh label create "$name" --color "$color" --description "$description" --force >/dev/null
  echo "  $name"
done <<'EOF'
bug|d73a4a|Something is broken
feature|1d76db|New capability
infra|5319e7|Hosting, CI/CD, monitoring and backups
tech-debt|fbca04|Cleanup and internal quality
docs|0075ca|Documentation
blocked|b60205|Waiting on something else
EOF

echo "Milestones"
existing_milestones=$(gh api 'repos/{owner}/{repo}/milestones?state=all&per_page=100' --jq '.[].title')
while IFS='|' read -r title description; do
  if grep -Fxq "$title" <<<"$existing_milestones"; then
    echo "  exists:  $title"
    continue
  fi
  gh api 'repos/{owner}/{repo}/milestones' -f title="$title" -f description="$description" >/dev/null
  echo "  created: $title"
done <<'EOF'
MVP polish|Make the working MVP pleasant and trustworthy for daily use
HTTPS and offline|Reachable over HTTPS from every phone, installable, works with no signal
Training and words|Vocabulary library and practice sessions
Insights|Patterns from the data: gaps, delays and best windows
Production infra|Proper hosting: infrastructure as code, TLS, backups, monitoring, deploys
Later|Ideas that are not scheduled yet
EOF

echo "Issues"
existing_titles=$(gh issue list --state all --limit 500 --json title --jq '.[].title')
while IFS='|' read -r milestone labels title body; do
  [[ -z $milestone || $milestone == \#* ]] && continue
  if grep -Fxq "$title" <<<"$existing_titles"; then
    echo "  exists:  $title"
    continue
  fi
  gh issue create --title "$title" --body "$body" --label "$labels" --milestone "$milestone" >/dev/null
  echo "  created: $title"
  sleep 1 # be gentle with GitHub's rate limits
done < scripts/backlog.psv

echo "Done."
