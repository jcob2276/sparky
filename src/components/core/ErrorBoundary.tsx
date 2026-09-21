import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  inline?: boolean;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  chunkFailed: boolean;
  error: Error | null;
}

const CHUNK_RELOAD_KEY = 'sparky_chunk_reload_ts';

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed')
  );
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    chunkFailed: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      chunkFailed: isChunkLoadError(error),
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Sparky ErrorBoundary] Uncaught error:', error, errorInfo);

    if (!isChunkLoadError(error)) return;

    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0');
    const now = Date.now();
    if (now - last > 30_000) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
      window.location.reload();
    }
  }

  private handleReset = () => {
    this.props.onReset?.();
    this.setState({
      hasError: false,
      chunkFailed: false,
      error: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      if (this.props.inline) {
        return (
          <div
            role="alert"
            data-testid="inline-error-boundary"
            className="rounded-2xl border border-danger/25 bg-danger/5 p-4 text-center my-2 space-y-2.5"
          >
            <div className="flex items-center justify-center gap-1.5 text-danger font-bold text-xs uppercase tracking-wider">
              <AlertTriangle size={14} className="shrink-0" />
              <span>Błąd modułu</span>
            </div>
            <p className="text-xs text-text-muted">
              {this.state.error?.message || 'Nie udało się załadować tego komponentu.'}
            </p>
            <div className="flex items-center justify-center pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={this.handleReset}
                icon={<RefreshCw size={12} />}
                className="rounded-xl text-xs"
              >
                Spróbuj ponownie
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div
          role="alert"
          data-testid="root-error-boundary"
          className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger border border-danger/20 mb-4">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-black text-text-primary mb-2 font-display uppercase tracking-wide">
            Coś poszło nie tak
          </h2>
          <p className="text-sm font-semibold text-text-muted mb-5 max-w-sm">
            {this.state.chunkFailed
              ? 'Nowa wersja aplikacji — odśwież stronę (Ctrl+F5), jeśli problem wraca.'
              : this.state.error?.message || 'Wystąpił nieoczekiwany błąd aplikacji.'}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={this.handleReset}
              className="rounded-full"
            >
              Spróbuj ponownie
            </Button>
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
              className="rounded-full"
            >
              Odśwież stronę
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
