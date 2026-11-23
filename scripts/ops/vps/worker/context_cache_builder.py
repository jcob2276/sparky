#!/usr/bin/env python3
"""Kompilator Pamięci Absolutnej Digital Twina (Gemini Context Caching) na VPS.

Pobiera dane z ostatnich 90 dni (vanguard_stream, oura_daily_summary, strava_activities_clean, daily_reconciliations),
kompiluje je w gęsty format Markdown bez narzutu JSON, tworzy CachedContent w Gemini API z TTL 26h,
i zapisuje metadane w tabeli public.vanguard_context_caches.
"""
import json
import logging
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

import psycopg
from psycopg.rows import dict_row

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("context_cache_builder")

DSN = os.getenv("WORKER_DATABASE_URL")
if not DSN:
    # Try reading from /etc/sparky-worker.env if run directly on VPS
    env_file = "/etc/sparky-worker.env"
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    os.environ[k] = v.strip('\'"')
        DSN = os.getenv("WORKER_DATABASE_URL")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = os.getenv("GEMINI_CACHE_MODEL", "models/gemini-3.5-flash")
CACHE_TTL_SECONDS = int(os.getenv("GEMINI_CACHE_TTL_SECONDS", "93600"))  # 26 godzin
DAYS_WINDOW = int(os.getenv("CONTEXT_DAYS_WINDOW", "90"))

SYSTEM_INSTRUCTION = """Jesteś Sparky — osobistym Cyfrowym Bliźniakiem (Digital Twin) i Wyrocznią Jakuba.
Masz dostęp do pełnej, absolutnej pamięci z ostatnich 90 dni jego życia zawartej w tym kontekście (biometria Oura, treningi Strava, strumień myśli i notatek, codzienne refleksje).

Zasady działania:
1. Mówisz WYŁĄCZNIE po polsku, bezpośrednio po imieniu (Jakub).
2. Posiadasz absolutną ciągłość wiedzy o Jakubie: jeśli pyta o minione wydarzenia, nawyki, trendy snu, obciążenie treningowe lub swoje dawne myśli, odnosisz się bezpośrednio do faktów z jego 90-dniowej osi czasu.
3. Jesteś przenikliwym, szczerym i lojalnym partnerem (Buddy Stance). Zauważasz wzorce, które Jakubowi mogą umykać (np. korelacje między snem a produktywnością, schematy zmęczenia czy mikrotarcia).
4. ABSOLUTNY ZAKAZ UŻYWANIA ZNAKÓW CHIŃSKICH LUB GLITCHY.
5. W Telegramie nie używaj podwójnych gwiazdek ** do pogrubień. Pisz czystym tekstem bez nagłówków typu ###."""


