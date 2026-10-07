"""Compact annual facts from primary ESEF packages; no inferred custom concepts."""
import io
import gzip
import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import date
from decimal import Decimal, InvalidOperation

XBRL = 'http://www.xbrl.org/2003/instance'
IX = 'http://www.xbrl.org/2013/inlineXBRL'
METRICS = {
    'Revenue': 'revenue', 'ProfitLoss': 'net_profit', 'Assets': 'assets', 'Equity': 'equity',
    'CashFlowsFromUsedInOperatingActivities': 'operating_cash_flow',
    'PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities': 'ppe_purchases',
    'PurchaseOfIntangibleAssetsClassifiedAsInvestingActivities': 'intangible_purchases',
}


def qname(raw, namespaces):
    prefix, name = raw.split(':', 1)
    return namespaces.get(prefix), name


def numeric(node, namespaces):
    text = ''.join(node.itertext()).strip()
    transform = node.get('format')
    if transform:
        uri, kind = qname(transform, namespaces)
        if not uri or not re.fullmatch(r'http://www.xbrl.org/inlineXBRL/transformation/\d{4}-\d{2}-\d{2}', uri):
            raise ValueError('Unsupported numeric transformation namespace')
        if kind == 'fixed-zero':
            text = '0'
        elif kind in ('num-comma-decimal', 'num-dot-decimal'):
            text = re.sub(r'\s', '', text)
            text = text.replace('.', '').replace(',', '.') if kind == 'num-comma-decimal' else text.replace(',', '')
        else:
            raise ValueError('Unsupported numeric transformation')
    if not re.fullmatch(r'\d+(?:\.\d+)?', text):
        raise ValueError('Malformed ESEF number')
    scale = int(node.get('scale', '0'))
    if abs(scale) > 12 or node.get('sign', '') not in ('', '-'):
        raise ValueError('Unsupported scale or sign')
    try:
        value = Decimal(text) * (Decimal(10) ** scale)
        return -value if node.get('sign') == '-' else value
    except InvalidOperation as error:
        raise ValueError('Malformed ESEF value') from error


