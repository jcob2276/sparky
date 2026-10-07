import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / 'ops'))
from gpw_oam import parse_page, search_url, discover_annual, resolve_package

FIXTURES = Path(__file__).parent / 'fixtures'
DAY = (FIXTURES / 'knf-oam-annual-day.html').read_text(encoding='utf8')
SEARCH = (FIXTURES / 'knf-oam-xtb-search.html').read_text(encoding='utf8')


class OAMTests(unittest.TestCase):
    def test_jnlp_is_only_metadata_for_exact_official_zip(self):
        jnlp=(FIXTURES/'knf-oam-xtb-package.jnlp').read_bytes()
        source='https://moam.knf.gov.pl/moam.nsf/AppForm?readForm&rok=2026&kat=20260320&plik=i3d7gs33o1_Raport.zip'
        self.assertEqual(resolve_package(jnlp, source), 'https://moam.knf.gov.pl/mOAM/2026/20260320/i3d7gs33o1_Raport.zip')
        with self.assertRaises(ValueError):
            resolve_package(jnlp.replace(b'/mOAM/2026/', b'/mOAM/2025/'), source)
        with self.assertRaises(ValueError):
            resolve_package(jnlp.replace(b'https://moam.knf.gov.pl/mOAM/', b'https://example.com/mOAM/'), source)

    def test_actual_index_rows_dates_and_consolidation(self):
        page = parse_page(DAY)
        self.assertEqual(len(page['reports']), 20)
        torpol = next(r for r in page['reports'] if r['report_type'] == 'SRR')
        self.assertEqual(torpol['issuer_name'], 'TORPOL SPÓŁKA AKCYJNA')
        self.assertEqual(torpol['publication_date'], '2026-03-20')
        self.assertTrue(torpol['source_url'].endswith('plik=ancmusuaj1_Raport.zip'))
        self.assertEqual(len(page['pages']), 5)

    def test_actual_search_has_all_history_pages(self):
        page = parse_page(SEARCH)
        self.assertEqual(len(page['pages']), 8)
        self.assertIn('start=161', page['pages'][-1])
        self.assertIn('Value=XTB', page['pages'][0])

    def test_cross_host_attachment_rejected(self):
        with self.assertRaises(ValueError):
            parse_page(DAY.replace('href="AppForm?', 'href="https://example.com/AppForm?', 1))

    def test_attachment_date_cannot_disagree_with_row(self):
        with self.assertRaises(ValueError):
            parse_page(DAY.replace('kat=20260320', 'kat=20260319', 1))

    def test_encoded_search_cannot_inject_query(self):
        url = search_url('A&B S.A.')
        self.assertIn('Value=A%26B+S.A.', url)

    def test_discovery_follows_actual_pagination_and_exact_entity(self):
        first = search_url('TORPOL')
        calls = []
        def fetch(url):
            calls.append(url)
            return DAY if url == first else '<html></html>'
        reports = discover_annual(fetch, 'TORPOL', 'TORPOL SPÓŁKA AKCYJNA')
        self.assertEqual(len(reports), 1)
        self.assertEqual(reports[0]['report_type'], 'SRR')
        self.assertEqual(len(calls), 6)
        self.assertEqual(discover_annual(fetch, 'TORPOL', 'TORPOL OTHER'), [])
        self.assertEqual(len(discover_annual(fetch,'TORPOL','Torpol Spółka Akcyjna')),1)
        self.assertEqual(len(discover_annual(fetch,'TORPOL','"TORPOL" SPÓŁKA AKCYJNA')),1)

    def test_latest_annual_does_not_scan_older_history(self):
        calls=[]
        def fetch(url):
            calls.append(url)
            return DAY
        reports=discover_annual(fetch,'TORPOL','TORPOL SPÓŁKA AKCYJNA',latest_only=True)
        self.assertEqual(len(reports),1)
        self.assertEqual(len(calls),1)


if __name__ == '__main__':
    unittest.main()
