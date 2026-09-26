import sys
import logging
import json
import urllib.request
import urllib.parse

try:
    import winsound
except ImportError:
    winsound = None

logger = logging.getLogger("deal_sniper.notifier")

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'

def play_alert_sound():
    if winsound:
        try:
            winsound.Beep(1046, 150) # C6
            winsound.Beep(1318, 150) # E6
            winsound.Beep(1568, 250) # G6
        except Exception:
            try:
                winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
            except Exception:
                pass

def print_deal_card(deal: dict):
    is_hot = deal.get("is_hot", False)
    badge = f"{Colors.WARNING}{Colors.BOLD}🔥 [MEGA OKAZJA]{Colors.END}" if is_hot else f"{Colors.GREEN}[NOWA OFERTA]{Colors.END}"
    
    price_str = f"{Colors.BOLD}{deal['price']} zł{Colors.END}"
    bat_val = deal.get("battery")
    bat_str = f"{Colors.CYAN}{bat_val}%{Colors.END}" if bat_val else f"{Colors.WARNING}Brak danych{Colors.END}"
    
    deliv_icon = "🛡️ Pakiet Ochronny / Bezpieczna Dostawa" if deal.get("has_delivery") else "⚠️ Odbiór osobisty / bez ochrony"
    
    print("\n" + "=" * 65)
    print(f" {badge}  {Colors.BOLD}{deal['model_name']}{Colors.END} ({deal['source']})")
    print(f" 💰 Cena:    {price_str}")
    print(f" 🔋 Bateria: {bat_str}")
    print(f" 📍 Miasto:  {deal.get('location', 'Polska')}")
    print(f" {deliv_icon}")
    print(f" 📝 Tytuł:   {deal['title']}")
    print(f" 🔗 Link:    {Colors.UNDERLINE}{Colors.BLUE}{deal['url']}{Colors.END}")
    print("=" * 65)

def send_telegram(deal: dict, tg_config: dict):
    if not tg_config or not tg_config.get("enabled"):
        return
    token = tg_config.get("bot_token")
    chat_id = tg_config.get("chat_id")
    if not token or not chat_id:
        return
    
    is_hot = deal.get("is_hot", False)
    header = "🔥 *MEGA OKAZJA!*" if is_hot else "📱 *Nowa oferta!*"
    bat_str = f"{deal['battery']}%" if deal.get("battery") else "Brak info"
    deliv = "🛡️ *Pakiet Ochronny / Dostawa*" if deal.get("has_delivery") else "⚠️ *Odbiór osobisty*"
    
    # Safe text escaping for HTML
    title = deal['title'].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    source = deal['source']
    price = deal['price']
    model = deal['model_name']
    loc = deal.get('location', 'Polska')
    url = deal['url']
    
    msg_html = (
        f"{'🔥 <b>MEGA OKAZJA!</b>' if is_hot else '📱 <b>Nowa oferta!</b>'}\n\n"
        f"<b>Model:</b> {model} ({source})\n"
        f"<b>Cena:</b> <b>{price} zł</b>\n"
        f"<b>Kondycja baterii:</b> {bat_str}\n"
        f"<b>Lokalizacja:</b> {loc}\n"
        f"<b>Bezpieczeństwo:</b> {deliv}\n\n"
        f"<b>Tytuł:</b> {title}\n\n"
        f"👉 <a href=\"{url}\">KLIKNIJ TUTAJ ABY ZOBACZYĆ OFERTĘ</a>"
    )
    
    post_data = urllib.parse.urlencode({
        "chat_id": chat_id,
        "text": msg_html,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    }).encode("utf-8")
    
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=post_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            pass
    except Exception as e:
        logger.error(f"Failed to send Telegram notification: {e}")

def send_discord(deal: dict, dc_config: dict):
    if not dc_config or not dc_config.get("enabled"):
        return
    webhook_url = dc_config.get("webhook_url")
    if not webhook_url:
        return
    
    is_hot = deal.get("is_hot", False)
    bat_str = f"{deal['battery']}%" if deal.get("battery") else "Brak info"
    deliv = "🛡️ Pakiet Ochronny / Dostawa" if deal.get("has_delivery") else "⚠️ Odbiór osobisty"
    color = 16728135 if is_hot else 5763719 # Red or Green
    
    payload = {
        "embeds": [{
            "title": f"{'🔥 MEGA OKAZJA: ' if is_hot else ''}{deal['model_name']} - {deal['price']} zł",
            "url": deal['url'],
            "description": f"**{deal['title']}**",
            "color": color,
            "fields": [
                {"name": "💰 Cena", "value": f"{deal['price']} PLN", "inline": True},
                {"name": "🔋 Bateria", "value": bat_str, "inline": True},
                {"name": "🛡️ Dostawa", "value": deliv, "inline": True},
                {"name": "📍 Lokalizacja", "value": deal.get('location', 'Polska'), "inline": True},
                {"name": "🛒 Portal", "value": deal['source'], "inline": True},
            ],
            "footer": {"text": "iPhone Deal Sniper"}
        }]
    }
    
    req = urllib.request.Request(
        webhook_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "DealSniper/1.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            pass
    except Exception as e:
        logger.error(f"Failed to send Discord webhook: {e}")

def notify_deal(deal: dict, config: dict):
    notif_cfg = config.get("notifications", {})
    
    # 1. Console
    if notif_cfg.get("console", True):
        print_deal_card(deal)
        
    # 2. Sound
    if notif_cfg.get("windows_beep", True) and deal.get("is_hot"):
        play_alert_sound()
        
    # 3. Telegram
    send_telegram(deal, notif_cfg.get("telegram", {}))
    
    # 4. Discord
    send_discord(deal, notif_cfg.get("discord", {}))
