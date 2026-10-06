import os
import sys
import json
import re

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "froniu_transcripts"))
MASTER_JSONL = os.path.join(OUTPUT_DIR, "all_transcripts.jsonl")

def search(query, max_results=10):
    if not os.path.exists(MASTER_JSONL):
        print(f"Baza {MASTER_JSONL} nie istnieje. Najpierw uruchom pobieranie.")
        return

    words = [w.lower() for w in query.split() if len(w) > 2]
    if not words:
        words = [query.lower()]

    matches = []
    with open(MASTER_JSONL, "r", encoding="utf-8") as f:
        for line in f:
            item = json.loads(line)
            content = item["content"]
            content_lower = content.lower()
            
            # Score by occurrence of search words
            score = 0
            for w in words:
                count = content_lower.count(w)
                if count > 0:
                    score += count * (5 if w in item["title"].lower() else 1)

            if score > 0:
                # Find best snippet
                best_snippet = ""
                min_idx = len(content)
                for w in words:
                    idx = content_lower.find(w)
                    if 0 <= idx < min_idx:
                        min_idx = idx
                
                start_char = max(0, min_idx - 150)
                end_char = min(len(content), min_idx + 350)
                snippet = content[start_char:end_char].replace("\n", " ").strip()
                matches.append({
                    "score": score,
                    "title": item["title"],
                    "url": item["url"],
                    "id": item["id"],
                    "snippet": f"...{snippet}..."
                })

    matches.sort(key=lambda x: x["score"], reverse=True)
    print(f"\nZnaleziono {len(matches)} materiałów pasujących do zapytania: '{query}'\n")
    for i, m in enumerate(matches[:max_results], 1):
        print(f"[{i}] {m['title']}")
        print(f"    URL: {m['url']}")
        print(f"    Trafność: {m['score']} wystąpień")
        print(f"    Fragment: {m['snippet']}\n")

if __name__ == "__main__":
    if sys.stdout.encoding.lower() != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    q = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "nawyki"
    search(q)
