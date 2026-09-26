import re
import logging
from bs4 import BeautifulSoup
from curl_cffi import requests
from scripts.deal_sniper.olx_scraper import extract_battery_percent, matches_target_model

logger = logging.getLogger("deal_sniper.allegro")

def fetch_allegro_deals(target_key: str, target_config: dict, safety_config: dict) -> list[dict]:
    deals = []
    query = target_config.get("allegro_query", "iphone-15-pro-max")
    min_price = target_config.get("min_price", 1800)
    max_price = target_config.get("max_price", 3500)
    deal_threshold = target_config.get("deal_price_threshold", 2600)
    
    url = f"https://allegrolokalnie.pl/oferty/q/{query}?price_from={min_price}&price_to={max_price}"
    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    
    try:
        resp = requests.get(url, headers=headers, impersonate="chrome124", timeout=12)
        if resp.status_code != 200:
            logger.warning(f"Allegro Lokalnie returned status {resp.status_code}")
            return []
        
        soup = BeautifulSoup(resp.text, "html.parser")
        articles = soup.select("article")
        
        title_blacklist = safety_config.get("title_blacklist", [])
        min_battery = safety_config.get("min_battery_percent", 80)
        
        for art in articles:
            # Title
            title_el = art.select_one("h3, [class*='title']")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            title_lower = title.lower()
            
            # Model match
            if not matches_target_model(title, target_key):
                continue
            
            # Blacklist
            if any(bad in title_lower for bad in title_blacklist):
                continue
            
            # Link
            link_el = art.select_one("a[href]")
            if not link_el:
                continue
            raw_url = link_el["href"]
            deal_url = ("https://allegrolokalnie.pl" + raw_url) if not raw_url.startswith("http") else raw_url
            
            # Price
            price_el = art.select_one("[class*='price']")
            if not price_el:
                continue
            price_text = price_el.get_text(strip=True).replace("\xa0", "").replace(" ", "")
            # extract numeric price
            m_price = re.search(r'(\d+[\d\s]*)(?:zł|pln)?', price_text, re.IGNORECASE)
            if not m_price:
                continue
            clean_digits = re.sub(r'[^\d]', '', m_price.group(1))
            if not clean_digits:
                continue
            price_val = int(clean_digits)
            if price_val < min_price or price_val > max_price:
                continue
            
            # Battery
            battery = extract_battery_percent(title)
            if battery is not None and min_battery and battery < min_battery:
                continue
            
            # Location / delivery info if present
            loc_el = art.select_one("[class*='location'], [class*='city']")
            location = loc_el.get_text(strip=True) if loc_el else "Allegro Lokalnie"
            
            # Smart / Safe delivery indicator
            has_smart = bool(art.select_one("[class*='smart'], [aria-label*='Smart']"))
            
            # Offer ID from URL
            offer_id_match = re.search(r'/oferta/([^/?#]+)', deal_url)
            offer_id = offer_id_match.group(1) if offer_id_match else deal_url
            
            is_hot = price_val <= deal_threshold
            
            deals.append({
                "source": "Allegro Lokalnie",
                "id": f"allegro_{offer_id}",
                "target_key": target_key,
                "model_name": target_config.get("name", target_key),
                "title": title,
                "price": price_val,
                "currency": "PLN",
                "battery": battery,
                "has_delivery": True,  # Allegro Lokalnie has buyer protection / Allegro Protect
                "location": location,
                "created_time": None,
                "url": deal_url,
                "is_hot": is_hot,
            })
            
    except Exception as e:
        logger.error(f"Error fetching Allegro Lokalnie offers: {e}")
        
    return deals
