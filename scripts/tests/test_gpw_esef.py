import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / 'ops'))
from gpw_esef import parse_xhtml, parse_package
from gpw_report_sources import annual_sources

FIXTURE = (Path(__file__).parent / 'fixtures/xtb-2025-esef-facts.xhtml').read_bytes()
LEI = '259400AVUPSABLEXNT19'


class ESEFTests(unittest.TestCase):
    def test_primary_issuer_index_preserves_actual_publication_date(self):
        html=(Path(__file__).parent/'fixtures/xtb-report-index.html').read_text(encoding='utf8')
        reports=annual_sources(html,'https://ir.xtb.com/raporty/raporty-okresowe/')
        self.assertEqual(len(reports),1)
        self.assertEqual(reports[0]['report_period_end'],'2025-12-31')
        self.assertEqual(reports[0]['publication_date'],'2026-03-20')
        self.assertEqual(reports[0]['report_page_url'],'https://ir.xtb.com/raport-okresowy/skonsolidowany-raport-roczny-za-2025-rok/')

    def test_real_scaled_consolidated_facts_and_comparatives(self):
        reports = parse_xhtml(FIXTURE, LEI)
        self.assertEqual([r['period_end'] for r in reports], ['2024-12-31', '2025-12-31'])
        current = reports[-1]
        self.assertEqual(current['currency'], 'PLN')
        self.assertEqual(current['metrics']['revenue']['value'], '2146056000')
        self.assertEqual(current['metrics']['net_profit']['value'], '644199000')
        self.assertEqual(current['metrics']['operating_cash_flow']['value'], '614344000')
        self.assertEqual(current['metrics']['assets']['value'], '9086667000')
        self.assertGreater(len(current['metrics']['net_profit']['fact_ids']), 1)

    def test_wrong_entity_rejected(self):
        with self.assertRaises(ValueError):
            parse_xhtml(FIXTURE, '00000000000000000000')

    def test_conflicting_duplicate_not_selected_arbitrarily(self):
        with self.assertRaises(ValueError):
            parse_xhtml(FIXTURE.replace(b'644 199', b'644 198', 1), LEI)

    def test_unknown_numeric_transform_not_guessed(self):
        with self.assertRaises(ValueError):
            parse_xhtml(FIXTURE.replace(b'num-comma-decimal', b'unknown'), LEI)

    def test_namespace_spoof_not_accepted_as_ifrs(self):
        with self.assertRaises(ValueError):
            parse_xhtml(FIXTURE.replace(b'https://xbrl.ifrs.org/taxonomy/', b'https://example.com/taxonomy/'), LEI)

    def test_forbidden_entity_expansion(self):
        with self.assertRaises(ValueError):
            parse_xhtml(b'<!DOCTYPE html [<!ENTITY sample "123">]>' + FIXTURE, LEI)

    def test_nested_report_package(self):
        import io
        import zipfile
        def archive(name, data):
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, 'w') as z:
                z.writestr(name, data)
            return buf.getvalue()
        reports = parse_package(archive('financial.xbri', archive('reports/annual.xhtml', FIXTURE)), LEI)
        self.assertEqual(len(reports), 2)
        self.assertEqual(reports[-1]['document_member'], 'financial.xbri!reports/annual.xhtml')

    def test_knf_rap_wrapper_contains_financial_attachment(self):
        import io
        import gzip
        import zipfile
        def archive(name, data, legacy_form=False):
            buf=io.BytesIO()
            with zipfile.ZipFile(buf,'w') as z:
                z.writestr(name,data)
                if legacy_form:
                    z.writestr('E-forms/template.zip',b'\x1f\x8b\x08legacy gzip form')
            return buf.getvalue()
        raw=archive('SRR_2025.rap', archive('Attachment/annual.xbri', gzip.compress(archive('reports/annual.xhtml',FIXTURE)),True))
        reports=parse_package(raw,LEI)
        self.assertEqual(reports[-1]['metrics']['net_profit']['value'],'644199000')
        self.assertEqual(reports[-1]['document_member'],'SRR_2025.rap!Attachment/annual.xbri!reports/annual.xhtml')

    def test_unread_pdf_does_not_consume_financial_expansion_budget(self):
        import io
        import zipfile
        buf=io.BytesIO()
        with zipfile.ZipFile(buf,'w',compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('presentation.pdf', b'0'*128_000_001)
            archive.writestr('annual.xhtml',FIXTURE)
        self.assertEqual(len(parse_package(buf.getvalue(),LEI)),2)

    def test_oversized_financial_archive_still_rejected_before_reading(self):
        import io
        import zipfile
        buf=io.BytesIO()
        with zipfile.ZipFile(buf,'w',compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('oversized.xbri',b'0'*128_000_001)
        with self.assertRaisesRegex(ValueError,'Oversized expanded'):
            parse_package(buf.getvalue(),LEI)


if __name__ == '__main__':
    unittest.main()
