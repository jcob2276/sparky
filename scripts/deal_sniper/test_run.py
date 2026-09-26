import os
import sys
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from scripts.deal_sniper.olx_scraper import fetch_olx_deals
from scripts.deal_sniper.allegro_scraper import fetch_allegro_deals

sys.stdout.reconfigure(encoding='utf-8')

config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
with open(config_path, "r", encoding="utf-8") as f:
    cfg = json.load(f)

print("=== TESTING OLX & ALLEGRO LOKALNIE SCRAPERS ===")
for target_key, tcfg in cfg["search_targets"].items():
    print(f"\n--- Target: {tcfg['name']} ---")
    olx = fetch_olx_deals(target_key, tcfg, cfg['safety_filters'])
    all_lok = fetch_allegro_deals(target_key, tcfg, cfg['safety_filters'])
    print(f"OLX: {len(olx)} ofert | Allegro Lokalnie: {len(all_lok)} ofert")
    combined = olx + all_lok
    combined.sort(key=lambda x: x["price"])
    
    print(f"Top 3 najtańsze oferty:")
    for d in combined[:3]:
        bat_str = f"Bat: {d['battery']}%" if d['battery'] else "Brak %"
        print(f"  [{d['source']}] {d['price']} zł | {bat_str} | {d['title'][:55]}")
        print(f"    Link: {d['url']}")
