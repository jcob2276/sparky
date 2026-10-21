import { describe, expect, it } from 'vitest';
import { dropLeadingTitle, looksLikeMarkdown, markdownToHtml, stripMarkdown, toDisplayHtml } from './markdownLite';

describe('markdownLite', () => {
  it('detects raw markdown but never touches existing HTML', () => {
    expect(looksLikeMarkdown('# Sesja\n**Data:** dziś')).toBe(true);
    expect(looksLikeMarkdown('zwykły tekst bez znaczników')).toBe(false);
    expect(looksLikeMarkdown('<p># nie ruszaj</p>')).toBe(false);
    expect(toDisplayHtml('<p>**x**</p>')).toBe('<p>**x**</p>');
  });

  it('renders headings, bold, lists and rules', () => {
    const html = markdownToHtml('# Tytuł\n**Data sesji:** 24.09\n\n- a\n- b\n\n1. x\n2. y\n---');
    expect(html).toContain('<h1>Tytuł</h1>');
    expect(html).toContain('<strong>Data sesji:</strong>');
    expect(html).toContain('<ul><li>a</li><li>b</li></ul>');
    expect(html).toContain('<ol><li>x</li><li>y</li></ol>');
    expect(html).toContain('<hr>');
  });

  it('escapes raw HTML inside markdown text', () => {
    expect(markdownToHtml('# <script>alert(1)</script>')).toBe('<h1>&lt;script&gt;alert(1)&lt;/script&gt;</h1>');
  });

  it('strips markers for list previews', () => {
    expect(stripMarkdown('# Sesja #1\n**Data sesji:** 24.09\n- punkt')).toBe('Sesja #1 Data sesji: 24.09 punkt');
  });

  it('drops a leading heading that repeats the card title, even with an emoji', () => {
    const html = '<h1>Sesja #1 (24.09)</h1><p>treść</p>';
    expect(dropLeadingTitle(html, '🧠 Sesja #1 (24.09)')).toBe('<p>treść</p>');
    expect(dropLeadingTitle(html, 'Coś innego')).toBe(html);
  });
});
