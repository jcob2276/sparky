#!/usr/bin/env bash
# Kopia plikow na sparky-vps: dane Uptime Kuma + buckety Supabase Storage.
# Buckety wymagaja SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY w /etc/sparky-backup.env;
# bez nich ta czesc jest pomijana (z ostrzezeniem), a kopia Kuma i tak sie wykonuje.
set -uo pipefail

ENV_FILE=/etc/sparky-backup.env
[ -r "$ENV_FILE" ] && . "$ENV_FILE"

DIR=${BACKUP_DIR:-/var/backups/sparky}
KUMA_DIR=${KUMA_DIR:-/opt/uptime-kuma/data}
BUCKETS=${BUCKETS:-"meal-photos note-attachments progress-photos todo-attachments"}
mkdir -p "$DIR/kuma" "$DIR/buckets"
FAIL=0

notify() {
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] || return 0
  curl -s -m 15 -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="$TELEGRAM_CHAT_ID" -d text="$1" >/dev/null || true
}

# --- 1) Uptime Kuma: spojny snapshot SQLite + reszta plikow ---
if [ -d "$KUMA_DIR" ]; then
  TS=$(date +%Y%m%d-%H%M%S)
  TMP=$(mktemp -d)
  cp -a "$KUMA_DIR/." "$TMP/"
  rm -f "$TMP"/kuma.db "$TMP"/kuma.db-wal "$TMP"/kuma.db-shm
  if [ -f "$KUMA_DIR/kuma.db" ] && command -v sqlite3 >/dev/null; then
    sqlite3 "$KUMA_DIR/kuma.db" ".backup '$TMP/kuma.db'" || FAIL=1
  fi
  tar -czf "$DIR/kuma/kuma-$TS.tar.gz" -C "$TMP" . || FAIL=1
  rm -rf "$TMP"
  find "$DIR/kuma" -name 'kuma-*.tar.gz' -mtime +30 -delete
  echo "Kuma: OK kuma-$TS.tar.gz"
else
  echo "Kuma: brak $KUMA_DIR, pomijam"
fi

# --- 2a) Buckety przez S3 (zalecane; klucze z Supabase Storage -> S3 Connection) ---
# Wymaga w /etc/sparky-backup.env: S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (S3_REGION opcjonalnie).
# `rclone copy` jest przyrostowy i niczego nie kasuje lokalnie (zachowuje usuniete pliki).
if [ -n "${S3_ACCESS_KEY_ID:-}" ] && [ -n "${S3_SECRET_ACCESS_KEY:-}" ] && [ -n "${S3_ENDPOINT:-}" ] && command -v rclone >/dev/null; then
  export RCLONE_CONFIG_SUPA_TYPE=s3 RCLONE_CONFIG_SUPA_PROVIDER=Other \
         RCLONE_CONFIG_SUPA_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" \
         RCLONE_CONFIG_SUPA_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" \
         RCLONE_CONFIG_SUPA_ENDPOINT="$S3_ENDPOINT" \
         RCLONE_CONFIG_SUPA_REGION="${S3_REGION:-eu-west-1}"
  for b in $BUCKETS; do
    mkdir -p "$DIR/buckets/$b"
    if rclone copy "SUPA:$b" "$DIR/buckets/$b" --transfers 4 --retries 2 --stats 0 2>&1 | tail -3; [ "${PIPESTATUS[0]}" -eq 0 ]; then
      echo "Bucket $b (S3): OK, plikow $(find "$DIR/buckets/$b" -type f | wc -l), $(du -sh "$DIR/buckets/$b" | cut -f1)"
    else
      echo "Bucket $b (S3): BLAD"; FAIL=1
    fi
  done
# --- 2b) Awaryjnie: Storage REST z kluczem service_role (dziala tylko ze starym kluczem JWT) ---
elif [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  AUTH=(-H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY")

  list_prefix() {  # $1=bucket $2=prefix -> wypisuje sciezki plikow
    local bucket=$1 prefix=$2 offset=0 page n
    while :; do
      page=$(curl -sf -m 60 "${AUTH[@]}" -H 'Content-Type: application/json' \
        -d "{\"prefix\":\"$prefix\",\"limit\":1000,\"offset\":$offset}" \
        "$SUPABASE_URL/storage/v1/object/list/$bucket") || return 1
      n=$(echo "$page" | jq 'length')
      echo "$page" | jq -r '.[] | select(.id != null) | .name' | while read -r f; do
        [ "$f" = ".emptyFolderPlaceholder" ] || echo "${prefix:+$prefix/}$f"
      done
      echo "$page" | jq -r '.[] | select(.id == null) | .name' | while read -r d; do
        list_prefix "$bucket" "${prefix:+$prefix/}$d"
      done
      [ "$n" -lt 1000 ] && break
      offset=$((offset + 1000))
    done
  }

  for b in $BUCKETS; do
    files=$(list_prefix "$b" "") || { echo "Bucket $b: blad listowania"; FAIL=1; continue; }
    new=0
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      out="$DIR/buckets/$b/$f"
      [ -s "$out" ] && continue
      mkdir -p "$(dirname "$out")"
      enc=$(printf '%s' "$f" | jq -sRr '@uri' | sed 's/%2F/\//g')
      if curl -sf -m 300 "${AUTH[@]}" -o "$out.part" "$SUPABASE_URL/storage/v1/object/authenticated/$b/$enc"; then
        mv "$out.part" "$out"; new=$((new + 1))
      else
        rm -f "$out.part"; FAIL=1; echo "Bucket $b: nie pobrano $f"
      fi
    done <<< "$files"
    echo "Bucket $b: nowych plikow $new, lacznie $(find "$DIR/buckets/$b" -type f 2>/dev/null | wc -l)"
  done
else
  echo "Buckety: brak SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY w $ENV_FILE, pomijam"
fi

if [ "$FAIL" -ne 0 ]; then
  notify "Sparky: backup plikow na sparky-vps zakonczyl sie bledami"
  exit 1
fi
