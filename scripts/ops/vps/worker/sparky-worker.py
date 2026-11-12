#!/usr/bin/env python3
"""Worker kolejki pgmq (sparky_jobs) na sparky-vps.

Format wiadomosci w kolejce (jsonb):  {"type": "echo", "payload": {...}}
Dodawanie zadania z SQL:  select pgmq.send('sparky_jobs', '{"type":"echo","payload":{"a":1}}');
Sukces -> wiadomosc trafia do archiwum. Blad -> wraca do kolejki po VT sekundach (ponowienie);
po MAX_READS probach laduje w archiwum z oznaczeniem bledu (dead letter), bez petli w nieskonczonosc.
"""
import json
import logging
import os
import re
import signal
import sqlite3
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

import psycopg
from psycopg.rows import dict_row

DSN = os.environ["WORKER_DATABASE_URL"]
QUEUE = os.getenv("QUEUE", "sparky_jobs")
VT = int(os.getenv("VT_SECONDS", "900"))          # czas na wykonanie, zanim wiadomosc wroci do kolejki
MAX_READS = int(os.getenv("MAX_READS", "5"))
POLL = float(os.getenv("POLL_SECONDS", "5"))
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
FUNCTION_KEY = os.getenv("SUPABASE_FUNCTION_KEY", "")
ARCHIVE_SECRET = os.getenv("ARCHIVE_SECRET", "")  # waski sekret archiwizatora (odczyt okien tetna)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("sparky-worker")
stop = False


def _sig(*_):
    global stop
    stop = True
    log.info("sygnal stop, koncze po biezacym zadaniu")


signal.signal(signal.SIGTERM, _sig)
signal.signal(signal.SIGINT, _sig)

HANDLERS = {}


def handler(name):
    def deco(fn):
        HANDLERS[name] = fn
        return fn
    return deco


@handler("echo")
def h_echo(payload):
    return payload


@handler("sleep")
def h_sleep(payload):
    s = max(0, min(float(payload.get("seconds", 1)), 120))
    time.sleep(s)
    return {"slept": s}


@handler("invoke_function")
def h_invoke(payload):
    """Wywoluje funkcje edge bez limitu czasu funkcji. Wymaga SUPABASE_URL i SUPABASE_FUNCTION_KEY."""
    name = str(payload.get("function", ""))
    if not re.fullmatch(r"[a-z0-9_-]+", name):
        raise ValueError("niepoprawna nazwa funkcji")
    if not SUPABASE_URL or not FUNCTION_KEY:
        raise RuntimeError("brak SUPABASE_URL/SUPABASE_FUNCTION_KEY w /etc/sparky-worker.env")
    body = json.dumps(payload.get("body", {})).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/functions/v1/{name}", data=body, method="POST",
        headers={"Content-Type": "application/json", "apikey": FUNCTION_KEY,
                 "Authorization": f"Bearer {FUNCTION_KEY}"})
    try:
        with urllib.request.urlopen(req, timeout=int(payload.get("timeout", 600))) as r:
            return {"status": r.status, "body": r.read(2000).decode(errors="replace")}
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read(500).decode(errors='replace')}")


# --- Archiwum surowych szeregow (SQLite na VPS) -------------------------------------------------
# Supabase trzyma wskazniki dzienne (np. oura_hr_daily); surowe probki zyja tu, bez limitu 14 dni.
ARCHIVE_DB = os.getenv("ARCHIVE_DB", "/var/lib/sparky-archive/archive.db")
HR_WINDOW_DAYS = 7  # Edge odrzuca wieksze okna (limit CPU i endpoint Oury)
UUID_RE = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")


def archive_connect():
    os.makedirs(os.path.dirname(ARCHIVE_DB), exist_ok=True)
    db = sqlite3.connect(ARCHIVE_DB, timeout=30)
    db.execute("pragma journal_mode=wal")
    db.executescript("""
        create table if not exists hr_samples(
            user_id text not null, ts text not null, bpm integer not null, source text not null default '',
            primary key (user_id, ts, source)) without rowid;
        create table if not exists archive_runs(
            id integer primary key, user_id text not null, kind text not null, window_start text not null,
            window_end text not null, fetched integer not null, inserted integer not null,
            ran_at text not null default current_timestamp);
    """)
    return db


