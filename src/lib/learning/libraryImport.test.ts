import { describe, expect, it } from 'vitest';
import {
  clampRating,
  parseCsv,
  parseCsvDate,
  parseLibraryCsv,
  parseLibraryList,
  splitDuplicates,
  typeFromWord,
} from './libraryImport';

const TODAY = '2026-10-21';

describe('typeFromWord', () => {
  it('rozpoznaje polskie i angielskie nazwy rodzajów', () => {
    expect(typeFromWord('Książki')).toBe('book');
    expect(typeFromWord('films')).toBe('video');
    expect(typeFromWord('Filmy')).toBe('video');
    expect(typeFromWord('seriale')).toBe('video');
    expect(typeFromWord('Kursy')).toBe('course');
    expect(typeFromWord('Podcasty')).toBe('podcast');
    expect(typeFromWord('Artykuły')).toBe('article');
    expect(typeFromWord('coś innego')).toBeNull();
  });
});

describe('parseLibraryList', () => {
  it('prosta lista tytułów dostaje rodzaj domyślny', () => {
    const { rows } = parseLibraryList('Dune\nNeuromancer\n\n  Solaris  ', 'book');
    expect(rows.map((r) => r.title)).toEqual(['Dune', 'Neuromancer', 'Solaris']);
    expect(rows.every((r) => r.resourceType === 'book' && r.source === 'paste')).toBe(true);
  });
  it('nagłówki przełączają rodzaj, a rok z nagłówka trafia do pozycji', () => {
    const { rows } = parseLibraryList('Książki:\nDune\nFilmy 2019:\nJoker\nMatrix\n2018:\nHeat', 'book');
    expect(rows.map((r) => [r.title, r.resourceType, r.finishedYear])).toEqual([
      ['Dune', 'book', null],
      ['Joker', 'video', 2019],
      ['Matrix', 'video', 2019],
      ['Heat', 'video', 2018],
    ]);
  });
  it('usuwa wypunktowania i numerację', () => {
    const { rows } = parseLibraryList('1. Dune\n- Solaris\n• Ubik\n* Valis', 'book');
    expect(rows.map((r) => r.title)).toEqual(['Dune', 'Solaris', 'Ubik', 'Valis']);
  });
  it('rozdziela tytuł i autora po myślniku z odstępami, ale nie psuje wyrazów z łącznikiem', () => {
    const { rows } = parseLibraryList('Dune — Frank Herbert\nAlicja w Krainie Czarów - Lewis Carroll\nSpider-Man', 'book');
    expect(rows[0]).toMatchObject({ title: 'Dune', author: 'Frank Herbert' });
    expect(rows[1]).toMatchObject({ title: 'Alicja w Krainie Czarów', author: 'Lewis Carroll' });
    expect(rows[2]).toMatchObject({ title: 'Spider-Man', author: null });
  });
  it('znacznik [film] zmienia rodzaj tylko dla tej linii', () => {
    const { rows } = parseLibraryList('[film] Joker\nDune', 'book');
    expect(rows.map((r) => r.resourceType)).toEqual(['video', 'book']);
  });
  it('wyciąga oceny z gwiazdek, x/5 i x/10 oraz strony w nawiasie', () => {
    const { rows } = parseLibraryList('Dune ★★★★\nSolaris 4.5/5\nHeat 8/10\nUbik (224 s.)\nValis 0/5', 'book');
    expect(rows.map((r) => r.rating)).toEqual([4, 4.5, 4, null, null]);
    expect(rows[3]).toMatchObject({ title: 'Ubik', pages: 224 });
  });
  it('ignoruje nieznane nagłówki z dwukropkiem jako zwykłe linie i nie gubi pustych tytułów', () => {
    const { rows, skipped } = parseLibraryList('Pulp Fiction: Wersja reżyserska\n—', 'video');
    expect(rows[0].title).toBe('Pulp Fiction: Wersja reżyserska');
    expect(skipped).toBe(1);
  });
  it('przycina zbyt długie tytuły i ogranicza liczbę wierszy', () => {
    expect(parseLibraryList('x'.repeat(500), 'book').rows[0].title).toHaveLength(200);
    const many = Array.from({ length: 1500 }, (_, i) => `T${i}`).join('\n');
    expect(parseLibraryList(many, 'book').rows).toHaveLength(1000);
  });
  it('puste wejście daje zero wierszy', () => {
    expect(parseLibraryList('', 'book')).toEqual({ rows: [], skipped: 0 });
  });
});

