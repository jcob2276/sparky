"""Official KNF OAM report discovery; names select candidates, never establish LEI."""
import re
import unicodedata
import xml.etree.ElementTree as ET
from datetime import date
from html.parser import HTMLParser
from urllib.parse import parse_qs, urlencode, urljoin, urlparse

BASE = 'https://moam.knf.gov.pl/moam.nsf/'


def official_url(raw):
    url = urlparse(urljoin(BASE, raw))
    if url.scheme != 'https' or url.netloc != 'moam.knf.gov.pl' or not url.path.startswith('/moam.nsf/'):
        raise ValueError('OAM link outside official report host')
    return url.geturl()


class Index(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.links = [], []
        self.row = self.cell = None

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'tr':
            self.row = []
        elif tag == 'td' and self.row is not None:
            self.cell = {'text': '', 'links': []}
        elif tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
            if self.cell is not None:
                self.cell['links'].append(attrs['href'])

    def handle_data(self, text):
        if self.cell is not None:
            self.cell['text'] += text

    def handle_endtag(self, tag):
        if tag == 'td' and self.cell is not None:
            self.row.append(self.cell)
            self.cell = None
        elif tag == 'tr' and self.row is not None:
            if self.row:
                self.rows.append(self.row)
            self.row = None


def parse_page(html):
    parser = Index()
    parser.feed(html)
    reports = []
    for cells in parser.rows:
        if len(cells) != 4:
            continue
        issuer, publication, title, package = cells
        day = publication['text'].strip()
        date.fromisoformat(day)
        if len(title['links']) != 1 or len(package['links']) != 1:
            raise ValueError('Missing or ambiguous OAM report links')
        detail = official_url(title['links'][0])
        source = official_url(package['links'][0])
        if not re.fullmatch('/moam.nsf/0/[A-Fa-f0-9]{32}', urlparse(detail).path):
            raise ValueError('Invalid OAM document identifier')
        parts = urlparse(source)
        query = parse_qs(parts.query)
        if parts.path != '/moam.nsf/AppForm' or query.get('rok') != [day[:4]] or query.get('kat') != [day.replace('-', '')]:
            raise ValueError('OAM package metadata differs from publication row')
        if len(query.get('plik', [])) != 1 or not re.fullmatch(r'[A-Za-z0-9]+_Raport\.zip', query['plik'][0]):
            raise ValueError('Invalid OAM package filename')
        text = ' '.join(title['text'].split())
        reports.append({'issuer_name': ' '.join(issuer['text'].split()), 'publication_date': day,
                        'title': text, 'report_type': text.split(',', 1)[0].strip(),
                        'report_page_url': detail, 'source_url': source})
    pages = []
    for link in parser.links:
        if not re.match(r'^(?:search\?OpenNavigator|mOAM\?readForm)', link):
            continue
        query = parse_qs(urlparse(link).query)
        if 'start' in query:
            if len(query['start']) != 1 or not query['start'][0].isdigit():
                raise ValueError('Invalid OAM pagination offset')
            pages.append(official_url(link))
    return {'reports': reports, 'pages': list(dict.fromkeys(pages))}


def search_url(issuer):
    return BASE + 'search?OpenNavigator&' + urlencode({'Field': 'NazwaPodmiot', 'Value': issuer})


def resolve_package(raw, source):
    # AppForm returns a legacy Java launcher; read only its report URL, never execute it.
    if len(raw) > 32_000 or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
        raise ValueError('Unsafe OAM package metadata')
    root = ET.fromstring(raw)
    arguments = [node.text for node in root.findall('./application-desc/argument')]
    if root.tag != 'jnlp' or arguments.count('-reportPath') != 1:
        raise ValueError('Missing or ambiguous OAM package URL')
    offset = arguments.index('-reportPath') + 1
    if offset >= len(arguments):
        raise ValueError('Missing OAM package argument')
    query = parse_qs(urlparse(official_url(source)).query)
    expected = 'https://moam.knf.gov.pl/mOAM/{}/{}/{}'.format(query['rok'][0], query['kat'][0], query['plik'][0])
    if arguments[offset] != expected:
        raise ValueError('OAM download differs from verified report metadata')
    return expected


def discover_annual(fetch, search, exact_issuer, min_year=2024, latest_only=False, allow_standalone=False):
    def name(value):
        value=re.sub('["“”„«»]','',value)
        return unicodedata.normalize('NFC',' '.join(value.split())).casefold()
    pending, visited, reports = [search_url(search)], set(), {}
    while pending:
        url = pending.pop(0)
        if url in visited:
            continue
        if len(visited) >= 256:
            raise ValueError('OAM search exceeds bounded pagination')
        visited.add(url)
        page = parse_page(fetch(url))
        dates=[report['publication_date'] for report in page['reports']]
        if latest_only and dates!=sorted(dates,reverse=True):
            raise ValueError('Official report search is not ordered by publication date')
        for report in page['reports']:
            if (name(report['issuer_name']) == name(exact_issuer)
                    and report['report_type'] in (('SRR', 'RR') if allow_standalone else ('SRR',))
                    and int(report['publication_date'][:4]) >= min_year):
                reports[report['report_page_url']] = report
        if latest_only and (reports or (dates and max(dates)<str(min_year)+'-01-01')):
            break
        pending.extend(link for link in page['pages'] if link not in visited)
    return sorted(reports.values(), key=lambda report: (report['publication_date'], report['report_type'] == 'SRR'), reverse=True)