def build_90d_snapshot(conn, user_id, window_start, window_end):
    """Pobiera i formatuje dane z 4 źródeł w chronologiczny, tokeno-oszczędny Markdown."""
    log.info("Pobieranie danych z 90 dni dla user_id=%s...", user_id)

    # 1. vanguard_stream
    stream_rows = conn.execute(
        """SELECT created_at, category, content
           FROM vanguard_stream
           WHERE user_id = %s AND created_at >= %s AND created_at <= %s
           ORDER BY created_at ASC""",
        (user_id, window_start, window_end)
    ).fetchall()

    # 2. oura_daily_summary
    oura_rows = conn.execute(
        """SELECT date, readiness_score, sleep_score, total_sleep_hours, hrv_avg, rhr_avg, steps, active_calories
           FROM oura_daily_summary
           WHERE user_id = %s AND date >= %s::date AND date <= %s::date
           ORDER BY date ASC""",
        (user_id, window_start, window_end)
    ).fetchall()

    # 3. strava_activities_clean
    strava_rows = conn.execute(
        """SELECT name, sport_type, start_date, elapsed_time, distance, hr_avg, pace_sec_per_km
           FROM strava_activities_clean
           WHERE user_id = %s AND start_date >= %s AND start_date <= %s
           ORDER BY start_date ASC""",
        (user_id, window_start, window_end)
    ).fetchall()

    # 4. daily_reconciliations
    reconcil_rows = conn.execute(
        """SELECT date, day_score, user_response, events_summary
           FROM daily_reconciliations
           WHERE user_id = %s AND created_at >= %s AND created_at <= %s
           ORDER BY date ASC""",
        (user_id, window_start, window_end)
    ).fetchall()

    log.info(
        "Pobrano: stream=%d, oura=%d, strava=%d, reconciliations=%d",
        len(stream_rows), len(oura_rows), len(strava_rows), len(reconcil_rows)
    )

    # Organizacja wg daty (YYYY-MM-DD)
    timeline = {}

    def get_day(d_str):
        if d_str not in timeline:
            timeline[d_str] = {"oura": None, "strava": [], "stream": [], "reconcil": None}
        return timeline[d_str]

    for r in oura_rows:
        d_str = str(r["date"])
        get_day(d_str)["oura"] = r

    for r in strava_rows:
        if r["start_date"]:
            d_str = r["start_date"].strftime("%Y-%m-%d")
            get_day(d_str)["strava"].append(r)

    for r in stream_rows:
        if r["created_at"]:
            d_str = r["created_at"].strftime("%Y-%m-%d")
            get_day(d_str)["stream"].append(r)

    for r in reconcil_rows:
        d_str = str(r["date"])
        get_day(d_str)["reconcil"] = r

    # Budowanie Markdown
    lines = [
        "# PAMIĘĆ ABSOLUTNA DIGITAL TWINA — HISTORIA OSTATNICH 90 DNI JAKUBA",
        f"Zakres: {window_start.strftime('%Y-%m-%d')} do {window_end.strftime('%Y-%m-%d')}",
        f"Zestawienie: {len(stream_rows)} wpisów myśli/notatek, {len(oura_rows)} dni biometrii, {len(strava_rows)} treningów.",
        "",
        "---",
    ]

    for d_str in sorted(timeline.keys()):
        day_data = timeline[d_str]
        lines.append(f"\n## {d_str}")

        # Oura
        o = day_data["oura"]
        if o:
            parts = []
            if o.get("total_sleep_hours"):
                parts.append(f"Sen: {o['total_sleep_hours']:.1f}h")
            if o.get("sleep_score"):
                parts.append(f"Wynik snu: {o['sleep_score']}")
            if o.get("readiness_score"):
                parts.append(f"Gotowość: {o['readiness_score']}")
            if o.get("hrv_avg"):
                parts.append(f"HRV: {int(o['hrv_avg'])} ms")
            if o.get("rhr_avg"):
                parts.append(f"Tętno spoczynkowe: {int(o['rhr_avg'])} bpm")
            if o.get("steps"):
                parts.append(f"Kroki: {o['steps']}")
            if o.get("active_calories"):
                parts.append(f"Aktywne kcal: {o['active_calories']}")
            lines.append("- Biometria (Oura): " + " | ".join(parts))

        # Strava
        for s in day_data["strava"]:
            dist_km = f"{s['distance'] / 1000:.1f} km" if s.get("distance") else ""
            time_m = f"{s['elapsed_time'] // 60} min" if s.get("elapsed_time") else ""
            hr = f"śr. tętno {int(s['hr_avg'])} bpm" if s.get("hr_avg") else ""
            meta = ", ".join(filter(None, [dist_km, time_m, hr]))
            lines.append(f"- Trening ({s.get('sport_type') or 'Aktywność'}): {s.get('name', 'Trening')} ({meta})")

        # Stream
        for st in day_data["stream"]:
            t_str = st["created_at"].strftime("%H:%M")
            cat = f"[{st['category']}] " if st.get("category") else ""
            cnt = (st.get("content") or "").strip().replace("\n", " ")
            lines.append(f"- {t_str} {cat}{cnt}")

        # Reconcil
        rec = day_data["reconcil"]
        if rec:
            score = f"Ocena: {rec['day_score']}/10" if rec.get("day_score") is not None else ""
            resp = (rec.get("user_response") or "").strip().replace("\n", " ")
            lines.append(f"- Refleksja wieczorna: {score} {resp}".strip())

    snapshot_text = "\n".join(lines)
    return snapshot_text


def create_gemini_cached_content(snapshot_text, api_key, model_name, ttl_seconds):
    """Tworzy CachedContent przez Gemini REST API."""
    url = "https://generativelanguage.googleapis.com/v1beta/cachedContents"
    payload = {
        "model": model_name,
        "displayName": f"digital_twin_90d_{int(time.time())}",
        "contents": [
            {
                "role": "user",
                "parts": [{"text": snapshot_text}]
            }
        ],
        "systemInstruction": {
            "parts": [{"text": SYSTEM_INSTRUCTION}]
        },
        "ttl": f"{ttl_seconds}s"
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST"
    )

    log.info("Wysyłanie CachedContent do Gemini API (%s znaków, model=%s)...", len(snapshot_text), model_name)
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            elapsed = time.time() - t0
            log.info("CachedContent utworzony pomyślnie w %.1fs! Odpowiedź: %s", elapsed, json.dumps(data)[:200])
            return data
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        log.error("Błąd tworzenia CachedContent HTTP %s: %s", e.code, err_body)
        raise RuntimeError(f"Gemini CachedContent error ({e.code}): {err_body}")


