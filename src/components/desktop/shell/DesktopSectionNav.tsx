import { Link } from 'react-router-dom';
import type { DesktopTabType } from './DesktopQuickActionsBar';
import { Pressable } from '../../ui/ControlPrimitives';
import Badge from '../../ui/Badge';
import {
  Dumbbell,
  HeartPulse,
  Brain,
  Layers,
  Sparkles,
  TrendingUp,
  Eye,
  AlarmClock,
  GraduationCap,
} from 'lucide-react';

interface Props {
  activeTab: DesktopTabType;
  onTabChange: (tab: DesktopTabType) => void;
  dailyStatus?: string;
  naukaBadge?: number;
}

const TABS: { id: DesktopTabType; label: string; icon: typeof Dumbbell }[] = [
  { id: 'training', label: 'Trening', icon: Dumbbell },
  { id: 'health', label: 'Zdrowie', icon: HeartPulse },
  { id: 'intel', label: 'Pamięć', icon: Brain },
  { id: 'all', label: 'Wszystko', icon: Layers },
];

const SHORTCUTS = [
  { label: 'Oracle Czat', href: '/czat', icon: Sparkles },
  { label: 'Korelacje', href: '/korelacje', icon: TrendingUp },
  { label: 'Wzrok & Wizja', href: '/optics', icon: Eye },
  { label: 'Budzik', href: '/budzik', icon: AlarmClock },
  { label: 'Nauka & Skill', href: '/rozwoj', icon: GraduationCap },
];

export default function DesktopSectionNav({ activeTab, onTabChange, dailyStatus, naukaBadge }: Props) {
  const statusColor =
    dailyStatus === 'green'
      ? 'bg-success'
      : dailyStatus === 'yellow'
      ? 'bg-warning'
      : dailyStatus === 'red'
      ? 'bg-danger'
      : null;

  return (
    <nav className="hidden xl:block sticky top-24 self-start w-40 shrink-0 pt-1 space-y-6">
      <div>
        <p className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-25em)] text-text-muted mb-2.5 px-2">
          Obszary
        </p>
        <ul className="space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <li key={id}>
                <Pressable
                  variant="ghost"
                  onClick={() => onTabChange(id)}
                  className={`w-full flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-bold transition-all text-left ${
                    isActive
                      ? 'bg-primary/10 text-primary font-black border border-primary/20 shadow-xs'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-solid/10'
                  }`}
                  icon={<Icon size={14} className={isActive ? 'text-primary' : 'text-text-muted'} />}
                >
                  <span className="flex-1 truncate">{label}</span>
                  {id === 'training' && statusColor && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor}`} />
                  )}
                </Pressable>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-25em)] text-text-muted mb-2.5 px-2">
          Aplikacje
        </p>
        <ul className="space-y-1">
          {SHORTCUTS.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link
                to={href}
                className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-surface-solid/10 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0 truncate">
                  <Icon size={14} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </div>
                {href === '/rozwoj' && naukaBadge != null && naukaBadge > 0 && (
                  <Badge count={naukaBadge} color="var(--color-danger)" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
