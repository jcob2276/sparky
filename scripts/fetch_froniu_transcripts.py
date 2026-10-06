import os
import sys
import json
import time
import re
import subprocess
from youtube_transcript_api import YouTubeTranscriptApi

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "froniu_transcripts"))
MD_DIR = os.path.join(OUTPUT_DIR, "transcripts")
os.makedirs(MD_DIR, exist_ok=True)
MASTER_JSONL = os.path.join(OUTPUT_DIR, "all_transcripts.jsonl")

def sanitize_filename(name):
    clean = re.sub(r'[\\/*?:"<>|]', '', name)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean[:110]

def format_timestamp(seconds):
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"

def rotate_warp():
    print(">>> Wykryto ograniczenie limitu (rate limit). Resetowanie połączenia Cloudflare WARP w celu odświeżenia IP...")
    try:
        subprocess.run(["warp-cli", "disconnect"], capture_output=True, timeout=10)
        time.sleep(2)
        subprocess.run(["warp-cli", "connect"], capture_output=True, timeout=10)
        time.sleep(3)
        print(">>> Połączenie WARP odświeżone.")
    except Exception as e:
        print(f">>> Błąd podczas resetowania WARP: {e}")
        time.sleep(5)

def get_existing_ids():
    existing = set()
    if os.path.exists(MASTER_JSONL):
        try:
            with open(MASTER_JSONL, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        try:
                            d = json.loads(line)
                            existing.add(d["id"])
                        except Exception:
                            pass
        except Exception:
            pass
    # Also check MD_DIR
    for fname in os.listdir(MD_DIR):
        if fname.endswith(".md"):
            m = re.search(r'\[([a-zA-Z0-9_-]{11})\]\.md$', fname)
            if m:
                existing.add(m.group(1))
    return existing

def process_video(video, api):
    vid = video["id"]
    title = video["title"]
    md_filename = f"{sanitize_filename(title)} [{vid}].md"
    md_path = os.path.join(MD_DIR, md_filename)

    retries = 2
    for attempt in range(retries):
        try:
            snippets = api.fetch(vid, languages=['pl', 'pl-orig'])
            if not snippets:
                return "no_snippets"

            text_parts = []
            timed_parts = []
            for s in snippets:
                t_str = format_timestamp(s.start)
                txt = s.text.replace("\n", " ").strip()
                if txt:
                    text_parts.append(txt)
                    timed_parts.append(f"- `[{t_str}]` {txt}")

            full_text = " ".join(text_parts)
            # Break text into paragraphs
            sentences = re.split(r'(?<=[.!?]) +', full_text)
            paragraphs = []
            curr = []
            curr_len = 0
            for sent in sentences:
                curr.append(sent)
                curr_len += len(sent)
                if curr_len >= 450:
                    paragraphs.append(" ".join(curr))
                    curr = []
                    curr_len = 0
            if curr:
                paragraphs.append(" ".join(curr))

            formatted_paragraphs = "\n\n".join(paragraphs) if paragraphs else full_text
            duration_desc = format_timestamp(video.get("duration") or 0)

            md_content = f"""# {title}

- **URL:** {video['url']}
- **Wideo ID:** `{vid}`
- **Długość:** {duration_desc}
- **Typ:** {video.get('tab', 'video')}

---

## 📝 Pełna treść (Transkrypcja)

{formatted_paragraphs}

---

## ⏱️ Znaczniki czasu

{chr(10).join(timed_parts)}
"""
            with open(md_path, "w", encoding="utf-8") as f:
                f.write(md_content)

            # Append to master JSONL
            with open(MASTER_JSONL, "a", encoding="utf-8") as f:
                f.write(json.dumps({
                    "id": vid,
                    "title": title,
                    "url": video["url"],
                    "duration": video.get("duration"),
                    "tab": video.get("tab"),
                    "content": full_text
                }, ensure_ascii=False) + "\n")

            return "success"

        except Exception as e:
            err_str = str(e)
            if "blocking" in err_str.lower() or "too many requests" in err_str.lower() or "ip" in err_str.lower() and "block" in err_str.lower():
                rotate_warp()
                time.sleep(2)
                continue
            elif "Subtitles are disabled" in err_str or "No transcripts were found" in err_str:
                return "no_transcript"
            elif "level" in err_str.lower() or "members" in err_str.lower() or "unplayable" in err_str.lower():
                return "members_only"
            else:
                return f"error: {err_str[:80]}"

    return "rate_limited"

def main():
    cache_file = os.path.join(OUTPUT_DIR, "video_list.json")
    if not os.path.exists(cache_file):
        print("Brak video_list.json!")
        return

    with open(cache_file, "r", encoding="utf-8") as f:
        all_videos = json.load(f)

    # Prioritize: 'videos' first, then 'streams', then 'shorts'
    priority = {"videos": 0, "streams": 1, "shorts": 2}
    all_videos.sort(key=lambda v: priority.get(v.get("tab"), 99))

    existing_ids = get_existing_ids()
    to_process = [v for v in all_videos if v["id"] not in existing_ids]

    print(f"Łącznie w bazie kanału: {len(all_videos)}")
    print(f"Już pobranych: {len(existing_ids)}")
    print(f"Pozostało do pobrania: {len(to_process)}")

    if not to_process:
        print("Wszystkie transkrypcje są już pobrane!")
        return

    api = YouTubeTranscriptApi()
    success = 0
    skipped = 0
    errors = 0
    total = len(to_process)
    start_time = time.time()

    if sys.stdout.encoding.lower() != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass

    for idx, video in enumerate(to_process, 1):
        status = process_video(video, api)
        if status == "success":
            success += 1
            icon = "[OK]"
        elif status in ("no_transcript", "members_only", "no_snippets"):
            skipped += 1
            icon = "[SKIP]"
        else:
            errors += 1
            icon = "[ERR]"

        elapsed = time.time() - start_time
        speed = idx / elapsed if elapsed > 0 else 0
        remaining_sec = int((total - idx) / speed) if speed > 0 else 0
        rem_m, rem_s = divmod(remaining_sec, 60)

        # Print status line
        title_disp = video["title"][:50]
        print(f"[{idx}/{total}] {icon} [{video.get('tab')}] {title_disp} ({status}) | ETA: {rem_m}m{rem_s:02d}s", flush=True)
        
        # Polite delay between requests to preserve IP reputation
        time.sleep(0.35)

    print("\n=== ZAKOŃCZONO POBIERANIE ===")
    print(f"Pobrano nowych transkrypcji: {success}")
    print(f"Pominięto (brak napisów / tylko dla wspierających): {skipped}")
    print(f"Błędów: {errors}")
    print(f"Łącznie w bazie: {len(get_existing_ids())} transkrypcji.")

if __name__ == "__main__":
    main()

