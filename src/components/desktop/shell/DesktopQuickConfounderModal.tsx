import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Check } from 'lucide-react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import { ToggleChip } from '../../ui/ToggleChip';
import {
  BEHAVIOR_CONFOUNDERS,
  type BehaviorConfounderKey,
} from '../../../lib/behavior/behaviorCapture';
import { fetchBehaviorLogsSince, setBehaviorConfounder } from '../../../lib/behavior/behaviorLogClient';
import { getTodayWarsaw } from '../../../lib/date';
import { daysBefore } from '../desktopUtils';
import { notify } from '../../../lib/notify';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export default function DesktopQuickConfounderModal({ isOpen, onClose, userId }: Props) {
  const today = getTodayWarsaw();
  const queryClient = useQueryClient();
  const [savingKey, setSavingKey] = useState<BehaviorConfounderKey | null>(null);

  const logsQuery = useQuery({
    queryKey: ['behavior-logs', userId],
    queryFn: () => (userId ? fetchBehaviorLogsSince(userId, daysBefore(7)) : Promise.resolve([])),
    enabled: !!userId && isOpen,
  });

  const activeKeys = (() => {
    const keys = new Set<BehaviorConfounderKey>();
    for (const row of logsQuery.data ?? []) {
      if (row.date !== today) continue;
      const key = row.behavior_key as BehaviorConfounderKey;
      if (BEHAVIOR_CONFOUNDERS.some((c) => c.key === key)) keys.add(key);
    }
    return keys;
  })();

  async function toggleConfounder(key: BehaviorConfounderKey) {
    if (!userId || savingKey) return;
    const next = !activeKeys.has(key);
    setSavingKey(key);
    try {
      await setBehaviorConfounder(userId, key, next, today);
      await queryClient.invalidateQueries({ queryKey: ['behavior-logs', userId] });
      notify(next ? `Zalogowano sygnał: ${key}` : `Usunięto sygnał: ${key}`, 'info');
    } catch {
      notify('Nie udało się zapisać sygnału', 'error');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-danger" />
          <span>Sygnały Dnia ({today})</span>
        </div>
      }
      subtitle="Zmienne zakłócające (confoundery) dla silnika korelacji i analityki."
      size="md"
    >
      <div className="space-y-4 pt-1">
        <p className="text-xs text-text-secondary leading-relaxed">
          Zaznacz nietypowe zdarzenia z dzisiejszego dnia. System uwzględni je przy analizie snu, regeneracji i realizacji celów, nie zanieczyszczając standardowych modeli.
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          {BEHAVIOR_CONFOUNDERS.map(({ key, label, icon }) => {
            const on = activeKeys.has(key);
            return (
              <ToggleChip
                key={key}
                active={on}
                onClick={() => void toggleConfounder(key)}
                disabled={savingKey === key}
                className="justify-between py-2.5 px-3 rounded-xl border border-border-custom/40 transition-all hover:scale-[1.01]"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs font-bold truncate">{label}</span>
                </span>
                {on && <Check size={14} className="text-primary shrink-0 ml-1" />}
              </ToggleChip>
            );
          })}
        </div>

        <div className="pt-3 border-t border-border-custom flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Zamknij
          </Button>
        </div>
      </div>
    </Modal>
  );
}
