"""Daily primary report discovery and compact financial facts, no document storage."""
import hashlib
import json
import os
from datetime import datetime, timezone
from urllib.request import Request, urlopen, build_opener, HTTPRedirectHandler
from gpw_esef import parse_package
from gpw_report_sources import ISSUERS, annual_sources, package_url, primary_url

BASE = os.environ['SUPABASE_URL']
KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
HEADERS = {'apikey': KEY, 'Content-Type': 'application/json'}
if KEY.startswith('eyJ'):
    HEADERS['Authorization'] = 'Bearer ' + KEY


class IssuerRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        primary_url(newurl, req.full_url)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def primary_fetch(url, maximum=50_000_000):
    with build_opener(IssuerRedirect()).open(Request(url, headers={'User-Agent': 'Sparky financial report importer'}), timeout=30) as response:
        primary_url(response.url, url)
        data = response.read(maximum + 1)
        if len(data) > maximum:
            raise ValueError('Oversized issuer response')
        return data


def db(path, payload):
    request = Request(BASE + '/rest/v1/' + path, method='POST',
                      headers={**HEADERS, 'Prefer': 'resolution=merge-duplicates'},
                      data=json.dumps(payload).encode())
    with urlopen(request, timeout=45) as response:
        response.read()


def main():
    checked = datetime.now(timezone.utc).isoformat()
    imported = 0
    latest_publication = None
    errors = []
    for issuer in ISSUERS:
        try:
            index = primary_fetch(issuer['index_url'], 2_000_000).decode('utf8')
            report = annual_sources(index, issuer['index_url'])[0]
            page = primary_fetch(report['report_page_url'], 2_000_000).decode('utf8')
            source = package_url(page, report['report_page_url'])
            raw = primary_fetch(source)
            reports = parse_package(raw, issuer['lei'])
            if max(r['period_end'] for r in reports) != report['report_period_end']:
                raise ValueError('Package period differs from primary issuer index')
            payload = [{**r, **report, 'isin': issuer['isin'], 'source_url': source,
                        'package_sha256': hashlib.sha256(raw).hexdigest(), 'imported_at': checked}
                       for r in reports]
            db('gpw_financial_reports?on_conflict=isin,report_period_end,period_end', payload)
            imported += 1
            latest_publication = max(latest_publication or report['publication_date'], report['publication_date'])
            print(json.dumps({'ticker': issuer['ticker'], 'report': report['report_period_end'], 'periods': len(payload)}))
        except Exception as error:
            errors.append({'ticker': issuer['ticker'], 'error': str(error)})
    # Configured issuer adapters are a subset of GPW, never advertise full coverage.
    db('investment_source_status?on_conflict=source', {'source': 'gpw_reports', 'checked_at': checked,
       'status': 'partial', 'error': json.dumps({'configuredIssuers': len(ISSUERS),
       'importedIssuers': imported, 'fullMarketCoverage': False, 'errors': errors}),
       **({'last_success_at': checked, 'latest_disclosure_date': latest_publication} if imported else {})})
    if errors:
        raise RuntimeError('Primary GPW report import incomplete: ' + json.dumps(errors))


if __name__ == '__main__':
    main()
