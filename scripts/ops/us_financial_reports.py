"""Compact entity-wide SEC facts, bound to the actual filing and reporting period."""
import math
import re
from datetime import date

CONCEPTS = {
    'net_profit': ['us-gaap:NetIncomeLoss', 'us-gaap:ProfitLoss', 'ifrs-full:ProfitLoss'],
    'revenue': ['us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax',
                'us-gaap:RevenueFromContractWithCustomerIncludingAssessedTax', 'us-gaap:Revenues',
                'us-gaap:SalesRevenueNet', 'ifrs-full:Revenue'],
    'assets': ['us-gaap:Assets', 'ifrs-full:Assets'],
    'equity': ['us-gaap:StockholdersEquity', 'us-gaap:StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest',
               'ifrs-full:Equity'],
    'operating_cash_flow': ['us-gaap:NetCashProvidedByUsedInOperatingActivities',
                            'ifrs-full:CashFlowsFromUsedInOperatingActivities'],
    'ppe_purchases': ['us-gaap:PaymentsToAcquirePropertyPlantAndEquipment',
                      'ifrs-full:PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities'],
}
INSTANT = {'assets', 'equity'}
FORMS = {'10-K', '10-K/A', '10-Q', '10-Q/A', '20-F', '20-F/A', '40-F', '40-F/A'}


def parse_reports(companyfacts, filings, expected_cik):
    if int(companyfacts['cik']) != int(expected_cik):
        raise ValueError('SEC companyfacts issuer does not match registry CIK')
    lengths = {len(filings.get(key, [])) for key in
               ('accessionNumber', 'form', 'reportDate', 'filingDate', 'primaryDocument')}
    if len(lengths) != 1:
        raise ValueError('Malformed SEC submissions parallel arrays')
    reports = []
    for index, accession in enumerate(filings['accessionNumber']):
        form, end, filed, document = [filings[key][index] for key in
                                      ('form', 'reportDate', 'filingDate', 'primaryDocument')]
        if form not in FORMS or not end or end < '2024-01-01':
            continue
        date.fromisoformat(end)
        date.fromisoformat(filed)
        if filed < end or not re.fullmatch(r'\d{10}-\d{2}-\d{6}', accession):
            raise ValueError('Invalid filing dates or accession')
        if not re.fullmatch(r'[A-Za-z0-9_.-]+\.(?:htm|html|txt)', document) or '..' in document:
            raise ValueError('Unsafe SEC primary document path')
        candidates = {}
        for metric, concepts in CONCEPTS.items():
            for concept in concepts:
                taxonomy, name = concept.split(':')
                units = companyfacts.get('facts', {}).get(taxonomy, {}).get(name, {}).get('units', {})
                for currency, rows in units.items():
                    if not re.fullmatch(r'[A-Z]{3}', currency):
                        continue
                    for row in rows:
                        value = row.get('val')
                        if (row.get('accn') != accession or row.get('end') != end or row.get('filed') != filed
                                or row.get('form') != form or isinstance(value, bool)
                                or not isinstance(value, (int, float)) or not math.isfinite(value)):
                            continue
                        start = row.get('start')
                        if metric in INSTANT:
                            if start:
                                continue
                        else:
                            if not start:
                                continue
                            days = (date.fromisoformat(end) - date.fromisoformat(start)).days
                            annual = form.startswith(('10-K', '20-F', '40-F'))
                            if not (300 <= days <= 400 if annual else 60 <= days <= 330):
                                continue
                        candidates.setdefault((metric, currency, start), []).append((concept, value))
        # Select the longest reported income period. This is YTD for most 10-Qs;
        # no subtraction or relabeling as a standalone calendar quarter.
        eligible = [(currency, start) for metric, currency, start in candidates if metric == 'net_profit'
                    and ('assets', currency, None) in candidates and ('equity', currency, None) in candidates]
        currencies = {currency for currency, _ in eligible}
        if len(currencies) != 1:
            continue
        currency, start = min(eligible, key=lambda item: item[1])
        metrics = {}
        for metric in CONCEPTS:
            choices = candidates.get((metric, currency, None if metric in INSTANT else start), [])
            # Prefer the first standard concept available; duplicates of that
            # concept must agree. Alternative accounting concepts are not summed.
            if not choices:
                continue
            concept = choices[0][0]
            values = {value for candidate, value in choices if candidate == concept}
            if len(values) == 1:
                metrics[metric] = {'value': str(next(iter(values))), 'concept': concept}
        if not {'net_profit', 'assets', 'equity'} <= metrics.keys():
            continue
        reports.append({'cik': int(expected_cik), 'accession': accession, 'form_type': form,
                        'period_start': start, 'period_end': end, 'publication_date': filed,
                        'currency': currency, 'metrics': metrics,
                        'source_url': f'https://www.sec.gov/Archives/edgar/data/{int(expected_cik)}/{accession.replace("-", "")}/{document}'})
    return sorted(reports, key=lambda row: (row['period_end'], row['publication_date']), reverse=True)
