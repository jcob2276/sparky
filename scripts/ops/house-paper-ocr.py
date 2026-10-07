"""Read House 2012 and 2020 paper PTR grids; reject ambiguous scans.

CLI requires Pillow, numpy, Poppler and Tesseract. Output is transaction JSON
for the existing replace_house_disclosure write path, never a guessed ticker.
"""
import argparse
from datetime import date
import json
from pathlib import Path
import re
import subprocess
import tempfile

import numpy as np
from PIL import Image, ImageOps


AMOUNTS = [(1001, 15000), (15001, 50000), (50001, 100000),
           (100001, 250000), (250001, 500000), (500001, 1000000),
           (1000001, 5000000), (5000001, 25000000),
           (25000001, 50000000), (50000001, None)]


def is_checked(pixels):
    """Detect a large mark inside a cell after excluding its ruled border."""
    height, width = pixels.shape
    if min(height, width) < 15:
        raise ValueError('Checkbox cell too small')
    margin_y, margin_x = max(4, height // 8), max(4, width // 8)
    inner = pixels[margin_y:-margin_y, margin_x:-margin_x]
    return bool((inner.mean(axis=1) > .04).mean() > .35
                and (inner.mean(axis=0) > .04).mean() > .35
                and inner.mean() > .03)


def selected_cell(marks):
    selected = [i for i, marked in enumerate(marks) if marked]
    if len(selected) != 1:
        raise ValueError('Missing or ambiguous transaction checkbox')
    return selected[0]


def is_framed_checked(pixels):
    """The modern form has a printed square inside each ruled table cell."""
    height, width = pixels.shape
    if min(height, width) < 24:
        raise ValueError('Framed checkbox cell too small')
    # Locate the inner square separately from the outer table ruling. Some
    # photocopies have a double left edge extending well into the table cell.
    trimmed = pixels[3:-3,3:-3]
    edges = np.flatnonzero(trimmed.mean(axis=1) > .5)
    if len(edges) < 2 or edges[-1]-edges[0] < height*.35:
        raise ValueError('Unrecognised checkbox frame')
    top_edges = edges[edges < trimmed.shape[0]*.4]
    bottom_edges = edges[edges > trimmed.shape[0]*.6]
    if not len(top_edges) or not len(bottom_edges):
        raise ValueError('Ambiguous horizontal checkbox frame')
    top,bottom = int(top_edges[-1]),int(bottom_edges[0])
    ends = np.flatnonzero(trimmed[top+1:bottom].mean(axis=0) > .65)
    if not len(ends):
        raise ValueError('Unrecognised checkbox width')
    left_edges = ends[ends < trimmed.shape[1]*.4]
    right_edges = ends[ends > trimmed.shape[1]*.6]
    if not len(left_edges):
        raise ValueError('Ambiguous vertical checkbox frame')
    if len(right_edges):
        right = int(right_edges[0])
    elif (trimmed[top_edges,-3:].any(axis=0).mean() > .6 and
          trimmed[bottom_edges,-3:].any(axis=0).mean() > .6):
        # Some printed squares overlap the table's right rule. Their horizontal
        # sides must both reach the cell edge before accepting this clipping.
        right = trimmed.shape[1]-1
    else:
        raise ValueError('Missing right checkbox frame')
    left = int(left_edges[-1])
    if right-left < width*.4:
        raise ValueError('Unrecognised checkbox width')
    inset_x,inset_y = max(2,(right-left)//10),max(2,(bottom-top)//10)
    inner = trimmed[top+inset_y:bottom-inset_y,left+inset_x:right-inset_x]
    return bool(inner.mean() > .06 and
                (inner.mean(axis=0) > .04).mean() > .25 and
                (inner.mean(axis=1) > .04).mean() > .25)


def paper_date(raw, disclosure_date):
    match = re.fullmatch(r'(\d{1,2})/(\d{1,2})/(\d{2}|\d{4})', raw.strip())
    if not match:
        raise ValueError('Unreadable transaction date')
    month, day, year = map(int, match.groups())
    if year < 100:
        year += 2000
    result = date(year, month, day)
    if result > date.fromisoformat(disclosure_date):
        raise ValueError('Transaction after disclosure date')
    return result.isoformat()


def line_centres(values):
    groups = []
    for value in values:
        if groups and value - groups[-1][-1] <= 3:
            groups[-1].append(int(value))
        else:
            groups.append([int(value)])
    return [round(sum(group) / len(group)) for group in groups]


def read_old_grid(image, disclosure_date, ocr):
    grey = np.asarray(image.convert('L'))
    ink = grey < 200
    height, width = ink.shape
    horizontal = line_centres(np.flatnonzero(ink.sum(axis=1) > width * .5))
    bands = []
    for top, bottom in zip(horizontal, horizontal[1:]):
        if top < height * .5 or bottom - top < 20:
            continue
        columns = line_centres(np.flatnonzero(
            ink[top+5:bottom-5].sum(axis=0) > (bottom-top-10) * .7))
        if len(columns) == 18:
            bands.append((top, bottom, columns))
    if not bands:
        raise ValueError('Unsupported paper PTR layout')
    # Use one validated grid for every later row. A faint/missing vertical rule
    # must not silently cause an occupied row to disappear from the document.
    first_top, _, columns = bands[0]
    data_lines = [y for y in horizontal if first_top <= y <= bands[-1][1]]
    bands = [(top, bottom, columns) for top, bottom in zip(data_lines, data_lines[1:])]

    def text(left, top, right, bottom):
        crop = image.crop((left+5, top+5, right-5, bottom-5))
        return re.sub(r'\s+', ' ', ocr(crop)).strip()

    # Check the source form rather than interpreting any 17-column grid as PTR.
    heading = ocr(image.crop((0, 0, width, int(height * .15)))).lower()
    if 'periodic transaction report' not in re.sub(r'\s+', ' ', heading):
        raise ValueError('Missing House PTR heading')
    rows = []
    header_seen = False
    example_seen = False
    for top, bottom, columns in bands:
        # Numeric dates and description are read independently of checkbox cells.
        asset_ink = ink[top+6:bottom-6, columns[1]+6:columns[2]-6]
        if asset_ink.mean() < .002:
            # A row with marks but no readable description must not be omitted.
            if any(is_checked(ink[top:bottom, columns[i]:columns[i+1]])
                   for i in [2, 3, 4, *range(7, 17)]):
                raise ValueError('Marked row without asset description')
            continue
        asset = text(columns[1], top, columns[2], bottom)
        if not header_seen:
            if 'full name' not in asset.lower() or 'ticker symbol' not in asset.lower():
                raise ValueError('Unsupported paper PTR asset header')
            header_seen = True
            continue
        if re.match(r'^Example\s+Mega\s*Corp\b', asset, re.I):
            if example_seen:
                raise ValueError('Unexpected duplicate example row')
            example_seen = True
            continue
        if not example_seen:
            raise ValueError('Missing paper PTR example row')
        if not asset or len(asset) < 4:
            raise ValueError('Unreadable asset description')
        transaction = selected_cell([is_checked(ink[top:bottom, columns[i]:columns[i+1]])
                                     for i in range(2, 5)])
        amount = selected_cell([is_checked(ink[top:bottom, columns[i]:columns[i+1]])
                                for i in range(7, 17)])
        owner = text(columns[0], top, columns[1], bottom)
        if owner not in ['', 'JT', 'SP', 'DC']:
            raise ValueError('Unreadable owner code')
        transaction_date = paper_date(text(columns[5], top, columns[6], bottom), disclosure_date)
        notification_date = paper_date(text(columns[6], top, columns[7], bottom), disclosure_date)
        if notification_date < transaction_date:
            raise ValueError('Notification precedes transaction')
        rows.append({'asset': asset, 'ticker': None,
                     'owner': {'': 'self', 'JT': 'joint', 'SP': 'spouse',
                               'DC': 'dependent_child'}[owner],
                     'type': ['buy', 'sell', 'exchange'][transaction],
                     'transactionDate': transaction_date, 'notificationDate': notification_date,
                     'amountLow': AMOUNTS[amount][0], 'amountHigh': AMOUNTS[amount][1]})
    if not rows:
        raise ValueError('No verified transactions in paper PTR')
    return rows


def tesseract_text(image):
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / 'cell.png'
        # Padding prevents a ruled edge being interpreted as part of a character.
        image.save(path)
        result = subprocess.run(['tesseract', str(path), 'stdout', '-l', 'eng', '--psm', '6'],
                                capture_output=True, text=True, encoding='utf-8', check=True, timeout=30)
        return result.stdout


def modern_header_crop(image, columns, start, horizontal):
    # Two ruled header bands precede the example/data rows. Page proportions
    # vary across scanners; a fixed-height crop can cut off both source labels.
    preceding = [line for line in horizontal if line < start]
    top = preceding[-2] if len(preceding) >= 2 else max(0, start-image.height*.3)
    return image.crop((columns[0], top, columns[-1], start))


def read_new_grid(image, disclosure_date, ocr):
    """Read the 2020 form (four transaction choices and eleven amount cells)."""
    ink = np.asarray(image.convert('L')) < 200
    height, width = ink.shape
    horizontal = line_centres(np.flatnonzero(ink.sum(axis=1) > width * .5))
    layout = None
    for top, bottom in zip(horizontal, horizontal[1:]):
        if bottom-top < 24 or bottom-top > height*.08:
            continue
        columns = line_centres(np.flatnonzero(
            ink[top+4:bottom-4].sum(axis=0) > (bottom-top-8) * .9))
        if len(columns) == 20:
            layout = (top, columns)
            break
    if not layout:
        raise ValueError('Unsupported modern paper PTR layout')
    start, columns = layout
    header = re.sub(r'\s+', ' ', ocr(modern_header_crop(image,columns,start,horizontal))).upper()
    if 'FULL ASSET NAME' not in header or 'AMOUNT OF TRANSACTION' not in header:
        raise ValueError('Unsupported modern PTR headers')

    def text(index, top, bottom):
        crop = image.crop((columns[index]+4,top+4,columns[index+1]-4,bottom-4))
        if index in [1,6,7]:
            crop = ImageOps.expand(crop.resize((crop.width*2,crop.height*2)),border=12,fill='white')
        return re.sub(r'\s+', ' ', ocr(crop)).strip()

    rows = []
    lines = [y for y in horizontal if y >= start]
    for row_number, (top,bottom) in enumerate(zip(lines,lines[1:])):
        if bottom-top < 24:
            raise ValueError('Modern PTR row too small')
        # Stop at the blank space separating the transaction grid from notes.
        structure = [ink[top+4:bottom-4, columns[i]-2:columns[i]+3].mean()
                     for i in [2,6,8]]
        if max(structure) < .3:
            if ink[top+4:bottom-4,columns[0]+4:columns[-1]-4].mean() < .005:
                break
            raise ValueError('Broken modern PTR grid')
        asset_ink = ink[top+4:bottom-4,columns[1]+4:columns[2]-4]
        asset = text(1,top,bottom) if asset_ink.mean() >= .002 else ''
        example_label = re.sub(r'[^a-z]', '', asset.lower())
        # A printed example is shorter than the following checkbox rows. Use
        # both its fixed fictitious name and this geometry; never skip a normal
        # transaction merely because its description begins with "Example".
        short_example = len(lines)>2 and bottom-top < (lines[2]-lines[1])*.75
        if row_number == 0 and short_example and re.fullmatch(
                r'ex[a-z]{2,5}meg(?:a)?co[rm]?p?commonstock',example_label):
            continue
        try:
            marked_types = [is_framed_checked(ink[top:bottom,columns[i]:columns[i+1]])
                            for i in range(2,6)]
            marked_amounts = [is_framed_checked(ink[top:bottom,columns[i]:columns[i+1]])
                              for i in range(8,19)]
        except ValueError as error:
            raise ValueError(f'Row {row_number} ({asset}): {error}') from None
        if asset_ink.mean() < .002:
            if any(marked_types+marked_amounts):
                raise ValueError('Marked modern PTR row without description')
            continue
        if len(asset) < 4:
            raise ValueError('Unreadable modern PTR description')
        owner = text(0,top,bottom)
        if owner not in ['', 'JT', 'SP', 'DC']:
            raise ValueError('Unreadable modern PTR owner')
        transaction_date = paper_date(text(6,top,bottom),disclosure_date)
        notification_date = paper_date(text(7,top,bottom),disclosure_date)
        if notification_date < transaction_date:
            raise ValueError('Notification precedes transaction')
        transaction = selected_cell(marked_types)
        amount = selected_cell(marked_amounts)
        if amount == 10 and owner not in ['SP','DC']:
            raise ValueError('Spouse/dependent amount category without matching owner')
        low,high = (AMOUNTS+[ (1000001,None) ])[amount]
        rows.append({'asset':asset,'ticker':None,
                     'owner':{'':'self','JT':'joint','SP':'spouse','DC':'dependent_child'}[owner],
                     'type':['buy','sell','sell','exchange'][transaction],
                     'transactionDate':transaction_date,'notificationDate':notification_date,
                     'amountLow':low,'amountHigh':high})
    if not rows:
        raise ValueError('No verified transactions in modern paper PTR')
    return rows


def read_paper_grid(image, disclosure_date, ocr):
    # Route by the grid width, not by an exception from a partially parsed report.
    ink = np.asarray(image.convert('L')) < 200
    height,width = ink.shape
    horizontal = line_centres(np.flatnonzero(ink.sum(axis=1) > width*.5))
    for top,bottom in zip(horizontal,horizontal[1:]):
        if bottom-top < 24 or bottom-top > height*.08:
            continue
        columns = line_centres(np.flatnonzero(ink[top+4:bottom-4].sum(axis=0) > (bottom-top-8)*.9))
        if len(columns) == 20:
            return read_new_grid(image,disclosure_date,ocr)
    return read_old_grid(image,disclosure_date,ocr)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--disclosure-date', required=True)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory() as directory:
        prefix = Path(directory) / 'page'
        subprocess.run(['pdftoppm', '-scale-to', '2200', '-png', str(args.pdf), str(prefix)],
                       check=True, capture_output=True, timeout=90)
        pages = sorted(Path(directory).glob('page-*.png'))
        if not pages or len(pages) > 30:
            raise ValueError('Invalid paper PTR page count')
        rows = []
        for page in pages:
            rows.extend(read_paper_grid(Image.open(page), args.disclosure_date, tesseract_text))
        print(json.dumps(rows))


if __name__ == '__main__':
    main()
