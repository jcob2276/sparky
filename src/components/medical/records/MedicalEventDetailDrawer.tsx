import { Calendar, Download, ExternalLink, FlaskConical, MapPin, Trash2 } from 'lucide-react';
import Sheet from '../../ui/Sheet';
import Button from '../../ui/Button';
import { Card } from '../../ui/Card';
import { confirmDialog } from '../../../lib/notify';
import { formatMedicalDocumentType, type MedicalTimelineItem } from '../../../lib/health/medicalRecords';

interface MedicalEventDetailDrawerProps {
  item: MedicalTimelineItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenLabs?: (markerKey?: string) => void;
  onDelete?: (eventId: string) => void;
}

function EventMarkersList({
  markers,
  onSelectMarker,
}: {
  markers: NonNullable<MedicalTimelineItem['labMarkers']>;
  onSelectMarker?: (markerKey?: string) => void;
}) {
  return (
    <div className="max-h-72 overflow-y-auto rounded-xl border border-border-custom bg-surface-1 divide-y divide-border-custom/40">
      {markers.map((m, idx) => {
        const isAlert = m.flag && m.flag !== 'N' && m.flag !== 'normal';
        const refStr = m.refLow != null && m.refHigh != null
          ? `${m.refLow} – ${m.refHigh}`
          : m.refText || '—';

        return (
          <div
            key={m.id || idx}
            onClick={() => onSelectMarker?.(m.markerKey)}
            className="flex items-center justify-between p-2.5 text-xs hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <div className="min-w-0 flex-1 pr-2">
              <p className={`font-bold truncate ${isAlert ? 'text-warning' : 'text-text-primary'}`}>
                {m.name}
              </p>
              <p className="text-3xs text-text-muted font-mono">Norma: {refStr}</p>
            </div>
            <div className="text-right shrink-0">
              <span className={`font-mono font-extrabold ${isAlert ? 'text-warning' : 'text-text-primary'}`}>
                {m.value} {m.unit}
              </span>
              {isAlert && (
                <span className="block text-3xs font-bold text-warning uppercase">Poza normą</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MedicalEventDetailDrawer({
  item,
  isOpen,
  onClose,
  onOpenLabs,
  onDelete,
}: MedicalEventDetailDrawerProps) {
  if (!item) return null;

  const typeInfo = formatMedicalDocumentType(item.documentType || (item.kind === 'lab' ? 'laboratory_report' : 'visit'));

  const handleDelete = async () => {
    if (!item.eventId || !onDelete) return;
    const confirmed = await confirmDialog('Czy na pewno chcesz usunąć ten wpis z Kartoteki?');
    if (confirmed) {
      onDelete(item.eventId);
      onClose();
    }
  };

  const markers = item.labMarkers ?? [];
  const outOfRangeMarkers = markers.filter((m) => m.flag && m.flag !== 'N' && m.flag !== 'normal');

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        <div className="flex items-center gap-2 min-w-0 pr-6">
          <span className={`text-3xs font-black uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${typeInfo.badgeColor}`}>
            {typeInfo.label}
          </span>
          <span className="truncate text-sm font-bold text-text-primary">{item.title}</span>
        </div>
      }
    >
      <div className="space-y-5 p-1 pb-8">
        <div className="rounded-2xl border border-border-custom bg-surface-1 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="flex items-center gap-1.5 font-bold text-text-primary">
              <Calendar size={13} className="text-primary" /> {item.occurredOn}
            </span>
            {item.specialty && (
              <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
                {item.specialty}
              </span>
            )}
          </div>
          {item.provider && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <MapPin size={12} className="shrink-0" />
              <span>{item.provider}</span>
            </div>
          )}
        </div>

        {item.summary && (
          <Card variant="surface" padding="1rem" className="space-y-1.5">
            <p className="text-3xs font-black uppercase tracking-wider text-text-muted">Opis / Podsumowanie</p>
            <p className="text-xs leading-relaxed text-text-secondary whitespace-pre-wrap">{item.summary}</p>
          </Card>
        )}

        {item.recommendations && (
          <Card variant="surface" padding="1rem" className="space-y-1.5 border-primary/20 bg-primary/[0.02]">
            <p className="text-3xs font-black uppercase tracking-wider text-primary">Zalecenia Lekarskie</p>
            <p className="text-xs leading-relaxed text-text-primary whitespace-pre-wrap">{item.recommendations}</p>
          </Card>
        )}

        {markers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                  <FlaskConical size={14} className="text-primary" /> Zbadane Markery ({markers.length})
                </h4>
                {outOfRangeMarkers.length > 0 && (
                  <span className="text-3xs text-warning font-bold">
                    {outOfRangeMarkers.length} poza zakresem referencyjnym
                  </span>
                )}
              </div>
              {onOpenLabs && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onClose();
                    onOpenLabs();
                  }}
                  className="text-primary text-xs"
                >
                  Otwórz w Laboratorium <ExternalLink size={12} />
                </Button>
              )}
            </div>

            <EventMarkersList
              markers={markers}
              onSelectMarker={(k) => {
                if (onOpenLabs) {
                  onClose();
                  onOpenLabs(k);
                }
              }}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2 border-t border-border-custom/50">
          {item.sourcePath && (
            <a
              href={item.sourcePath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-border-custom bg-surface-2 py-2.5 px-4 text-xs font-bold text-primary hover:bg-surface-3 transition-colors"
            >
              <Download size={14} /> Pobierz dokument źródłowy
            </a>
          )}

          {item.eventId && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-error hover:bg-error/10 self-center text-xs"
            >
              <Trash2 size={13} /> Usuń ten wpis
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
