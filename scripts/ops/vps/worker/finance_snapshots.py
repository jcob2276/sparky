"""Complete portfolio observations: current quantities belong to the observation day."""
import math


def build_snapshot(holdings, series, observed_on):
    positions, by_class, total = [], {}, 0.0
    for holding in holdings:
        quantity = float(holding['quantity'] or 0)
        if not math.isfinite(quantity) or quantity < 0:
            return None
        if quantity == 0:
            continue
        prices = series.get(holding['ticker'], {})
        dates = [day for day, price in prices.items()
                 if day <= observed_on and math.isfinite(price) and price > 0]
        if not dates:
            return None
        day = max(dates)
        value = quantity * prices[day]
        total += value
        asset = holding['asset_class']
        by_class[asset] = by_class.get(asset, 0) + value
        positions.append({'ticker': holding['ticker'], 'qty': quantity,
                          'price_date': day.isoformat(), 'value_pln': round(value, 2)})
    return {'as_of': observed_on.isoformat(), 'total_pln': round(total, 2),
            'by_class': {key: round(value, 2) for key, value in by_class.items()},
            'positions': positions}
