"""Gornik wzorcow zachowan: Gemini szuka w 90-dniowej osi czasu powtarzalnych wzorcow z datami. Tylko raport (dry-run)."""
import logging

from curator_common import gemini_json, get_user_id, load_snapshot, save_report

log = logging.getLogger("curator.patterns")

PROMPT = """Jesteś analitykiem wzorców behawioralnych osobistego asystenta Jakuba. Poniżej jest (A) lista wzorców, które już są w systemie, oraz (B) jego 90-dniowa oś czasu (myśli, biometria Oura, treningi, refleksje wieczorne).

Znajdź w (B) NOWE powtarzalne wzorce, których nie ma w (A). Zwróć JSON:
{"patterns":[{"pattern_type":"early_warning|narrative_biometric_mismatch|recurring_blocker|declaration_vs_action","title":"krótki tytuł po polsku","description":"na czym polega wzorzec (2-3 zdania)","occurrences":[{"date":"YYYY-MM-DD","evidence":"co dokładnie zaszło tego dnia"}],"outcome_metric":"co mierzyć, by sprawdzić wzorzec (np. sleep_hours następnej nocy)","confidence":0.0-1.0}]}
Zasady:
- Wzorzec musi mieć co najmniej 3 różne daty z (B); mniej = nie zgłaszaj.
- Szczególnie szukaj: deklaracja w jednym dniu a przeciwne zachowanie lub dane biometryczne w kolejnych (declaration_vs_action), narracja niezgodna z danymi Oura (narrative_biometric_mismatch), powtarzające się blokery.
- Używaj wyłącznie dat i faktów z (B). Niczego nie zmyślaj. Odpowiadaj tylko JSON-em."""


def run_pattern_miner(conn):
    user_id = get_user_id(conn)
    existing = conn.execute(
        "SELECT pattern_type, title, signature, occurrence_count, status FROM vanguard_behavioral_patterns WHERE user_id=%s",
        (user_id,),
    ).fetchall()
    known = "\n".join(f"- [{p['pattern_type']}/{p['status']}] {p['title']} ({p['occurrence_count']}x)" for p in existing) or "(brak)"
    prompt = PROMPT + "\n\n(A) ISTNIEJĄCE WZORCE:\n" + known + "\n\n(B) OŚ CZASU:\n" + load_snapshot(conn, user_id)
    raw = gemini_json(prompt)

    patterns = []
    for p in raw.get("patterns") or []:
        dates = sorted({o.get("date") for o in p.get("occurrences") or [] if o.get("date")})
        if len(dates) >= 3 and p.get("title"):
            patterns.append({**p, "dates": dates})
    lines = ["# Górnik wzorców (dry-run, nic nie zapisano do vanguard_behavioral_patterns)", f"Istniejących wzorców: {len(existing)}", ""]
    for p in patterns:
        lines += [f"## {p['title']} [{p.get('pattern_type', '?')}] pewność {p.get('confidence', '?')}",
                  p.get("description", ""), f"Metryka: {p.get('outcome_metric', '-')}", "Wystąpienia:"]
        lines += [f"- {o.get('date')}: {o.get('evidence', '')}" for o in p.get("occurrences") or []]
        lines.append("")
    summary = {"existing": len(existing), "proposed": len(patterns)}
    report_id = save_report(conn, user_id, "pattern_miner", "dry_run", summary, "\n".join(lines))
    return {"report_id": report_id, **summary}
