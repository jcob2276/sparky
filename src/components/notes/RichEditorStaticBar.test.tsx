import { act, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import RichEditorStaticBar from './RichEditorStaticBar';

it('keeps the same dock when the keyboard moves the visible viewport and the editor loses focus', async () => {
  const viewport = Object.assign(new EventTarget(), {
    height: 800, width: 440, offsetTop: 0, offsetLeft: 0,
  });
  const height = vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(800);
  const width = vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(440);
  vi.stubGlobal('visualViewport', viewport);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  const view = render(<RichEditorStaticBar docked showStaticBar onAction={vi.fn()} activeState={{
    bold: false, italic: false, h1: false, h2: false, list: false, numList: false,
    underline: false, strikethrough: false, blockquote: false,
  }} />);
  try {
    const button = screen.getByRole('button', { name: 'Tabela' });
    const dock = button.closest<HTMLElement>('.keep-static-bar-docked')!;
    expect(dock.parentElement).toBe(document.body);
    act(() => {
      Object.assign(viewport, { height: 400, offsetTop: 60 });
      viewport.dispatchEvent(new Event('resize'));
      document.dispatchEvent(new FocusEvent('focusout'));
    });
    await waitFor(() => expect(dock.style.bottom).toContain('340px'));
    expect(screen.getByRole('button', { name: 'Tabela' })).toBe(button);
  } finally {
    view.unmount();
    height.mockRestore();
    width.mockRestore();
    vi.unstubAllGlobals();
  }
});
