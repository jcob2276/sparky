from youtube_transcript_api import YouTubeTranscriptApi
import json

with open('mazur_matches.json', encoding='utf-8') as f:
    matches = json.load(f)

ytt = YouTubeTranscriptApi()
for m in matches:
    try:
        t = ytt.list(m['id']).find_transcript(['pl'])
        print("HAS SUBS:", m['id'], "|", m['title'])
    except Exception:
        pass
