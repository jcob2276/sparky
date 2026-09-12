import React from 'react';
import { User, Car, FileText, Calendar, Home, CreditCard, HeartPulse } from 'lucide-react';
import WorkspaceSidebar from '../shared/WorkspaceSidebar';
import WorkspaceNavigation from '../shared/WorkspaceNavigation';
import SidebarSection from '../shared/SidebarSection';
import type { TerminyTabKey } from './TerminyPage';
import type { DerivedObligation } from './terminyDerived';

interface TerminySidebarProps {
  tab: TerminyTabKey;
  setTab: (tab: TerminyTabKey) => void;
  rows: DerivedObligation[];
  onNavigateTo?: (dest: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function TerminySidebar({
  tab,
  setTab,
  rows,
  onNavigateTo,
  collapsed,
  onToggleCollapse,
}: TerminySidebarProps) {
  const peopleCount = rows.filter((r) => r.item.kind === 'people').length;
  const vehicleCount = rows.filter((r) => r.item.kind === 'vehicle').length;
  const documentCount = rows.filter((r) => r.item.kind === 'document').length;
  const homeCount = rows.filter((r) => r.item.kind === 'home').length;
  const financeCount = rows.filter((r) => r.item.kind === 'finance').length;
  const healthCount = rows.filter((r) => r.item.kind === 'health_admin').length;

  return (
    <WorkspaceSidebar collapsed={collapsed} onCollapse={onToggleCollapse} className="select-none">
      <div className={`flex-1 overflow-y-auto ${collapsed ? 'px-1 py-2 space-y-4' : 'px-4 pb-4 space-y-6'}`}>
        <WorkspaceNavigation active="terminy" onNavigate={onNavigateTo} />

        <SidebarSection
          label="Terminy i Kategorie"
          items={[
            {
              id: 'horizon',
              label: 'Nadchodzące',
              icon: <Calendar size={15} />,
              count: rows.length,
              active: tab === 'horizon',
              onClick: () => setTab('horizon'),
            },
            {
              id: 'people',
              label: 'Ludzie (Urodziny)',
              icon: <User size={15} />,
              count: peopleCount,
              active: tab === 'people',
              onClick: () => setTab('people'),
            },
            {
              id: 'vehicle',
              label: 'Pojazd (Przeglądy)',
              icon: <Car size={15} />,
              count: vehicleCount,
              active: tab === 'vehicle',
              onClick: () => setTab('vehicle'),
            },
            {
              id: 'document',
              label: 'Dokumenty (Polisy)',
              icon: <FileText size={15} />,
              count: documentCount,
              active: tab === 'document',
              onClick: () => setTab('document'),
            },
            {
              id: 'home',
              label: 'Dom i Mieszkanie',
              icon: <Home size={15} />,
              count: homeCount,
              active: tab === 'home',
              onClick: () => setTab('home'),
            },
            {
              id: 'finance',
              label: 'Finanse i Podatki',
              icon: <CreditCard size={15} />,
              count: financeCount,
              active: tab === 'finance',
              onClick: () => setTab('finance'),
            },
            {
              id: 'health_admin',
              label: 'Zdrowie i Badania',
              icon: <HeartPulse size={15} />,
              count: healthCount,
              active: tab === 'health_admin',
              onClick: () => setTab('health_admin'),
            },
          ]}
        />
      </div>
    </WorkspaceSidebar>
  );
}