def call_archive_function(name, body, timeout=120):
    """Wola funkcje edge waskim sekretem ARCHIVE_SECRET (tylko odczyt okien szeregow), bez klucza serwisowego."""
    if not SUPABASE_URL or len(ARCHIVE_SECRET) < 32:
        raise RuntimeError("brak SUPABASE_URL/ARCHIVE_SECRET w /etc/sparky-worker.env")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/functions/v1/{name}", data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json", "x-archive-secret": ARCHIVE_SECRET})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read(500).decode(errors='replace')}")


@handler("archive_oura_hr")
def h_archive_oura_hr(payload):
    """Pobiera surowe tętno Oury oknami po 7 dni przez `sync?service=oura-hr-raw` i dopisuje do SQLite.

    payload: user_id (uuid, wymagane), days_back (1-400, domyslnie 3), end_days_ago (domyslnie 0).
    Idempotentne (klucz glowny user_id+ts+source), wiec ponowienie po bledzie jest bezpieczne.
    """
    user_id = str(payload.get("user_id", ""))
    if not UUID_RE.fullmatch(user_id):
        raise ValueError("niepoprawny user_id")
    days_back = max(1, min(int(payload.get("days_back", 3)), 400))
    end = datetime.now(timezone.utc) - timedelta(days=max(0, int(payload.get("end_days_ago", 0))))
    cursor = end - timedelta(days=days_back)
    db = archive_connect()
    fetched = inserted = windows = 0
    try:
        while cursor < end:
            w_end = min(cursor + timedelta(days=HR_WINDOW_DAYS), end)
            res = call_archive_function("sync", {
                "service": "oura-hr-raw", "userId": user_id,
                "start": cursor.isoformat(), "end": w_end.isoformat()})
            rows = [(user_id, ts, int(bpm), source or "") for ts, bpm, source in res.get("samples", [])]
            before = db.total_changes
            db.executemany("insert or ignore into hr_samples values (?,?,?,?)", rows)
            new = db.total_changes - before
            db.execute("insert into archive_runs(user_id, kind, window_start, window_end, fetched, inserted) "
                       "values (?,?,?,?,?,?)", (user_id, "hr", cursor.isoformat(), w_end.isoformat(), len(rows), new))
            db.commit()
            fetched, inserted, windows = fetched + len(rows), inserted + new, windows + 1
            cursor = w_end
        total = db.execute("select count(*) from hr_samples where user_id = ?", (user_id,)).fetchone()[0]
    finally:
        db.close()
    return {"windows": windows, "fetched": fetched, "inserted": inserted, "archive_total": total}


@handler("fetch_prices")
def h_fetch_prices(payload):
    from finance_prices import fetch_prices
    return fetch_prices(payload, DSN)


def process(conn, msg):
    msg_id, read_ct, message = msg["msg_id"], msg["read_ct"], msg["message"]
    if read_ct > MAX_READS:
        log.error("dead letter msg=%s po %s probach: %s", msg_id, read_ct - 1, json.dumps(message)[:300])
        conn.execute("select pgmq.archive(%s, %s)", (QUEUE, msg_id))
        return
    jtype = message.get("type") if isinstance(message, dict) else None
    fn = HANDLERS.get(jtype)
    if not fn:
        log.error("nieznany typ zadania %r (msg=%s) - archiwizuje", jtype, msg_id)
        conn.execute("select pgmq.archive(%s, %s)", (QUEUE, msg_id))
        return
    t0 = time.time()
    try:
        result = fn(message.get("payload") or {})
        log.info("OK msg=%s type=%s %.1fs wynik=%s", msg_id, jtype, time.time() - t0, json.dumps(result)[:200])
        conn.execute("select pgmq.archive(%s, %s)", (QUEUE, msg_id))
    except Exception as e:  # noqa: BLE001
        log.error("BLAD msg=%s type=%s proba=%s/%s: %s", msg_id, jtype, read_ct, MAX_READS, e)


def main():
    backoff = 2
    while not stop:
        try:
            with psycopg.connect(DSN, autocommit=True, row_factory=dict_row, connect_timeout=15) as conn:
                log.info("polaczony z baza, kolejka=%s vt=%ss", QUEUE, VT)
                backoff = 2
                while not stop:
                    rows = conn.execute("select * from pgmq.read(%s, %s, 1)", (QUEUE, VT)).fetchall()
                    if not rows:
                        time.sleep(POLL)
                        continue
                    for m in rows:
                        process(conn, m)
        except Exception as e:  # noqa: BLE001
            log.error("polaczenie: %s (ponawiam za %ss)", e, backoff)
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)
    log.info("zakonczono")


if __name__ == "__main__":
    main()
