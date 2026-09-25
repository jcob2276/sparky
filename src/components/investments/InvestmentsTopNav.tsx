import { FC, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { Pressable } from '../ui/ControlPrimitives';
import { Sparkles, WalletCards, LayoutGrid, X, ExternalLink } from 'lucide-react';

interface Props {
  onOpenPlaybook: () => void;
  onRefresh: () => void;
  syncing: boolean;
}

const SPARKY_LINKS = [
  { label: 'Dziś (Pulpit)', path: '/dzis', icon: Sparkles, desc: 'Codzienny widok poranny i wieczorny' },
  { label: 'Finanse Osobiste', path: '/finanse', icon: WalletCards, desc: 'Budżet, runway, pasywa, cashflow' },
  { label: 'Desktop Cockpit', path: '/dashboard', icon: LayoutGrid, desc: 'Pełny pulpit operacyjny na komputer' },
];

export const InvestmentsTopNav: FC<Props> = ({ onOpenPlaybook, onRefresh, syncing }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  return (
    <div className="relative mb-6 border-b border-border-custom/50 pb-4">
      <div className="flex items-center justify-between gap-4">
        {/* Brand & App Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="OrcaFolio">
              🐋
            </span>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-text-primary">
                  OrcaFolio
                </span>
                <span className="px-1.5 py-0.5 rounded text-3xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                  Sparky OS
                </span>
              </div>
              <p className="text-3xs text-text-secondary hidden sm:block">
                Publiczny radar 13F & GPW KNF
              </p>
            </div>
          </div>

          <div className="h-4 w-px bg-border-custom/60 mx-1 hidden sm:block" />

          {/* Quick Menu Button */}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
          >
            <span>📱 Menu Sparky</span>
            <span className="text-3xs font-mono text-text-muted">▼</span>
          </Button>
        </div>

        {/* Quick Links & Actions */}
        <div className="flex items-center gap-2">
          <Link
            to="/finanse"
            className="hidden md:flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border-custom/60 bg-surface hover:bg-surface/80 text-text-secondary hover:text-text-primary transition-colors shadow-xs"
          >
            <WalletCards size={13} />
            <span>Finanse osobiste</span>
          </Link>

          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenPlaybook}
            className="hidden sm:inline-flex rounded-xl border border-border-custom/60 text-xs font-semibold"
          >
            🧠 Playbook
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={onRefresh}
            disabled={syncing}
            loading={syncing}
            className="rounded-xl border border-border-custom/60 text-xs font-semibold"
          >
            {syncing ? '...' : '↻ Odśwież'}
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/dzis')}
            className="rounded-xl text-xs font-bold"
          >
            ← Do Sparky OS
          </Button>
        </div>
      </div>

      {/* Dropdown Menu Modal / Sheet connecting both sites */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-[var(--z-modal)] bg-black/40 animate-fade-in"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="absolute left-0 top-14 z-[var(--z-overlay)] w-full max-w-sm p-4 rounded-3xl bg-surface border border-border-custom shadow-xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-border-custom/50">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Połączone Aplikacje Sparky
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMenuOpen(false)}
                className="p-1 h-auto text-text-muted hover:text-text-primary"
              >
                <X size={16} />
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-2xs font-semibold text-text-secondary px-1">
                Główny System Operacyjny:
              </p>
              {SPARKY_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Pressable
                    key={link.path}
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate(link.path);
                    }}
                    className="w-full text-left p-2.5 rounded-2xl border border-border-custom/40 bg-surface/50 hover:bg-surface hover:border-primary/40 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Icon size={15} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">
                          {link.label}
                        </div>
                        <div className="text-3xs text-text-secondary">{link.desc}</div>
                      </div>
                    </div>
                    <ExternalLink size={12} className="text-text-muted invisible group-hover:visible" />
                  </Pressable>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-border-custom/40">
              <div className="flex items-center justify-between text-2xs text-text-muted px-1">
                <span>Tryb: 100% Free · Bez logowania</span>
                <span className="font-mono">v1.0 OrcaFolio</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
