import { Card } from '../../ui/Card';
import { CheckCircle2, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { formatMedicalDate } from '../../../lib/health/medicalAnalytics';

export interface MarkerTrend {
  key: string;
  name: string;
  category: string | null;
  pctChange: number;
  absoluteChange: number;
  unit: string;
  ref_text: string | null;
  ref_low: number | null;
  ref_high: number | null;
  currentValue: number;
  prevValue: number;
  history: Array<{ id: string; result_date: string; value: number; unit: string | null; source_name?: string | null; provider?: string | null }>;
}

interface MedicalTrendDetailCardProps {
  selectedTrend: MarkerTrend;
  insight: string | null;
}

export function MedicalTrendDetailCard({ selectedTrend, insight }: MedicalTrendDetailCardProps) {
  return (
    <Card variant="surface" padding="1.25rem" className="lg:col-span-2 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-custom/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xs font-black uppercase text-primary tracking-wider">{selectedTrend.category || 'Marker'}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-3xs font-bold text-primary">
              <CheckCircle2 size={10} /> W normie
            </span>
          </div>
          <h3 className="text-lg font-black text-text-primary mt-0.5">{selectedTrend.name}</h3>
        </div>

        <div className="flex items-baseline gap-2 sm:text-right">
          <span className="text-2xl font-black text-text-primary">
            {selectedTrend.currentValue}
          </span>
          <span className="text-xs font-bold text-text-muted">{selectedTrend.unit}</span>
          <div className={`text-xs font-bold flex items-center gap-0.5 ${selectedTrend.pctChange < 0 ? 'text-text-muted' : 'text-primary'}`}>
            ({selectedTrend.pctChange > 0 ? '+' : ''}{selectedTrend.pctChange.toFixed(1)}%)
          </div>
        </div>
      </div>

      {insight && (
        <div className="flex items-start gap-2.5 rounded-xl bg-primary/[0.04] border border-primary/20 p-3 text-xs text-text-secondary leading-relaxed">
          <Info size={16} className="text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-black text-text-primary block text-2xs uppercase tracking-wider">Interpretacja Analityczna</span>
            {insight}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs">
        <div className="bg-background/20 p-2.5 rounded-xl border border-border-custom/40">
          <span className="text-text-muted font-bold block">Aktualny (ostatni)</span>
          <span className="text-sm font-black text-text-primary mt-0.5 block">{selectedTrend.currentValue} {selectedTrend.unit}</span>
        </div>
        <div className="bg-background/20 p-2.5 rounded-xl border border-border-custom/40">
          <span className="text-text-muted font-bold block">Poprzedni pomiar</span>
          <span className="text-sm font-black text-text-secondary mt-0.5 block">{selectedTrend.prevValue} {selectedTrend.unit}</span>
        </div>
        <div className="bg-background/20 p-2.5 rounded-xl border border-border-custom/40">
          <span className="text-text-muted font-bold block">Zmiana bezwzgl.</span>
          <span className="text-sm font-black text-text-primary mt-0.5 block">
            {selectedTrend.absoluteChange > 0 ? '+' : ''}{selectedTrend.absoluteChange.toFixed(2)}
          </span>
        </div>
        <div className="bg-background/20 p-2.5 rounded-xl border border-border-custom/40">
          <span className="text-text-muted font-bold block">Zakres referencyjny</span>
          <span className="text-xs font-bold text-text-secondary mt-1 block">
            {selectedTrend.ref_text || (selectedTrend.ref_low != null && selectedTrend.ref_high != null ? `${selectedTrend.ref_low} – ${selectedTrend.ref_high}` : 'Standard')}
          </span>
        </div>
      </div>

      <div className="h-48 w-full bg-background/30 rounded-2xl p-2 border border-border-custom/60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={selectedTrend.history} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-custom)" opacity={0.15} />
            <XAxis dataKey="result_date" tick={{ fontSize: 9 }} stroke="var(--border-custom)" tickFormatter={(v) => formatMedicalDate(v).slice(0, 6)} />
            <YAxis tick={{ fontSize: 9 }} stroke="var(--border-custom)" domain={['dataMin - 10%', 'dataMax + 10%']} />
            <Tooltip
              contentStyle={{ background: 'var(--surface-solid)', borderColor: 'var(--border-custom)', borderRadius: '12px' }}
              labelFormatter={(label) => formatMedicalDate(String(label))}
              formatter={(val: unknown) => [`${val} ${selectedTrend.unit}`, selectedTrend.name]}
            />
            <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-1.5 pt-1">
        <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Historia pomiarów</span>
        <div className="space-y-1">
          {[...selectedTrend.history].reverse().map((h) => (
            <div key={h.id} className="flex items-center justify-between text-xs bg-background/20 px-3 py-1.5 rounded-lg border border-border-custom/30">
              <div className="flex items-center gap-2">
                <span className="font-bold text-text-primary">{formatMedicalDate(h.result_date)}</span>
                <span className="text-3xs text-text-muted">({h.source_name || h.provider || 'Laboratorium'})</span>
              </div>
              <span className="font-mono font-bold text-text-primary">{h.value} {h.unit}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
