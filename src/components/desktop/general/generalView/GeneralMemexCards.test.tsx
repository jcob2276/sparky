import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { WikiEntry } from './GeneralMemexCards';
import * as sources from '../../../../lib/memorySourcesApi';
import type { GeneralViewWiki } from '../../../../lib/generalMemoryApi';
import * as wikiSources from '../../../../lib/wikiSourcesApi';

beforeEach(() => vi.spyOn(wikiSources, 'fetchWikiSources').mockResolvedValue([]));

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
  expect(await screen.findByText('Po spacerze wróciłem do zadania')).toBeInTheDocument();
  expect(screen.getByText(/18.10.2026/)).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Pokaż oryginał' }));
  expect(await screen.findByText('Pełny oryginalny wpis')).toBeInTheDocument();
});

it('makes missing sources explicit without presenting the stored quote as an original', async () => {
  vi.spyOn(sources, 'fetchMemorySource').mockResolvedValue({ status: 'missing' });
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: /Przerwy pomagają/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Pokaż oryginał' }));
  expect(await screen.findByText(/Źródło usunięte lub niedostępne/)).toBeInTheDocument();
});

it('lets a failed original retrieval be retried', async () => {
  vi.spyOn(sources, 'fetchMemorySource').mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ status: 'available', text: 'Odzyskany wpis', date: null, date_precision: null });
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: /Przerwy pomagają/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Pokaż oryginał' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się pobrać źródła');
  fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
  await waitFor(() => expect(screen.getByText('Odzyskany wpis')).toBeInTheDocument());
});

it('states when a thesis has no verifiable citations or known compilation date', async () => {
  renderPage({ ...page, source_refs: [] });
  fireEvent.click(screen.getByRole('button', { name: /Przerwy pomagają/ }));
  expect(await screen.findByText(/Brak odnośników do źródeł/)).toBeInTheDocument();
  expect(screen.getByText(/Kompilacja: Data nieznana/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Pokaż oryginał' })).not.toBeInTheDocument();
});

it('marks a hypothesis before the reader opens its sources', () => {
  renderPage({ ...page, status: 'hypothesis' });
  expect(screen.getByText('Hipoteza')).toBeInTheDocument();
});

it('reads compiled wiki sources only after expansion, preferring them to legacy references', async () => {
  vi.mocked(wikiSources.fetchWikiSources).mockResolvedValue([{
    id: 'compiled-source', source_table: 'daily_reconciliations', source_id: 'reflection',
    source_date: '2026-07-01T22:30:00Z', quote: 'x'.repeat(180), relevance: 0.95,
  }]);
  const original = vi.spyOn(sources, 'fetchMemorySource').mockResolvedValue({ status: 'missing' });
  renderPage();
  expect(wikiSources.fetchWikiSources).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Przerwy pomagają/ }));
  expect(screen.getByRole('status')).toHaveTextContent('Pobieranie źródeł');
  expect(await screen.findByText('Refleksja dnia')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Źródła' })).toBeInTheDocument();
  expect(wikiSources.fetchWikiSources).toHaveBeenCalledWith('user-one', 'page-one');
  expect(screen.getByText('02.07.2026 · 00:30')).toBeInTheDocument();
  expect(screen.getByText(`${'x'.repeat(159)}…`)).toBeInTheDocument();
  expect(screen.queryByText('Po spacerze wróciłem do zadania')).not.toBeInTheDocument();
  expect(original).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Pokaż oryginał' }));
  await waitFor(() => expect(original).toHaveBeenCalledWith('user-one', expect.objectContaining({ table: 'daily_reconciliations', id: 'reflection' })));
});

it('surfaces a failed wiki sources read and allows retrying it', async () => {
  vi.mocked(wikiSources.fetchWikiSources).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: /Przerwy pomagają/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się pobrać źródeł strony');
  expect(screen.queryByText(/Brak odnośników/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
  expect(await screen.findByText('Po spacerze wróciłem do zadania')).toBeInTheDocument();
});
