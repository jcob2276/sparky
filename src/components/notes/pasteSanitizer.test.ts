// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sanitizePastedHtml } from './pasteSanitizer';

describe('sanitizePastedHtml', () => {
  it('drops the source styling but keeps structure', () => {
    const html = '<p style="background-color: rgb(255,255,255); color: #000"><span style="font-family: Arial"><b>Nowy</b> samochód</span></p><ul><li class="x">jeden</li></ul>';
    expect(sanitizePastedHtml(html)).toBe('<p><b>Nowy</b> samochód</p><ul><li>jeden</li></ul>');
  });

  it('unwraps unknown tags and removes comments', () => {
    expect(sanitizePastedHtml('<!--StartFragment--><font color="red">tekst</font><!--EndFragment-->')).toBe('tekst');
  });

  it('drops scripts, styles, images and embeds entirely', () => {
    const html = '<script>alert(1)</script><style>p{}</style><p>ok<img src="http://t/x.png"><iframe src="x"></iframe></p>';
    expect(sanitizePastedHtml(html)).toBe('<p>ok</p>');
  });

  it('keeps safe links and removes dangerous ones', () => {
    expect(sanitizePastedHtml('<a href="https://example.com" onclick="x()">a</a>'))
      .toBe('<a href="https://example.com" target="_blank" rel="noreferrer noopener">a</a>');
    expect(sanitizePastedHtml('<a href="javascript:alert(1)">b</a>')).toBe('<a>b</a>');
  });
});
