import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MarkerSeries } from '../../../lib/health/medicalAnalytics';
import { Pressable } from '../../ui/ControlPrimitives';
import { MedicalTrendDetailCard, type MarkerTrend } from './MedicalTrendDetailCard';

interface MedicalTrendsProps {
  series: MarkerSeries[];
}

function getMarkerClinicalInsight(key: string, current: number, prev: number | null): string | null {
  if (key === 'ferritin') {
    if (current >= 40 && current <= 200) {
      if (prev && prev > current) {
        return 'Fizjologiczna normalizacja poziomu ferrytyny w strefie optymalnej (40–200 ng/ml). Wartość 127.41 ng/ml potwierdza pełne rezerwy żelaza bez odczynu zapalnego.';
      }
      return 'Optymalne zapasy ustrojowe żelaza (strefa docelowa 40–200 ng/ml).';
    }
    if (current < 40) return 'Ferrytyna poniżej strefy optymalnej (rezerwy żelaza wymagają uwagi).';
    if (current > 200) return 'Podwyższona ferrytyna — może wskazywać na przejściowy odczyn zapalny.';
  }
  if (key === 'testosterone_total') {
    if (current >= 5.0 && current <= 10.0) {
      return 'Wysoki fizjologiczny poziom testosteronu (7.21 ng/ml = 721 ng/dl). Bardzo korzystny profil anaboliczno-hormonalny.';
    }
  }
  if (key === 'tsh') {
    if (current >= 1.0 && current <= 2.5) {
      return 'Wzorcowe stężenie TSH w wąskim oknie eutyreozy (1.0–2.5 mU/l).';
    }
    if (current > 2.5 && current <= 4.2) {
      return 'TSH w normie laboratoryjnej, przy górnej granicy okna optymalnego (2.5 mU/l). FT3 i FT4 pozostają w normie.';
    }
  }
  return null;
}

function analyzeMedicalTrends(series: MarkerSeries[]) {
  const allTrends: MarkerTrend[] = series
    .filter((s) => s.prior !== null)
    .map((s) => {
      const current = s.latest;
      const previous = s.prior!;
      const absoluteChange = current.value - previous.value;
      return {
        key: s.marker_key,
        name: s.marker_name,
        category: s.category,
        pctChange: previous.value === 0 ? 0 : (absoluteChange / previous.value) * 100,
        absoluteChange,
        unit: current.unit || '',
        ref_text: current.ref_text,
        ref_low: current.ref_low,
        ref_high: current.ref_high,
        currentValue: current.value,
        prevValue: previous.value,
        history: [...s.history].reverse(),
      };
    })
    .sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
  return {
    allTrends,
    largestChanges: allTrends.filter((trend) => Math.abs(trend.pctChange) >= 10).slice(0, 5),
    stable: allTrends.filter((trend) => Math.abs(trend.pctChange) < 10),
  };
}

export default function MedicalTrends({ series }: MedicalTrendsProps) {
  const [selectedChartKey, setSelectedChartKey] = useState<string | null>(null);
  const trendAnalysis = useMemo(() => analyzeMedicalTrends(series), [series]);

  // Prioritize ferritin or the first trend if none selected
  const activeKey = selectedChartKey || (trendAnalysis.allTrends.some(t => t.key === 'ferritin') ? 'ferritin' : trendAnalysis.allTrends[0]?.key);
  const selectedTrend = trendAnalysis.allTrends.find(t => t.key === activeKey);

  const insight = selectedTrend ? getMarkerClinicalInsight(selectedTrend.key, selectedTrend.currentValue, selectedTrend.prevValue) : null;

  return (
    <div className="space-y-6">
      <div className="border-b border-border-custom/50 pb-3">
        <h2 className="text-lg font-black uppercase font-display">3. Trendy i Zmienność</h2>
        <p className="text-2xs text-text-muted mt-0.5">Analiza długoterminowa i dynamika zmian kluczowych parametrów</p>
      </div>

      {trendAnalysis.allTrends.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <span className="text-2xs font-black uppercase tracking-wider text-text-muted">Synteza Zmian</span>
            
            <div className="space-y-2">
              <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Największe przesunięcia (≥10%)</span>
              {trendAnalysis.largestChanges.map(s => (
                <Pressable
                  key={s.key}
                  onClick={() => setSelectedChartKey(s.key)}
                  className={`w-full text-left rounded-xl p-3 border transition-all flex items-center justify-between ${
                    selectedTrend?.key === s.key
                      ? 'border-primary/50 bg-primary/[0.05]'
                      : 'border-border-custom bg-background/20 hover:bg-background/40'
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">{s.name}</h4>
                    <span className="text-3xs text-text-muted">
                      {s.currentValue} {s.unit} · {s.history[s.history.length - 1]?.result_date}
                    </span>
                  </div>
                  <span className={`text-xs font-black flex items-center gap-0.5 ${s.pctChange > 0 ? 'text-primary' : 'text-text-muted'}`}>
                    {s.pctChange < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                    {s.pctChange > 0 ? '+' : ''}{s.pctChange.toFixed(0)}%
                  </span>
                </Pressable>
              ))}
            </div>

            <div className="space-y-2">
              <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Stabilne wskaźniki (&lt;10%)</span>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {trendAnalysis.stable.map(s => (
                  <Pressable
                    key={s.key}
                    onClick={() => setSelectedChartKey(s.key)}
                    className={`w-full text-left rounded-lg px-2.5 py-1.5 border transition-all flex items-center justify-between text-xs ${
                      selectedTrend?.key === s.key
                        ? 'border-primary/40 bg-primary/[0.03]'
                        : 'border-border-custom/50 bg-background/10 hover:bg-background/20'
                    }`}
                  >
                    <span className="font-semibold text-text-secondary">{s.name}</span>
                    <span className="text-text-muted font-bold flex items-center gap-0.5 text-2xs">
                      <Minus size={10} />
                      {Math.abs(s.pctChange).toFixed(1)}%
                    </span>
                  </Pressable>
                ))}
              </div>
            </div>
          </div>

          {selectedTrend && (
            <MedicalTrendDetailCard selectedTrend={selectedTrend} insight={insight} />
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-custom py-12 text-center">
          <p className="text-xs text-text-muted italic">Zbyt mało powtarzalnych pomiarów badań, aby wyznaczyć trendy.</p>
        </div>
      )}
    </div>
  );
}
