import { Moon, Sun, Clock, Flame, PauseCircle, Check } from 'lucide-react';
import { useFluxStore } from '../../lib/nightShift/useFluxStore';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import { ControlInput } from '../ui/ControlPrimitives';
import { notify } from '../../lib/notify';

import { isNativePlatform } from '../../lib/native/platform';
import { toggleSystemNightLight, toggleSystemOverlayFilter, checkSecureSettingsPermission } from '../../lib/native/nightLightPlugin';
import { ShieldCheck, Smartphone } from 'lucide-react';

const KELVIN_PRESETS = [
  { label: '3400K', name: 'Soft Halogen', kelvin: 3400 },
  { label: '2700K', name: 'Sunset Warm', kelvin: 2700 },
  { label: '1900K', name: 'Candlelight', kelvin: 1900 },
  { label: '1200K', name: 'Deep Amber', kelvin: 1200 },
  { label: '1000K', name: 'Pure Red (Bio)', kelvin: 1000 },
];

export default function FluxSettingsSection() {
  const {
    enabled,
    startTime,
    endTime,
    targetTemperature,
    gradualTransition,
    pausedUntil,
    setEnabled,
    setStartTime,
    setEndTime,
    setTargetTemperature,
    setGradualTransition,
    pauseForMinutes,
    clearPause,
  } = useFluxStore();

  const isPaused = Boolean(pausedUntil && Date.now() < pausedUntil);

  const handlePause = (mins: number) => {
    pauseForMinutes(mins);
    notify(`Filtry wyłączone na ${mins} min.`, 'success');
  };

  const handleResume = () => {
    clearPause();
    notify('Filtr nocny aktywowany ponownie.', 'success');
  };

  return (
    <Card padding="1.25rem" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Moon size={16} />
          </div>
          <div>
            <h2 className="text-sm font-black font-display text-text-primary uppercase tracking-wider">
              Bio-Rytm & Ekran (f.lux)
            </h2>
            <p className="text-xs text-text-muted">
              Redukcja niebieskiego światła po 21:00 dla ochrony melatoniny
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setEnabled(!enabled);
            notify(enabled ? 'Filtr f.lux wyłączony' : 'Filtr f.lux włączony', 'success');
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-amber-500' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-4 pt-2 border-t border-border-custom">
          {/* Pauza */}
          {isPaused ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <div className="flex items-center gap-2">
                <PauseCircle size={15} />
                <span>Filtr nocny wstrzymany</span>
              </div>
              <Button size="sm" variant="outline" onClick={handleResume}>
                Wznowić
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Potrzebujesz precyzji kolorów?</span>
              <button
                type="button"
                onClick={() => handlePause(60)}
                className="text-amber-400 font-bold hover:underline"
              >
                Wstrzymaj na 1 godz.
              </button>
            </div>
          )}

          {/* Godziny działania */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted flex items-center gap-1.5 uppercase tracking-wider">
              <Clock size={13} /> Harmonogram działania
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-text-muted block mb-1">Od godziny</span>
                <ControlInput
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-border-custom bg-surface-solid px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-text-muted block mb-1">Do godziny</span>
                <ControlInput
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-border-custom bg-surface-solid px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Presety temperatury barwowej */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted flex items-center gap-1.5 uppercase tracking-wider">
              <Flame size={13} /> Temperatura Barwowa (Warmth)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {KELVIN_PRESETS.map((preset) => {
                const isSelected = targetTemperature === preset.kelvin;
                return (
                  <button
                    key={preset.kelvin}
                    type="button"
                    onClick={() => setTargetTemperature(preset.kelvin)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-bold'
                        : 'border-border-custom bg-surface-solid text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <div>
                      <div className="font-mono">{preset.label}</div>
                      <div className="text-[10px] opacity-75">{preset.name}</div>
                    </div>
                    {isSelected && <Check size={14} className="text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adaptacja płynna (30-min ramping) */}
          <label className="flex items-center gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={gradualTransition}
              onChange={(e) => setGradualTransition(e.target.checked)}
              className="rounded border-border-custom text-amber-500 focus:ring-amber-500"
            />
            <div className="text-xs">
              <span className="font-bold text-text-primary block">Płynna adaptacja wzroku (30 min)</span>
              <span className="text-[11px] text-text-muted">
                Stopniowo ściemnia i ociepla obraz przed wyznaczoną godziną
              </span>
            </div>
          </label>

          {/* Android System-Wide OS Night Light Integration */}
          {isNativePlatform() && (
            <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                <Smartphone size={14} /> Nakładka na cały system Android (Red Moon / Twilight style)
              </div>
              <p className="text-[11px] text-text-muted">
                Nakłada ciepły filtr na CAŁY system Android – działa we wszystkich aplikacjach, menu, YouTube i pulpitach!
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={async () => {
                    const ok = await toggleSystemOverlayFilter(true, '#FF8C00', 0.35);
                    if (ok) notify('Włączono nakładkę f.lux na CAŁY system Android!', 'success');
                    else notify('Sprawdź uprawnienie "Wyświetlanie nad innymi aplikacjami".', 'error');
                  }}
                >
                  Włącz na całe Android OS
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const ok = await toggleSystemOverlayFilter(false);
                    if (ok) notify('Wyłączono nakładkę systemową Androida', 'info');
                  }}
                >
                  Wyłącz nakładkę
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
