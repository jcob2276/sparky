"""Daily primary report discovery and compact financial facts, no document storage."""
import hashlib
import json
import os
from datetime import datetime, timezone
from urllib.request import Request, urlopen, build_opener, HTTPRedirectHandler
from gpw_esef import parse_package
from gpw_report_sources import ISSUERS, annual_sources, package_url, primary_url
from gpw_oam import discover_annual, resolve_package
from gpw_issuer_identity import resolve_issuer

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


def db(path, payload=None, preference='resolution=merge-duplicates'):
    request = Request(BASE + '/rest/v1/' + path, method='POST' if payload is not None else 'GET',
                      headers={**HEADERS, 'Prefer': preference},
                      data=json.dumps(payload).encode() if payload is not None else None)
    with urlopen(request, timeout=45) as response:
        raw=response.read()
        return json.loads(raw) if raw else None


def main():
    checked = datetime.now(timezone.utc).isoformat()
    imported = 0
    latest_publication = None
    errors = []
    companies=db('gpw_companies?select=isin,ticker,name&ticker=not.is.null&limit=1000')
    companies=[company for company in companies if company['ticker']]
    if len(companies)>=1000:
        raise ValueError('Registry exceeds verified read pagination; refusing partial coverage')
    db('gpw_report_import_coverage?on_conflict=isin',[{'isin':c['isin']} for c in companies],
       'resolution=ignore-duplicates')
    batch_size=int(os.environ.get('GPW_REPORT_BATCH_SIZE','20'))
    if not 1<=batch_size<=500:
        raise ValueError('GPW report batch size outside 1..500')
    registry={company['isin']:company for company in companies}
    queue=db('gpw_report_import_coverage?select=isin&order=checked_at.asc.nullsfirst,isin.asc&limit=1000')
    queue=[queued for queued in queue if queued['isin'] in registry][:batch_size]
    for queued in queue:
        if queued['isin'] not in registry:
            continue
        company=registry[queued['isin']]
        issuer=company
        progress={'isin':company['isin'],'checked_at':datetime.now(timezone.utc).isoformat()}
        try:
            issuer=next((known for known in ISSUERS if known['isin']==company['isin']),None)
            issuer=issuer or resolve_issuer(lambda url: json.loads(primary_fetch(url,2_000_000)),company)
            progress.update({key:issuer[key] for key in ('lei',)})
            progress['legal_name']=issuer['oam_name']
            progress['identity_source_url']=issuer.get('identity_source_url')
            if issuer.get('oam_name'):
                candidates = discover_annual(lambda url: primary_fetch(url, 2_000_000).decode('utf8'),
                                             company['name'], issuer['oam_name'],latest_only=True)
                if not candidates:
                    raise ValueError('No consolidated annual reports in official KNF search')
                candidate = candidates[0]
                metadata = primary_fetch(candidate['source_url'], 32_000)
                source = resolve_package(metadata, candidate['source_url'])
                report = {key: candidate[key] for key in ('publication_date', 'report_page_url')}
            else:
                index = primary_fetch(issuer['index_url'], 2_000_000).decode('utf8')
                report = annual_sources(index, issuer['index_url'])[0]
                page = primary_fetch(report['report_page_url'], 2_000_000).decode('utf8')
                source = package_url(page, report['report_page_url'])
            raw = primary_fetch(source)
            reports = parse_package(raw, issuer['lei'])
            report.setdefault('report_period_end', max(r['period_end'] for r in reports))
            if max(r['period_end'] for r in reports) != report['report_period_end']:
                raise ValueError('Package period differs from primary issuer index')
            payload = [{**r, **report, 'isin': issuer['isin'], 'source_url': source,
                        'package_sha256': hashlib.sha256(raw).hexdigest(), 'imported_at': checked}
                       for r in reports]
            db('gpw_financial_reports?on_conflict=isin,report_period_end,period_end', payload)
            imported += 1
            progress.update({'status':'complete','error':None})
            latest_publication = max(latest_publication or report['publication_date'], report['publication_date'])
            print(json.dumps({'ticker': issuer['ticker'], 'report': report['report_period_end'], 'periods': len(payload)}))
        except Exception as error:
            message=str(error)[:2000]
            errors.append({'ticker': company['ticker'], 'error': message})
            progress.update({'status':'error','error':message})
            print(json.dumps({'ticker':company['ticker'],'error':message}),flush=True)
        db('gpw_report_import_coverage?on_conflict=isin',progress)
    coverage=db('gpw_report_import_coverage?select=isin,status&limit=1000')
    covered=sum(row['status']=='complete' for row in coverage if row['isin'] in registry)
    latest=db('gpw_financial_reports?select=publication_date&order=publication_date.desc&limit=1')
    latest_publication=latest[0]['publication_date'] if latest else None
    # Coverage includes every eligible registry ISIN; pending/error sources remain explicit.
    db('investment_source_status?on_conflict=source', {'source': 'gpw_reports', 'checked_at': checked,
       'status': 'ok' if covered==len(companies) else 'partial', 'error': json.dumps({'registrySecurities': len(companies),
       'attemptedSecurities':len(queue),'coveredSecurities':covered,'importedSecurities': imported,
       'fullMarketCoverage':covered==len(companies),'errorCount':len(errors),'errors': errors[:10]}),
       **({'last_success_at': checked, 'latest_disclosure_date': latest_publication} if imported else {})})
    if errors:
        raise RuntimeError('Primary GPW report import incomplete: ' + str(len(errors)) + ' errors; details in import coverage')


if __name__ == '__main__':
    main()
