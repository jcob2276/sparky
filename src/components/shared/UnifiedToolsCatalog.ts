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
  Clock,
  TrendingUp,
  GraduationCap,
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
  {
    id: 'inwestycje',
    label: 'Inwestycje 13F (OrcaFolio)',
    icon: TrendingUp,
    path: '/inwestycje',
    category: 'operacje',
    description: 'Portfele 13F, szorty GPW, politycy USA',
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
    id: 'rozwoj',
    label: 'Nauka & Rozwój',
    icon: GraduationCap,
    path: '/rozwoj',
    category: 'strategia_zdrowie',
    description: 'Kompas rozwoju, książki, projekty i praktyka',
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
    id: 'historia',
    label: 'Historia',
    icon: Clock,
    path: '/historia',
    category: 'strategia_zdrowie',
    description: 'Przeglądy dzienne i tygodniowe, trajektoria',
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
