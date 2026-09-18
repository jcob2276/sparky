import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PhoneCall, Clock, CalendarCheck, UserCheck } from 'lucide-react';
import { useHaptics } from '../../../hooks/useHaptics';
import type { CloserDailyLogRow } from '../../../lib/closer/closerApi';
import { getTodayWarsaw } from '../../../lib/date';
import { Pressable } from '../../ui/ControlPrimitives';

interface Props {
  dateStr: string;
  log: CloserDailyLogRow | undefined;
  onUpdate: (patch: {
    dials?: number;
    work_hours?: number;
    appointments?: number;
    sales_calls?: number;
    notes?: string | null;
  }) => void;
  disabled?: boolean;
}

interface DialsCardProps {
  dials: number;
  disabled: boolean;
  onChangeDials: (delta: number) => void;
}

function DialsCard({ dials, disabled, onChangeDials }: DialsCardProps) {
  return (
    <div className="rounded-xl border border-border-custom/25 bg-surface-raised/30 p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
          <PhoneCall size={13} className="text-primary" /> Diale
        </span>
        <span className="text-base font-black text-primary">{dials}</span>
      </div>
      <div className="flex items-center gap-1">
        <Pressable
          type="button"
          disabled={disabled || dials <= 0}
          onClick={() => onChangeDials(-5)}
          className="flex-1 rounded-lg border border-border-custom/30 bg-surface py-1 text-2xs font-bold text-text-muted hover:text-text-primary active:scale-95 disabled:opacity-30"
        >
          -5
        </Pressable>
        <Pressable
          type="button"
          disabled={disabled || dials <= 0}
          onClick={() => onChangeDials(-1)}
          className="flex-1 rounded-lg border border-border-custom/30 bg-surface py-1 text-2xs font-bold text-text-muted hover:text-text-primary active:scale-95 disabled:opacity-30"
        >
          -1
        </Pressable>
        <Pressable
          type="button"
          disabled={disabled}
          onClick={() => onChangeDials(1)}
          className="flex-1 rounded-lg border border-primary/30 bg-primary/10 py-1 text-2xs font-black text-primary hover:bg-primary/20 active:scale-95"
        >
          +1
        </Pressable>
        <Pressable
          type="button"
          disabled={disabled}
          onClick={() => onChangeDials(5)}
          className="flex-1 rounded-lg border border-primary/30 bg-primary/10 py-1 text-2xs font-black text-primary hover:bg-primary/20 active:scale-95"
        >
          +5
        </Pressable>
        <Pressable
          type="button"
          disabled={disabled}
          onClick={() => onChangeDials(10)}
          className="flex-1 rounded-lg border border-primary/30 bg-primary/10 py-1 text-2xs font-black text-primary hover:bg-primary/20 active:scale-95"
        >
          +10
        </Pressable>
      </div>
    </div>
  );
}

interface WorkHoursCardProps {
  workHours: number;
  disabled: boolean;
  onChangeWorkHours: (delta: number) => void;
}

function WorkHoursCard({ workHours, disabled, onChangeWorkHours }: WorkHoursCardProps) {
  return (
    <div className="rounded-xl border border-border-custom/25 bg-surface-raised/30 p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
          <Clock size={13} className="text-warning" /> Czas pracy
        </span>
        <span className="text-base font-black text-text-primary">{workHours}h</span>
      </div>
      <div className="flex items-center gap-1">
        <Pressable
          type="button"
          disabled={disabled || workHours <= 0}
          onClick={() => onChangeWorkHours(-0.5)}
          className="flex-1 rounded-lg border border-border-custom/30 bg-surface py-1 text-2xs font-bold text-text-muted hover:text-text-primary active:scale-95 disabled:opacity-30"
        >
          -0.5h
        </Pressable>
        <Pressable
          type="button"
          disabled={disabled}
          onClick={() => onChangeWorkHours(0.5)}
          className="flex-1 rounded-lg border border-warning/30 bg-warning/10 py-1 text-2xs font-black text-warning hover:bg-warning/20 active:scale-95"
        >
          +0.5h
        </Pressable>
        <Pressable
          type="button"
          disabled={disabled}
          onClick={() => onChangeWorkHours(1)}
          className="flex-1 rounded-lg border border-warning/30 bg-warning/10 py-1 text-2xs font-black text-warning hover:bg-warning/20 active:scale-95"
        >
          +1h
        </Pressable>
        <Pressable
          type="button"
          disabled={disabled}
          onClick={() => onChangeWorkHours(2)}
          className="flex-1 rounded-lg border border-warning/30 bg-warning/10 py-1 text-2xs font-black text-warning hover:bg-warning/20 active:scale-95"
        >
          +2h
        </Pressable>
      </div>
    </div>
  );
}

