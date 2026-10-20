import { DEFAULT_UNIT_BY_TYPE, TYPE_LABELS, UNIT_LABELS, type LearningResourceType, type LearningUnit } from '../../../lib/learning/learningModel';
import { defaultTotalFor, type AssignmentFormState } from '../../../lib/learning/assignmentForm';
import type { LearningSkill } from '../../../lib/learning/learningApi';
import Button from '../../ui/Button';
import { ControlInput, ControlSelect } from '../../ui/ControlPrimitives';

interface LearningAssignmentFormProps {
  form: AssignmentFormState;
  skills: LearningSkill[];
  today: string;
  error: string | null;
  saving: boolean;
  onChange: (patch: Partial<AssignmentFormState>) => void;
  onSubmit: () => void;
  onBack?: () => void;
}

const FIELD = 'w-full rounded-xl border border-border-custom/60 bg-surface-2 px-3 py-2 text-sm font-semibold text-text-primary';
const LABEL = 'text-xs font-bold text-text-secondary block mb-1';

export default function LearningAssignmentForm({ form, skills, today, error, saving, onChange, onSubmit, onBack }: LearningAssignmentFormProps) {
  const changeType = (type: LearningResourceType) => {
    const unit = DEFAULT_UNIT_BY_TYPE[type];
    onChange({ resourceType: type, unit, total: form.total || defaultTotalFor(type, unit) });
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <label htmlFor="learning-title" className={LABEL}>Tytuł</label>
        <ControlInput id="learning-title" type="text" value={form.title} maxLength={200} className={FIELD}
          onChange={(event) => onChange({ title: event.target.value })} placeholder="Np. Never Split the Difference" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="learning-type" className={LABEL}>Rodzaj</label>
          <ControlSelect id="learning-type" value={form.resourceType} className={FIELD}
            onChange={(event) => changeType(event.target.value as LearningResourceType)}>
            {(Object.keys(TYPE_LABELS) as LearningResourceType[]).map((type) => (
              <option key={type} value={type}>{TYPE_LABELS[type]}</option>
            ))}
          </ControlSelect>
        </div>
        <div>
          <label htmlFor="learning-unit" className={LABEL}>Liczymy w</label>
          <ControlSelect id="learning-unit" value={form.unit} className={FIELD}
            onChange={(event) => onChange({ unit: event.target.value as LearningUnit })}>
            {(Object.keys(UNIT_LABELS) as LearningUnit[]).map((unit) => (
              <option key={unit} value={unit}>{UNIT_LABELS[unit]}</option>
            ))}
          </ControlSelect>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="learning-total" className={LABEL}>Ile łącznie ({UNIT_LABELS[form.unit]})</label>
          <ControlInput id="learning-total" type="text" inputMode="numeric" autoComplete="off" value={form.total} className={FIELD}
            onChange={(event) => onChange({ total: event.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="np. 240" />
        </div>
        <div>
          <label htmlFor="learning-due" className={LABEL}>Termin</label>
          <ControlInput id="learning-due" type="date" min={today} value={form.dueDate} className={FIELD}
            onChange={(event) => onChange({ dueDate: event.target.value })} />
        </div>
      </div>

      {skills.length > 0 && (
        <div>
          <label htmlFor="learning-skill" className={LABEL}>Umiejętność (opcjonalnie)</label>
          <ControlSelect id="learning-skill" value={form.skillId} className={FIELD}
            onChange={(event) => onChange({ skillId: event.target.value })}>
            <option value="">Bez przypisania</option>
            {skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.label}</option>)}
          </ControlSelect>
        </div>
      )}

      {error && <p role="alert" className="text-xs font-semibold text-danger">{error}</p>}

      <div className="flex gap-2 pt-1">
        {onBack && <Button type="button" variant="ghost" size="sm" onClick={onBack}>Wstecz</Button>}
        <Button type="submit" loading={saving} className="flex-1">Dodaj do miesiąca</Button>
      </div>
    </form>
  );
}
