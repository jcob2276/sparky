#!/usr/bin/env bash
# Nocna kopia bazy Supabase na sparky-vps. Uruchamiane przez sparky-backup.timer.
# Sekrety (DATABASE_URL, opcjonalnie TELEGRAM_*) czyta z /etc/sparky-backup.env (chmod 600).
set -euo pipefail

ENV_FILE=/etc/sparky-backup.env
[ -r "$ENV_FILE" ] && . "$ENV_FILE"
: "${DATABASE_URL:?brak DATABASE_URL w $ENV_FILE}"

DIR=${BACKUP_DIR:-/var/backups/sparky}
mkdir -p "$DIR/daily" "$DIR/weekly" "$DIR/monthly"
TS=$(date +%Y%m%d-%H%M%S)
OUT="$DIR/daily/db-$TS.sql.gz"

notify() {
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] || return 0
  curl -s -m 15 -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="$TELEGRAM_CHAT_ID" -d text="$1" >/dev/null || true
}
trap 'notify "Sparky: backup bazy na sparky-vps NIE POWIODL SIE ($TS)"; rm -f "$OUT.part"' ERR

pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip -9 > "$OUT.part"
gzip -t "$OUT.part"
[ "$(stat -c%s "$OUT.part")" -gt 10240 ]   # odrzuca puste/uciete zrzuty
mv "$OUT.part" "$OUT"

[ "$(date +%u)" = 7 ] && cp "$OUT" "$DIR/weekly/"
[ "$(date +%d)" = 01 ] && cp "$OUT" "$DIR/monthly/"

find "$DIR/daily"   -name 'db-*.sql.gz' -mtime +30  -delete
find "$DIR/weekly"  -name 'db-*.sql.gz' -mtime +90  -delete
find "$DIR/monthly" -name 'db-*.sql.gz' -mtime +370 -delete

echo "OK $OUT $(du -h "$OUT" | cut -f1)"

# --- Dane finansowe jako JSON Lines (kazda tabela bank_* i finance_* OPROCZ bank_connection_secrets) ---
# Kopie dzienne 30 dni, miesieczne (1. dnia) bez wygasania: surowe odpowiedzi banku zostaja nawet po rotacji dumpow.
FIN="$DIR/finance"
mkdir -p "$FIN/daily" "$FIN/monthly"
FTMP="$FIN/daily/.tmp-$TS"
mkdir -p "$FTMP"
for t in $(psql "$DATABASE_URL" -At -c "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and (table_name like 'bank\_%' or table_name like 'finance\_%') and table_name <> 'bank_connection_secrets' order by 1"); do
  psql "$DATABASE_URL" -At -c "select row_to_json(x) from public.\"$t\" x" | gzip -9 > "$FTMP/$t.jsonl.gz"
done
tar -czf "$FIN/daily/finance-$TS.tar.gz" -C "$FTMP" .
rm -rf "$FTMP"
[ "$(date +%d)" = 01 ] && cp "$FIN/daily/finance-$TS.tar.gz" "$FIN/monthly/"
find "$FIN/daily" -name 'finance-*.tar.gz' -mtime +30 -delete
echo "OK finance $(du -h "$FIN/daily/finance-$TS.tar.gz" | cut -f1)"