interface CounterCardProps {
  icon: React.ElementType;
  iconColor: string;
  valueColor: string;
  buttonColor: string;
  label: string;
  sublabel: string;
  value: number;
  disabled: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}

function CounterCard({
  icon: Icon,
  iconColor,
  valueColor,
  buttonColor,
  label,
  sublabel,
  value,
  disabled,
  onDecrement,
  onIncrement,
}: CounterCardProps) {
  return (
    <div className="rounded-xl border border-border-custom/25 bg-surface-raised/30 p-2.5 flex items-center justify-between">
      <div>
        <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
          <Icon size={13} className={iconColor} /> {label}
        </span>
        <span className="text-3xs text-text-muted">{sublabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <Pressable
          type="button"
          disabled={disabled || value <= 0}
          onClick={onDecrement}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-custom/30 bg-surface text-xs font-bold text-text-muted hover:text-text-primary active:scale-95 disabled:opacity-30"
        >
          -
        </Pressable>
        <span className={`text-base font-black min-w-4 text-center ${valueColor}`}>
          {value}
        </span>
        <Pressable
          type="button"
          disabled={disabled}
          onClick={onIncrement}
          className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-black active:scale-95 ${buttonColor}`}
        >
          +
        </Pressable>
      </div>
    </div>
  );
}

export default function CloserDayInputs({
  dateStr,
  log,
  onUpdate,
  disabled = false,
}: Props) {
  const haptics = useHaptics();

  const dials = log?.dials ?? 0;
  const workHours = log?.work_hours ?? 0;
  const appointments = log?.appointments ?? 0;
  const salesCalls = log?.sales_calls ?? 0;

  const isToday = dateStr === getTodayWarsaw();
  const displayDate = (() => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      return format(new Date(y, m - 1, d), 'EEEE, d MMMM', { locale: pl });
    } catch {
      return dateStr;
    }
  })();

  const changeDials = (delta: number) => {
    haptics.selection();
    onUpdate({ dials: Math.max(0, dials + delta) });
  };

  const changeWorkHours = (delta: number) => {
    haptics.selection();
    const next = Math.max(0, Math.round((workHours + delta) * 10) / 10);
    onUpdate({ work_hours: next });
  };

  const changeAppointments = (delta: number) => {
    haptics.selection();
    onUpdate({ appointments: Math.max(0, appointments + delta) });
  };

  const changeSalesCalls = (delta: number) => {
    haptics.selection();
    onUpdate({ sales_calls: Math.max(0, salesCalls + delta) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold capitalize text-text-primary">
            {displayDate}
          </span>
          {isToday && (
            <span className="ml-2 rounded-md bg-primary/10 px-1.5 py-0.5 text-3xs font-black uppercase tracking-wider text-primary">
              Dziś
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <DialsCard dials={dials} disabled={disabled} onChangeDials={changeDials} />
        <WorkHoursCard workHours={workHours} disabled={disabled} onChangeWorkHours={changeWorkHours} />
        <CounterCard
          icon={CalendarCheck}
          iconColor="text-success"
          valueColor="text-success"
          buttonColor="border-success/30 bg-success/10 text-success hover:bg-success/20"
          label="Umówienia"
          sublabel="spotkania z klientami"
          value={appointments}
          disabled={disabled}
          onDecrement={() => changeAppointments(-1)}
          onIncrement={() => changeAppointments(1)}
        />
        <CounterCard
          icon={UserCheck}
          iconColor="text-primary"
          valueColor="text-primary"
          buttonColor="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          label="Sales calle"
          sublabel="przeprowadzone rozmowy"
          value={salesCalls}
          disabled={disabled}
          onDecrement={() => changeSalesCalls(-1)}
          onIncrement={() => changeSalesCalls(1)}
        />
      </div>
    </div>
  );
}
