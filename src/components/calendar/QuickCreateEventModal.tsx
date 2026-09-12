import Button from '../ui/Button';
import { ControlInput, Pressable } from '../ui/ControlPrimitives';
import React, { useState, useMemo } from 'react';
import { Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useCalendarData } from './hooks/useCalendarData';

import Modal from '../ui/Modal';
import CategoryPicker from './CategoryPicker';
import RecurrencePicker from './RecurrencePicker';
import { findCalendarConflicts } from '../../lib/calendarConflicts';
import { useCalendar } from './context/CalendarContext';
import { QuickScheduleFields } from './QuickScheduleFields';
import { minutesLabel } from './calendarHelpers';
import { parseTodoQuickInput } from '../../lib/todo/todoParser';

interface QuickCreateEventModalProps {
  calData: ReturnType<typeof useCalendarData>;
  handleQuickSave: () => void;
}

const DURATION_PRESETS = [
  { mins: 15, label: '15m' },
  { mins: 30, label: '30m' },
  { mins: 45, label: '45m' },
  { mins: 60, label: '1h' },
  { mins: 90, label: '1.5h' },
  { mins: 120, label: '2h' },
];

function QuickTimeStrip({
  date,
  startTimeStr,
  endTimeStr,
  quickDuration,
  setQuickDuration,
}: {
  date: string;
  startTimeStr: string;
  endTimeStr: string;
  quickDuration: number;
  setQuickDuration: (d: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-solid/30 border border-border-custom/25">
      <div className="flex items-center gap-1.5 text-2xs font-semibold text-text-secondary tabular-nums pl-1">
        <Clock size={12} className="text-primary" />
        <span>{date}</span>
        <span className="text-text-muted">·</span>
        <span className="font-bold text-text-primary">{startTimeStr} – {endTimeStr}</span>
      </div>
      <div className="flex items-center gap-1">
        {DURATION_PRESETS.map((p) => (
          <Pressable
            key={p.mins}
            onClick={() => setQuickDuration(p.mins)}
            className={`px-2 py-1 rounded-md text-2xs font-semibold active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-100 ease-out border ${
              quickDuration === p.mins
                ? 'border-primary/40 bg-primary/15 text-primary font-bold shadow-2xs'
                : 'border-transparent text-text-muted hover:text-text-primary hover:bg-surface-solid'
            }`}
          >
            {p.label}
          </Pressable>
        ))}
      </div>
    </div>
  );
}

function QuickCreateFooter({
  saving,
  onClose,
  onSave,
  disabled,
}: {
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-border-custom/25">
      <span className="text-2xs text-text-muted hidden sm:inline">
        Naciśnij <kbd className="px-1.5 py-0.5 rounded bg-surface-solid border border-border-custom/40 font-mono text-3xs">Enter ↵</kbd> aby zapisać
      </span>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="flex-1 sm:flex-none text-xs"
        >
          Anuluj
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={disabled}
          loading={saving}
          className="flex-1 sm:flex-none px-5 text-xs font-semibold active:scale-[0.98]"
        >
          {saving ? 'Zapisywanie…' : 'Zapisz'}
        </Button>
      </div>
    </div>
  );
}

function QuickTypeSwitcher({
  quickType,
  onSelectEvent,
  onSelectTask,
}: {
  quickType: 'event' | 'task';
  onSelectEvent: () => void;
  onSelectTask: () => void;
}) {
  return (
    <div className="flex p-1 rounded-xl bg-surface-solid/60 border border-border-custom/30">
      <Pressable
        type="button"
        onClick={onSelectEvent}
        className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-1.5 rounded-lg active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out ${
          quickType === 'event'
            ? 'bg-background text-primary shadow-xs font-bold'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <Calendar size={13} />
        Wydarzenie
      </Pressable>
      <Pressable
        type="button"
        onClick={onSelectTask}
        className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-1.5 rounded-lg active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out ${
          quickType === 'task'
            ? 'bg-background text-primary shadow-xs font-bold'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <Clock size={13} />
        Zadanie
      </Pressable>
    </div>
  );
}

export const QuickCreateEventModal: React.FC<QuickCreateEventModalProps> = ({ calData, handleQuickSave }) => {
  const { timeBudgets: { budgets } } = useCalendar();
  const {
    quickCreate,
    closeQuickCreate,
    quickTitle,
    setQuickTitle,
    quickDuration,
    setQuickDuration,
    quickCategory,
    setQuickCategory,
    quickType,
    setQuickType,
    quickRecurrence,
    setQuickRecurrence,
    quickCustomDays,
    setQuickCustomDays,
    quickRecurrenceEndDate,
    setQuickRecurrenceEndDate,
    saving,
  } = calData;

  const [showMore, setShowMore] = useState(false);

  const quickStart = quickCreate ? new Date(`${quickCreate.date}T${minutesLabel(quickCreate.startMin)}:00`).getTime() : 0;
  const conflicts = useMemo(() => {
    if (!quickCreate) return [];
    return findCalendarConflicts(calData.events, quickStart, quickStart + quickDuration * 60_000);
  }, [calData.events, quickCreate, quickStart, quickDuration]);

  const nlpParsed = useMemo(() => parseTodoQuickInput(quickTitle), [quickTitle]);

  const hasAdvancedContent = Boolean(
    calData.quickLocation ||
    calData.quickDescription ||
    calData.quickReminder != null ||
    quickRecurrence ||
    conflicts.length > 0
  );

  const isAdvancedOpen = showMore || hasAdvancedContent;

  const startTimeStr = quickCreate ? minutesLabel(quickCreate.startMin) : '';
  const endTimeStr = quickCreate ? minutesLabel(quickCreate.startMin + quickDuration) : '';

  return (
    <Modal
      isOpen={Boolean(quickCreate)}
      onClose={closeQuickCreate}
      size="md"
      title={quickType === 'task' ? 'Nowe zadanie' : 'Nowe wydarzenie'}
      overlayClassName="bg-black/30 dark:bg-black/50 backdrop-blur-xs"
    >
      {quickCreate && (
        <div className="space-y-3.5 select-none">
          <QuickTypeSwitcher
            quickType={quickType}
            onSelectEvent={() => setQuickType('event')}
            onSelectTask={() => {
              setQuickType('task');
              if (quickRecurrence === 'custom') setQuickRecurrence('');
            }}
          />

          {/* Hero Title Input with NLP parser tags */}
          <div className="space-y-1.5">
            <ControlInput
              autoFocus
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !saving && quickTitle.trim() && !(quickRecurrence === 'custom' && quickCustomDays.length === 0)) {
                  e.preventDefault();
                  handleQuickSave();
                }
              }}
              placeholder={quickType === 'task' ? 'Co jest do zrobienia? (np. 15:30 Przygotować raport 45m)…' : 'Tytuł wydarzenia (np. 15:30 Spotkanie 45m)…'}
              className="min-h-11 w-full rounded-xl border border-border-custom/50 bg-surface-solid/40 px-3.5 text-base font-semibold tracking-tight text-text-primary focus:border-primary focus:bg-background placeholder:text-text-muted/50 transition-colors shadow-2xs"
            />
            {nlpParsed.tokens.length > 0 && (
              <div className="flex flex-wrap gap-1 px-1 py-0.5 animate-in fade-in duration-100">
                {nlpParsed.tokens.map((token, idx) => (
                  <span
                    key={`${token.type}-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-2xs font-semibold border border-primary/25"
                  >
                    {token.type === 'time' && '🕒'}
                    {token.type === 'duration' && '⏱️'}
                    {token.type === 'date' && '📅'}
                    {token.type === 'recurrence' && '🔁'}
                    {token.type === 'tag' && '🏷️'}
                    {token.type === 'priority' && '⚡'}
                    <span>{token.label}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Time & Duration Presets Strip */}
          <QuickTimeStrip
            date={quickCreate.date}
            startTimeStr={startTimeStr}
            endTimeStr={endTimeStr}
            quickDuration={quickDuration}
            setQuickDuration={setQuickDuration}
          />

          {/* Category / Sphere Selection */}
          <div className="space-y-1">
            <span className="text-2xs text-text-muted/70 font-semibold uppercase tracking-wider px-1">Obszar życia</span>
            <CategoryPicker selected={quickCategory} onSelect={setQuickCategory} />
          </div>

          {/* Expandable Advanced Options Toggle */}
          <Pressable
            onClick={() => setShowMore((prev) => !prev)}
            className="flex items-center justify-between w-full px-2 py-1.5 text-2xs font-semibold text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-solid/40 transition-colors"
          >
            <span>{isAdvancedOpen ? 'Mniej opcji' : 'Więcej opcji (lokalizacja, notatka, cykl, alarm)'}</span>
            {isAdvancedOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </Pressable>

          {/* Collapsible Advanced Section */}
          {isAdvancedOpen && (
            <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
              <QuickScheduleFields calData={calData} conflicts={conflicts} budgets={budgets} />

              <RecurrencePicker
                recurrence={quickRecurrence}
                setRecurrence={setQuickRecurrence}
                customDays={quickCustomDays}
                setCustomDays={setQuickCustomDays}
                endDate={quickRecurrenceEndDate}
                setEndDate={setQuickRecurrenceEndDate}
                minDate={quickCreate.date}
                allowCustom={quickType === 'event'}
              />
            </div>
          )}

          {/* Save & Cancel Row */}
          <QuickCreateFooter
            saving={saving}
            onClose={closeQuickCreate}
            onSave={handleQuickSave}
            disabled={saving || !quickTitle.trim() || (quickRecurrence === 'custom' && quickCustomDays.length === 0)}
          />
        </div>
      )}
    </Modal>
  );
};
