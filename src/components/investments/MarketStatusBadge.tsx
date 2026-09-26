import { FC, useState, useEffect } from 'react';
import { getGpwSession, getUsaSession, MarketSession } from '../../lib/investments/marketStatus';
import { Clock } from 'lucide-react';

export const MarketStatusBadge: FC = () => {
  const [sessions, setSessions] = useState<{ gpw: MarketSession; usa: MarketSession }>(() => ({
    gpw: getGpwSession(),
    usa: getUsaSession(),
  }));
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const showPopover = isOpen || isHovered;

  useEffect(() => {
    const update = () => {
      setSessions({
        gpw: getGpwSession(),
        usa: getUsaSession(),
      });
    };

    // Update every 30s to keep market countdowns accurate
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, []);

  const renderDot = (variant: MarketSession['badgeVariant'], _state: MarketSession['state']) => {
    if (variant === 'success') {
      return (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </span>
      );
    }
    if (variant === 'warning') {
      return <span className="inline-flex rounded-full h-2 w-2 bg-warning" />;
    }
    return <span className="inline-flex rounded-full h-2 w-2 bg-text-muted/60" />;
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-xl bg-surface border border-border-custom shadow-2xs cursor-pointer select-none hover:border-primary/40 transition-colors"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Kliknij, aby zobaczyć godziny sesji giełdowych"
      >
        <Clock size={12} className="text-text-muted hidden sm:inline" />

        {/* GPW Pill */}
        <div className="flex items-center gap-1.5 font-mono text-2xs">
          {renderDot(sessions.gpw.badgeVariant, sessions.gpw.state)}
          <span className="font-bold text-text-primary">GPW</span>
          <span
            className={`hidden md:inline ${
              sessions.gpw.state === 'open'
                ? 'text-success font-semibold'
                : 'text-text-secondary'
            }`}
          >
            {sessions.gpw.stateLabel}
          </span>
        </div>

        <div className="h-3 w-px bg-border-custom/80" />

        {/* USA Pill */}
        <div className="flex items-center gap-1.5 font-mono text-2xs">
          {renderDot(sessions.usa.badgeVariant, sessions.usa.state)}
          <span className="font-bold text-text-primary">USA</span>
          <span
            className={`hidden md:inline ${
              sessions.usa.state === 'open'
                ? 'text-success font-semibold'
                : 'text-text-secondary'
            }`}
          >
            {sessions.usa.stateLabel}
          </span>
        </div>
      </div>

      {/* Dropdown Popover */}
      {showPopover && (
        <div className="absolute right-0 top-full mt-2 w-72 p-3.5 rounded-2xl bg-surface border border-border-custom shadow-xl z-[var(--z-popover)] text-xs animate-fade-in space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border-custom/50">
            <span className="font-bold text-text-primary font-mono text-xs flex items-center gap-1.5">
              <span>🕒</span> Sesje giełdowe na żywo
            </span>
            <span className="text-3xs font-mono text-text-muted">Czas Polski (CET)</span>
          </div>

          {/* GPW detail */}
          <div className="p-2.5 rounded-xl bg-surface border border-border-custom/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary flex items-center gap-1.5">
                {renderDot(sessions.gpw.badgeVariant, sessions.gpw.state)}
                GPW Warszawa
              </span>
              <span
                className={`text-2xs font-mono font-bold px-1.5 py-0.5 rounded ${
                  sessions.gpw.state === 'open'
                    ? 'bg-success/15 text-success'
                    : 'bg-surface text-text-secondary border border-border-custom'
                }`}
              >
                {sessions.gpw.stateLabel}
              </span>
            </div>
            <div className="flex items-center justify-between text-3xs font-mono text-text-muted">
              <span>{sessions.gpw.hoursLabel}</span>
              <span className="text-text-secondary">{sessions.gpw.nextSessionNote}</span>
            </div>
          </div>

          {/* USA detail */}
          <div className="p-2.5 rounded-xl bg-surface border border-border-custom/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary flex items-center gap-1.5">
                {renderDot(sessions.usa.badgeVariant, sessions.usa.state)}
                NYSE / NASDAQ (USA)
              </span>
              <span
                className={`text-2xs font-mono font-bold px-1.5 py-0.5 rounded ${
                  sessions.usa.state === 'open'
                    ? 'bg-success/15 text-success'
                    : 'bg-surface text-text-secondary border border-border-custom'
                }`}
              >
                {sessions.usa.stateLabel}
              </span>
            </div>
            <div className="flex items-center justify-between text-3xs font-mono text-text-muted">
              <span>{sessions.usa.hoursLabel}</span>
              <span className="text-text-secondary">{sessions.usa.nextSessionNote}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
