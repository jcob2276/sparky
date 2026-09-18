import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../ui/Button';
import { ControlInput, Pressable } from '../ui/ControlPrimitives';
import Modal from '../ui/Modal';
import CategoryPicker from './CategoryPicker';
import RecurrencePicker from './RecurrencePicker';
import CalendarConflictNotice from './CalendarConflictNotice';
import { QuickScheduleFields } from './QuickScheduleFields';
import { QuickTypeSwitcher } from './components/QuickTypeSwitcher';
import { QuickTimeStrip } from './components/QuickTimeStrip';
import { useCalendarData } from './hooks/useCalendarData';
import { useCalendar } from './context/CalendarContext';
import { findCalendarConflicts } from '../../lib/calendarConflicts';
import { minutesLabel } from './calendarHelpers';
import { parseTodoQuickInput } from '../../lib/todo/todoParser';

interface QuickCreateEventModalProps {
  calData: ReturnType<typeof useCalendarData>;
  handleQuickSave: () => void;
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
    <div className="flex items-center justify-between pt-2.5 border-t border-border-custom/25 mt-1">
      <span className="text-2xs text-text-muted hidden sm:inline">
        Naciśnij <kbd className="px-1.5 py-0.5 rounded bg-surface-solid border border-border-custom/40 font-mono text-3xs">Enter ↵</kbd> aby zapisać
      </span>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="flex-1 sm:flex-none text-xs min-h-10 sm:min-h-8"
        >
          Anuluj
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={disabled}
          loading={saving}
          className="flex-1 sm:flex-none px-6 text-xs font-bold active:scale-[0.98] min-h-10 sm:min-h-8"
        >
          {saving ? 'Zapisywanie…' : 'Zapisz'}
        </Button>
      </div>
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
    quickRecurrence
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
      overlayClassName="bg-black/35 dark:bg-black/60 backdrop-blur-xs"
    >
      {quickCreate && (
        <div className="space-y-3 select-none">
          <QuickTypeSwitcher
            quickType={quickType}
            onSelectEvent={() => setQuickType('event')}
            onSelectTask={() => {
              setQuickType('task');
              if (quickRecurrence === 'custom') setQuickRecurrence('');
            }}
          />

          {/* Hero Title Input with NLP parser tags */}
          <div className="space-y-1">
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
              placeholder={quickType === 'task' ? 'Co jest do zrobienia? (np. Raport 45m)…' : 'Tytuł wydarzenia (np. Trening 45m)…'}
              className="min-h-11 sm:min-h-10 w-full rounded-xl border border-border-custom/50 bg-surface-solid/60 px-3.5 text-sm font-semibold tracking-tight text-text-primary focus:border-primary focus:bg-background placeholder:text-text-muted/75 transition-colors shadow-2xs"
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

          {/* Time & Duration Presets */}
          <QuickTimeStrip
            date={quickCreate.date}
            startTimeStr={startTimeStr}
            endTimeStr={endTimeStr}
            quickDuration={quickDuration}
            setQuickDuration={setQuickDuration}
          />

          {/* Conflict Notice if any (shown cleanly without opening full advanced form) */}
          {conflicts.length > 0 && !isAdvancedOpen && (
            <CalendarConflictNotice titles={conflicts.map((event) => event.summary || 'Wydarzenie')} />
          )}

          {/* Category / Sphere Selection */}
          <div className="space-y-1">
            <span className="text-2xs text-text-muted/70 font-bold uppercase tracking-wider px-1">Obszar życia</span>
            <CategoryPicker selected={quickCategory} onSelect={setQuickCategory} />
          </div>

          {/* Expandable Advanced Options Toggle */}
          <Pressable
            type="button"
            onClick={() => setShowMore((prev) => !prev)}
            className="flex items-center justify-between w-full px-2 py-1.5 text-2xs font-semibold text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-solid/40 transition-colors"
          >
            <span>{isAdvancedOpen ? 'Mniej opcji' : 'Więcej opcji (lokalizacja, notatka, cykl, alarm)'}</span>
            {isAdvancedOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </Pressable>

          {/* Collapsible Advanced Section */}
          {isAdvancedOpen && (
            <div className="space-y-2.5 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
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
