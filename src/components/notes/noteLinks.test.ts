import { expect, it } from 'vitest';
import { noteLinkHtml } from './noteLinks';

it('turns a pasted URL into a link and safely preserves selected text', () => {
  const container = document.createElement('div');
  container.innerHTML = noteLinkHtml(' https://example.com/?a=1&b=2 ', '<plan>') ?? '';
  expect(container.querySelector('a')?.href).toBe('https://example.com/?a=1&b=2');
  expect(container.textContent).toBe('<plan>');
});

it('leaves unsupported protocols and ordinary text as plain text', () => {
  expect(noteLinkHtml('javascript:alert(1)')).toBeNull();
  expect(noteLinkHtml('Zobacz https://example.com')).toBeNull();
});
