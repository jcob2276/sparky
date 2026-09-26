import re
import logging
from curl_cffi import requests

logger = logging.getLogger("deal_sniper.olx")

OLX_API_URL = "https://www.olx.pl/api/v1/offers/"

def extract_battery_percent(text: str) -> int | None:
    if not text:
        return None
    patterns = [
        r'(?:kondycj[a-z]*|bateri[a-z]*|kond\.|bateria|kondycja)[^\d\n\r]{0,15}?(\d{2,3})\s*%',
        r'(\d{2,3})\s*%\s*(?:kondycj[a-z]*|bateri[a-z]*|kond\.)',
        r'(\d{2,3})\s*%\s*(?:baterii|kondycji)',
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            val = int(m.group(1))
            if 70 <= val <= 100:
                return val
    # Fallback: simple NN%
    matches = re.findall(r'\b(\d{2,3})\s*%', text)
    for m_val in matches:
        val = int(m_val)
        if 75 <= val <= 100:
            return val
    return None

def matches_target_model(title: str, target_key: str) -> bool:
    t = title.lower()
    if target_key == "iphone_15_pro_max":
        # Must have 15 and pro max
        if "15" in t and ("pro max" in t or "promax" in t or "pro-max" in t):
            if "16" in t or "14" in t or "13" in t:
                return False
            return True
        return False
    elif target_key == "iphone_16_pro":
        # Must have 16 and pro, but NOT max, and STRICTLY NOT 128gb
        if "16" in t and ("pro" in t or "pro " in t):
            if "max" in t or "promax" in t or "plus" in t or "17" in t or "15" in t:
                return False
            # Reject 128GB
            if "128" in t or "128gb" in t or "128 gb" in t:
                return False
            return True
        return False
    return True

def fetch_olx_deals(target_key: str, target_config: dict, safety_config: dict) -> list[dict]:
    deals = []
    query = target_config.get("olx_query", "iphone 15 pro max")
    min_price = target_config.get("min_price", 1800)
    max_price = target_config.get("max_price", 3500)
    deal_threshold = target_config.get("deal_price_threshold", 2600)
    
    params = {
        "query": query,
        "category_id": 2298,  # Apple iPhone subcategory
        "filter_float_price:from": min_price,
        "filter_float_price:to": max_price,
        "sort_by": "created_at:desc",
        "limit": 25,
    }
    
    headers = {
        "Accept": "application/json",
        "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    
    try:
        resp = requests.get(OLX_API_URL, params=params, headers=headers, impersonate="chrome124", timeout=12)
        if resp.status_code != 200:
            logger.warning(f"OLX API returned status {resp.status_code}")
            return []
        
        data = resp.json().get("data", [])
        title_blacklist = safety_config.get("title_blacklist", [])
        desc_blacklist = safety_config.get("desc_blacklist", [])
        min_battery = safety_config.get("min_battery_percent", 80)
        require_safe = bool(safety_config.get("require_safe_delivery", False))
        
        for item in data:
            offer_id = str(item.get("id"))
            title = item.get("title", "").strip()
            desc = item.get("description", "").strip()
            title_lower = title.lower()
            desc_lower = desc.lower()
            
            # Model check
            if not matches_target_model(title, target_key):
                continue
            
            # Blacklist filters
            if any(bad in title_lower for bad in title_blacklist):
                continue
            if any(bad in desc_lower for bad in desc_blacklist):
                continue
            
            # Price extraction
            price_val = None
            params_list = item.get("params", [])
            for p in params_list:
                if p.get("key") == "price":
                    pv = p.get("value")
                    if isinstance(pv, dict):
                        price_val = pv.get("value")
                    elif isinstance(pv, (int, float)):
                        price_val = pv
                    break
            
            if not price_val or price_val < min_price or price_val > max_price:
                continue
            
            # Delivery & Protection check
            delivery_mode = item.get("delivery", {}).get("rock", {}).get("mode")
            has_olx_delivery = delivery_mode == "BuyWithDelivery"
            
            if require_safe and not has_olx_delivery:
                continue
            
            # Battery check
            full_text = f"{title} {desc}"
            battery = extract_battery_percent(full_text)
            if battery is not None and min_battery and battery < min_battery:
                continue
            
            # Location
            city = item.get("location", {}).get("city", {}).get("name", "Polska")
            region = item.get("location", {}).get("region", {}).get("name", "")
            
            # Deal Score & Tag
            is_hot_deal = price_val <= deal_threshold
            
            deals.append({
                "source": "OLX",
                "id": f"olx_{offer_id}",
                "target_key": target_key,
                "model_name": target_config.get("name", target_key),
                "title": title,
                "price": price_val,
                "currency": "PLN",
                "battery": battery,
                "has_delivery": has_olx_delivery,
                "location": f"{city}, {region}".strip(", "),
                "created_time": item.get("created_time"),
                "url": item.get("url"),
                "is_hot": is_hot_deal,
            })
            
    except Exception as e:
        logger.error(f"Error fetching OLX offers: {e}")
        
    return deals
