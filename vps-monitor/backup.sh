#!/bin/bash
# Nocna, zaszyfrowana kopia zapasowa VPS na Dysk Google (rclone crypt).
#  - current/<nazwa>   : aktualny stan
#  - archive/<data>/.. : pliki zmienione lub usunięte danego dnia (historia, przechowywana KEEP_DAYS dni)
# Wynik zapisuje do /var/lib/vps-control-center/backup-status.json (czyta go panel).
set -u
export PATH=/usr/local/bin:/usr/bin:/bin
STATE=/var/lib/vps-control-center
STATUS=$STATE/backup-status.json
STAGE=/var/backups/vps-staging
DATE=$(date +%F)
KEEP_DAYS=30
mkdir -p "$STATE" "$STAGE"

exec 9>/var/lock/vps-backup.lock
flock -n 9 || { echo "Kopia już trwa, pomijam."; exit 0; }

START=$(date -Is); T0=$(date +%s)
RES=$(mktemp)
status() { # state started finished
  python3 -I - "$1" "$START" "${2:-}" "$RES" <<'PY'
import json, sys
state, started, finished, resf = sys.argv[1:5]
srcs = []
try:
    for l in open(resf):
        n, rc = l.split()
        srcs.append({"name": n, "rc": int(rc)})
except OSError:
    pass
out = {"state": state, "started": started, "finished": finished or None, "sources": srcs}
try:
    old = json.load(open("/var/lib/vps-control-center/backup-status.json"))
    for k in ("backup", "drive", "last_ok"):
        if k in old: out[k] = old[k]
except Exception:
    pass
json.dump(out, open("/var/lib/vps-control-center/backup-status.json.tmp", "w"), ensure_ascii=False)
PY
  mv -f "$STATUS.tmp" "$STATUS"
}
echo "=== $START: start kopii ==="
status running

EXCL=(--exclude ".venv/**" --exclude "venv/**" --exclude "node_modules/**" --exclude "__pycache__/**" --exclude "*.pyc")
COMMON=(--transfers 4 --checkers 8 --drive-chunk-size 64M --log-level INFO --retries 3 --low-level-retries 10)

run_src() { # nazwa ścieżka [dodatkowe flagi rclone]
  local name="$1" path="$2"; shift 2
  if [ ! -e "$path" ]; then echo "[$name] brak ścieżki $path, pomijam"; echo "$name 0" >>"$RES"; return; fi
  echo "[$name] $path"
  rclone sync "$path" "gcrypt:current/$name" --backup-dir "gcrypt:archive/$DATE/$name" "${EXCL[@]}" "${COMMON[@]}" "$@"
  echo "$name $?" >>"$RES"
}

# Bazy SQLite kopiuję spójnie (.backup), bo n8n i uptime-kuma zapisują do nich w trakcie działania.
snap_db() { # plik_źródłowy katalog_staging
  mkdir -p "$2"; rm -f "$2/$(basename "$1")"
  sqlite3 "$1" ".backup '$2/$(basename "$1")'" && echo "[sqlite] $(basename "$1") OK" || echo "[sqlite] $(basename "$1") BŁĄD"
}

N8N=/var/lib/docker/volumes/n8n_n8n_data/_data
snap_db "$N8N/database.sqlite" "$STAGE/n8n"
run_src n8n "$N8N" --exclude "database.sqlite*"
rclone copyto "$STAGE/n8n/database.sqlite" gcrypt:current/n8n/database.sqlite "${COMMON[@]}" --backup-dir "gcrypt:archive/$DATE/n8n"; echo "n8n-db $?" >>"$RES"

KUMA=/opt/uptime-kuma/data
snap_db "$KUMA/kuma.db" "$STAGE/kuma"
run_src uptime-kuma "$KUMA" --exclude "kuma.db*"
rclone copyto "$STAGE/kuma/kuma.db" gcrypt:current/uptime-kuma/kuma.db "${COMMON[@]}" --backup-dir "gcrypt:archive/$DATE/uptime-kuma"; echo "kuma-db $?" >>"$RES"

