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
import time
import urllib.error
import urllib.request

import psycopg
from psycopg.rows import dict_row

DSN = os.environ["WORKER_DATABASE_URL"]
QUEUE = os.getenv("QUEUE", "sparky_jobs")
VT = int(os.getenv("VT_SECONDS", "900"))          # czas na wykonanie, zanim wiadomosc wroci do kolejki
MAX_READS = int(os.getenv("MAX_READS", "5"))
POLL = float(os.getenv("POLL_SECONDS", "5"))
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
FUNCTION_KEY = os.getenv("SUPABASE_FUNCTION_KEY", "")

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
