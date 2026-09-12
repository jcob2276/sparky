import { useState, useRef, useEffect } from 'react';
import { Mic, Send } from 'lucide-react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import { Pressable } from '../../ui/ControlPrimitives';
import { appendStreamEntry } from '../../../lib/streamApi';
import { notify } from '../../../lib/notify';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onSaved?: () => void;
}

const TAGS = [
  { label: 'Myśl', prefix: '' },
  { label: 'Tarcie', prefix: '[TARCIE] ' },
  { label: 'Pomysł', prefix: '[POMYSŁ] ' },
  { label: 'Fakt', prefix: '## ' },
];

export default function DesktopQuickStreamModal({ isOpen, onClose, userId, onSaved }: Props) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleClose = () => {
    setContent('');
    onClose();
  };

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!userId || !content.trim() || saving) return;

    setSaving(true);
    try {
      await appendStreamEntry({
        userId,
        source: 'desktop_fast_capture',
        content: content.trim(),
        metadata: { client: 'desktop_dashboard' },
      });
      notify('Zapisano do strumienia Vanguard', 'success');
      setContent('');
      onSaved?.();
      onClose();
    } catch {
      notify('Nie udało się zapisać do strumienia', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleTagClick(prefix: string) {
    setContent((prev) => {
      if (!prefix) return prev;
      if (prev.startsWith(prefix)) return prev;
      return prefix + prev;
    });
    textareaRef.current?.focus();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <Mic size={18} className="text-primary" />
          <span>Zrzut do Strumienia</span>
        </div>
      }
      subtitle="Bezpośredni zapis do vanguard_stream z automatyczną klasyfikacją tarcia i faktów."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-2xs font-bold text-text-muted uppercase tracking-wider mr-1">Prefiks:</span>
          {TAGS.map(({ label, prefix }) => (
            <Pressable
              key={label}
              variant="ghost"
              size="sm"
              onClick={() => handleTagClick(prefix)}
              className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-surface-solid/10 hover:bg-surface-solid/20 text-text-secondary border border-border-custom/40"
            >
              {label}
            </Pressable>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder="Zapisz surowy fakt, co się właśnie wydarzyło, tarcie lub myśl... (Ctrl+Enter aby wysłać)"
          rows={4}
          className="w-full rounded-xl border border-border-custom bg-surface-solid/5 p-3.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
        />

        <div className="flex items-center justify-between pt-2 border-t border-border-custom">
          <span className="text-2xs text-text-muted">Skrót: <kbd className="font-mono bg-surface-solid/10 px-1 py-0.5 rounded text-2xs">Ctrl+Enter</kbd></span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={handleClose}>
              Anuluj
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={!content.trim() || saving}
              icon={<Send size={14} />}
            >
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
