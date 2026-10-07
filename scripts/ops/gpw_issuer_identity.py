"""ISIN-to-LEI identity from official GLEIF, independently confirmed by relation."""
import re
from urllib.parse import urlencode,urlparse

BASE='https://api.gleif.org/api/v1/lei-records'


def resolve_issuer(fetch,company):
    isin=company['isin']
    if not re.fullmatch(r'[A-Z]{2}[A-Z0-9]{9}\d',isin):
        raise ValueError('Invalid registry ISIN')
    records=fetch(BASE+'?'+urlencode({'filter[isin]':isin,'page[size]':2})).get('data',[])
    if len(records)!=1:
        raise ValueError('Missing or ambiguous official ISIN-to-LEI mapping')
    record=records[0]
    attrs=record['attributes']
    lei=attrs['lei']
    name=attrs['entity']['legalName']['name']
    if record.get('type')!='lei-records' or record.get('id')!=lei or not re.fullmatch(r'[A-Z0-9]{18}\d{2}',lei) or not name:
        raise ValueError('Malformed official issuer identity')
    relation=BASE+'/'+lei+'/isins?'+urlencode({'page[size]':1000})
    pending,visited,confirmed=relation,set(),False
    while pending:
        parsed=urlparse(pending)
        if parsed.scheme!='https' or parsed.netloc!='api.gleif.org' or parsed.path!='/api/v1/lei-records/'+lei+'/isins':
            raise ValueError('ISIN relation pagination outside official issuer API')
        if pending in visited or len(visited)>=25:
            raise ValueError('Unbounded ISIN relation pagination')
        visited.add(pending)
        page=fetch(pending)
        for row in page.get('data',[]):
            identity=row.get('attributes',{})
            if row.get('type')=='isins' and identity.get('isin')==isin and identity.get('lei')==lei:
                confirmed=True
        pending=page.get('links',{}).get('next')
    if not confirmed:
        raise ValueError('Official issuer relation does not confirm registry ISIN')
    return {**company,'lei':lei,'oam_name':name,'identity_source_url':BASE+'?'+urlencode({'filter[isin]':isin})}
