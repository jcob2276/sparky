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
  isAdvancedOpen,
  hasHiddenContent,
  onToggleMore,
}: {
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  disabled: boolean;
  isAdvancedOpen: boolean;
  hasHiddenContent: boolean;
  onToggleMore: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 border-t border-border-custom/25 pt-2.5 ${
        isAdvancedOpen
          ? 'sticky bottom-0 z-[var(--z-sticky)] -mx-3 -mb-3 bg-surface-solid/70 px-3 pb-3 backdrop-blur-xs sm:-mx-4 sm:-mb-4 sm:px-4 sm:pb-4'
          : ''
      }`}
    >
      <Pressable
        type="button"
        onClick={onToggleMore}
        aria-expanded={isAdvancedOpen}
        className="relative mr-auto flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-text-muted hover:bg-surface-solid/40 hover:text-text-primary transition-colors sm:min-h-8"
      >
        {isAdvancedOpen ? 'Mniej' : 'Więcej'}
        {isAdvancedOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {hasHiddenContent && !isAdvancedOpen && (
          <span className="absolute right-1 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" aria-label="Uzupełnione dodatkowe opcje" />
        )}
      </Pressable>
      <Button
        variant="secondary"
        size="sm"
        onClick={onClose}
        className="px-4 text-xs min-h-10 sm:min-h-8"
      >
        Anuluj
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={onSave}
        disabled={disabled}
        loading={saving}
        className="px-5 text-xs font-bold active:scale-[0.98] min-h-10 sm:min-h-8"
      >
        {saving ? 'Zapisywanie…' : 'Zapisz'}
      </Button>
    </div>
  );
}

type QuickCreateState = NonNullable<ReturnType<typeof useCalendarData>['quickCreate']>;

/** Montowany tylko przy otwartym dymku, więc stan „Więcej” resetuje się przy każdym otwarciu. */
function QuickCreateForm({
  calData,
  handleQuickSave,
  quickCreate,
}: QuickCreateEventModalProps & { quickCreate: QuickCreateState }) {
  const { timeBudgets: { budgets } } = useCalendar();
  const {
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

  const nlpParsed = useMemo(() => parseTodoQuickInput(quickTitle), [quickTitle]);

  // Zapis używa wartości rozpoznanych z tytułu przed ręcznymi, więc podgląd i konflikty muszą robić tak samo.
  const effectiveDate = nlpParsed.date_explicit && nlpParsed.due_date ? nlpParsed.due_date : quickCreate.date;
  const effectiveStartMin = nlpParsed.scheduled_time
    ? Number(nlpParsed.scheduled_time.slice(0, 2)) * 60 + Number(nlpParsed.scheduled_time.slice(3, 5))
    : quickCreate.startMin;
  const effectiveDuration = nlpParsed.duration_minutes || quickDuration;

  const quickStart = new Date(`${effectiveDate}T${minutesLabel(effectiveStartMin)}:00`).getTime();
  const conflicts = useMemo(
    () => findCalendarConflicts(calData.events, quickStart, quickStart + effectiveDuration * 60_000),
    [calData.events, quickStart, effectiveDuration],
  );

  const hasHiddenContent = Boolean(
    calData.quickLocation ||
    calData.quickDescription ||
    calData.quickReminder != null ||
    quickRecurrence
  );

  const isAdvancedOpen = showMore;

  const startTimeStr = minutesLabel(effectiveStartMin);
  const endTimeStr = minutesLabel((effectiveStartMin + effectiveDuration) % 1440);

  return (
        <div className="space-y-2.5 select-none">
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
              className="min-h-11 sm:min-h-10 w-full rounded-xl border border-border-custom/50 bg-surface-solid/60 px-3.5 text-base sm:text-sm font-semibold tracking-tight text-text-primary focus:border-primary focus:bg-background placeholder:text-text-muted/75 transition-colors shadow-2xs"
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
            date={effectiveDate}
            startTimeStr={startTimeStr}
            endTimeStr={endTimeStr}
            quickDuration={effectiveDuration}
            setQuickDuration={setQuickDuration}
            durationLocked={Boolean(nlpParsed.duration_minutes)}
            showSummary={!isAdvancedOpen}
            onEditTime={() => setShowMore(true)}
            allDay={calData.quickAllDay && quickType === 'event'}
          />

          {/* Conflict Notice if any (shown cleanly without opening full advanced form) */}
          {conflicts.length > 0 && !isAdvancedOpen && (
            <CalendarConflictNotice titles={conflicts.map((event) => event.summary || 'Wydarzenie')} />
          )}

          {/* Category / Sphere Selection — jeden przewijany rząd */}
          <CategoryPicker selected={quickCategory} onSelect={setQuickCategory} scroll />

          {/* Collapsible Advanced Section (Data/Od/Do, lokalizacja, notatka, alarm, cykl) */}
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
            isAdvancedOpen={isAdvancedOpen}
            hasHiddenContent={hasHiddenContent}
            onToggleMore={() => setShowMore((prev) => !prev)}
          />
        </div>
  );
}

export const QuickCreateEventModal: React.FC<QuickCreateEventModalProps> = ({ calData, handleQuickSave }) => {
  const { quickCreate, closeQuickCreate, quickType } = calData;

  return (
    <Modal
      isOpen={Boolean(quickCreate)}
      onClose={closeQuickCreate}
      size="md"
      ariaLabel={quickType === 'task' ? 'Nowe zadanie' : 'Nowe wydarzenie'}
      showCloseButton={false}
      padding="p-3 sm:p-4"
      overlayClassName="bg-black/35 dark:bg-black/60 backdrop-blur-xs"
    >
      {quickCreate && <QuickCreateForm calData={calData} handleQuickSave={handleQuickSave} quickCreate={quickCreate} />}
    </Modal>
  );
};
