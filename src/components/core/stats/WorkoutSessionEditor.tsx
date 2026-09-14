import { Edit3, Check, X, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../ui/Button';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import type { EditFormState, EditableExerciseLog } from '../hooks/useStatsData';

interface WorkoutSessionEditorProps {
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  updateSession: () => void;
  deleteLog: (id: string) => void;
  onCancel: () => void;
}

export function WorkoutSessionEditor({
  editForm,
  setEditForm,
  updateSession,
  deleteLog,
  onCancel,
}: WorkoutSessionEditorProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border-2 border-primary/50 bg-surface p-4 shadow-md space-y-3">
      <div className="flex items-center justify-between border-b border-border-custom pb-2.5">
        <p className="text-xs font-black uppercase tracking-wider text-primary font-display flex items-center gap-1.5">
          <Edit3 size={13} />
          Edycja sesji
        </p>
        <ControlInput
          type="date"
          value={editForm.date ?? ''}
          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
          className="bg-surface-solid border border-border-custom rounded-lg px-2.5 py-1 text-xs font-bold text-text-primary outline-none focus:border-primary"
        />
      </div>

      <ControlInput
        type="text"
        value={editForm.workout_day ?? ''}
        onChange={(e) => setEditForm({ ...editForm, workout_day: e.target.value })}
        placeholder="Nazwa treningu..."
        className="w-full bg-surface-solid border border-border-custom rounded-xl p-2.5 text-sm font-black text-text-primary outline-none focus:border-primary"
      />

      {/* Logs editor */}
      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {editForm.logs.map((log, idx) => {
          const logIsWellness = (log.muscle_tags || []).includes('wellness') ||
            ['sauna', 'lodowata', 'zimny prysznic', 'stretching'].some(w => (log.exercise_name || '').toLowerCase().startsWith(w));

          const updateLog = (field: keyof EditableExerciseLog, value: string) => {
            const newLogs = [...editForm.logs];
            newLogs[idx] = { ...newLogs[idx], [field]: value };
            setEditForm({ ...editForm, logs: newLogs });
          };

          return (
            <div key={log.id} className="flex items-center gap-2 bg-surface-solid/70 p-2 rounded-lg border border-border-custom/70 text-xs">
              <Pressable
                onClick={() => navigate(`/cwiczenie?n=${encodeURIComponent(log.exercise_name)}`)}
                className="text-2xs w-28 truncate font-bold text-primary hover:underline text-left cursor-pointer"
              >
                {log.exercise_name}
              </Pressable>

              <div className="flex items-center gap-1 ml-auto">
                <ControlInput
                  type="number"
                  step="0.5"
                  value={log.weight ?? ''}
                  onChange={(e) => updateLog('weight', e.target.value)}
                  placeholder="0"
                  className="w-14 bg-surface border border-border-custom rounded px-1.5 py-0.5 text-xs text-center font-bold"
                />
                <span className="text-3xs text-text-muted">{logIsWellness ? '°C' : 'kg'}</span>

                <ControlInput
                  type="number"
                  value={log.reps ?? ''}
                  onChange={(e) => updateLog('reps', e.target.value)}
                  placeholder="0"
                  className="w-12 bg-surface border border-border-custom rounded px-1.5 py-0.5 text-xs text-center font-bold"
                />
                <span className="text-3xs text-text-muted">{logIsWellness ? 'min' : 'x'}</span>

                <Pressable
                  onClick={() => deleteLog(log.id)}
                  variant="ghost"
                  icon={<Trash2 size={11} />}
                  className="text-danger hover:bg-danger/10 p-1 rounded"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border-custom">
        <Button variant="primary" size="sm" onClick={updateSession} className="flex-1 flex items-center justify-center gap-1">
          <Check size={13} />
          Zapisz
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} className="flex items-center justify-center gap-1">
          <X size={13} />
          Anuluj
        </Button>
      </div>
    </div>
  );
}
