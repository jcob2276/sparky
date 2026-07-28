import { Clock, Play, Trash2, Edit3, QrCode, Vibrate, Calculator, Brain, Sparkles, Bell } from 'lucide-react';
import type { Alarm } from '../../../types/alarm';

interface AlarmCardProps {
  alarm: Alarm;
  onToggle: (id: string) => void;
  onEdit: (alarm: Alarm) => void;
  onDelete: (id: string) => void;
  onTestTrigger: (alarm: Alarm) => void;
}

const DAY_LABELS = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];

export function AlarmCard({ alarm, onToggle, onEdit, onDelete, onTestTrigger }: AlarmCardProps) {
  const getMissionBadge = () => {
    switch (alarm.mission.type) {
      case 'shake':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Vibrate className="w-3.5 h-3.5" />
            <span>Potrząśnij ({alarm.mission.config.shakeCount || 20}x)</span>
          </span>
        );
      case 'barcode':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <QrCode className="w-3.5 h-3.5" />
            <span>Skan Kodu ({alarm.mission.config.barcodeName || 'Produkt'})</span>
          </span>
        );
      case 'math':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Calculator className="w-3.5 h-3.5" />
            <span>Matematyka ({alarm.mission.config.mathDifficulty || 'medium'})</span>
          </span>
        );
      case 'memory':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Brain className="w-3.5 h-3.5" />
            <span>Gra Pamięciowa</span>
          </span>
        );
      case 'typing':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Afirmacja</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 text-muted-foreground border border-white/10">
            <Bell className="w-3.5 h-3.5" />
            <span>Standardowy Dzwonek</span>
          </span>
        );
    }
  };

  return (
    <div className={`relative p-5 rounded-2xl border transition-all duration-300 backdrop-blur-md ${
      alarm.enabled
        ? 'bg-surface/80 border-primary/40 shadow-lg shadow-primary/5'
        : 'bg-surface/40 border-white/5 opacity-70'
    }`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-baseline space-x-3">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">
              {alarm.time}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {alarm.label || 'Budzik'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {DAY_LABELS.map((label, idx) => {
              const isSelected = alarm.days.includes(idx);
              return (
                <span
                  key={idx}
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isSelected
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-muted-foreground/40'
                  }`}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={() => onToggle(alarm.id)}
          className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${
            alarm.enabled ? 'bg-primary justify-end' : 'bg-white/10 justify-start'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-white shadow-md transform transition-transform" />
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
        <div>{getMissionBadge()}</div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onTestTrigger(alarm)}
            title="Przetestuj budzik teraz"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-amber-400 transition-colors"
          >
            <Play className="w-4 h-4" />
          </button>

          <button
            onClick={() => onEdit(alarm)}
            title="Edytuj budzik"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(alarm.id)}
            title="Usuń budzik"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
