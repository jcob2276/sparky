import type { HouseDisclosureDocument } from '../../lib/investments/useCongressOverview';

export function HouseDisclosureDocuments({ documents }: { documents: HouseDisclosureDocument[] }) {
  if (!documents.length) return null;
  return <section className="rounded-2xl border border-border-custom bg-surface-elevated p-4 space-y-3">
    <h3 className="text-sm font-bold text-text-primary">Najnowsze dokumenty Izby Reprezentantów</h3>
    <p className="text-xs text-text-muted">Publikacja pojawia się tutaj także wtedy, gdy skan wymaga odczytania. Data zgłoszenia pochodzi z oficjalnego indeksu House PTR.</p>
    <ul className="divide-y divide-border-custom/40">
      {documents.map((doc) => <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
        <div><span className="font-semibold text-text-primary">{doc.filer_name}</span>
          <span className="ml-2 text-text-muted">{doc.filing_date}</span>
          <span className="ml-2 text-text-muted">{doc.parse_status === 'parsed'
            ? `${doc.transaction_count ?? '—'} transakcji` : doc.parse_status === 'error'
              ? 'Dokument wymaga odczytania' : 'W kolejce do odczytania'}</span>
        </div>
        <a href={doc.source_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Otwórz oficjalny PDF</a>
      </li>)}
    </ul>
  </section>;
}
