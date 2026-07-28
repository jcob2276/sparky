import { useState, useEffect } from 'react';
import { Plus, Bell, Clock, ShieldCheck, Zap } from 'lucide-react';
import { useAlarmStore } from '../../../store/useAlarmStore';
import { AlarmCard } from './AlarmCard';
import { AlarmEditModal } from './AlarmEditModal';
import { AlarmRingerModal } from './AlarmRingerModal';
import type { Alarm } from '../../../types/alarm';
import { notify } from '../../../lib/notify';

export default function AlarmView() {
  const { alarms, addAlarm, updateAlarm, deleteAlarm, toggleAlarm, triggerAlarm, checkAlarms } = useAlarmStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [currentTime, setCurrentTime] = useState('');

  // Clock ticker & Alarm background scanner
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      );
    };
    updateTime();

    const interval = setInterval(() => {
      updateTime();
      checkAlarms();
    }, 1000);

    return () => clearInterval(interval);
  }, [checkAlarms]);

  const handleOpenNew = () => {
    setEditingAlarm(null);
    setIsModalOpen(true);
  };

  const handleEdit = (alarm: Alarm) => {
    setEditingAlarm(alarm);
    setIsModalOpen(true);
  };

  const handleSave = (alarmData: Omit<Alarm, 'id' | 'createdAt' | 'updatedAt' | 'snoozedCount'>) => {
    if (editingAlarm) {
      updateAlarm(editingAlarm.id, alarmData);
      notify('Budzik został zaktualizowany.', 'success');
    } else {
      addAlarm(alarmData);
      notify('Nowy budzik został utworzony.', 'success');
    }
  };

  const handleDelete = (id: string) => {
    deleteAlarm(id);
    notify('Budzik usunięty.', 'info');
  };

  const handleTestTrigger = (alarm: Alarm) => {
    notify(`Testowy dzwonek dla: ${alarm.label || 'Budzik'}`, 'info');
    triggerAlarm(alarm);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-24">
      {/* Ringer Modal Overlay when active */}
      <AlarmRingerModal />

      {/* Top Header Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 backdrop-blur-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              <span>Moduł Budzika z Misjami (Alarmy)</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Budzik & Misje Poranne
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Skuteczne poranne wstawanie. Wybierz misję wybudzenia: potrząśnięcie telefonem, skanowanie kodu towaru w kuchni, zadania matematyczne lub grę pamięciową.
            </p>
          </div>

          <div className="flex flex-col items-end justify-center space-y-2 bg-black/30 p-4 rounded-2xl border border-white/10">
            <div className="flex items-center space-x-2 text-primary">
              <Clock className="w-5 h-5" />
              <span className="text-xs uppercase font-semibold text-muted-foreground">Aktualny Czas</span>
            </div>
            <div className="text-3xl md:text-4xl font-black font-mono text-foreground tracking-wider">
              {currentTime || '--:--:--'}
            </div>
          </div>
        </div>
      </div>

      {/* Actions Toolbar */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground font-medium">
          <Bell className="w-4 h-4 text-primary" />
          <span>Aktywne budziki ({alarms.filter((a) => a.enabled).length} z {alarms.length})</span>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm flex items-center space-x-2 shadow-lg shadow-primary/25 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Nowy Budzik</span>
        </button>
      </div>

      {/* Alarm Cards Grid */}
      {alarms.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl space-y-3">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
          <h3 className="text-lg font-bold">Brak skonfigurowanych budzików</h3>
          <p className="text-xs text-muted-foreground">Kliknij "Nowy Budzik", aby dodać swój pierwszy budzik z misją.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alarms.map((alarm) => (
            <AlarmCard
              key={alarm.id}
              alarm={alarm}
              onToggle={toggleAlarm}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTestTrigger={handleTestTrigger}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <AlarmEditModal
          initialAlarm={editingAlarm}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
