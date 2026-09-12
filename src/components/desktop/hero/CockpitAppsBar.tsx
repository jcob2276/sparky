import { MessageSquare, BarChart2, Bell, Calendar, ListTodo, StickyNote, BookOpen, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const APPS = [
  { to: '/czat', label: 'Oracle Czat', icon: MessageSquare, color: 'text-primary' },
  { to: '/korelacje', label: 'Korelacje', icon: BarChart2, color: 'text-info' },
  { to: '/budzik', label: 'Budzik', icon: Clock, color: 'text-warning' },
  { to: '/kalendarz', label: 'Kalendarz', icon: Calendar, color: 'text-success' },
  { to: '/todo', label: 'Zadania', icon: ListTodo, color: 'text-info' },
  { to: '/keep', label: 'Notatki', icon: StickyNote, color: 'text-warning' },
  { to: '/terminy', label: 'Terminy', icon: Bell, color: 'text-error' },
  { to: '/links', label: 'Pocket', icon: BookOpen, color: 'text-primary' },
];

export default function CockpitAppsBar() {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {APPS.map((app) => {
        const Icon = app.icon;
        return (
          <Link
            key={app.to}
            to={app.to}
            className="flex items-center gap-2 shrink-0 rounded-xl border border-border-custom/70 bg-surface/40 hover:bg-surface-2 px-3 py-2 text-xs font-medium text-text-primary transition-all hover:border-border-focus"
          >
            <Icon size={14} className={app.color} />
            <span>{app.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
