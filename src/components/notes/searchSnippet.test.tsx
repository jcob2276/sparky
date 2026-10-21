import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { highlightText, snippetAround } from './searchSnippet';

describe('searchSnippet', () => {
  const long = `${'wstęp '.repeat(30)}kluczowe słowo w środku ${'koniec '.repeat(30)}`;

  it('centers the snippet on the first match and marks truncation', () => {
    const snippet = snippetAround(long, 'kluczowe');
    expect(snippet).toContain('kluczowe słowo');
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
    expect(snippet.length).toBeLessThan(160);
  });

  it('keeps short text and falls back to the start when nothing matches', () => {
    expect(snippetAround('krótko', 'x')).toBe('krótko');
    expect(snippetAround(long, 'brakuje').startsWith('wstęp')).toBe(true);
  });

  it('highlights every term, case-insensitively, and survives regex characters', () => {
    const { container } = render(<p>{highlightText('Plan Pilne plan (a+b)', 'plan (a+b)')}</p>);
    const marks = [...container.querySelectorAll('mark')].map(mark => mark.textContent);
    expect(marks).toEqual(['Plan', 'plan', '(a+b)']);
  });

  it('returns text untouched for an empty query', () => {
    expect(highlightText('abc', '  ')).toBe('abc');
  });
});
