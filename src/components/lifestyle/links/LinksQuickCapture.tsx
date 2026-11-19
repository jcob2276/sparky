import { Pressable, ControlInput } from '../../ui/ControlPrimitives';
import { ClipboardPaste, Link2, Plus, X } from 'lucide-react';
import Spinner from '../../ui/Spinner';
import { notify } from '../../../lib/notify';

interface LinksQuickCaptureProps {
  onAddLink: (url: string) => Promise<void>;
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  url: string;
  setUrl: (value: string) => void;
  loading: boolean;
}

export function LinksQuickCapture({ expanded, setExpanded, url, setUrl, onAddLink, loading }: LinksQuickCaptureProps) {
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
    if (loading) return;
    const raw = url.trim();
    const match = raw.match(/https?:\/\/[^\s]+/);
    if (!match) {
      notify('Podaj prawidłowy adres URL zaczynający się od http:// lub https://', 'error');
      return;
    }
    await onAddLink(match[0]);
  };

  return (
    <div id="pocket-quick-capture"
      className={`mx-auto w-full max-w-[var(--ds-maxw-640px)] rounded-lg border border-border-custom/40 bg-surface-solid/40 transition-all duration-[var(--motion-medium)] backdrop-blur-md shadow-xs ${
        expanded ? 'p-3.5 shadow-md border-border-custom' : 'px-3.5 py-2 hover:border-border-custom'
      }`}
    >
      {!expanded ? (
        <div className="flex items-center justify-between gap-2.5">
          <Pressable type="button"
            className="flex min-h-11 flex-1 items-center gap-2 text-left text-sm font-medium text-text-muted"
            onClick={() => setExpanded(true)}
          >
            <Plus size={16} className="text-primary shrink-0" />
            <span>Zapisz artykuł, wideo lub link</span>
          </Pressable>
          <Pressable
            onClick={handlePasteClipboard}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-solid rounded-lg transition-colors btn-press cursor-pointer"
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
              aria-label="Adres linku"
              disabled={loading}
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
                aria-label="Wyczyść adres"
                disabled={loading}
                className="p-1 text-text-muted hover:text-text-primary"
              >
                <X size={13} />
              </Pressable>
            )}
          </div>

          <div className="flex items-center justify-end gap-1.5 border-t border-border-custom/20 pt-2">
            <Pressable
              onClick={() => setExpanded(false)}
              className="px-2.5 py-1 text-xs font-semibold text-text-muted hover:text-text-primary rounded-lg cursor-pointer"
            >
              Anuluj
            </Pressable>
            <Pressable
              onClick={handleSubmit}
              disabled={loading || !url.trim()}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-on-accent text-xs font-bold hover:bg-primary-hover transition-colors shadow-2xs btn-press cursor-pointer disabled:opacity-40"
            >
              {loading ? <Spinner size="sm" className="h-3 w-3" /> : <Plus size={13} />}
              <span>Zapisz</span>
            </Pressable>
          </div>
        </div>
      )}
    </div>
  );
}
