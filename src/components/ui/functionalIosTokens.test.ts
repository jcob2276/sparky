// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

function contractBlock(marker: string) {
  const start = css.indexOf(marker);
  if (start < 0) throw new Error(`Missing CSS marker: ${marker}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

describe('Functional iOS token contract', () => {
  it('uses system canvases and semantic colours', () => {
    const light = contractBlock('/* Functional iOS light */');
    const dark = contractBlock('/* Functional iOS dark */');

    expect(light).toContain('--background: #F2F2F7;');
    expect(light).toContain('--surface: #FFFFFF;');
    expect(light).toContain('--primary: #007AFF;');
    expect(light).toContain('--direction: #FF9500;');
    expect(light).toContain('--color-success: #34C759;');
    expect(light).toContain('--attention: #5856D6;');
    expect(dark).toContain('--background: #000000;');
    expect(dark).toContain('--surface: #1C1C1E;');
    expect(dark).toContain('--surface-3: #2C2C2E;');
  });

  it('defines geometry by component role', () => {
    const light = contractBlock('/* Functional iOS light */');

    expect(light).toContain('--radius-grouped: 14px;');
    expect(light).toContain('--radius-hero: 22px;');
    expect(light).toContain('--radius-sheet: 28px;');
    expect(light).toContain('--text-screen-title: 34px;');
  });

  it('does not paint a decorative gradient on the application canvas', () => {
    const body = contractBlock('html, body');
    expect(body).not.toContain('radial-gradient');
    expect(body).not.toContain('background-image');
  });
});
