"""Wspolne narzedzia kuratora grafu: wywolanie Gemini z odpowiedzia JSON, zapis raportow, ladowanie grafu i snapshotu."""
import json
import logging
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

log = logging.getLogger("curator")

MODEL = os.getenv("GEMINI_CURATOR_MODEL", "gemini-3.5-flash")
API_KEY = os.getenv("GEMINI_API_KEY", "")


def gemini_json(prompt, timeout=420, model=MODEL):
    """Wysyla prompt do Gemini i zwraca sparsowany JSON (responseMimeType=application/json)."""
    if not API_KEY:
        raise RuntimeError("Brak GEMINI_API_KEY w /etc/sparky-worker.env")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = json.dumps({
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json", "maxOutputTokens": 32768},
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, method="POST",
                                 headers={"Content-Type": "application/json", "x-goog-api-key": API_KEY})
    data = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")
            if e.code == 429 and attempt < 2 and "PerDay" not in body:  # dzienny limit: ponawianie nic nie da
                # Limity tokenow na minute (free tier): czekamy zalecany czas i ponawiamy.
                m = re.search(r'"retryDelay":\s*"(\d+(?:\.\d+)?)s"', body)
                wait = min(float(m.group(1)) + 2 if m else 65, 120)
                log.warning("Gemini 429, ponawiam za %.0fs (proba %d)", wait, attempt + 1)
                time.sleep(wait)
                continue
            quota = re.findall(r'"quotaId":\s*"([^"]+)"', body)
            raise RuntimeError(f"Gemini HTTP {e.code} model={model}: {quota[:2] or body[:400]}")
    parts = ((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts).strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Gemini zwrocil niepoprawny JSON: {e}; poczatek: {text[:200]}")


def get_user_id(conn):
    row = conn.execute("SELECT user_id FROM user_settings LIMIT 1").fetchone()
    if not row:
        raise RuntimeError("Nie znaleziono uzytkownika w user_settings")
    return str(row["user_id"])


def save_report(conn, user_id, kind, mode, summary, content):
    row = conn.execute(
        """INSERT INTO public.vanguard_curation_reports (user_id, kind, mode, summary, content, model_name)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
        (user_id, kind, mode, json.dumps(summary, ensure_ascii=False), content, MODEL),
    ).fetchone()
    return str(row["id"])


def load_claims(conn, user_id):
    return conn.execute(
        """SELECT c.id, c.status, c.epistemic_status, c.evidence_count, c.learned_at, c.valid_from, c.valid_to,
                  c.fact_text, s.canonical_name AS subj, r.name AS rel, o.canonical_name AS obj
           FROM claims c JOIN entities s ON s.id = c.subject_id JOIN entities o ON o.id = c.object_id
                         JOIN relations r ON r.id = c.relation_id
           WHERE c.user_id = %s ORDER BY c.learned_at""",
        (user_id,),
    ).fetchall()


def claim_line(c):
    day = c["learned_at"].strftime("%Y-%m-%d") if c["learned_at"] else "?"
    fact = f" | {c['fact_text']}" if c.get("fact_text") else ""
    return (f"[{str(c['id'])[:8]}] {c['subj']} —{c['rel']}→ {c['obj']} | {c['epistemic_status']}/{c['status']}"
            f" | obserwacji:{c['evidence_count'] or 0} | zapisano {day}{fact}")


def load_snapshot(conn, user_id, days=90):
    from context_cache_builder import build_90d_snapshot
    end = datetime.now(timezone.utc)
    return build_90d_snapshot(conn, user_id, end - timedelta(days=days), end)


def resolve_ids(items, id_key, short_to_full):
    """Zamienia 8-znakowe skroty ID z odpowiedzi modelu na pelne UUID; odrzuca nieznane."""
    out = []
    for it in items or []:
        full = short_to_full.get(str(it.get(id_key, ""))[:8])
        if full:
            out.append({**it, id_key: full})
    return out
