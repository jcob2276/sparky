import copy
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).parents[1]/'ops'))
from gpw_issuer_identity import resolve_issuer

FIXTURES=Path(__file__).parent/'fixtures'
RECORD=json.loads((FIXTURES/'gleif-xtb.json').read_text())
ISINS=json.loads((FIXTURES/'gleif-xtb-isins.json').read_text())
COMPANY={'isin':'PLXTRDM00011','ticker':'XTB','name':'old registry name'}


class IdentityTests(unittest.TestCase):
    def resolve(self,record=RECORD,isins=ISINS):
        def fetch(url):
            return isins if '/isins?' in url else record
        return resolve_issuer(fetch,COMPANY)

    def test_official_isin_relation_overrides_stale_registry_name(self):
        issuer=self.resolve()
        self.assertEqual(issuer['lei'],'259400AVUPSABLEXNT19')
        self.assertEqual(issuer['oam_name'],'XTB SPÓŁKA AKCYJNA')
        self.assertEqual(issuer['isin'],COMPANY['isin'])

    def test_no_name_based_fallback_without_mapping(self):
        with self.assertRaises(ValueError):
            self.resolve({'data':[]})

    def test_ambiguous_identity_rejected(self):
        record=copy.deepcopy(RECORD)
        record['data'].append(record['data'][0])
        with self.assertRaises(ValueError):
            self.resolve(record)

    def test_filter_result_must_have_exact_confirming_isin(self):
        isins=copy.deepcopy(ISINS)
        isins['data'][0]['attributes']['isin']='PLOPTTC00011'
        with self.assertRaises(ValueError):
            self.resolve(isins=isins)

    def test_pagination_cannot_leave_official_api(self):
        isins=copy.deepcopy(ISINS)
        isins['links']['next']='https://example.com/next'
        with self.assertRaises(ValueError):
            self.resolve(isins=isins)


if __name__=='__main__':
    unittest.main()
