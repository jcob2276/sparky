"""Audyt claimow: Gemini porownuje claimy z 90-dniowym snapshotem. Tryb dry-run: tylko raport, bez zapisu do grafu."""
import logging

from curator_common import claim_line, gemini_json, get_user_id, load_claims, load_snapshot, resolve_ids, save_report

log = logging.getLogger("curator.claims")

PROMPT = """Jesteś audytorem grafu wiedzy osobistego asystenta Jakuba. Poniżej jest (A) lista claimów z grafu, każdy z 8-znakowym ID w nawiasach kwadratowych, oraz (B) 90-dniowa oś czasu Jakuba z datami.

Dla claimów sprawdź ich poparcie w osi czasu (B) i zwróć JSON o dokładnie takich kluczach:
{
 "boost":   [{"id": "...", "evidence_dates": ["YYYY-MM-DD", ...], "reason": "..."}],
 "promote": [{"id": "...", "evidence_dates": ["YYYY-MM-DD", ...], "reason": "..."}],
 "demote":  [{"id": "...", "contradicting_dates": ["YYYY-MM-DD", ...], "reason": "..."}],
 "merge":   [{"ids": ["...", "..."], "keep": "...", "reason": "..."}],
 "unsupported": [{"id": "...", "reason": "..."}]
}
Zasady:
- boost: claim ma dodatkowe, niezależne obserwacje w różnych dniach osi czasu (podaj konkretne daty z (B)).
- promote: hipoteza (epistemic_status=hypothesis), która ma co najmniej 3 różne daty potwierdzające w (B). Mniej niż 3 daty = nie awansuj.
- demote: claim, któremu dane z (B) wyraźnie przeczą (podaj daty i krótki dowód).
- merge: claimy o tym samym sensie (duplikaty, różne sformułowania); wskaż, który zostawić.
- unsupported: claim, dla którego w (B) nie znalazłeś żadnego poparcia.
- Używaj wyłącznie dat, które faktycznie występują w (B). Niczego nie zmyślaj. Pomijaj claimy bez ustaleń.
- Odpowiadaj tylko JSON-em."""


def run_claims_audit(conn):
    user_id = get_user_id(conn)
    claims = load_claims(conn, user_id)
    short = {str(c["id"])[:8]: str(c["id"]) for c in claims}
    by_full = {str(c["id"]): c for c in claims}
    snapshot = load_snapshot(conn, user_id)
    prompt = (PROMPT + "\n\n(A) CLAIMY:\n" + "\n".join(claim_line(c) for c in claims)
              + "\n\n(B) OŚ CZASU:\n" + snapshot)
    log.info("Audyt claimow: %d claimow, prompt %d znakow", len(claims), len(prompt))
    raw = gemini_json(prompt)

    promote = []
    for it in resolve_ids(raw.get("promote"), "id", short):
        dates = sorted(set(it.get("evidence_dates") or []))
        c = by_full[it["id"]]
        if c["epistemic_status"] == "hypothesis" and len(dates) >= 3:
            promote.append({**it, "evidence_dates": dates})
    boost = [{**it, "evidence_dates": sorted(set(it.get("evidence_dates") or []))}
             for it in resolve_ids(raw.get("boost"), "id", short) if len(set(it.get("evidence_dates") or [])) >= 2]
    demote = [it for it in resolve_ids(raw.get("demote"), "id", short) if it.get("contradicting_dates")]
    unsupported = resolve_ids(raw.get("unsupported"), "id", short)
    merge = []
    for it in raw.get("merge") or []:
        ids = [short.get(str(i)[:8]) for i in it.get("ids") or []]
        keep = short.get(str(it.get("keep", ""))[:8])
        if len([i for i in ids if i]) >= 2 and keep:
            merge.append({"ids": [i for i in ids if i], "keep": keep, "reason": it.get("reason", "")})

    def label(full):
        c = by_full[full]
        return f"{c['subj']} —{c['rel']}→ {c['obj']}"

    lines = ["# Audyt claimów (dry-run, bez zapisu do grafu)", f"Claimów: {len(claims)}", ""]
    lines += [f"## Awans hipotezy do faktu ({len(promote)})"] + [
        f"- {label(i['id'])} — daty: {', '.join(i['evidence_dates'])} — {i.get('reason', '')}" for i in promote]
    lines += ["", f"## Dodatkowe obserwacje ({len(boost)})"] + [
        f"- {label(i['id'])} — +{len(i['evidence_dates'])} dat ({', '.join(i['evidence_dates'][:6])})" for i in boost]
    lines += ["", f"## Do degradacji — dane przeczą ({len(demote)})"] + [
        f"- {label(i['id'])} — {', '.join(i['contradicting_dates'])} — {i.get('reason', '')}" for i in demote]
    lines += ["", f"## Duplikaty do scalenia ({len(merge)})"] + [
        f"- zostaw: {label(i['keep'])}; scal: {'; '.join(label(x) for x in i['ids'] if x != i['keep'])} — {i['reason']}"
        for i in merge]
    lines += ["", f"## Bez poparcia w danych ({len(unsupported)})"] + [
        f"- {label(i['id'])} — {i.get('reason', '')}" for i in unsupported[:60]]
    summary = {"claims": len(claims), "promote": len(promote), "boost": len(boost), "demote": len(demote),
               "merge": len(merge), "unsupported": len(unsupported),
               "proposals": {"promote": [i["id"] for i in promote], "demote": [i["id"] for i in demote]}}
    report_id = save_report(conn, user_id, "claims_audit", "dry_run", summary, "\n".join(lines))
    return {"report_id": report_id, **{k: v for k, v in summary.items() if k != "proposals"}}
