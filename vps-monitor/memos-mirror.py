#!/usr/bin/env python3
"""Lustro Telegram -> Memos: refleksje i dziennik ze strumienia Sparky'ego trafiają do Memos jako notatki.

Tylko jeden kierunek i tylko źródło 'telegram' (wpisy z Memos mają źródło 'memos', więc nie wracają: brak pętli).
Przepisywane tryby: stream (dziennik), reflection, daily_reconciliation_response (refleksje).
Bezczynny, dopóki w bridge.env nie ma SPARKY_KEY, SPARKY_USER_ID i MEMOS_TOKEN.
"""
import json, os, time, urllib.parse, urllib.request, urllib.error

SUPA = os.environ.get("SUPABASE_URL", "https://pdvqkgfsqziqlhptatgf.supabase.co").rstrip("/")
KEY = os.environ.get("SPARKY_KEY", "").strip()
UID = os.environ.get("SPARKY_USER_ID", "").strip()
MEMOS = os.environ.get("MEMOS_URL", "http://memos:5230").rstrip("/")
TOKEN = os.environ.get("MEMOS_TOKEN", "").strip()
STATE = os.environ.get("MIRROR_STATE", "/data/mirror_state.json")
INTERVAL = int(os.environ.get("MIRROR_INTERVAL", "60"))
BACKFILL_DAYS = int(os.environ.get("MIRROR_BACKFILL_DAYS", "0"))
JOURNAL = {"stream": "#dziennik", "reflection": "#refleksja", "daily_reconciliation_response": "#refleksja"}


def log(*a):
    print(time.strftime("%F %T"), *a, flush=True)


def load():
    try:
        return json.load(open(STATE))
    except Exception:
        return {}


def save(st):
    tmp = STATE + ".tmp"
    json.dump(st, open(tmp, "w"))
    os.replace(tmp, STATE)


def http(url, headers, body=None, method=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data, headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
        return json.loads(raw) if raw else {}


def fetch(since):
    q = urllib.parse.urlencode({
        "select": "id,content,created_at,metadata",
        "user_id": "eq." + UID, "source": "eq.telegram",
        "created_at": "gt." + since, "order": "created_at.asc", "limit": "50"})
    return http(f"{SUPA}/rest/v1/vanguard_stream?{q}", {"apikey": KEY, "Authorization": "Bearer " + KEY})


def to_memos(row, tag):
    text = (row.get("content") or "").strip()
    body = {"content": f"{text}\n\n#telegram {tag}", "visibility": "PRIVATE", "createTime": row["created_at"]}
    h = {"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"}
    try:
        return http(f"{MEMOS}/api/memos", h, body)
    except urllib.error.HTTPError as e:
        if e.code == 400:  # część wersji nie pozwala ustawić createTime: wyślij bez niego
            body.pop("createTime")
            return http(f"{MEMOS}/api/memos", h, body)
        raise


def tick(st):
    if not (KEY and UID and TOKEN):
        log("brak SPARKY_KEY / SPARKY_USER_ID / MEMOS_TOKEN w bridge.env, czekam")
        return
    if "cursor" not in st:  # pierwsze uruchomienie: bez kopiowania historii (chyba że ustawisz MIRROR_BACKFILL_DAYS)
        st["cursor"] = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime(time.time() - BACKFILL_DAYS * 86400))
        save(st)
    while True:
        rows = fetch(st["cursor"])
        if not rows:
            return
        for row in rows:
            mode = (row.get("metadata") or {}).get("mode")
            tag = JOURNAL.get(mode)
            if tag and (row.get("content") or "").strip():
                to_memos(row, tag)
                log("do Memos:", row["id"], mode)
            st["cursor"] = row["created_at"]  # przesuwamy po każdym wpisie, także pominiętym
            save(st)
        if len(rows) < 50:
            return


def main():
    log("lustro Telegram->Memos startuje (tryby:", ", ".join(JOURNAL), ")")
    while True:
        st = load()
        try:
            tick(st)
        except Exception as e:  # błąd sieci/API: spróbuj za minutę, kursor się nie przesuwa
            log("błąd:", repr(e)[:200])
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
