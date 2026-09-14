import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import type { NewMetricState } from './BodyMetricsSection';

interface BodyCircumferencesDrawerProps {
  expanded: boolean;
  onToggle: () => void;
  newMetric: NewMetricState;
  set: (key: keyof NewMetricState) => (v: string) => void;
  latestBody: {
    neck: number | null;
    chest: number | null;
    belly: number | null;
    hips: number | null;
    thigh: number | null;
    biceps_l: number | null;
    calf: number | null;
  } | null;
}

function Field({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-3xs font-bold uppercase tracking-wider text-text-muted font-display block">
        {label}
      </label>
      <div className="relative">
        <ControlInput
          type="text" inputMode="decimal" value={value}
          onChange={(e) => onChange(e.target.value.replace(',', '.'))}
          placeholder={placeholder ?? '--'}
          className="w-full rounded-xl border border-border-custom bg-surface px-3 py-2 text-sm font-black text-text-primary outline-none transition-all placeholder:text-text-muted/60 focus:border-primary/50 focus:bg-surface-solid focus:shadow-focus"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-3xs font-bold text-text-muted pointer-events-none">
          cm
        </span>
      </div>
    </div>
  );
}

export function BodyCircumferencesDrawer({
  expanded,
  onToggle,
  newMetric,
  set,
  latestBody,
}: BodyCircumferencesDrawerProps) {
  return (
    <div className="space-y-3">
      <Pressable
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-xl border border-border-custom bg-surface/60 px-3.5 py-2.5 text-xs font-bold text-text-muted transition-all hover:text-text-primary hover:bg-surface cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-primary/70" />
          Szczegółowe obwody (Klatka, Biodra, Ramiona, Nogi)
        </span>
        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </Pressable>

      {expanded && (
        <div className="rounded-xl border border-border-custom bg-surface/80 p-3.5 space-y-3">
          <div className="space-y-2">
            <p className="text-3xs font-bold uppercase tracking-wider text-text-muted">Tułów</p>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Klatka" value={newMetric.chest} onChange={set('chest')} placeholder={latestBody?.chest ? String(latestBody.chest) : '--'} />
              <Field label="Brzuch" value={newMetric.belly} onChange={set('belly')} placeholder={latestBody?.belly ? String(latestBody.belly) : '--'} />
              <Field label="Biodra" value={newMetric.hips} onChange={set('hips')} placeholder={latestBody?.hips ? String(latestBody.hips) : '--'} />
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-border-custom/50">
            <p className="text-3xs font-bold uppercase tracking-wider text-text-muted">Kończyny & Szyja</p>
            <div className="grid grid-cols-4 gap-2">
              <Field label="Szyja" value={newMetric.neck} onChange={set('neck')} placeholder={latestBody?.neck ? String(latestBody.neck) : '~37'} />
              <Field label="Biceps L" value={newMetric.biceps_l} onChange={set('biceps_l')} placeholder={latestBody?.biceps_l ? String(latestBody.biceps_l) : '--'} />
              <Field label="Udo" value={newMetric.thigh} onChange={set('thigh')} placeholder={latestBody?.thigh ? String(latestBody.thigh) : '--'} />
              <Field label="Łydka" value={newMetric.calf} onChange={set('calf')} placeholder={latestBody?.calf ? String(latestBody.calf) : '--'} />
            </div>
          </div>

          <p className="text-3xs text-text-muted leading-relaxed pt-1">
            💡 Pomiar rano na czczo. Talia = najwęższe miejsce. Brzuch = poziom pępka. Biodra = najszerszy punkt pośladków. US Navy liczy BF% z logarytmu różnicy obwodów.
          </p>
        </div>
      )}
    </div>
  );
}
