"""Rotate through the SEC issuer catalogue; store facts, never raw filing archives."""
import json
import os
import re
import time
from datetime import datetime, timezone
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from us_financial_reports import parse_reports

BASE = os.environ['SUPABASE_URL']
KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
HEADERS = {'apikey': KEY, 'Content-Type': 'application/json'}
if KEY.startswith('eyJ'):
    HEADERS['Authorization'] = 'Bearer ' + KEY


def db(path, payload=None, count=False):
    headers = {**HEADERS, 'Prefer': 'count=exact' if count else 'resolution=merge-duplicates'}
    request = Request(BASE + '/rest/v1/' + path, method='POST' if payload is not None else 'GET',
                      headers=headers, data=json.dumps(payload).encode() if payload is not None else None)
    with urlopen(request, timeout=45) as response:
        if count:
            return int(response.headers['Content-Range'].split('/')[-1])
        raw = response.read()
        return json.loads(raw) if raw else None


def sec(path):
    if not re.fullmatch(r'(?:submissions/(?:CIK\d{10}|CIK\d{10}-submissions-\d{3})|api/xbrl/companyfacts/CIK\d{10})\.json', path):
        raise ValueError('Invalid official SEC API path')
    time.sleep(.6)  # below SEC fair-access rate, one worker, no fan-out
    with urlopen(Request('https://data.sec.gov/' + path, headers={
            'User-Agent': 'Sparky jakubsobon3@gmail.com', 'Accept': 'application/json'}), timeout=45) as response:
        if response.url != 'https://data.sec.gov/' + path:
            raise ValueError('Unexpected SEC API redirect')
        raw = response.read(30_000_001)
        if len(raw) > 30_000_000:
            raise ValueError('SEC JSON exceeds response budget')
        return json.loads(raw)


def main():
    batch = int(os.environ.get('US_REPORT_BATCH_SIZE', '200'))
    if not 1 <= batch <= 1000:
        raise ValueError('US report batch outside 1..1000')
    db('rpc/seed_us_report_import_coverage', {})
    requested = os.environ.get('US_REPORT_CIKS', '').strip()
    filter_query = ''
    if requested:
        if not re.fullmatch(r'\d{1,10}(?:,\d{1,10}){0,49}', requested):
            raise ValueError('Invalid requested CIK list')
        filter_query = '&cik=in.(' + requested + ')'
    queue = db('us_report_import_coverage?select=cik&order=checked_at.asc.nullsfirst,cik.asc&limit=' + str(batch) + filter_query)
    errors, imported = [], 0
    for row in queue:
        cik = int(row['cik'])
        checked = datetime.now(timezone.utc).isoformat()
        progress = {'cik': cik, 'checked_at': checked}
        try:
            facts = sec(f'api/xbrl/companyfacts/CIK{cik:010}.json')
            submissions = sec(f'submissions/CIK{cik:010}.json')
            if int(submissions['cik']) != cik:
                raise ValueError('SEC submissions issuer mismatch')
            filings = submissions['filings']['recent']
            keys = ('accessionNumber', 'form', 'reportDate', 'filingDate', 'primaryDocument')
            filings = {key: list(filings[key]) for key in keys}
            for history in submissions['filings'].get('files', []):
                if history['filingTo'] < '2024-01-01':
                    continue
                earlier = sec('submissions/' + history['name'])
                for key in keys:
                    filings[key].extend(earlier[key])
            reports = parse_reports(facts, filings, cik)
            if reports:
                db('us_financial_reports?on_conflict=cik,accession', reports)
                imported += 1
            progress.update(status='complete' if reports else 'unavailable', report_count=len(reports), error=None)
            print(json.dumps({'cik': cik, 'reports': len(reports)}), flush=True)
        except HTTPError as error:
            if error.code == 404:
                progress.update(status='unavailable', error='No official SEC XBRL companyfacts available')
            else:
                progress.update(status='error', error=f'SEC HTTP {error.code}')
                errors.append({'cik': cik, 'error': progress['error']})
        except Exception as error:
            progress.update(status='error', error=str(error)[:2000])
            errors.append({'cik': cik, 'error': progress['error']})
        db('us_report_import_coverage?on_conflict=cik', progress)
    counts = {status: db('us_report_import_coverage?select=cik&limit=1&status=eq.' + status, count=True)
              for status in ('pending', 'complete', 'unavailable', 'error')}
    latest = db('us_financial_reports?select=publication_date&order=publication_date.desc&limit=1')
    checked = datetime.now(timezone.utc).isoformat()
    db('investment_source_status?on_conflict=source', {'source': 'sec_us_financials', 'checked_at': checked,
       'status': 'ok' if not counts['pending'] and not counts['error'] and not counts['unavailable'] else 'partial',
       'error': json.dumps({**counts, 'attemptedIssuers': len(queue), 'importedIssuers': imported, 'errors': errors[:5]}),
       **({'last_success_at': checked, 'latest_disclosure_date': latest[0]['publication_date']} if imported and latest else {})})
    if errors:
        raise RuntimeError('US financial reports: ' + str(len(errors)) + ' issuer errors; see coverage')


if __name__ == '__main__':
    main()