describe('parseCsv / parseCsvDate / clampRating', () => {
  it('obsługuje cudzysłowy, przecinki, podwójne cudzysłowy, CRLF i BOM', () => {
    const table = parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\r\n\r\nz,');
    expect(table).toEqual([['a', 'b'], ['x, y', 'he said "hi"'], ['z', '']]);
  });
  it('pole z nową linią zostaje jednym polem', () => {
    expect(parseCsv('a,b\n"l1\nl2",x')[1]).toEqual(['l1\nl2', 'x']);
  });
  it('daty w trzech formatach, nonsens i przyszłość to null', () => {
    expect(parseCsvDate('2019/05/01', TODAY)).toBe('2019-05-01');
    expect(parseCsvDate('2019-5-1', TODAY)).toBe('2019-05-01');
    expect(parseCsvDate('01.05.2019', TODAY)).toBe('2019-05-01');
    expect(parseCsvDate('2019-02-31', TODAY)).toBeNull();
    expect(parseCsvDate('2030-01-01', TODAY)).toBeNull();
    expect(parseCsvDate('', TODAY)).toBeNull();
    expect(parseCsvDate(undefined, TODAY)).toBeNull();
  });
  it('ocena jest zaokrąglana do połówek i ograniczona do 0.5-5', () => {
    expect(clampRating(4.3)).toBe(4.5);
    expect(clampRating(7)).toBe(5);
    expect(clampRating(0)).toBeNull();
    expect(clampRating(Number.NaN)).toBeNull();
  });
});

describe('parseLibraryCsv', () => {
  it('Goodreads: tylko półka „read”, strony, data, ocena 0 to brak oceny', () => {
    const csv = [
      'Book Id,Title,Author,My Rating,Number of Pages,Date Read,Exclusive Shelf',
      '1,Dune,Frank Herbert,5,612,2019/05/01,read',
      '2,Solaris,Stanisław Lem,0,224,,read',
      '3,Ubik,Philip K. Dick,4,224,,to-read',
    ].join('\n');
    const result = parseLibraryCsv(csv, TODAY);
    expect(result.format).toBe('goodreads');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ title: 'Dune', author: 'Frank Herbert', pages: 612, finishedOn: '2019-05-01', rating: 5, resourceType: 'book', source: 'csv' });
    expect(result.rows[1]).toMatchObject({ title: 'Solaris', rating: null, finishedOn: null });
  });
  it('Letterboxd: filmy z rokiem w tytule, datą obejrzenia i oceną', () => {
    const csv = ['Date,Name,Year,Letterboxd URI,Rating', '2024-03-10,Joker,2019,https://boxd.it/x,4.5'].join('\n');
    const result = parseLibraryCsv(csv, TODAY);
    expect(result.format).toBe('letterboxd');
    expect(result.rows[0]).toMatchObject({ title: 'Joker (2019)', resourceType: 'video', finishedOn: '2024-03-10', rating: 4.5 });
  });
  it('własny CSV z polskimi nagłówkami i rodzajem', () => {
    const csv = ['Tytuł,Autor,Rodzaj,Strony,Data,Ocena', 'Dune,Frank Herbert,książka,612,01.05.2019,5', 'Joker,,film,,,'].join('\n');
    const result = parseLibraryCsv(csv, TODAY);
    expect(result.format).toBe('generic');
    expect(result.rows[0]).toMatchObject({ resourceType: 'book', pages: 612, finishedOn: '2019-05-01' });
    expect(result.rows[1]).toMatchObject({ resourceType: 'video', author: null });
  });
  it('plik bez kolumny z tytułem lub pusty daje „unknown”', () => {
    expect(parseLibraryCsv('a,b\n1,2', TODAY).format).toBe('unknown');
    expect(parseLibraryCsv('', TODAY)).toEqual({ rows: [], skipped: 0, format: 'unknown' });
  });
  it('wiersz bez tytułu jest pomijany i policzony', () => {
    const result = parseLibraryCsv('Title,Author\n,X\nDune,Y', TODAY);
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });
});

describe('splitDuplicates', () => {
  const row = (title: string, author: string | null = null, resourceType: 'book' | 'video' = 'book') =>
    ({ title, author, resourceType, pages: null, finishedOn: null, finishedYear: null, rating: null, source: 'paste' as const });
  it('rozpoznaje duplikaty względem biblioteki bez względu na wielkość liter i spacje', () => {
    const { fresh, duplicates } = splitDuplicates(
      [row('  dune  '), row('Solaris')],
      [{ title: 'Dune', author: null, resource_type: 'book' }],
    );
    expect(fresh.map((r) => r.title)).toEqual(['Solaris']);
    expect(duplicates).toHaveLength(1);
  });
  it('powtórzenie w tej samej paczce liczy się jako duplikat, ten sam tytuł innego rodzaju nie', () => {
    const { fresh, duplicates } = splitDuplicates([row('Dune'), row('DUNE'), row('Dune', null, 'video')], []);
    expect(fresh).toHaveLength(2);
    expect(duplicates).toHaveLength(1);
  });
  it('autor rozróżnia pozycje o tym samym tytule', () => {
    const { fresh } = splitDuplicates([row('Dune', 'Herbert'), row('Dune', 'Inny')], []);
    expect(fresh).toHaveLength(2);
  });
});
