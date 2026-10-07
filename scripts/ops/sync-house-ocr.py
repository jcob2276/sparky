"""CPU OCR recovery for the existing House disclosure queue and atomic writer."""
import argparse
from datetime import datetime, timedelta, timezone
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.parse
import urllib.request
import urllib.error

from PIL import Image

spec = importlib.util.spec_from_file_location('house_ocr', Path(__file__).with_name('house-paper-ocr.py'))
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--document-id')
    parser.add_argument('--ocr-command', help='JSON command array; defaults to native Tesseract')
    args = parser.parse_args()
    base = os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1/'
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    headers = {'apikey': key, 'Content-Type': 'application/json'}
    if key.startswith('eyJ'):
        headers['Authorization'] = 'Bearer ' + key

    def api(path, data=None, method='GET'):
        request = urllib.request.Request(base + path, method=method, headers=headers,
                                         data=json.dumps(data).encode() if data is not None else None)
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                raw = response.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as error:
            details = error.read(2000).decode('utf-8', errors='replace')
            raise RuntimeError(f'House database HTTP {error.code}: {details}') from None

    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=1)).isoformat()
    query = {'select': 'id,doc_id,year,filer_name,filing_date,source_url',
             'year': f'eq.{now.year}',
             'order': 'filing_date.desc,doc_id.desc', 'limit': '10'}
    if args.document_id:
        query['id'] = 'eq.' + args.document_id
    else:
        query['parse_status'] = 'eq.error'
        query['or'] = f'(ocr_checked_at.is.null,ocr_checked_at.lt.{cutoff})'
    documents = api('house_disclosures?' + urllib.parse.urlencode(query))
    politicians = api('politicians?select=id,display_name&chamber=eq.house')
    names = {p['display_name'].strip().lower(): p['id'] for p in politicians}
    converted = 0
    failed = 0
    command = json.loads(args.ocr_command) if args.ocr_command else None

    def ocr(image):
        if not command:
            return reader.tesseract_text(image)
        with tempfile.TemporaryDirectory() as directory:
            cell = Path(directory) / 'cell.png'
            image.save(cell)
            return subprocess.check_output([*command, str(cell)], text=True, encoding='utf-8', timeout=30)

    for document in documents:
        identifier = document['id']
        expected = f"https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/{document['year']}/{document['doc_id']}.pdf"
        if document['source_url'] != expected or not str(document['doc_id']).isdigit():
            raise ValueError('Unexpected official disclosure URL')
        api('house_disclosures?id=eq.' + urllib.parse.quote(identifier),
            {'ocr_checked_at': now.isoformat()}, 'PATCH')
        try:
            with tempfile.TemporaryDirectory() as directory:
                pdf = Path(directory) / 'report.pdf'
                with urllib.request.urlopen(expected, timeout=30) as response:
                    content = response.read(20_000_001)
                if len(content) > 20_000_000 or not content.startswith(b'%PDF-'):
                    raise ValueError('Invalid or oversized PDF')
                pdf.write_bytes(content)
                prefix = Path(directory) / 'page'
                subprocess.run(['pdftoppm', '-scale-to', '2200', '-png', str(pdf), str(prefix)],
                               check=True, capture_output=True, timeout=90)
                pages = sorted(Path(directory).glob('page-*.png'))
                if not pages or len(pages) > 30:
                    raise ValueError('Unsupported PDF page count')
                rows = []
                for page in pages:
                    rows.extend(reader.read_paper_grid(Image.open(page), document['filing_date'], ocr))
                payload = []
                for index, row in enumerate(rows):
                    payload.append({'id': f"house-{document['year']}-{document['doc_id']}-{index}",
                                    'politician_id': names.get(document['filer_name'].strip().lower()),
                                    'filer_name': document['filer_name'], 'chamber': 'house',
                                    'ticker': row['ticker'], 'asset_description': row['asset'],
                                    'transaction_date': row['transactionDate'],
                                    'disclosure_date': document['filing_date'],
                                    'notification_date': row['notificationDate'],
                                    'transaction_type': row['type'], 'owner': row['owner'],
                                    'amount_low': row['amountLow'], 'amount_high': row['amountHigh'],
                                    'source': 'house_clerk', 'source_url': expected,
                                    'external_id': f"house-clerk|{document['doc_id']}|{index}"})
                count = api('rpc/replace_house_disclosure',
                            {'p_document_id': identifier, 'p_trades': payload}, 'POST')
                converted += count
                print(json.dumps({'document': identifier, 'transactions': count}), flush=True)
        except (ValueError, subprocess.SubprocessError, OSError) as error:
            failed += 1
            # An unsupported form remains visible as an import error; no partial write.
            print(json.dumps({'document': identifier, 'ocrError': str(error)}), flush=True)
    print(json.dumps({'documents': len(documents), 'transactions': converted,
                      'unconvertedDocuments': failed}), flush=True)


if __name__ == '__main__':
    main()
