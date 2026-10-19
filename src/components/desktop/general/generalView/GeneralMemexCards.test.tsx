import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { WikiEntry } from './GeneralMemexCards';
import * as sources from '../../../../lib/memorySourcesApi';
import type { GeneralViewWiki } from '../../../../lib/generalMemoryApi';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const page = {
  id: 'page-one', title: 'Przerwy pomagają', page_type: 'behavior_pattern', status: 'active', confidence: 0.7,
  summary: 'Krótka teza', content_md: '## Teza\nPełna teza z kontekstem.', tags: [], last_seen_at: null,
  last_compiled_at: null,
  source_refs: [{ table: 'vanguard_stream', id: 'source-one', date: '2026-10-18', quote: 'Po spacerze wróciłem do zadania' }],
};

function renderPage(w: GeneralViewWiki = page) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><WikiEntry w={w} userId="user-one" /></QueryClientProvider>);
}

it('expands a thesis and citation, then retrieves the actual source on demand', async () => {
  vi.spyOn(sources, 'fetchMemorySource').mockResolvedValue({ status: 'available', text: 'Pełny oryginalny wpis', date: null, date_precision: null });
  renderPage();
  expect(screen.queryByText('Po spacerze wróciłem do zadania')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Przerwy pomagają/ }));
  expect(screen.getByText(/Pełna teza z kontekstem/)).toBeInTheDocument();
  expect(screen.getByText('Po spacerze wróciłem do zadania')).toBeInTheDocument();
  expect(screen.getByText(/18.10.2026/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pokaż oryginał' }));
  expect(await screen.findByText('Pełny oryginalny wpis')).toBeInTheDocument();
});

it('makes missing sources explicit without presenting the stored quote as an original', async () => {
  vi.spyOn(sources, 'fetchMemorySource').mockResolvedValue({ status: 'missing' });
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: /Przerwy pomagają/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Pokaż oryginał' }));
  expect(await screen.findByText(/Źródło usunięte lub niedostępne/)).toBeInTheDocument();
});

it('lets a failed original retrieval be retried', async () => {
  vi.spyOn(sources, 'fetchMemorySource').mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ status: 'available', text: 'Odzyskany wpis', date: null, date_precision: null });
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: /Przerwy pomagają/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Pokaż oryginał' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się pobrać źródła');
  fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
  await waitFor(() => expect(screen.getByText('Odzyskany wpis')).toBeInTheDocument());
});

it('states when a thesis has no verifiable citations or known compilation date', () => {
  renderPage({ ...page, source_refs: [] });
  fireEvent.click(screen.getByRole('button', { name: /Przerwy pomagają/ }));
  expect(screen.getByText(/Brak odnośników do źródeł/)).toBeInTheDocument();
  expect(screen.getByText(/Kompilacja: Data nieznana/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Pokaż oryginał' })).not.toBeInTheDocument();
});

it('marks a hypothesis before the reader opens its sources', () => {
  renderPage({ ...page, status: 'hypothesis' });
  expect(screen.getByText('Hipoteza')).toBeInTheDocument();
});
