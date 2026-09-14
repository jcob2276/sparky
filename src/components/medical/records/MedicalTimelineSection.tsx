import { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarCheck,
  ChevronRight,
  Download,
  FileText,
  FlaskConical,
  MapPin,
  Scale,
  Search,
  Stethoscope,
  X,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import {
  formatMedicalDocumentType,
  type MedicalTimelineItem,
} from '../../../lib/health/medicalRecords';

interface MedicalTimelineSectionProps {
  timeline: MedicalTimelineItem[];
  onSelectItem: (item: MedicalTimelineItem) => void;
}

const TIMELINE_ICONS: Record<string, typeof Stethoscope> = {
  visit: Stethoscope,
  lab: FlaskConical,
  procedure: CalendarCheck,
  vaccination: CalendarCheck,
  body_composition_bia: Scale,
  other: FileText,
  document: FileText,
};

function TimelineCardRow({
  item,
  onSelectItem,
}: {
  item: MedicalTimelineItem;
  onSelectItem: (item: MedicalTimelineItem) => void;
}) {
  const Icon = TIMELINE_ICONS[item.documentType || item.kind] || FileText;
  const typeInfo = formatMedicalDocumentType(
    item.documentType || (item.kind === 'lab' ? 'laboratory_report' : 'visit'),
  );
  const markers = item.labMarkers ?? [];
  const outOfRange = markers.filter((m) => m.flag && m.flag !== 'N' && m.flag !== 'normal');

  return (
    <article
      onClick={() => onSelectItem(item)}
      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border-custom bg-surface-1 p-3.5 sm:p-4 hover:border-primary/40 hover:bg-surface-2 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-3xs font-black uppercase tracking-wider px-2 py-0.5 rounded border ${typeInfo.badgeColor}`}>
              {typeInfo.label}
            </span>
            <time className="text-3xs font-semibold text-text-muted flex items-center gap-1">
              <Calendar size={11} /> {item.occurredOn}
            </time>
            {item.provider && (
              <span className="text-3xs text-text-muted flex items-center gap-0.5 truncate max-w-[200px]">
                <MapPin size={10} /> {item.provider}
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold text-text-primary mt-1 group-hover:text-primary transition-colors truncate">
            {item.title}
          </h3>

          {item.detail && (
            <p className="mt-1 text-xs text-text-secondary line-clamp-1">
              {item.detail}
            </p>
          )}

          {markers.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {markers.slice(0, 4).map((m, idx) => {
                const isAlert = m.flag && m.flag !== 'N' && m.flag !== 'normal';
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-3xs font-mono font-bold border ${
                      isAlert
                        ? 'border-warning/30 bg-warning/10 text-warning'
                        : 'border-border-custom/50 bg-background/50 text-text-secondary'
                    }`}
                  >
                    {m.name}: {m.value} {m.unit}
                  </span>
                );
              })}
              {markers.length > 4 && (
                <span className="text-3xs font-bold text-text-muted">
                  +{markers.length - 4} więcej…
                </span>
              )}
              {outOfRange.length > 0 && (
                <span className="text-3xs font-black text-warning ml-1">
                  ({outOfRange.length} poza normą)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {item.sourcePath && (
          <a
            href={item.sourcePath}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg border border-border-custom text-text-muted hover:text-primary hover:bg-surface-3 transition-colors"
            title="Pobierz plik źródłowy"
          >
            <Download size={13} />
          </a>
        )}
        <span className="flex items-center text-xs font-bold text-text-muted group-hover:text-primary transition-colors">
          Szczegóły <ChevronRight size={14} />
        </span>
      </div>
    </article>
  );
}

export default function MedicalTimelineSection({
  timeline,
  onSelectItem,
}: MedicalTimelineSectionProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTimeline = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return timeline.filter((item) => {
      if (q) {
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDetail = item.detail?.toLowerCase().includes(q);
        const matchesProvider = item.provider?.toLowerCase().includes(q);
        const matchesSpecialty = item.specialty?.toLowerCase().includes(q);
        const matchesMarker = item.labMarkers?.some((m) => m.name.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDetail && !matchesProvider && !matchesSpecialty && !matchesMarker) {
          return false;
        }
      }

      if (activeFilter === 'labs') {
        return item.kind === 'lab' || item.documentType === 'laboratory_report' || item.documentType === 'processed';
      }
      if (activeFilter === 'visits') {
        return item.kind === 'visit' || item.documentType === 'visit';
      }
      if (activeFilter === 'imaging') {
        return item.documentType === 'laryngoscopy_images' || item.documentType === 'imaging' || item.kind === 'procedure';
      }

      return true;
    });
  }, [timeline, activeFilter, searchQuery]);

  const groupedByYear = useMemo(() => {
    const map = new Map<string, MedicalTimelineItem[]>();
    for (const item of filteredTimeline) {
      const year = item.occurredOn ? item.occurredOn.slice(0, 4) : 'Inne';
      const list = map.get(year) || [];
      list.push(item);
      map.set(year, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTimeline]);

  const counts = useMemo(() => ({
    all: timeline.length,
    labs: timeline.filter((i) => i.kind === 'lab' || i.documentType === 'laboratory_report').length,
    visits: timeline.filter((i) => i.kind === 'visit' || i.documentType === 'visit').length,
    imaging: timeline.filter((i) => i.documentType === 'laryngoscopy_images' || i.kind === 'procedure').length,
  }), [timeline]);

  return (
    <section aria-labelledby="timeline-heading" className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border-custom/50 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="timeline-heading" className="text-xl font-black font-display uppercase tracking-tight text-text-primary">
              Oś Zdrowia & Dokumentacja
            </h2>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-3xs font-bold text-text-muted">
              {filteredTimeline.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            Kompletna, chronologiczna historia Twoich wizyt, procedur i wyników laboratoryjnych
          </p>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <ControlInput
            type="text"
            placeholder="Szukaj w historii…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-7 py-1.5 text-xs rounded-xl border border-border-custom bg-background w-44 sm:w-56 focus:border-primary transition-all"
          />
          {searchQuery && (
            <Pressable
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
            >
              <X size={12} />
            </Pressable>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          { id: 'all', label: `Wszystkie (${counts.all})` },
          { id: 'labs', label: `Badania laboratoryjne (${counts.labs})` },
          { id: 'visits', label: `Wizyty & Lekarze (${counts.visits})` },
          { id: 'imaging', label: `Badania obrazowe (${counts.imaging})` },
        ].map((tab) => (
          <Pressable
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeFilter === tab.id
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-text-muted hover:text-text-primary border border-transparent'
            }`}
          >
            {tab.label}
          </Pressable>
        ))}
      </div>

      {groupedByYear.length === 0 ? (
        <Card variant="surface" className="py-12 text-center">
          <FlaskConical className="mx-auto text-text-muted" size={28} />
          <p className="mt-3 font-bold text-text-primary">Brak wyników spełniających kryteria</p>
          <p className="mt-1 text-xs text-text-muted">Zmień filtr lub wpisz inne hasło wyszukiwania.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedByYear.map(([year, items]) => (
            <div key={year} className="space-y-2">
              <div className="sticky top-28 z-10 py-1 bg-background/80 backdrop-blur-sm">
                <span className="inline-block rounded-md bg-surface-3 px-2 py-0.5 text-3xs font-black uppercase tracking-wider text-text-muted">
                  Rok {year}
                </span>
              </div>

              <div className="space-y-2">
                {items.map((item) => (
                  <TimelineCardRow
                    key={item.id}
                    item={item}
                    onSelectItem={onSelectItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
