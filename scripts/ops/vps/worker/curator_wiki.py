"""Selekcja kolejki weryfikacji wiki. Dry-run: raport. Apply: odwracalnie zamyka tylko pewne duplikaty i nieaktualne pozycje."""
import json
import logging
from datetime import datetime, timezone

from curator_common import MODEL, gemini_json, get_user_id, load_snapshot, resolve_ids, save_report

log = logging.getLogger("curator.wiki")
AUTO_CONFIDENCE = 0.9
AUTO_VERDICTS = ("duplicate", "obsolete")

PROMPT = """Jesteś kuratorem kolejki weryfikacji wiki osobistego asystenta Jakuba. Poniżej jest (A) jego DOSSIER i najnowsze dni osi czasu, oraz (B) lista otwartych pozycji kolejki, każda z 8-znakowym ID w nawiasach kwadratowych.

Dla każdej pozycji z (B) oceń, czy wymaga uwagi. Zwróć JSON {"items":[{"id":"...","verdict":"duplicate|obsolete|needs_user|keep","duplicate_of":"id lub null","confidence":0.0-1.0,"reason":"..."}]}.
Wypisz WYŁĄCZNIE pozycje, których werdykt to duplicate, obsolete lub needs_user (pozycje keep pomiń).
- duplicate: ta sama sprawa co inna pozycja z (B) o tym samym lub szerszym zakresie; podaj duplicate_of (ID pozycji, którą zostawiamy; wybierz najnowszą lub najbardziej szczegółową).
- obsolete: sprawa jest już załatwiona lub nieaktualna w świetle danych z (A) (np. brakujące dane już są, zdarzenie minęło); w reason wskaż dowód z (A).
- needs_user: wymaga decyzji lub potwierdzenia przez Jakuba i nie da się tego rozstrzygnąć z danych.
- confidence: pewność werdyktu; poniżej 0.9 gdy masz jakąkolwiek wątpliwość. Nie zgaduj."""


def _items(conn, user_id):
    return conn.execute(
        """SELECT i.id, i.item_type, i.severity, i.title, i.detail, i.action, i.created_at, p.title AS page
           FROM vanguard_wiki_review_items i LEFT JOIN vanguard_wiki_pages p ON p.id = i.page_id
           WHERE i.user_id = %s AND i.status = 'open' ORDER BY i.created_at""",
        (user_id,),
    ).fetchall()


def _context(conn, user_id):
    dossier = conn.execute(
        "SELECT content FROM vanguard_dossiers WHERE user_id=%s AND kind='life_90d' ORDER BY created_at DESC LIMIT 1",
        (user_id,),
    ).fetchone()
    days = load_snapshot(conn, user_id, 90).split("\n## ")
    return (dossier["content"] if dossier else "") + "\n\nNAJNOWSZE DNI:\n## " + "\n## ".join(days[-21:])


def run_wiki_triage(conn, apply=False):
    user_id = get_user_id(conn)
    items = _items(conn, user_id)
    short = {str(i["id"])[:8]: str(i["id"]) for i in items}
    by_full = {str(i["id"]): i for i in items}
    lines = [f"[{str(i['id'])[:8]}] {i['created_at']:%Y-%m-%d} {i['item_type']}/{i['severity']} | strona: {i['page'] or '-'} | "
             f"{i['title']} | {(i['detail'] or '')[:220]} | akcja: {(i['action'] or '')[:120]}" for i in items]
    prompt = PROMPT + "\n\n(A) KONTEKST:\n" + _context(conn, user_id) + "\n\n(B) POZYCJE:\n" + "\n".join(lines)
    log.info("Selekcja wiki: %d otwartych pozycji, prompt %d znakow", len(items), len(prompt))
    raw = gemini_json(prompt)

    verdicts = []
    for it in resolve_ids(raw.get("items"), "id", short):
        dup = short.get(str(it.get("duplicate_of") or "")[:8]) if it.get("duplicate_of") else None
        v = it.get("verdict")
        if v not in ("duplicate", "obsolete", "needs_user"):
            continue
        if v == "duplicate" and (not dup or dup == it["id"]):
            v = "needs_user"
        verdicts.append({"id": it["id"], "verdict": v, "duplicate_of": dup,
                         "confidence": float(it.get("confidence") or 0), "reason": it.get("reason", "")})

    auto = [v for v in verdicts if v["verdict"] in AUTO_VERDICTS and v["confidence"] >= AUTO_CONFIDENCE]
    applied = 0
    if apply:
        now = datetime.now(timezone.utc).isoformat()
        for v in auto:
            note = {"auto_triage": {"verdict": v["verdict"], "duplicate_of": v["duplicate_of"], "reason": v["reason"],
                                    "confidence": v["confidence"], "model": MODEL, "at": now}}
            cur = conn.execute(
                """UPDATE vanguard_wiki_review_items
                   SET status = 'resolved', updated_at = now(), metadata = coalesce(metadata, '{}'::jsonb) || %s::jsonb
                   WHERE id = %s AND status = 'open'""",
                (json.dumps(note, ensure_ascii=False), v["id"]),
            )
            applied += cur.rowcount

    def line(v):
        i = by_full[v["id"]]
        extra = f" (duplikat: {by_full[v['duplicate_of']]['title']})" if v["duplicate_of"] in by_full else ""
        return f"- [{v['confidence']:.2f}] {i['item_type']}: {i['title']}{extra} — {v['reason']}"

    groups = {k: [v for v in verdicts if v["verdict"] == k] for k in ("duplicate", "obsolete", "needs_user")}
    content = [f"# Selekcja kolejki wiki ({'ZASTOSOWANO' if apply else 'dry-run'})",
               f"Otwartych: {len(items)}; do auto-zamknięcia (pewność ≥ {AUTO_CONFIDENCE}): {len(auto)}; zamknięto: {applied}", ""]
    for k, title in (("duplicate", "Duplikaty"), ("obsolete", "Nieaktualne"), ("needs_user", "Wymaga Twojej decyzji")):
        content += [f"## {title} ({len(groups[k])})"] + [line(v) for v in groups[k]] + [""]
    summary = {"open": len(items), "duplicate": len(groups["duplicate"]), "obsolete": len(groups["obsolete"]),
               "needs_user": len(groups["needs_user"]), "auto_eligible": len(auto), "applied": applied}
    report_id = save_report(conn, user_id, "wiki_triage", "applied" if apply else "dry_run", summary, "\n".join(content))
    return {"report_id": report_id, **summary}
