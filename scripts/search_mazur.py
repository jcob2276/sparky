import subprocess
import json

cmd = ['yt-dlp', '--flat-playlist', '--print', '%(id)s|||%(title)s|||%(duration)s', 'https://www.youtube.com/@RafMazur/videos']
res = subprocess.run(cmd, capture_output=True, errors='replace')
lines = res.stdout.strip().split('\n')

print(f'Total videos fetched: {len(lines)}')

keywords = ['chłopiec', 'miły', 'agresj', 'męsk', 'tożsamoś', 'pewnoś', 'wartoś', 'strach', 'lęk', 'opór', 'napięci', 'konfront', 'cień', 'wstyd', 'odrzucen', 'drapież', 'kobiety', 'relacj', 'inicjacj', 'dorosł', 'sukces', 'przegran', 'wygryw', 'grzecz', 'ofiara', 'kontrola', 'presj', 'odwaga', 'flinch', 'władza', 'dominacj']

matches = []
for line in lines:
    parts = line.split('|||')
    if len(parts) >= 2:
        vid_id, title = parts[0].strip(), parts[1].strip()
        dur = parts[2].strip() if len(parts) > 2 else ''
        low = title.lower()
        matched_words = [k for k in keywords if k in low]
        if matched_words:
            matches.append({'id': vid_id, 'title': title, 'words': matched_words, 'duration': dur})

matches.sort(key=lambda x: len(x['words']), reverse=True)
print(f'Matches found: {len(matches)}')
with open('mazur_matches.json', 'w', encoding='utf-8') as f:
    json.dump(matches, f, ensure_ascii=False, indent=2)

for m in matches[:30]:
    print(f"{m['id']} | {', '.join(m['words'])} | {m['title']}")
