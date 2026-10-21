import type { ReactNode } from 'react';

const escapeRegExp = (value: string) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const searchTerms = (query: string) => query.trim().split(/\s+/).filter(Boolean);

/** Fragment tekstu wokół pierwszego trafienia, żeby wynik wyszukiwania pokazywał, czemu notatka pasuje. */
export function snippetAround(text: string, query: string, max = 140): string {
  if (text.length <= max) return text;
  const lower = text.toLocaleLowerCase('pl-PL');
  const hits = searchTerms(query)
    .map(term => lower.indexOf(term.toLocaleLowerCase('pl-PL')))
    .filter(index => index >= 0);
  if (!hits.length) return text.slice(0, max);
  const start = Math.max(0, Math.min(...hits) - Math.floor(max / 3));
  const end = Math.min(text.length, start + max);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

/** Zaznacza trafienia zapytania w zwykłym tekście (bez dangerouslySetInnerHTML). */
export function highlightText(text: string, query: string): ReactNode {
  const terms = searchTerms(query);
  if (!terms.length || !text) return text;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  return text.split(pattern).map((part, index) => (
    index % 2 === 1
      ? <mark key={index} className="rounded-sm bg-warning/40 px-0.5 text-inherit">{part}</mark>
      : part
  ));
}
