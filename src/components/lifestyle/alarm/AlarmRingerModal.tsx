import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Timer, ShieldAlert } from 'lucide-react';
import { useAlarmStore } from '../../../store/useAlarmStore';
import { ShakeMission } from './missions/ShakeMission';
import { MathMission } from './missions/MathMission';
import { MemoryMission } from './missions/MemoryMission';
import { BarcodeMission } from './missions/BarcodeMission';
import { TypingMission } from './missions/TypingMission';

export function AlarmRingerModal() {
  const { ringer, dismissRinger, snoozeRinger } = useAlarmStore();
  const [missionDone, setMissionDone] = useState(false);

  if (!ringer.isRinging || !ringer.activeAlarm) return null;

  const alarm = ringer.activeAlarm;
  const missionType = alarm.mission?.type || 'none';
  const snoozeLeft = alarm.snoozeLimit > 0 ? alarm.snoozeLimit - (alarm.snoozedCount || 0) : 0;

  const handleMissionComplete = () => {
    setMissionDone(true);
    dismissRinger();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-slate-950 via-zinc-900 to-black text-foreground overflow-y-auto"
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between pt-4 max-w-md">
          <div className="flex items-center space-x-2 text-amber-400">
            <Bell className="w-6 h-6 animate-bounce" />
            <span className="text-sm font-bold tracking-wide uppercase">ALARM AKTYWNY</span>
          </div>
          {alarm.snoozeLimit > 0 && snoozeLeft > 0 && (
            <button
              onClick={snoozeRinger}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-xs font-semibold flex items-center space-x-1.5 active:scale-95 transition-all text-amber-300"
            >
              <Timer className="w-4 h-4" />
              <span>Drzemka ({snoozeLeft})</span>
            </button>
          )}
        </div>

        {/* Alarm Time & Label */}
        <div className="text-center my-6 space-y-2">
          <div className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-200 animate-pulse">
            {alarm.time}
          </div>
          <h2 className="text-xl font-bold text-foreground">{alarm.label || 'Poranna pobudka!'}</h2>
        </div>

        {/* Mission Component container */}
        <div className="w-full my-auto py-4">
          {missionType === 'shake' && (
            <ShakeMission
              requiredShakes={alarm.mission.config.shakeCount || 20}
              onComplete={handleMissionComplete}
            />
          )}

          {missionType === 'math' && (
            <MathMission
              difficulty={alarm.mission.config.mathDifficulty || 'medium'}
              totalQuestions={alarm.mission.config.mathCount || 3}
              onComplete={handleMissionComplete}
            />
          )}

          {missionType === 'memory' && (
            <MemoryMission
              gridSize={alarm.mission.config.memoryGridSize || 3}
              targetRounds={2}
              onComplete={handleMissionComplete}
            />
          )}

          {missionType === 'barcode' && (
            <BarcodeMission
              targetBarcodeValue={alarm.mission.config.barcodeValue}
              targetBarcodeName={alarm.mission.config.barcodeName}
              onComplete={handleMissionComplete}
            />
          )}

          {missionType === 'typing' && (
            <TypingMission
              typingPhrase={alarm.mission.config.typingPhrase}
              onComplete={handleMissionComplete}
            />
          )}

          {missionType === 'none' && (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-sm mx-auto">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Bell className="w-10 h-10 animate-bounce" />
              </div>
              <button
                onClick={dismissRinger}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-lg shadow-xl shadow-emerald-500/20 transition-all active:scale-98"
              >
                Wyłącz Budzik
              </button>
            </div>
          )}
        </div>

        {/* Warning Footer */}
        <div className="text-center text-xs text-muted-foreground flex items-center space-x-1 py-4">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Wymagana realizacja misji do wyłączenia dzwonka.</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
