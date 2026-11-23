"""Higiena encji: duplikaty, ujednolicenie rodzajow (kind) i aliasy. Tylko raport (dry-run)."""
import logging

from curator_common import gemini_json, get_user_id, save_report

log = logging.getLogger("curator.entities")

PROMPT = """Jesteś kuratorem grafu wiedzy osobistego asystenta Jakuba. Poniżej jest lista encji (każda z 8-znakowym ID, rodzajem kind, nazwą, aliasami i liczbą claimów).

Zwróć JSON:
{"merge":[{"ids":["...","..."],"keep":"...","reason":"..."}],
 "kind_map":[{"from":"stary_kind","to":"ujednolicony_kind","reason":"..."}],
 "aliases":[{"id":"...","add":["alias1"],"reason":"..."}]}
Zasady:
- merge: tylko encje, które na pewno oznaczają to samo (warianty zapisu, odmiany, polski/angielski odpowiednik tego samego); wskaż keep (ta z większą liczbą claimów lub lepszą nazwą). Encji różniących się znaczeniem NIE scalaj, nawet gdy brzmią podobnie.
- kind_map: ujednolicenie rodzajów występujących w kilku językach lub wariantach (np. osoba→person, działanie→action). Użyj angielskich nazw, istniejących już w liście.
- aliases: sensowne brakujące aliasy (nie wymyślaj; tylko to, co wynika z nazw encji na liście).
- Nie zgaduj; przy wątpliwości pomiń. Odpowiadaj tylko JSON-em."""


def run_entity_hygiene(conn):
    user_id = get_user_id(conn)
    ents = conn.execute(
        """SELECT e.id, e.kind, e.canonical_name,
                  coalesce((SELECT string_agg(a.alias, ' / ') FROM entity_aliases a WHERE a.entity_id = e.id), '') AS aliases,
                  (SELECT count(*) FROM claims c WHERE c.subject_id = e.id OR c.object_id = e.id) AS claim_count
           FROM entities e WHERE e.user_id = %s AND e.merged_into IS NULL ORDER BY e.kind, e.canonical_name""",
        (user_id,),
    ).fetchall()
    short = {str(e["id"])[:8]: e for e in ents}
    lines = [f"[{str(e['id'])[:8]}] {e['kind']} | {e['canonical_name']} | aliasy: {e['aliases'] or '-'} | claimów: {e['claim_count']}"
             for e in ents]
    raw = gemini_json(PROMPT + "\n\nENCJE:\n" + "\n".join(lines))

    merges = []
    for m in raw.get("merge") or []:
        ids = [str(i)[:8] for i in m.get("ids") or [] if str(i)[:8] in short]
        keep = str(m.get("keep", ""))[:8]
        if len(set(ids)) >= 2 and keep in short:
            merges.append({"ids": sorted(set(ids)), "keep": keep, "reason": m.get("reason", "")})
    kinds = [k for k in raw.get("kind_map") or [] if k.get("from") and k.get("to") and k["from"] != k["to"]]
    aliases = [a for a in raw.get("aliases") or [] if str(a.get("id", ""))[:8] in short and a.get("add")]

    def name(i):
        return f"{short[i]['canonical_name']} ({short[i]['kind']})"

    content = ["# Higiena encji (dry-run, nic nie zmieniono)", f"Encji aktywnych: {len(ents)}", "", f"## Scalenia ({len(merges)})"]
    content += [f"- zostaw {name(m['keep'])}; scal: {'; '.join(name(i) for i in m['ids'] if i != m['keep'])} — {m['reason']}" for m in merges]
    content += ["", f"## Ujednolicenie rodzajów ({len(kinds)})"] + [f"- {k['from']} → {k['to']} — {k.get('reason', '')}" for k in kinds]
    content += ["", f"## Aliasy ({len(aliases)})"] + [f"- {name(str(a['id'])[:8])}: +{', '.join(a['add'])}" for a in aliases]
    summary = {"entities": len(ents), "merge": len(merges), "kind_map": len(kinds), "aliases": len(aliases)}
    report_id = save_report(conn, user_id, "entity_hygiene", "dry_run", summary, "\n".join(content))
    return {"report_id": report_id, **summary}
