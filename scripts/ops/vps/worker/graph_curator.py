"""Kurator grafu wiedzy: punkt wejscia dla zadania pgmq `curate_graph` ({"task": "...", "apply": false})."""
import logging
import time

import psycopg
from psycopg.rows import dict_row

log = logging.getLogger("curator")
TASKS = ("claims_audit", "wiki_triage", "pattern_miner", "entity_hygiene")


def run(payload):
    from curator_claims import run_claims_audit
    from curator_entities import run_entity_hygiene
    from curator_patterns import run_pattern_miner
    from curator_wiki import run_wiki_triage
    import os

    task = (payload or {}).get("task", "all")
    apply = bool((payload or {}).get("apply", False))
    todo = TASKS if task == "all" else (task,)
    if any(t not in TASKS for t in todo):
        raise ValueError(f"nieznane zadanie kuratora: {task}")
    results = {}
    with psycopg.connect(os.environ["WORKER_DATABASE_URL"], autocommit=True, row_factory=dict_row) as conn:
        for n, t in enumerate(todo):
            if n:
                time.sleep(70)  # odstep miedzy duzymi promptami (limit tokenow na minute w planie darmowym)
            try:
                if t == "claims_audit":
                    results[t] = run_claims_audit(conn)
                elif t == "wiki_triage":
                    results[t] = run_wiki_triage(conn, apply=apply)
                elif t == "pattern_miner":
                    results[t] = run_pattern_miner(conn)
                else:
                    results[t] = run_entity_hygiene(conn)
            except Exception as e:
                log.exception("kurator %s zawiodl", t)
                results[t] = {"error": str(e)[:300]}
    return results
