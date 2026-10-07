"""Issuer-specific primary report indexes; explicit LEI/ISIN identity."""
import re
from datetime import date
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

ISSUERS = [{'isin': 'PLXTRDM00011', 'ticker': 'XTB', 'lei': '259400AVUPSABLEXNT19',
            'oam_name': 'XTB SPÓŁKA AKCYJNA',
            'index_url': 'https://ir.xtb.com/raporty/raporty-okresowe/'}]


class ReportLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.links = []
        self.row = None
        self.anchor = None

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'tr':
            self.row = {'dates': [], 'links': []}
        if tag == 'time' and self.row and re.fullmatch(r'\d{4}-\d{2}-\d{2}', attrs.get('datetime', '')):
            self.row['dates'].append(attrs['datetime'])
        if tag == 'a' and attrs.get('href'):
            self.anchor = {'href': attrs['href'], 'text': ''}

    def handle_data(self, text):
        if self.anchor:
            self.anchor['text'] += text

    def handle_endtag(self, tag):
        if tag == 'a' and self.anchor:
            self.links.append(self.anchor)
            if self.row:
                self.row['links'].append(self.anchor)
            self.anchor = None
        if tag == 'tr' and self.row:
            self.rows.append(self.row)
            self.row = None


def primary_url(raw, base):
    url = urlparse(urljoin(base, raw))
    if url.scheme != 'https' or url.netloc != urlparse(base).netloc or url.username or url.password:
        raise ValueError('Report link outside verified issuer host')
    return url.geturl()


def annual_sources(html, base):
    parser = ReportLinks()
    parser.feed(html)
    reports = []
    for row in parser.rows:
        for link in row['links']:
            year = re.fullmatch(r'Skonsolidowany Raport Roczny za (\d{4}) rok', link['text'].strip(), re.I)
            if year and int(year[1]) >= 2024:
                if len(set(row['dates'])) != 1:
                    raise ValueError('Missing or ambiguous actual publication date')
                publication = row['dates'][0]
                period = year[1] + '-12-31'
                if date.fromisoformat(publication) < date.fromisoformat(period):
                    raise ValueError('Publication precedes report period')
                reports.append({'report_period_end': period, 'publication_date': publication,
                                'report_page_url': primary_url(link['href'], base)})
    if not reports:
        raise ValueError('No recognised current annual reports in issuer index')
    return sorted(reports, key=lambda r: r['report_period_end'], reverse=True)


def package_url(html, base):
    parser = ReportLinks()
    parser.feed(html)
    packages = {primary_url(link['href'], base) for link in parser.links
                if urlparse(link['href']).path.lower().endswith(('.zip', '.xbri'))}
    if len(packages) != 1:
        raise ValueError('Missing or ambiguous annual report package')
    return packages.pop()
