import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

function createCanvasContext() {
  return {
    beginPath() {},
    clearRect() {},
    lineTo() {},
    moveTo() {},
    setLineDash() {},
    stroke() {},
  };
}

describe('Poker Decision Lab', () => {
  it('evaluates a CALL even when audio is unavailable', () => {
    const html = readFileSync('public/poker/index.html', 'utf8');
    const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
    const applicationScript = scripts.at(-1)?.[1];

    expect(applicationScript).toBeTruthy();

    const window = new Window({ url: 'http://localhost/poker/index.html' });
    const innerTextDescriptor = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'innerText');
    Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
      ...innerTextDescriptor,
      set(value: unknown) {
        innerTextDescriptor?.set?.call(this, String(value));
      },
    });
    window.HTMLCanvasElement.prototype.getContext = () => createCanvasContext() as never;
    window.document.write(html.replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/g, ''));
    window.eval(`${applicationScript}\nwindow.__pokerHandleDecision = handleUserDecision;`);
    window.dispatchEvent(new window.Event('DOMContentLoaded'));

    (window as Window & { __pokerHandleDecision: (action: 'CALL') => void })
      .__pokerHandleDecision('CALL');

    expect(window.document.getElementById('decisionBadge')?.textContent)
      .not.toContain('Oczekiwanie na ruch');
  });
});
