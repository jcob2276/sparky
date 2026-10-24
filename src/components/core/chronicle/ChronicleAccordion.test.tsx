import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../hooks/useHaptics', () => {
  const haptics = { light: vi.fn(), medium: vi.fn(), success: vi.fn(), selection: vi.fn() };
  return { haptics, useHaptics: () => haptics };
});

import ChronicleAccordion from './ChronicleAccordion';

describe('ChronicleAccordion', () => {
  it('zwinięta pokazuje tytuł i podgląd, ale nie montuje zawartości', () => {
    render(<ChronicleAccordion title="Sylwetka i pomiary" preview="Waga 77,5 kg · Tłuszcz 21,2%"><p>wykresy</p></ChronicleAccordion>);
    expect(screen.getByText('Waga 77,5 kg · Tłuszcz 21,2%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sylwetka i pomiary/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('wykresy')).toBeNull();
  });

  it('otwarcie pokazuje zawartość i chowa podgląd, drugie dotknięcie zwija', () => {
    render(<ChronicleAccordion title="Siłownia" preview="12 ostatnich sesji"><p>historia</p></ChronicleAccordion>);
    const header = screen.getByRole('button', { name: /Siłownia/ });
    fireEvent.click(header);
    expect(screen.getByText('historia')).toBeInTheDocument();
    expect(screen.queryByText('12 ostatnich sesji')).toBeNull();
    expect(header).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(header);
    expect(screen.queryByText('historia')).toBeNull();
  });

  it('może startować otwarta', () => {
    render(<ChronicleAccordion title="Sen" defaultOpen><p>kafelki</p></ChronicleAccordion>);
    expect(screen.getByText('kafelki')).toBeInTheDocument();
  });
});
