import { describe, expect, it } from 'vitest';
import { initialLibraryForm, validateLibraryItem, type LibraryItemFormState } from './libraryItemForm';

const TODAY = '2026-10-21';
const form = (patch: Partial<LibraryItemFormState> = {}): LibraryItemFormState => ({ ...initialLibraryForm(), title: 'Dune', ...patch });

describe('validateLibraryItem', () => {
  it('sam tytuł wystarcza: reszta to „nie wiem”', () => {
    expect(validateLibraryItem(form(), TODAY)).toEqual({
      ok: true,
      value: { title: 'Dune', author: null, resourceType: 'book', pages: null, finishedOn: null, finishedYear: null, rating: null, source: 'manual' },
    });
  });
  it('dokładna data ma pierwszeństwo przed rokiem', () => {
    expect(validateLibraryItem(form({ finishedOn: '2019-05-01', finishedYear: '2015' }), TODAY))
      .toMatchObject({ ok: true, value: { finishedOn: '2019-05-01', finishedYear: null } });
  });
  it('sam rok jest zapisywany jako rok', () => {
    expect(validateLibraryItem(form({ finishedYear: '2015' }), TODAY))
      .toMatchObject({ ok: true, value: { finishedOn: null, finishedYear: 2015 } });
  });
  it('odrzuca przyszłość, rok spoza zakresu i zły format', () => {
    expect(validateLibraryItem(form({ finishedOn: '2026-10-22' }), TODAY)).toMatchObject({ ok: false });
    expect(validateLibraryItem(form({ finishedYear: '2027' }), TODAY)).toMatchObject({ ok: false });
    expect(validateLibraryItem(form({ finishedYear: '1899' }), TODAY)).toMatchObject({ ok: false });
    expect(validateLibraryItem(form({ finishedYear: '20' }), TODAY)).toMatchObject({ ok: false });
    expect(validateLibraryItem(form({ finishedOn: '01.05.2019' }), TODAY)).toMatchObject({ ok: false });
  });
  it('strony tylko dla książek i kursów; zły zakres odrzucony', () => {
    expect(validateLibraryItem(form({ pages: '612' }), TODAY)).toMatchObject({ ok: true, value: { pages: 612 } });
    expect(validateLibraryItem(form({ resourceType: 'video', pages: '120' }), TODAY)).toMatchObject({ ok: true, value: { pages: null } });
    for (const pages of ['0', '1.5', '-1', '5001']) expect(validateLibraryItem(form({ pages }), TODAY).ok).toBe(false);
  });
  it('wymaga niepustego tytułu i trzyma limity długości', () => {
    expect(validateLibraryItem(form({ title: '  ' }), TODAY)).toEqual({ ok: false, error: 'Wpisz tytuł.' });
    expect(validateLibraryItem(form({ title: 'x'.repeat(201) }), TODAY).ok).toBe(false);
    expect(validateLibraryItem(form({ author: 'x'.repeat(201) }), TODAY).ok).toBe(false);
  });
});
