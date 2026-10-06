import { useState } from 'react';
import { Mic, Square, Send, Keyboard, MessageSquare } from 'lucide-react';
import Button from '../../ui/Button';
import { ControlInput } from '../../ui/ControlPrimitives';

interface Props {
  isRecording: boolean;
  isProcessing: boolean;
  audioDuration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSendMessage: (text: string) => void;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function VoicePlanMicBar({
  isRecording,
  isProcessing,
  audioDuration,
  onStartRecording,
  onStopRecording,
  onSendMessage,
}: Props) {
  const [typedText, setTypedText] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);

  const handleSendText = () => {
    if (!typedText.trim() || isProcessing) return;
    onSendMessage(typedText.trim());
    setTypedText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="pt-2 border-t border-border-custom/20 space-y-2">
      {/* Recording in progress */}
      {isRecording ? (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-danger/10 border border-danger/30 animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="size-3 rounded-full bg-danger animate-ping" />
            <div>
              <p className="text-xs font-bold text-text-primary">Nagrywanie głosu…</p>
              <p className="text-2xs font-mono text-text-muted">{formatTimer(audioDuration)}</p>
            </div>
          </div>

          <Button
            variant="danger"
            size="sm"
            icon={<Square size={13} fill="currentColor" />}
            onClick={onStopRecording}
            disabled={isProcessing}
          >
            Zakończ i wyślij
          </Button>
        </div>
      ) : showKeyboard ? (
        /* Text input bar */
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Mic size={15} />}
            onClick={() => setShowKeyboard(false)}
            aria-label="Wróć do głosu"
            title="Przełącz na nagrywanie głosem"
          />
          <ControlInput
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napisz lub doprecyzuj swoje plany…"
            className="flex-1 rounded-xl border border-border-custom/60 bg-surface px-3 py-2 text-xs font-semibold text-text-primary"
            disabled={isProcessing}
          />
          <Button
            variant="primary"
            size="sm"
            icon={<Send size={14} />}
            onClick={handleSendText}
            disabled={!typedText.trim() || isProcessing}
            aria-label="Wyślij wiadomość"
          />
        </div>
      ) : (
        /* Primary Big Voice Button */
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onStartRecording();
            }}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-gradient-to-r from-primary to-primary-hover text-on-accent font-black text-xs tracking-wider uppercase transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            <div className="size-6 rounded-full bg-on-accent/20 flex items-center justify-center pointer-events-none">
              <Mic size={14} className="text-on-accent animate-bounce" />
            </div>
            <span className="pointer-events-none select-none">Naciśnij, aby dyktować</span>
          </button>

          <Button
            variant="ghost"
            size="md"
            icon={<Keyboard size={16} />}
            onClick={() => setShowKeyboard(true)}
            aria-label="Wpisz tekst z klawiatury"
            title="Wpisz z klawiatury"
          />
        </div>
      )}
    </div>
  );
}
