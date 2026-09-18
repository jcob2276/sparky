import { Pressable } from '../ui/ControlPrimitives';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import PageToolbar from './PageToolbar';
import Tabs from '../ui/Tabs';

interface WorkspaceHeaderTab { key: string; label: ReactNode; icon?: ReactNode }

interface WorkspaceHeaderProps {
  title: ReactNode;
  subtitle?: string;
  onBack: () => void;
  leading?: ReactNode;
  center?: ReactNode;
  actions?: ReactNode;
  tabs?: { items: WorkspaceHeaderTab[]; active: string; onChange: (key: string) => void; hideOnMobile?: boolean };
  navigation?: ReactNode;
  secondaryRow?: ReactNode;
  hideNavigationOnMobile?: boolean;
}

export function WorkspaceHeader({ title, subtitle, onBack, leading, center, actions, tabs, navigation, secondaryRow, hideNavigationOnMobile }: WorkspaceHeaderProps) {
  const shouldHideNavOnMobile = hideNavigationOnMobile || Boolean(tabs?.hideOnMobile);
  return (
    <>
      <PageToolbar
        title={title}
        description={subtitle}
        leading={
          <>
            <Pressable variant="ghost" size="sm" onClick={onBack} className="shrink-0" aria-label="Wróć">
              <ChevronLeft size={20} strokeWidth={2.5} />
            </Pressable>
            {leading}
          </>
        }
        center={center}
        actions={actions}
        hideNavigationOnMobile={shouldHideNavOnMobile}
        navigation={tabs ? <Tabs tabs={tabs.items} active={tabs.active} onChange={tabs.onChange} /> : navigation}
      />
      {secondaryRow}
    </>
  );
}
