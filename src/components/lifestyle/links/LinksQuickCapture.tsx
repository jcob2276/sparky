import { useState } from 'react';
import { Pressable, ControlInput } from '../../ui/ControlPrimitives';
import { ClipboardPaste, Link2, Plus, X } from 'lucide-react';
import Spinner from '../../ui/Spinner';
import { notify } from '../../../lib/notify';
import { CATEGORIES } from './linksUtils';

interface LinksQuickCaptureProps {
  onAddLink: (url: string, category?: string) => Promise<void>;
  loading: boolean;
}

export function LinksQuickCapture({ onAddLink, loading }: LinksQuickCaptureProps) {
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Inne');

  const handlePasteClipboard = async () => {
    if (!navigator.clipboard?.readText) {
      notify('Schowek jest niedostępny na tym urządzeniu.', 'error');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      const match = text.match(/https?:\/\/[^\s]+/);
      if (match) {
        setUrl(match[0]);
        setExpanded(true);
        notify('Wklejono URL ze schowka', 'success');
      } else {
        notify('W schowku nie znaleziono prawidłowego adresu URL', 'error');
      }
    } catch {
      notify('Brak uprawnień do schowka', 'error');
    }
  };

  const handleSubmit = async () => {
    const raw = url.trim();
    const match = raw.match(/https?:\/\/[^\s]+/);
    if (!match) {
      notify('Podaj prawidłowy adres URL zaczynający się od http:// lub https://', 'error');
      return;
    }
    await onAddLink(match[0], selectedCategory);
    setUrl('');
    setExpanded(false);
  };

  return (
    <div
      className={`mx-auto w-full max-w-[var(--ds-maxw-640px)] rounded-2xl border border-border-custom/40 bg-surface-solid/40 transition-all duration-[var(--motion-medium)] backdrop-blur-md shadow-xs ${
        expanded ? 'p-3.5 shadow-md border-border-custom' : 'px-3.5 py-2 hover:border-border-custom'
      }`}
    >
      {!expanded ? (
        <div className="flex items-center justify-between gap-2.5">
          <div
            className="flex items-center gap-2 text-text-muted flex-1 text-sm font-medium cursor-text select-none"
            onClick={() => setExpanded(true)}
          >
            <Plus size={16} className="text-primary shrink-0" />
            <span>Zapisz artykuł, wideo lub link...</span>
          </div>
          <Pressable
            onClick={handlePasteClipboard}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-solid rounded-xl transition-colors btn-press cursor-pointer"
            title="Wklej ze schowka"
          >
            <ClipboardPaste size={14} />
            <span className="hidden sm:inline">Wklej</span>
          </Pressable>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Link2 size={15} className="text-text-muted shrink-0" />
            <ControlInput
              autoFocus
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-transparent text-sm font-medium text-text-primary border-none outline-none ring-0 p-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSubmit();
                }
                if (e.key === 'Escape') {
                  setExpanded(false);
                }
              }}
            />
            {url && (
              <Pressable
                variant="ghost"
                size="sm"
                onClick={() => setUrl('')}
                className="p-1 text-text-muted hover:text-text-primary"
              >
                <X size={13} />
              </Pressable>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-custom/20">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-full text-2xs font-semibold transition-all btn-press ${
                    selectedCategory === cat
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-surface-solid/60 text-text-muted hover:text-text-primary'
                  }`}
                >
                  {cat}
                </Pressable>
              ))}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Pressable
                onClick={() => setExpanded(false)}
                className="px-2.5 py-1 text-xs font-semibold text-text-muted hover:text-text-primary rounded-xl cursor-pointer"
              >
                Anuluj
              </Pressable>
              <Pressable
                onClick={handleSubmit}
                disabled={loading || !url.trim()}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-primary text-on-accent text-xs font-bold hover:bg-primary-hover transition-colors shadow-2xs btn-press cursor-pointer disabled:opacity-40"
              >
                {loading ? <Spinner size="sm" className="h-3 w-3" /> : <Plus size={13} />}
                <span>Zapisz</span>
              </Pressable>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