def build_and_save_cache():
    """Główna funkcja wykonawcza: buduje snapshot, tworzy cache i rejestruje w Supabase."""
    if not DSN:
        raise RuntimeError("Brak WORKER_DATABASE_URL w środowisku")
    if not GEMINI_API_KEY:
        raise RuntimeError("Brak GEMINI_API_KEY w środowisku (/etc/sparky-worker.env)")

    now_utc = datetime.now(timezone.utc)
    window_start = now_utc - timedelta(days=DAYS_WINDOW)
    window_end = now_utc

    with psycopg.connect(DSN, autocommit=True, row_factory=dict_row) as conn:
        # 1. Pobierz ID użytkownika Jakuba
        user_row = conn.execute("SELECT user_id FROM user_settings LIMIT 1").fetchone()
        if not user_row:
            raise RuntimeError("Nie znaleziono użytkownika w user_settings")
        user_id = str(user_row["user_id"])

        # 2. Skompiluj snapshot 90-dniowy
        snapshot_text = build_90d_snapshot(conn, user_id, window_start, window_end)
        approx_tokens = len(snapshot_text) // 3
        log.info("Rozmiar snapshotu: %d znaków (~%d tokenów)", len(snapshot_text), approx_tokens)

        # 3. Zapisz snapshot lokalnie na VPS (do szybkiego odczytu)
        snapshot_path = "/opt/sparky-worker/snapshot_90d.md"
        try:
            with open(snapshot_path, "w", encoding="utf-8") as f:
                f.write(snapshot_text)
            log.info("Zapisano lokalny snapshot do %s (%d bajtów)", snapshot_path, len(snapshot_text))
        except Exception as e:
            log.warning("Nie udało się zapisać lokalnego pliku snapshotu: %s", e)

        # 3b. Dossier dla Wyroczni (pamięć długoterminowa w bazie; nie wymaga billingu cache)
        dossier_info = {}
        try:
            from dossier_builder import build_and_store_dossier
            dossier_info = build_and_store_dossier(conn, user_id, snapshot_text, window_start, window_end, GEMINI_API_KEY)
        except Exception as e:
            log.error("Nie udało się zbudować dossier: %s", e)
            dossier_info = {"dossier_error": str(e)[:200]}

        # 4. Sprawdź próg minimalny (1024 tokeny)
        if approx_tokens < 1024:
            log.warning("Snapshot za mały na Context Caching (%d tokenów < 1024). Pomijam tworzenie cache.", approx_tokens)
            return {"status": "skipped_too_small", "tokens": approx_tokens}

        # 5. Wywołaj Gemini API CachedContents (wymaga billing w Google AI Studio)
        cache_resp = None
        try:
            cache_resp = create_gemini_cached_content(snapshot_text, GEMINI_API_KEY, MODEL_NAME, CACHE_TTL_SECONDS)
        except Exception as e:
            if "TotalCachedContentStorageTokensPerModelFreeTier" in str(e) or "limit=0" in str(e):
                log.warning(
                    "Explicit Context Caching Storage wymaga włączonego bilingu (Pay-as-you-go) w Google AI Studio. "
                    "Snapshot 90-dniowy został zachowany lokalnie i jest gotowy do Big Context Window (1M tokenów)."
                )
                return {
                    "status": "local_snapshot_ready",
                    "reason": "billing_required_for_cache_storage",
                    "snapshot_path": snapshot_path,
                    **dossier_info,
                    "tokens": approx_tokens,
                    "chars": len(snapshot_text)
                }
            raise

        cache_name = cache_resp["name"]
        model = cache_resp.get("model", MODEL_NAME)
        total_tokens = cache_resp.get("usageMetadata", {}).get("totalTokenCount", approx_tokens)
        expire_time_str = cache_resp.get("expireTime")

        if expire_time_str:
            # np. 2026-11-24T12:00:00.000Z
            expires_at = datetime.fromisoformat(expire_time_str.replace("Z", "+00:00"))
        else:
            expires_at = now_utc + timedelta(seconds=CACHE_TTL_SECONDS)

        # 5. Oznacz poprzednie aktywne rekordy jako 'expired'
        conn.execute(
            """UPDATE public.vanguard_context_caches
               SET status = 'expired', updated_at = now()
               WHERE user_id = %s AND status = 'active'""",
            (user_id,)
        )

        # 6. Zapisz nowy aktywny rekord w tabeli
        inserted = conn.execute(
            """INSERT INTO public.vanguard_context_caches
               (user_id, cache_name, model_name, token_count, window_start, window_end, expires_at, status, metadata)
               VALUES (%s, %s, %s, %s, %s, %s, %s, 'active', %s)
               RETURNING id, cache_name, token_count, expires_at""",
            (
                user_id,
                cache_name,
                model,
                total_tokens,
                window_start,
                window_end,
                expires_at,
                json.dumps({"snapshot_chars": len(snapshot_text), "created_via": "context_cache_builder.py"})
            )
        ).fetchone()

        log.info("Zarejestrowano nowy cache w bazie: id=%s, name=%s, tokens=%s, expires_at=%s",
                 inserted["id"], inserted["cache_name"], inserted["token_count"], inserted["expires_at"])

        return {
            "status": "active",
            "cache_id": str(inserted["id"]),
            "cache_name": inserted["cache_name"],
            "token_count": inserted["token_count"],
            "expires_at": inserted["expires_at"].isoformat()
        }


if __name__ == "__main__":
    try:
        res = build_and_save_cache()
        print(json.dumps(res, indent=2))
    except Exception as e:
        log.exception("Krytyczny błąd budowania context cache: %s", e)
        sys.exit(1)
