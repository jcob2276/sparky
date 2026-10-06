import { useState } from 'react';
import { Sparkles, X, Check, ArrowRight } from 'lucide-react';
import { useUserId } from '../../../store/useStore';
import { getTodayWarsaw } from '../../../lib/date';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import VoicePlanSlotsPreview from './VoicePlanSlotsPreview';
import VoicePlanChatView from './VoicePlanChatView';
import VoicePlanMicBar from './VoicePlanMicBar';
import { useVoicePlanInterview } from './useVoicePlanInterview';
import type { PlanSlotItem } from '../../../lib/voicePlanningApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  planningDate?: string;
  initialSlots?: Array<{ slot: number; category: string; title: string } | null>;
  onApplySlots: (slots: PlanSlotItem[]) => void;
}

export default function VoicePlanModal({
  isOpen,
  onClose,
  planningDate,
  initialSlots,
  onApplySlots,
}: Props) {
  const userId = useUserId();
  const effectiveDate = planningDate || getTodayWarsaw();

  const {
    messages,
    slots,
    isReady,
    isRecording,
    isProcessing,
    interimTranscript,
    audioDuration,
    startRecording,
    stopRecording,
    sendMessage,
    handleClearSlot,
    handleEditSlot,
  } = useVoicePlanInterview({
    userId,
    planningDate: effectiveDate,
    initialSlots,
  });

  const filledSlots = slots.filter((s) => Boolean(s.title.trim()));
  const hasAnySlots = filledSlots.length > 0;

  const handleApply = () => {
    onApplySlots(slots);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen onClose={onClose} showCloseButton={false} padding="p-0" size="md">
      <div className="flex flex-col max-h-[85vh] overflow-hidden bg-background border border-border-custom/60 rounded-3xl">
        {/* Header */}
        <header className="p-4 border-b border-border-custom/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
                Planowanie głosem ze Sparky
              </h3>
              <p className="text-2xs font-semibold text-text-muted">{effectiveDate}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={<X size={16} />} onClick={onClose} aria-label="Zamknij" />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <VoicePlanSlotsPreview
            slots={slots}
            onClearSlot={handleClearSlot}
            onEditSlot={handleEditSlot}
          />

          <VoicePlanChatView
            messages={messages}
            interimTranscript={interimTranscript}
            isAnalyzing={isProcessing}
            isRecording={isRecording}
          />
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-border-custom/20 bg-surface/30 space-y-3">
          <VoicePlanMicBar
            isRecording={isRecording}
            isProcessing={isProcessing}
            audioDuration={audioDuration}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onSendMessage={sendMessage}
          />

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-2xs text-text-muted">
              {isReady ? (
                <span className="text-success font-bold flex items-center gap-1">
                  <Check size={12} /> Plan gotowy do wdrożenia!
                </span>
              ) : (
                <span>Wypełniono {filledSlots.length} z 5 priorytetów</span>
              )}
            </div>

            <Button
              variant={isReady ? 'primary' : 'outline'}
              size="sm"
              disabled={!hasAnySlots || isProcessing}
              onClick={handleApply}
              icon={isReady ? <Check size={14} /> : <ArrowRight size={14} />}
            >
              Zastosuj te priorytety ({filledSlots.length}/5)
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