def parse_xhtml(raw, expected_lei, min_year=2024):
    if len(raw) > 16_000_000 or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
        raise ValueError('Unsafe or oversized ESEF document')
    namespaces = {}
    for _, (prefix, uri) in ET.iterparse(io.BytesIO(raw), events=['start-ns']):
        if prefix in namespaces and namespaces[prefix] != uri:
            raise ValueError('Rebound namespace in ESEF document')
        namespaces[prefix] = uri
    root = ET.fromstring(raw)
    nodes = list(root.iter(f'{{{IX}}}nonFraction'))
    if not nodes:
        return []
    contexts = {}
    for ctx in root.iter(f'{{{XBRL}}}context'):
        identifier = ctx.find(f'.//{{{XBRL}}}identifier')
        if identifier is None or identifier.text != expected_lei:
            raise ValueError('Report entity differs from verified issuer LEI')
        if ctx.find(f'{{{XBRL}}}scenario') is not None or ctx.find(f'.//{{{XBRL}}}segment') is not None:
            continue
        period = ctx.find(f'{{{XBRL}}}period')
        if period is None:
            raise ValueError('Missing ESEF period')
        instant = period.findtext(f'{{{XBRL}}}instant')
        start = period.findtext(f'{{{XBRL}}}startDate')
        end = instant or period.findtext(f'{{{XBRL}}}endDate')
        if not end or date.fromisoformat(end).year < min_year:
            continue
        if not instant and (not start or not 350 <= (date.fromisoformat(end) - date.fromisoformat(start)).days <= 380):
            continue
        contexts[ctx.get('id')] = (start, end, bool(instant))
    units = {}
    for unit in root.iter(f'{{{XBRL}}}unit'):
        measure = unit.find(f'{{{XBRL}}}measure')
        if measure is not None and measure.text:
            uri, code = qname(measure.text, namespaces)
            if uri == 'http://www.xbrl.org/2003/iso4217' and re.fullmatch('[A-Z]{3}', code):
                units[unit.get('id')] = code
    periods = {}
    for node in nodes:
        uri, concept = qname(node.get('name', ''), namespaces)
        if concept not in METRICS:
            continue
        if not uri or not re.fullmatch(r'https?://xbrl.ifrs.org/taxonomy/\d{4}-\d{2}-\d{2}/ifrs-full', uri):
            raise ValueError('Not an IFRS concept')
        context = contexts.get(node.get('contextRef'))
        if context is None or node.get('{http://www.w3.org/2001/XMLSchema-instance}nil') in ('true', '1'):
            continue
        start, end, instant = context
        if instant != (concept in ('Assets', 'Equity')):
            raise ValueError('Financial fact uses the wrong period type')
        currency = units.get(node.get('unitRef'))
        if not currency:
            raise ValueError('Missing monetary unit')
        report = periods.setdefault(end, {'period_end': end, 'period_start': None, 'currency': currency, 'metrics': {}})
        if report['currency'] != currency or (start and report['period_start'] not in (None, start)):
            raise ValueError('Incompatible report currencies or annual periods')
        if start:
            report['period_start'] = start
        metric = METRICS[concept]
        value = format(numeric(node, namespaces), 'f')
        existing = report['metrics'].get(metric)
        if existing and Decimal(existing['value']) != Decimal(value):
            raise ValueError('Conflicting duplicate financial facts')
        fact = report['metrics'].setdefault(metric, {'value': value, 'concept': concept,
            'context_id': node.get('contextRef'), 'fact_ids': []})
        if node.get('id') and len(fact['fact_ids']) < 12:
            fact['fact_ids'].append(node.get('id'))
    reports = [r for r in periods.values() if r['period_start'] and
               all(metric in r['metrics'] for metric in ('net_profit', 'assets', 'equity'))]
    if not reports:
        raise ValueError('No complete annual financial core in ESEF document')
    return sorted(reports, key=lambda report: report['period_end'])


def parse_package(raw, expected_lei, min_year=2024):
    reports = []
    total_size = 0

    def unwrap(data, maximum):
        nonlocal total_size
        if not data.startswith(b'\x1f\x8b'):
            return data
        with gzip.GzipFile(fileobj=io.BytesIO(data)) as compressed:
            expanded = compressed.read(min(maximum, 128_000_000 - total_size) + 1)
        total_size += len(expanded)
        if len(expanded) > maximum or total_size > 128_000_000:
            raise ValueError('Oversized gzip report attachment')
        return expanded

    def visit(data, prefix='', depth=0):
        nonlocal total_size
        if depth > 2:
            raise ValueError('Too deeply nested report package')
        data = unwrap(data, 128_000_000)
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            for member in archive.infolist():
                total_size += member.file_size
                if total_size > 128_000_000:
                    raise ValueError('Oversized expanded ESEF package')
                name = prefix + member.filename
                # KNF .rap contains gzip-compressed Java form templates named .zip.
                # Financial reports are attachments, not those application templates.
                if member.filename.replace('\\', '/').startswith('E-forms/'):
                    continue
                suffix = member.filename.lower().rsplit('.', 1)[-1]
                if suffix in ('zip', 'xbri', 'rap'):
                    visit(archive.read(member), name + '!', depth + 1)
                elif suffix in ('xhtml', 'html') and member.file_size <= 16_000_000:
                    document = unwrap(archive.read(member), 16_000_000)
                    # Board/audit attachments can have ordinary HTML doctypes.
                    # They contain no financial tags and are never parsed as facts.
                    if IX.encode() not in document:
                        continue
                    for report in parse_xhtml(document, expected_lei, min_year):
                        reports.append({**report, 'document_member': name})
    visit(raw)
    if not reports:
        raise ValueError('No tagged annual financial report in package')
    if len({r['period_end'] for r in reports}) != len(reports):
        raise ValueError('Ambiguous multiple financial reports in package')
    return reports