# Nextcloud: zrzut bazy (pg_dump) + pliki użytkownika + konfiguracja (z kluczami szyfrującymi)
mkdir -p "$STAGE/nextcloud"
if docker exec nextcloud-db-1 pg_dump -U nextcloud nextcloud 2>/dev/null | gzip > "$STAGE/nextcloud/db.sql.gz.tmp"; then
  mv -f "$STAGE/nextcloud/db.sql.gz.tmp" "$STAGE/nextcloud/db.sql.gz"; echo "[nextcloud] pg_dump OK"
else echo "[nextcloud] pg_dump BŁĄD"; fi
cp -f /opt/nextcloud/docker-compose.yml /opt/nextcloud/.env "$STAGE/nextcloud/" 2>/dev/null
cp -a /opt/nextcloud/html/config "$STAGE/nextcloud/" 2>/dev/null
run_src nextcloud/meta "$STAGE/nextcloud"
run_src nextcloud/files /opt/nextcloud/data
# Memos: spójna kopia bazy SQLite + załączniki (bez bridge.env z kluczem)
MEMOS=/opt/memos/data
if [ -f "$MEMOS/memos_prod.db" ]; then snap_db "$MEMOS/memos_prod.db" "$STAGE/memos"; fi
run_src memos "$MEMOS" --exclude "memos_prod.db*"
rclone copyto "$STAGE/memos/memos_prod.db" gcrypt:current/memos/memos_prod.db "${COMMON[@]}" --backup-dir "gcrypt:archive/$DATE/memos"; echo "memos-db $?" >>"$RES"
# Arcane: compose i klucz szyfrujący (bez katalogu data/, to tylko baza stanu z obrazami)
run_src opt/arcane /opt/arcane --exclude "data/**"
run_src studia   /home/ubuntu/studia
run_src projekty /home/ubuntu/projekty
run_src archiwa  /home/ubuntu/archiwa
for d in vps-control-center macbook-hunter sparky-worker dtms n8n; do run_src "opt/$d" "/opt/$d"; done
for d in /etc/systemd/system /etc/fail2ban /etc/cron.d; do run_src "etc${d#/etc}" "$d" --skip-links; done

# Czyszczenie historii starszej niż KEEP_DAYS dni
rclone delete gcrypt:archive --min-age ${KEEP_DAYS}d --rmdirs "${COMMON[@]}" 2>/dev/null

FAILED=$(awk '$2!=0' "$RES" | wc -l)
END=$(date -Is); DUR=$(( $(date +%s) - T0 ))
SIZE=$(rclone size gcrypt:current --json 2>/dev/null || echo '{}')
ABOUT=$(rclone about gdrive: --json 2>/dev/null || echo '{}')
python3 -I - "$FAILED" "$START" "$END" "$DUR" "$SIZE" "$ABOUT" "$RES" <<'PY'
import json, sys
failed, start, end, dur, size, about, resf = sys.argv[1:8]
srcs = [dict(zip(("name", "rc"), l.split())) for l in open(resf)]
for s in srcs: s["rc"] = int(s["rc"])
def j(x):
    try: return json.loads(x)
    except Exception: return {}
out = {"state": "ok" if failed == "0" else "failed", "started": start, "finished": end, "duration_s": int(dur),
       "sources": srcs, "backup": j(size), "drive": j(about)}
if failed == "0": out["last_ok"] = end
else:
    try: out["last_ok"] = json.load(open("/var/lib/vps-control-center/backup-status.json")).get("last_ok")
    except Exception: pass
json.dump(out, open("/var/lib/vps-control-center/backup-status.json.tmp", "w"), ensure_ascii=False)
PY
mv -f "$STATUS.tmp" "$STATUS"
rm -f "$RES"
echo "=== $END: koniec, błędów: $FAILED, czas: ${DUR}s ==="
exit $([ "$FAILED" = 0 ] && echo 0 || echo 1)
