"""Daily price acquisition for the existing Sparky queue worker."""
import json
import os
import time
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import psycopg
from psycopg.rows import dict_row
from finance_snapshots import build_snapshot

def fetch_prices(payload, dsn):
    """Dzienne zamkniecia pozycji z finance_holdings (yfinance) -> finance_price_history + finance_portfolio_daily.

    payload: days_back (1-2000, domyslnie 5). Idempotentne (upsert po ticker+data). Nie rusza finance_holdings.
    Waluta pozycji i kurs do PLN (z tego samego zrodla) sa zapisywane razem z cena; GBp/GBX liczone jako pensy.
    Biezace ilosci zapisywane sa na dzien obserwacji w Warszawie. Brak ceny blokuje caly snapshot.
    """
    import yfinance as yf  # import leniwy: ciezka biblioteka, potrzebna tylko temu zadaniu

    cache_dir = os.getenv("YF_CACHE", "/var/lib/sparky-archive/yf-cache")  # zapisywalny mimo ProtectHome
    os.makedirs(cache_dir, exist_ok=True)
    yf.set_tz_cache_location(cache_dir)

    days_back = max(1, min(int(payload.get("days_back", 5)), 2000))
    start = (datetime.now(timezone.utc) - timedelta(days=days_back + 4)).date()
    with psycopg.connect(dsn, autocommit=False, row_factory=dict_row, connect_timeout=15) as c:
        holdings = c.execute("select user_id, ticker, asset_class, quantity from finance_holdings "
                             "").fetchall()
        tickers = sorted({h["ticker"] for h in holdings if h["ticker"]})
        series, fx_cache, report = {}, {}, {}

        def fx_series(ccy):
            if ccy == "PLN":
                return None
            if ccy not in fx_cache:
                h = yf.Ticker(f"{ccy}PLN=X").history(start=start.isoformat(), auto_adjust=False)
                if h.empty:
                    raise RuntimeError(f"brak kursu {ccy}/PLN")
                s = h["Close"].copy()
                s.index = [d.date() for d in s.index]
                fx_cache[ccy] = s
            return fx_cache[ccy]

        for t in tickers:
            try:
                tk = yf.Ticker(t)
                hist = tk.history(start=start.isoformat(), auto_adjust=False)
                if hist.empty:
                    report[t] = "pusto"
                    continue
                raw_ccy = (tk.history_metadata or {}).get("currency") or "PLN"
                scale = 0.01 if raw_ccy in ("GBp", "GBX") else 1.0
                ccy = "GBP" if raw_ccy in ("GBp", "GBX") else raw_ccy.upper()
                fx = fx_series(ccy)
                rows = []
                for idx, row in hist.iterrows():
                    d = idx.date()
                    close = float(row["Close"]) * scale
                    if fx is None:
                        rate = 1.0
                    else:
                        prev = [v for k, v in fx.items() if k <= d]
                        if not prev:
                            continue
                        rate = float(prev[-1])
                    rows.append((t, d, round(close, 6), ccy, round(rate, 6), round(close * rate, 4)))
                for r in rows:
                    c.execute("insert into finance_price_history(ticker, price_date, close, currency, fx_to_pln, close_pln) "
                              "values (%s,%s,%s,%s,%s,%s) on conflict (ticker, price_date) do update set "
                              "close=excluded.close, currency=excluded.currency, fx_to_pln=excluded.fx_to_pln, "
                              "close_pln=excluded.close_pln, fetched_at=now()", r)
                series[t] = {r[1]: r[5] for r in rows}
                report[t] = f"{len(rows)} dni, {ccy}"
            except Exception as e:  # noqa: BLE001
                report[t] = f"blad: {str(e)[:80]}"
            time.sleep(1)

        observed_on = datetime.now(ZoneInfo("Europe/Warsaw")).date()
        # Keep observing users who sold/removed their final position.
        previous_users = c.execute("select distinct user_id from finance_portfolio_daily").fetchall()
        by_user = {row["user_id"]: [] for row in previous_users}
        for holding in holdings:
            by_user.setdefault(holding["user_id"], []).append(holding)
        written = 0
        skipped = []
        for uid, items in by_user.items():
            snapshot = build_snapshot(items, series, observed_on)
            if snapshot is None:
                skipped.append(str(uid))
                continue
            c.execute("insert into finance_portfolio_daily(user_id, as_of, total_pln, by_class, positions) "
                      "values (%s,%s,%s,%s,%s) on conflict (user_id, as_of) do update set total_pln=excluded.total_pln, "
                      "by_class=excluded.by_class, positions=excluded.positions, computed_at=now()",
                      (uid, snapshot['as_of'], snapshot['total_pln'],
                       json.dumps(snapshot['by_class']), json.dumps(snapshot['positions'])))
            written += 1
        c.commit()
    return {"tickers": len(tickers), "report": report, "portfolio_rows": written, "as_of": observed_on.isoformat(), "skipped_incomplete": skipped}
