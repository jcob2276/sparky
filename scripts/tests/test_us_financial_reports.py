import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'ops'))
from us_financial_reports import parse_reports


def documents():
    accession = '0000002488-26-000123'
    def fact(value, start=None):
        row = dict(val=value, end='2026-06-27', accn=accession, filed='2026-08-05', form='10-Q')
        if start:
            row['start'] = start
        return row
    facts = {'cik': 2488, 'facts': {'us-gaap': {
        'NetIncomeLoss': {'units': {'USD': [fact(3680000000, '2025-12-28'), fact(2297000000, '2026-03-29')]}},
        'Assets': {'units': {'USD': [fact(100)]}},
        'StockholdersEquity': {'units': {'USD': [fact(50)]}},
        'RevenueFromContractWithCustomerExcludingAssessedTax': {'units': {'USD': [fact(200, '2025-12-28')]}},
        'NetCashProvidedByUsedInOperatingActivities': {'units': {'USD': [fact(20, '2025-12-28')]}},
    }}}
    filings = {'accessionNumber': [accession], 'form': ['10-Q'], 'reportDate': ['2026-06-27'],
               'filingDate': ['2026-08-05'], 'primaryDocument': ['amd-20260627.htm']}
    return facts, filings


class Reports(unittest.TestCase):
    def test_annual_report_uses_fiscal_period_not_calendar_year(self):
        facts, filings = documents()
        filings['form'] = ['10-K']
        facts['facts']['us-gaap']['NetIncomeLoss']['units']['USD'] = facts['facts']['us-gaap']['NetIncomeLoss']['units']['USD'][:1]
        for concept in facts['facts']['us-gaap'].values():
            for row in concept['units']['USD']:
                row['form'] = '10-K'
                if 'start' in row:
                    row['start'] = '2025-06-29'
        report = parse_reports(facts, filings, expected_cik=2488)[0]
        self.assertEqual(report['period_start'], '2025-06-29')

    def test_never_uses_facts_from_other_accession(self):
        facts, filings = documents()
        for row in facts['facts']['us-gaap']['Assets']['units']['USD']:
            row['accn'] = '0000002488-26-000076'
        self.assertEqual(parse_reports(facts, filings, expected_cik=2488), [])

    def test_preserves_ytd_period_and_official_accession(self):
        reports = parse_reports(*documents(), expected_cik=2488)
        self.assertEqual(len(reports), 1)
        report = reports[0]
        self.assertEqual(report['period_start'], '2025-12-28')
        self.assertEqual(report['metrics']['net_profit']['value'], '3680000000')
        self.assertEqual(report['metrics']['net_profit']['concept'], 'us-gaap:NetIncomeLoss')
        self.assertEqual(report['source_url'], 'https://www.sec.gov/Archives/edgar/data/2488/000000248826000123/amd-20260627.htm')

    def test_never_mixes_quarter_cash_flow_with_ytd_income(self):
        facts, filings = documents()
        facts['facts']['us-gaap']['NetCashProvidedByUsedInOperatingActivities']['units']['USD'][0]['start'] = '2026-03-29'
        report = parse_reports(facts, filings, expected_cik=2488)[0]
        self.assertNotIn('operating_cash_flow', report['metrics'])

    def test_conflicting_duplicate_is_not_silently_selected(self):
        facts, filings = documents()
        rows = facts['facts']['us-gaap']['Assets']['units']['USD']
        rows.append({**rows[0], 'val': 999})
        self.assertEqual(parse_reports(facts, filings, expected_cik=2488), [])

    def test_rejects_wrong_issuer_and_document_path(self):
        facts, filings = documents()
        with self.assertRaises(ValueError):
            parse_reports(facts, filings, expected_cik=999)
        filings['primaryDocument'][0] = '../other.htm'
        with self.assertRaises(ValueError):
            parse_reports(facts, filings, expected_cik=2488)

    def test_wrong_currency_or_comparative_period_is_missing(self):
        facts, filings = documents()
        facts['facts']['us-gaap']['StockholdersEquity']['units'] = {'EUR': []}
        self.assertEqual(parse_reports(facts, filings, expected_cik=2488), [])
        facts, filings = documents()
        facts['facts']['us-gaap']['NetIncomeLoss']['units']['USD'][0]['end'] = '2025-06-27'
        report = parse_reports(facts, filings, expected_cik=2488)[0]
        self.assertEqual(report['period_start'], '2026-03-29')


if __name__ == '__main__':
    unittest.main()
