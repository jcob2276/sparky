#!/usr/bin/env python3
"""Worker kolejki pgmq (sparky_jobs) na sparky-vps.

Format wiadomosci w kolejce (jsonb):  {"type": "echo", "payload": {...}}
Dodawanie zadania z SQL:  select pgmq.send('sparky_jobs', '{"type":"echo","payload":{"a":1}}');
Sukces -> wiadomosc trafia do archiwum. Blad -> wraca do kolejki po VT sekundach (ponowienie);
po MAX_READS probach laduje w archiwum z oznaczeniem bledu (dead letter), bez petli w nieskonczonosc.
"""
import base64
import json
import logging
import os
import re
import signal
import sqlite3
import time
import urllib.error
import urllib.request
import uuid
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
# Gloswki Telegrama: klucze w /etc/sparky-worker.env (nie przez HTTP z funkcji edge).
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_AUDIO_MODELS = [m.strip() for m in os.getenv("GEMINI_AUDIO_MODELS", "gemini-3.5-flash").split(",") if m.strip()]

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


@handler("build_context_cache")
def h_build_context_cache(payload):
    from context_cache_builder import build_and_save_cache
    return build_and_save_cache()


def post_multipart(url, fields, files, headers=None, timeout=120):
    boundary = f"----FormBoundary{uuid.uuid4().hex}"
    body = bytearray()
    for k, v in fields.items():
        body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
    for name, (fname, data, mime) in files.items():
        body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{fname}\"\r\nContent-Type: {mime}\r\n\r\n".encode())
        body.extend(data)
        body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode())
    req_headers = {"Content-Type": f"multipart/form-data; boundary={boundary}"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, data=bytes(body), headers=req_headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def transcribe_groq(audio_bytes, filename, api_key):
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    # Groq (Cloudflare) blokuje domyslny User-Agent Pythona (403), wiec ustawiamy wlasny.
    headers = {"Authorization": f"Bearer {api_key}", "User-Agent": "sparky-worker/1.0"}
    fields = {
        "model": "whisper-large-v3-turbo",
        "language": "pl",
        "response_format": "json"
    }
    files = {"file": (filename, audio_bytes, "audio/ogg")}
    res = post_multipart(url, fields, files, headers=headers, timeout=60)
    return res.get("text", "").strip()


def transcribe_gemini(audio_bytes, mime_type, api_key):
    b64 = base64.b64encode(audio_bytes).decode("ascii")
    prompt = (
        "Dokonaj wiernej, dokładnej transkrypcji mowy z tego nagrania audio na tekst w języku polskim. "
        "Zwróć wyłącznie sam tekst wypowiedzi, bez żadnych wstępów, cudzysłowów ani komentarzy. "
        "Jeśli nagranie zawiera tylko ciszę lub szum, zwróć pusty ciąg znaków."
    )
    last_err = None
    for model in GEMINI_AUDIO_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        payload = json.dumps({
            "contents": [{
                "parts": [
                    {"inlineData": {"mimeType": mime_type, "data": b64}},
                    {"text": prompt}
                ]
            }]
        }).encode("utf-8")
        req = urllib.request.Request(
            url, data=payload, method="POST",
            headers={"Content-Type": "application/json", "x-goog-api-key": api_key})
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                candidates = data.get("candidates") or []
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    text = " ".join(p.get("text", "").strip() for p in parts if p.get("text")).strip()
                    if text:
                        return text
        except Exception as e:
            log.warning("Gemini %s failed: %s", model, e)
            last_err = e
    raise RuntimeError(f"Wszystkie modele Gemini zawiodły: {last_err}")


@handler("transcribe_telegram_voice")
def h_transcribe_telegram_voice(payload):
    """Transkrybuje głosówkę z Telegrama na VPS bez limitów Edge Function.
    
    1. Pobiera rekord z vanguard_telegram_inbox.
    2. Pobiera plik audio z Telegram Bot API.
    3. Transkrybuje przez Gemini Audio API (lub Groq Whisper fallback).
    4. Aktualizuje treść w vanguard_telegram_inbox.
    5. Wywołuje vanguard-telegram-worker, aby dokończyć logikę biznesową (zapis do bazy, Wyrocznia).
    """
    inbox_id = str(payload.get("inbox_id", ""))
    if not UUID_RE.fullmatch(inbox_id):
        raise ValueError(f"niepoprawny inbox_id: {inbox_id}")

    with psycopg.connect(DSN, autocommit=True, row_factory=dict_row) as conn:
        # Atomowe przejecie rekordu: worker_type='vps' (watchdog liczy wtedy 300 s), pomija ukonczone.
        row = conn.execute(
            "UPDATE vanguard_telegram_inbox SET status = 'processing', worker_type = 'vps', updated_at = now() "
            "WHERE id = %s AND status <> 'completed' RETURNING id, payload",
            (inbox_id,)
        ).fetchone()
        if not row:
            log.info("inbox_id=%s nie istnieje albo jest ukończony, pomijam", inbox_id)
            return {"status": "skipped"}

    gemini_key, tg_token, groq_key = GEMINI_API_KEY, TELEGRAM_BOT_TOKEN, GROQ_API_KEY
    if not tg_token:
        raise RuntimeError("Brak TELEGRAM_BOT_TOKEN w /etc/sparky-worker.env")

    inbox_payload = row["payload"] or {}
    msg = inbox_payload.get("message") or {}
    voice = msg.get("voice") or msg.get("audio") or {}
    file_id = voice.get("file_id")
    chat_id = msg.get("chat", {}).get("id")
    message_id = msg.get("message_id")

    if not file_id:
        raise ValueError("Brak file_id w wiadomości głosowej")

    # Send typing status to Telegram so user knows work is in progress
    if chat_id:
        try:
            req = urllib.request.Request(
                f"https://api.telegram.org/bot{tg_token}/sendChatAction",
                data=json.dumps({"chat_id": chat_id, "action": "typing"}).encode(),
                headers={"Content-Type": "application/json"}
            )
            urllib.request.urlopen(req, timeout=5)
        except Exception as e:
            log.warning("Nie udało się wysłać typing: %s", e)

    # 1. Fetch file path from Telegram API
    get_file_req = urllib.request.Request(
        f"https://api.telegram.org/bot{tg_token}/getFile?file_id={file_id}"
    )
    with urllib.request.urlopen(get_file_req, timeout=20) as resp:
        file_info = json.loads(resp.read().decode())
    if not file_info.get("ok"):
        raise RuntimeError(f"Błąd Telegram getFile: {file_info}")

    file_path = file_info["result"]["file_path"]
    download_url = f"https://api.telegram.org/file/bot{tg_token}/{file_path}"

    # 2. Download audio stream
    with urllib.request.urlopen(download_url, timeout=90) as resp:
        audio_bytes = resp.read()

    log.info("Pobrano plik audio %s (%s bajtów) dla inbox_id=%s", file_path, len(audio_bytes), inbox_id)

    ext = file_path.split(".")[-1].lower() if "." in file_path else "ogg"
    if ext in ("oga", "opus"):
        ext = "ogg"
    mime = "audio/ogg" if ext == "ogg" else "audio/mpeg" if ext == "mp3" else "audio/mp4" if ext == "m4a" else "audio/ogg"
    filename = f"voice.{ext}"

    # 3. Transcribe with Gemini (primary), Groq Whisper fallback
    transcription = ""
    err_msg = ""
    if gemini_key:
        try:
            log.info("Rozpoczynam transkrypcję audio przez Gemini...")
            transcription = transcribe_gemini(audio_bytes, mime, gemini_key)
            log.info("Transkrypcja Gemini zakończona sukcesem (%s znaków)", len(transcription))
        except Exception as e:
            log.error("Gemini transkrypcja nie powiodła się: %s", e)
            err_msg = str(e)

    if not transcription and groq_key:
        try:
            log.info("Próba transkrypcji przez Groq Whisper (%s)...", filename)
            transcription = transcribe_groq(audio_bytes, filename, groq_key)
            log.info("Transkrypcja Groq zakończona sukcesem (%s znaków)", len(transcription))
        except Exception as e:
            log.error("Groq transkrypcja nie powiodła się: %s", e)
            err_msg += f" | Groq: {e}"

    if not transcription:
        with psycopg.connect(DSN, autocommit=True, row_factory=dict_row) as conn:
            conn.execute(
                "UPDATE vanguard_telegram_inbox SET status = 'failed', error_log = %s, updated_at = now() WHERE id = %s",
                (f"Transcription failure: {err_msg}", inbox_id)
            )
        raise RuntimeError(f"Błąd transkrypcji audio: {err_msg}")

    # 4. Save transcribed text into payload
    inbox_payload["message"]["text"] = transcription
    with psycopg.connect(DSN, autocommit=True, row_factory=dict_row) as conn:
        conn.execute(
            "UPDATE vanguard_telegram_inbox SET payload = %s, updated_at = now() WHERE id = %s",
            (json.dumps(inbox_payload), inbox_id)
        )
        updated_row = conn.execute(
            "SELECT * FROM vanguard_telegram_inbox WHERE id = %s",
            (inbox_id,)
        ).fetchone()

    # 5. Hand off to vanguard-telegram-worker to process downstream logic (Oracle, stream, notes)
    log.info("Przekazywanie do vanguard-telegram-worker (inbox_id=%s)...", inbox_id)
    worker_url = f"{SUPABASE_URL}/functions/v1/vanguard-telegram-worker"
    worker_body = json.dumps({"record": dict(updated_row)}, default=str).encode("utf-8")
    
    # Uwierzytelnienie wylacznie waskim sekretem (bez klucza serwisowego).
    if len(ARCHIVE_SECRET) < 32:
        raise RuntimeError("brak ARCHIVE_SECRET w /etc/sparky-worker.env")
    worker_headers = {
        "Content-Type": "application/json",
        "x-archive-secret": ARCHIVE_SECRET,
    }

    req = urllib.request.Request(
        worker_url,
        data=worker_body,
        headers=worker_headers,
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        resp_data = resp.read().decode("utf-8", errors="replace")
        log.info("vanguard-telegram-worker odpowiedział: %s", resp_data[:200])

    return {"status": "ok", "transcription": transcription[:100], "len": len(transcription)}


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
