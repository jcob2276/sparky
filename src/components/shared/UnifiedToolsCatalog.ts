import type { LucideIcon } from 'lucide-react';
import {
  StickyNote,
  ListTodo,
  Calendar,
  Bell,
  BookOpen,
  WalletCards,
  FolderKanban,
  HeartPulse,
  GraduationCap,
  Clock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export interface WorkspaceToolDef {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  category: 'operacje' | 'strategia_zdrowie';
  badgeKey?: string;
  description: string;
}

export const WORKSPACE_TOOLS: WorkspaceToolDef[] = [
  // Codzienne operacje
  {
    id: 'keep',
    label: 'Notatki',
    icon: StickyNote,
    path: '/keep',
    category: 'operacje',
    description: 'Szybkie notatki, checklisty, myśli',
  },
  {
    id: 'todo',
    label: 'Zadania',
    icon: ListTodo,
    path: '/todo',
    category: 'operacje',
    description: 'Kolejka wykonawcza Todo & PowerList',
  },
  {
    id: 'kalendarz',
    label: 'Kalendarz',
    icon: Calendar,
    path: '/kalendarz',
    category: 'operacje',
    description: 'Zdarzenia, bloki czasu, synchronizacja',
  },
  {
    id: 'terminy',
    label: 'Terminy',
    icon: Bell,
    path: '/terminy',
    category: 'operacje',
    description: 'Urodziny, przeglądy, polisy, subskrypcje',
  },
  {
    id: 'links',
    label: 'Pocket',
    icon: BookOpen,
    path: '/links',
    category: 'operacje',
    description: 'Zapisane linki i materiały do przeczytania',
  },
  {
    id: 'finanse',
    label: 'Finanse',
    icon: WalletCards,
    path: '/finanse',
    category: 'operacje',
    description: 'Cashflow, koszty stałe, pasywa, runway',
  },

  // Strategia, Zdrowie i Pamięć
  {
    id: 'projekty',
    label: 'Kierunek',
    icon: FolderKanban,
    path: '/projekty',
    category: 'strategia_zdrowie',
    description: 'Cele długoterminowe, sprinty, projekty',
  },
  {
    id: 'badania',
    label: 'Kartoteka',
    icon: HeartPulse,
    path: '/badania',
    category: 'strategia_zdrowie',
    description: 'Wyniki krwi, badania laboratoryjne, profil',
  },
  {
    id: 'rozwoj',
    label: 'Nauka',
    icon: GraduationCap,
    path: '/rozwoj',
    category: 'strategia_zdrowie',
    badgeKey: 'naukaBadge',
    description: 'Skill Tree, GrowthVault, eksperymenty',
  },
  {
    id: 'historia',
    label: 'Historia',
    icon: Clock,
    path: '/historia',
    category: 'strategia_zdrowie',
    description: 'Przeglądy dzienne i tygodniowe, trajektoria',
  },
  {
    id: 'czat',
    label: 'Oracle Czat',
    icon: Sparkles,
    path: '/czat',
    category: 'strategia_zdrowie',
    description: 'Rozmowa z pamięcią Vanguard i asystentem',
  },
  {
    id: 'korelacje',
    label: 'Korelacje',
    icon: TrendingUp,
    path: '/korelacje',
    category: 'strategia_zdrowie',
    description: 'Korelacje nawyków, snu, HRV i energii',
  },
];
