#!/usr/bin/env bash
# Backs up the production PocketBase data. Runs on the prod VM (ADR 0005).
#
# Stops the backend for a few seconds, copies /pb_data into a .tar.gz, and starts it
# again. A stopped database is a consistent one, so no SQLite file is copied half-written.
# Keeps the newest few backups.
#
# Usage:
#   ./backup-prod.sh [LABEL]       LABEL (for example the version being replaced) goes in the file name
#
# Environment:
#   PUPPY_DIR      default /opt/puppy: holds compose.prod.yaml, and backups/ is created inside it
#   BACKUP_KEEP    default 7: how many backups to keep
#
# Prints the path of the new backup on its last line.
# Exit codes: 0 backed up (or nothing to back up yet), 1 failed

set -euo pipefail

PUPPY_DIR=${PUPPY_DIR:-/opt/puppy}
BACKUP_KEEP=${BACKUP_KEEP:-7}
label=${1:-manual}
[[ $label =~ ^[A-Za-z0-9._-]+$ ]] || { echo "Label may only contain letters, digits, dots, dashes and underscores." >&2; exit 1; }

compose() { docker compose -f "$PUPPY_DIR/compose.prod.yaml" "$@"; }

# APP_VERSION must be set for compose to read the file. Any value works for these commands.
export APP_VERSION=${APP_VERSION:-backup}

container=$(compose ps -a -q backend)
if [[ -z $container ]]; then
  echo "No backend container yet, so there is nothing to back up."
  exit 0
fi

image=$(docker inspect --format '{{.Config.Image}}' "$container")
backups=$PUPPY_DIR/backups
mkdir -p "$backups"
file="pb_data-$(date -u +%Y%m%dT%H%M%SZ)-$label.tar.gz"

was_running=$(docker inspect --format '{{.State.Running}}' "$container")
restart() {
  if [[ $was_running == true ]]; then
    docker start "$container" >/dev/null
  fi
}
trap restart EXIT

if [[ $was_running == true ]]; then
  echo "Stopping the backend for the copy."
  docker stop "$container" >/dev/null
fi

# A throwaway container that shares the backend's volumes, so the volume name never matters.
docker run --rm --volumes-from "$container" -v "$backups:/backup" --entrypoint sh "$image" -c \
  "tar czf '/backup/$file.partial' -C /pb_data . && mv '/backup/$file.partial' '/backup/$file' && chown $(id -u):$(id -g) '/backup/$file'"

# Delete the oldest beyond BACKUP_KEEP. File names sort by time.
find "$backups" -maxdepth 1 -name 'pb_data-*.tar.gz' | sort -r | tail -n +"$((BACKUP_KEEP + 1))" | xargs -r rm -f --

echo "Backed up to $backups/$file"
