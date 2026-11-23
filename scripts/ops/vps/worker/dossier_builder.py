"""Dossier Jakuba: Gemini kompresuje 90-dniowy snapshot do zwartego opisu wzorcow (pamiec dlugoterminowa Wyroczni).

Wywolywany z context_cache_builder po zbudowaniu snapshotu. Wynik trafia do public.vanguard_dossiers,
skad vanguard-oracle wstrzykuje najnowszy dossier do promptu. Bez cache'owania po stronie Gemini (wymaga billingu).
"""
import json
import logging
import os
import urllib.error
import urllib.request

log = logging.getLogger("dossier_builder")

MODEL = os.getenv("GEMINI_DOSSIER_MODEL", "gemini-3.5-flash")
KEEP_LAST = int(os.getenv("DOSSIER_KEEP_LAST", "7"))
MIN_CHARS = 400

PROMPT = """Poniżej jest 90-dniowa oś czasu Jakuba (myśli i notatki, biometria Oura, treningi Strava, wieczorne refleksje).
Napisz z niej DOSSIER, czyli zwartą pamięć długoterminową dla jego osobistej Wyroczni (asystenta rozmawiającego z nim na Telegramie).

Zasady:
- Po polsku, maksymalnie ok. 1300 słów (nie więcej niż 10 000 znaków), czysty Markdown z nagłówkami ##, bez pogrubień i bez tabel.
- Wyłącznie fakty i wzorce poparte danymi. Przy każdym wzorcu podaj daty lub zakres dat i skalę (np. "4 z 6 niedziel"). Niczego nie zgaduj; niepewne oznacz słowem "prawdopodobnie".
- Pisz o Jakubie w trzeciej osobie.
- Nie dodawaj porad ani moralizowania; to ma być wiedza, nie kazanie.

Sekcje (pomiń pustą; jako nagłówek użyj samej nazwy sekcji, bez tekstu w nawiasach):
## Rytm i regeneracja (sen, HRV, tętno spoczynkowe, trendy i anomalie z datami)
## Trening i obciążenie
## Powtarzające się tematy i wzorce myślenia (co wraca w jego słowach)
## Unikanie i rozjazd między deklaracją a działaniem (konkretne przykłady z datami)
## Cele, projekty i otwarte pętle (co deklarował i jaki jest stan)
## Co mu pomaga, a co szkodzi (korelacje sen/ruch/nastrój potwierdzone w danych)
## Ostatnie 7 dni (najważniejsze zdarzenia i stan na dziś)
"""


def generate_dossier(snapshot_text, api_key, model=MODEL, timeout=240):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = json.dumps({
        "contents": [{"role": "user", "parts": [{"text": PROMPT + "\n\n" + snapshot_text}]}],
        "generationConfig": {"temperature": 0.3},
    }).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload, method="POST",
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Gemini dossier HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:300]}")
    parts = ((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
    text = "\n".join(p.get("text", "") for p in parts if p.get("text")).strip()
    if len(text) < MIN_CHARS:
        raise RuntimeError(f"Dossier za krotki ({len(text)} znakow), odrzucam")
    return text.replace("**", "")


def store_dossier(conn, user_id, text, window_start, window_end, model, source_chars):
    row = conn.execute(
        """INSERT INTO public.vanguard_dossiers
           (user_id, kind, content, window_start, window_end, model_name, source_chars)
           VALUES (%s, 'life_90d', %s, %s, %s, %s, %s) RETURNING id""",
        (user_id, text, window_start, window_end, model, source_chars),
    ).fetchone()
    conn.execute(
        """DELETE FROM public.vanguard_dossiers
           WHERE user_id = %s AND kind = 'life_90d' AND id NOT IN (
             SELECT id FROM public.vanguard_dossiers
             WHERE user_id = %s AND kind = 'life_90d' ORDER BY created_at DESC LIMIT %s)""",
        (user_id, user_id, KEEP_LAST),
    )
    return row["id"]


def build_and_store_dossier(conn, user_id, snapshot_text, window_start, window_end, api_key):
    text = generate_dossier(snapshot_text, api_key)
    dossier_id = store_dossier(conn, user_id, text, window_start, window_end, MODEL, len(snapshot_text))
    log.info("Dossier zapisany: id=%s, %d znakow", dossier_id, len(text))
    return {"dossier_id": str(dossier_id), "dossier_chars": len(text)}
