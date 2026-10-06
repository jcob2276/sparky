import { useState } from 'react';
import Button from '../ui/Button';
import type { HouseDisclosureDocument } from '../../lib/investments/houseDisclosureDocuments';

export function HouseDisclosureDocuments({ documents }: { documents: HouseDisclosureDocument[] }) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [visible, setVisible] = useState(10);
  if (!documents.length) return null;
  const unread = documents.filter(doc => doc.parse_status !== 'parsed');
  const shown = unreadOnly ? unread : documents;
  return <section className="rounded-2xl border border-border-custom bg-surface-elevated p-4 space-y-3">
    <h3 className="text-sm font-bold text-text-primary">Dokumenty Izby Reprezentantów ({documents.length})</h3>
    <p className="text-xs text-text-muted">Publikacja pojawia się tutaj także wtedy, gdy skan wymaga odczytania. Data zgłoszenia pochodzi z oficjalnego indeksu House PTR.</p>
    <p className="text-xs text-text-muted">{unread.length} dokumentów bez odczytanych transakcji w wybranym okresie i dla wybranego autora. Filtry partii i tickera dotyczą tabeli transakcji poniżej; dokument bez odczytu nie ma potwierdzonego tickera.</p>
    <Button size="sm" variant="secondary" onClick={() => { setUnreadOnly(!unreadOnly); setVisible(10); }}>
      {unreadOnly ? 'Wszystkie dokumenty' : 'Tylko nieodczytane'}
    </Button>
    {unreadOnly && !shown.length && <p className="text-xs text-text-muted">W odczytanym indeksie nie ma dokumentów oczekujących na odczyt w tym zakresie.</p>}
    <ul className="divide-y divide-border-custom/40">
      {shown.slice(0, visible).map((doc) => <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
        <div><span className="font-semibold text-text-primary">{doc.filer_name}</span>
          <span className="ml-2 text-text-muted">{doc.filing_date}</span>
          <span className="ml-2 text-text-muted">{doc.parse_status === 'parsed'
            ? `${doc.transaction_count ?? '—'} transakcji` : doc.parse_status === 'error'
              ? doc.parse_error?.includes('OCR') ? 'Skan wymaga OCR' : 'Dokument wymaga odczytania' : 'W kolejce do odczytania'}</span>
        </div>
        <a href={doc.source_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Otwórz oficjalny PDF</a>
      </li>)}
    </ul>
    {visible < shown.length && <Button size="sm" variant="secondary" onClick={() => setVisible(visible + 20)}>Pokaż kolejne dokumenty ({shown.length - visible})</Button>}
  </section>;
}
