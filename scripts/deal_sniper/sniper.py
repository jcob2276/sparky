import os
import sys
import json
import time
import random
import argparse
import logging
from datetime import datetime

# Setup project root in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from scripts.deal_sniper.olx_scraper import fetch_olx_deals
from scripts.deal_sniper.allegro_scraper import fetch_allegro_deals
from scripts.deal_sniper.notifier import notify_deal, Colors

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("deal_sniper")

def load_config() -> dict:
    cfg_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
    with open(cfg_path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_seen_deals(history_path: str) -> set:
    if os.path.exists(history_path):
        try:
            with open(history_path, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except Exception:
            return set()
    return set()

def save_seen_deals(history_path: str, seen: set):
    try:
        # Keep up to 2000 most recent IDs
        to_save = list(seen)[-2000:]
        with open(history_path, "w", encoding="utf-8") as f:
            json.dump(to_save, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving seen deals: {e}")

def run_scan(config: dict, seen_ids: set, is_initial: bool = False, notify: bool = True, ignore_seen: bool = False) -> list[dict]:
    all_new_deals = []
    targets = config.get("search_targets", {})
    safety = config.get("safety_filters", {})
    
    for t_key, t_cfg in targets.items():
        if not t_cfg.get("enabled", True):
            continue
        
        # 1. Fetch from OLX
        olx_deals = fetch_olx_deals(t_key, t_cfg, safety)
        
        # 2. Fetch from Allegro Lokalnie
        allegro_deals = fetch_allegro_deals(t_key, t_cfg, safety)
        
        combined = olx_deals + allegro_deals
        
        for deal in combined:
            deal_id = deal["id"]
            if ignore_seen:
                all_new_deals.append(deal)
                seen_ids.add(deal_id)
            elif deal_id not in seen_ids:
                seen_ids.add(deal_id)
                all_new_deals.append(deal)
                if notify and not is_initial:
                    notify_deal(deal, config)
                    
    return all_new_deals

def print_summary_table(deals: list[dict]):
    if not deals:
        print(f"\n{Colors.WARNING}Brak ofert spełniających podane kryteria.{Colors.END}\n")
        return
        
    deals.sort(key=lambda x: (not x.get("is_hot", False), x["price"]))
    
    print("\n" + "=" * 90)
    print(f" {Colors.BOLD}ZNALEZIONE OFERTY (Posortowane od najbardziej opłacalnych){Colors.END}")
    print("=" * 90)
    print(f"{'STATUS':<12} | {'CENA':<9} | {'BAT':<7} | {'MODEL':<18} | {'PORTAL':<10} | {'MIASTO':<15}")
    print("-" * 90)
    
    for d in deals:
        status = f"{Colors.WARNING}🔥 OKAZJA{Colors.END}" if d.get("is_hot") else f"{Colors.GREEN}STANDARD{Colors.END}"
        price = f"{d['price']} zł"
        bat = f"{d['battery']}%" if d.get("battery") else "-"
        portal = d.get("source", "")
        model = d.get("model_name", "")[:18]
        city = (d.get("location", "").split(",")[0])[:15]
        
        print(f"{status:<21} | {price:<9} | {bat:<7} | {model:<18} | {portal:<10} | {city:<15}")
        print(f"   ↳ {d['title']}")
        print(f"   🔗 {Colors.BLUE}{d['url']}{Colors.END}")
        print("-" * 90)

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description="iPhone 15 Pro Max & 16 Pro Deal Sniper Bot")
    parser.add_argument("--once", action="store_true", help="Wykonaj pojedyncze sprawdzenie i pokaż najlepsze okazje")
    parser.add_argument("--watch", action="store_true", help="Uruchom w trybie ciągłym (nasłuchuj nowych ofert)")
    parser.add_argument("--target", choices=["15pm", "16p", "all"], default="all", help="Wybór modelu do monitorowania")
    parser.add_argument("--safe-only", action="store_true", help="Tylko oferty z Przesyłką OLX (Pakietem Ochronnym) / Allegro")
    parser.add_argument("--min-bat", type=int, help="Minimalna kondycja baterii w procentach (np. 85)")
    parser.add_argument("--max-price-15", type=int, help="Maksymalna cena dla iPhone 15 Pro Max")
    parser.add_argument("--max-price-16", type=int, help="Maksymalna cena dla iPhone 16 Pro")
    parser.add_argument("--interval", type=int, default=45, help="Interwał sprawdzania w sekundach w trybie watch")
    
    args = parser.parse_args()
    
    config = load_config()
    
    # Override settings from CLI
    if args.target == "15pm":
        config["search_targets"]["iphone_15_pro_max"]["enabled"] = True
        config["search_targets"]["iphone_16_pro"]["enabled"] = False
    elif args.target == "16p":
        config["search_targets"]["iphone_15_pro_max"]["enabled"] = False
        config["search_targets"]["iphone_16_pro"]["enabled"] = True
        
    if args.safe_only:
        config["safety_filters"]["require_safe_delivery"] = True
    if args.min_bat is not None:
        config["safety_filters"]["min_battery_percent"] = args.min_bat
    if args.max_price_15:
        config["search_targets"]["iphone_15_pro_max"]["max_price"] = args.max_price_15
    if args.max_price_16:
        config["search_targets"]["iphone_16_pro"]["max_price"] = args.max_price_16
        
    hist_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seen_deals.json")
    seen_ids = load_seen_deals(hist_file)
    
    # Header banner
    print(f"{Colors.BOLD}{Colors.HEADER}===================================================={Colors.END}")
    print(f"{Colors.BOLD}{Colors.HEADER}   🎯 iPHONE DEAL SNIPER (15 PRO MAX & 16 PRO)    {Colors.END}")
    print(f"{Colors.BOLD}{Colors.HEADER}===================================================={Colors.END}")
    print(f" Portale:  OLX (API + Pakiet Ochronny) & Allegro Lokalnie")
    if config['search_targets']['iphone_15_pro_max']['enabled']:
        t = config['search_targets']['iphone_15_pro_max']
        print(f" 📱 {t['name']}: {t['min_price']} - {t['max_price']} zł (Okazja <= {t['deal_price_threshold']} zł)")
    if config['search_targets']['iphone_16_pro']['enabled']:
        t = config['search_targets']['iphone_16_pro']
        print(f" 📱 {t['name']}: {t['min_price']} - {t['max_price']} zł (Okazja <= {t['deal_price_threshold']} zł)")
    print(f" 🛡️  Tylko bezpieczna dostawa: {'TAK' if config['safety_filters'].get('require_safe_delivery') else 'NIE (wszystkie)'}")
    print(f" 🔋 Min. bateria: {config['safety_filters'].get('min_battery_percent')}%")
    print(f" 🔔 Telegram: {'WŁĄCZONY' if config['notifications']['telegram'].get('enabled') else 'Wyłączony (edytuj config.json)'}")
    print("=" * 52 + "\n")
    
    if not args.watch:
        # Default: scan and print summary
        print("🔍 Przeszukiwanie aktualnych ofert na rynku...")
        deals = run_scan(config, seen_ids, is_initial=False, notify=False, ignore_seen=True)
        save_seen_deals(hist_file, seen_ids)
        print_summary_table(deals)
        print(f"\n💡 Wskazówka: Aby bot działał w tle i na bieżąco wysyłał alerty o nowych ofertach:")
        print(f"   python scripts/deal_sniper/sniper.py --watch\n")
        return
        
    # WATCH MODE
    print(f"🚀 Uruchomiono tryb nasłuchiwania w czasie rzeczywistym!")
    print(f"⏱️  Sprawdzanie co ~{args.interval} sekund. Naciśnij Ctrl+C, aby zatrzymać.\n")
    
    # Initial scan without notifications to seed seen_ids if empty
    if not seen_ids:
        print("⏳ Zapisywanie stanu początkowego bazy ofert...")
        initial_deals = run_scan(config, seen_ids, is_initial=True, notify=False)
        save_seen_deals(hist_file, seen_ids)
        print(f"✅ Zapisano {len(seen_ids)} aktualnych ofert. Teraz nasłuchuję TYLKO NOWYCH!\n")
        
    try:
        while True:
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] Sprawdzanie nowych ofert...", end="\r", flush=True)
            
            new_deals = run_scan(config, seen_ids, is_initial=False, notify=True)
            if new_deals:
                print(f"\n[{timestamp}] 🎉 Znaleziono {len(new_deals)} NOWYCH OFERT!")
                save_seen_deals(hist_file, seen_ids)
            
            # Randomized jitter (+/- 5s)
            sleep_time = args.interval + random.uniform(-4, 6)
            time.sleep(max(15, sleep_time))
            
    except KeyboardInterrupt:
        print("\n\n🛑 Zatrzymano Deal Snipera. Do zobaczenia!")

if __name__ == "__main__":
    main()
