import json

with open("tmp/db_export_sauna.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for table, rows in data.items():
    print(f"\n==========================================")
    print(f"TABLE: {table} (Total rows: {len(rows)})")
    print(f"==========================================")
    matches = []
    for r in rows:
        r_str = json.dumps(r, ensure_ascii=False)
        if "saun" in r_str.lower():
            matches.append(r)
            
    print(f"Found {len(matches)} matches for 'saun':")
    for m in matches:
        print(json.dumps(m, indent=2, ensure_ascii=False))

