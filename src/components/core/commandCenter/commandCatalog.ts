import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Calendar,
  CheckSquare,
  FileText,
  Dumbbell,
  Eye,
  GraduationCap,
  History,
  Inbox,
  LayoutDashboard,
  Redo2,
  Settings,
  Undo2,
  WalletCards,
} from 'lucide-react';
import { redoLastAction, undoLastAction } from '../../../lib/actionHistory';

export interface SparkyCommand {
  id: string;
  title: string;
  subtitle: string;
  keywords: string;
  icon: LucideIcon;
  shortcut?: string;
  run: () => Promise<unknown> | unknown;
}

interface CommandCatalogOptions {
  navigate: (path: string) => void;
  close: () => void;
}

export function createCommandCatalog({ navigate, close }: CommandCatalogOptions): SparkyCommand[] {
  const go = (path: string) => () => {
    navigate(path);
    close();
  };

  return [
    { id: 'today', title: 'Otwórz Dzisiaj', subtitle: 'Plan, Teraz i następne ruchy', keywords: 'dzisiaj dziś home plan teraz', icon: LayoutDashboard, run: go('/dzis') },
    { id: 'tasks', title: 'Otwórz Zadania', subtitle: 'Skrzynka, Dzisiaj i zaplanowane', keywords: 'todo zadania lista skrzynka', icon: CheckSquare, run: go('/todo') },
    { id: 'notes', title: 'Otwórz Notatki', subtitle: 'Notatki, materiały i powiązania', keywords: 'keep notes notatki wiedza', icon: FileText, run: go('/keep') },
    { id: 'calendar', title: 'Otwórz Kalendarz', subtitle: 'Dzień, tydzień i agenda', keywords: 'kalendarz wydarzenia event plan', icon: Calendar, run: go('/kalendarz') },
    { id: 'terminy', title: 'Otwórz Terminy', subtitle: 'Urodziny, przeglądy, polisy', keywords: 'terminy urodziny przegląd polisa ubezpieczenie przypomnienia', icon: Bell, run: go('/terminy') },
    { id: 'inbox', title: 'Otwórz Pocket', subtitle: 'Materiały oczekujące na decyzję', keywords: 'pocket inbox linki skrzynka materiały', icon: Inbox, run: go('/links') },
    { id: 'finance', title: 'Otwórz Finanse', subtitle: 'Konta, transakcje i portfel', keywords: 'finanse bank oszczędności inwestycje xtb', icon: WalletCards, run: go('/finanse') },
    { id: 'growth', title: 'Otwórz Rozwój', subtitle: 'Cele i kierunek', keywords: 'rozwój cele kierunek', icon: GraduationCap, run: go('/rozwoj') },
    { id: 'training', title: 'Otwórz Centrum Treningowe', subtitle: 'Trening i aktywność', keywords: 'trening ćwiczenia siłownia', icon: Dumbbell, run: go('/trening') },
    { id: 'eyesight', title: 'Otwórz Wzrok', subtitle: 'Pomiary wzroku', keywords: 'wzrok oczy okulary optyka', icon: Eye, run: go('/optics') },
    { id: 'history', title: 'Otwórz Kronikę', subtitle: 'Refleksje i wcześniejsze dni', keywords: 'historia kronika refleksje dni', icon: History, run: go('/historia') },
    { id: 'settings', title: 'Otwórz Ustawienia', subtitle: 'Oura, telefon APK, kalendarz', keywords: 'ustawienia settings oura apk telefon uprawnienia', icon: Settings, run: go('/settings') },
    { id: 'undo', title: 'Cofnij ostatnią zmianę', subtitle: 'Ostatnia odwracalna czynność', keywords: 'undo cofnij wróć zmiana', icon: Undo2, shortcut: '⌘ Z', run: undoLastAction },
    { id: 'redo', title: 'Ponów ostatnią zmianę', subtitle: 'Ponownie wykonaj cofniętą czynność', keywords: 'redo ponów powtórz', icon: Redo2, shortcut: '⇧⌘ Z', run: redoLastAction },
  ];
}

const foldCommandText = (value: string) => value.toLocaleLowerCase('pl-PL')
  .normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l');

export function filterCommands(commands: SparkyCommand[], query: string): SparkyCommand[] {
  const normalized = foldCommandText(query.trim());
  if (!normalized) return commands.slice(0, 6);
  const words = normalized.split(/\s+/);
  return commands.filter((command) => {
    const haystack = foldCommandText(`${command.title} ${command.subtitle} ${command.keywords}`);
    return words.every((word) => haystack.includes(word));
  });
}
