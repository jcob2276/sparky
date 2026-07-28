import { useState } from 'react';
import { X, Check, Vibrate, QrCode, Calculator, Brain, Sparkles, Bell } from 'lucide-react';
import type { Alarm, MissionType, MathDifficulty } from '../../../types/alarm';

interface AlarmEditModalProps {
  initialAlarm?: Alarm | null;
  onSave: (alarmData: Omit<Alarm, 'id' | 'createdAt' | 'updatedAt' | 'snoozedCount'>) => void;
  onClose: () => void;
}

const DAY_NAMES = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
const DAY_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];

export function AlarmEditModal({ initialAlarm, onSave, onClose }: AlarmEditModalProps) {
  const [time, setTime] = useState(initialAlarm?.time || '07:00');
  const [label, setLabel] = useState(initialAlarm?.label || '');
  const [days, setDays] = useState<number[]>(initialAlarm?.days || [1, 2, 3, 4, 5]);
  const [sound, setSound] = useState(initialAlarm?.sound || 'radar');
  const [volume, setVolume] = useState(initialAlarm?.volume ?? 0.8);
  const [snoozeLimit, setSnoozeLimit] = useState(initialAlarm?.snoozeLimit ?? 3);

  // Mission states
  const [missionType, setMissionType] = useState<MissionType>(initialAlarm?.mission?.type || 'shake');
  const [shakeCount, setShakeCount] = useState(initialAlarm?.mission?.config?.shakeCount || 20);
  const [barcodeName, setBarcodeName] = useState(initialAlarm?.mission?.config?.barcodeName || 'Kawa w kuchni');
  const [barcodeValue, setBarcodeValue] = useState(initialAlarm?.mission?.config?.barcodeValue || '5900000000000');
  const [mathDifficulty, setMathDifficulty] = useState<MathDifficulty>(initialAlarm?.mission?.config?.mathDifficulty || 'medium');
  const [mathCount, setMathCount] = useState(initialAlarm?.mission?.config?.mathCount || 3);
  const [typingPhrase, setTypingPhrase] = useState(initialAlarm?.mission?.config?.typingPhrase || 'Wstaję z energią i zdobywam ten dzień!');

  const toggleDay = (dayIdx: number) => {
    setDays((prev) =>
      prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx].sort()
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      time,
      label,
      enabled: true,
      days,
      sound,
      volume,
      fadeIn: true,
      snoozeLimit,
      snoozeIntervalMinutes: 5,
      mission: {
        type: missionType,
        config: {
          shakeCount,
          barcodeName,
          barcodeValue,
          mathDifficulty,
          mathCount,
          typingPhrase
        }
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl p-6 text-foreground space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-lg font-bold">
            {initialAlarm ? 'Edytuj Budzik' : 'Nowy Budzik'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Time Picker */}
          <div className="flex flex-col items-center justify-center space-y-2 py-2">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="text-5xl font-black bg-black/40 border border-white/15 rounded-2xl px-6 py-3 text-primary text-center focus:outline-none focus:border-primary tracking-wider"
              required
            />
            <input
              type="text"
              placeholder="Etykieta (np. Szkoła / Praca)..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full max-w-xs text-center text-sm bg-transparent border-b border-white/10 focus:border-primary px-2 py-1 text-foreground focus:outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Days */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Powtarzaj w dni</label>
            <div className="flex justify-between gap-1">
              {DAY_SHORT.map((name, idx) => {
                const active = days.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    title={DAY_NAMES[idx]}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mission Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Misja Wybudzenia (Alarmy-style)</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'shake', label: 'Potrząśnij', icon: Vibrate },
                { type: 'barcode', label: 'Skan Kodu', icon: QrCode },
                { type: 'math', label: 'Matematyka', icon: Calculator },
                { type: 'memory', label: 'Pamięć', icon: Brain },
                { type: 'typing', label: 'Afirmacja', icon: Sparkles },
                { type: 'none', label: 'Brak misji', icon: Bell }
              ].map((m) => {
                const Icon = m.icon;
                const active = missionType === m.type;
                return (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => setMissionType(m.type as MissionType)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 text-xs font-medium transition-all ${
                      active
                        ? 'bg-primary/20 border-primary text-primary font-bold shadow-lg shadow-primary/10'
                        : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mission Details config */}
            {missionType === 'shake' && (
              <div className="p-3 bg-white/5 rounded-xl space-y-2 border border-white/10 text-xs">
                <div className="flex justify-between">
                  <span>Liczba potrząśnięć:</span>
                  <span className="font-bold text-amber-400">{shakeCount}x</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={shakeCount}
                  onChange={(e) => setShakeCount(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
            )}

            {missionType === 'barcode' && (
              <div className="p-3 bg-white/5 rounded-xl space-y-2 border border-white/10 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1">Nazwa produktu / Miejsca:</label>
                  <input
                    type="text"
                    value={barcodeName}
                    onChange={(e) => setBarcodeName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-foreground"
                    placeholder="np. Kawa w kuchni"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Wymagany Kod EAN/QR (opcjonalnie):</label>
                  <input
                    type="text"
                    value={barcodeValue}
                    onChange={(e) => setBarcodeValue(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-foreground"
                    placeholder="Wpisz kod z opakowania..."
                  />
                </div>
              </div>
            )}

            {missionType === 'math' && (
              <div className="p-3 bg-white/5 rounded-xl space-y-2 border border-white/10 text-xs">
                <div className="flex justify-between items-center">
                  <span>Trudność zadań:</span>
                  <select
                    value={mathDifficulty}
                    onChange={(e) => setMathDifficulty(e.target.value as MathDifficulty)}
                    className="bg-black/40 border border-white/10 px-2 py-1 rounded text-foreground"
                  >
                    <option value="easy">Łatwy (+ / -)</option>
                    <option value="medium">Średni (×)</option>
                    <option value="hard">Trudny (mieszane)</option>
                  </select>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span>Ilość równań:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={mathCount}
                    onChange={(e) => setMathCount(Number(e.target.value))}
                    className="w-16 bg-black/40 border border-white/10 px-2 py-1 rounded text-foreground text-center"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sound & Snooze */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-muted-foreground block mb-1">Dźwięk Dzwonka:</label>
              <select
                value={sound}
                onChange={(e) => setSound(e.target.value)}
                className="w-full bg-black/40 border border-white/10 px-3 py-2 rounded-xl text-foreground"
              >
                <option value="radar">Radar (Standard)</option>
                <option value="classic">Classic Alert</option>
                <option value="digital">Digital Pulse</option>
                <option value="chime">Chime Bell</option>
              </select>
            </div>
            <div>
              <label className="text-muted-foreground block mb-1">Limit Drzemek:</label>
              <select
                value={snoozeLimit}
                onChange={(e) => setSnoozeLimit(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 px-3 py-2 rounded-xl text-foreground"
              >
                <option value={0}>Brak (Zablokowane)</option>
                <option value={1}>1 drzemka</option>
                <option value={3}>3 drzemki</option>
                <option value={5}>5 drzemek</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-muted-foreground font-semibold rounded-xl text-sm"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-primary/20"
            >
              <Check className="w-4 h-4" />
              <span>Zapisz Budzik</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
