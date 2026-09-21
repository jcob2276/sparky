import { Suspense, memo, useState } from 'react';
import { FileDown } from 'lucide-react';
import { useSession } from '../../store/useStore';
import { Pressable } from '../ui/ControlPrimitives';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import Stats, { type ChronicleDomain } from './Stats';
import StravaWidget from '../integrations/StravaWidget';
import Photos from '../identity/Photos';
import { useHaptics } from '../../hooks/useHaptics';

function ViewFallback() {
  return (
    <div className="flex min-h-[var(--ds-h-220px)] items-center justify-center rounded-lg border border-on-accent/[0.06] bg-on-accent/[0.02]">
      <Spinner size="md" />
    </div>
  );
}

const DOMAIN_TABS: { id: ChronicleDomain; label: string; icon: string }[] = [
  { id: 'body', label: 'Ciało & Sylwetka', icon: '📏' },
  { id: 'gym', label: 'Siłownia', icon: '🏋️' },
  { id: 'running', label: 'Biegi', icon: '🏃' },
  { id: 'all', label: 'Całość', icon: '📋' },
];

export const DashboardHistoriaTab = memo(function DashboardHistoriaTab() {
  const session = useSession();
  const haptics = useHaptics();
  const [activeDomain, setActiveDomain] = useState<ChronicleDomain>('body');
  const [isExportOpen, setIsExportOpen] = useState(false);

  if (!session) return null;

  return (
    <div className="p-4 sm:p-5 pb-8 space-y-4">
      {/* Segmented Domain Tabs + Compact Export Button */}
      <div className="flex items-center justify-between gap-2 pt-1 pb-1">
        <div
          className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Domeny kroniki"
        >
          {DOMAIN_TABS.map((tab) => {
            const isActive = activeDomain === tab.id;
            return (
              <Pressable
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  haptics.selection();
                  setActiveDomain(tab.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ui-interactive active:scale-95 shadow-2xs whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-primary/40 bg-primary/15 text-primary shadow-xs'
                    : 'border-border-custom/80 bg-surface/70 hover:bg-surface text-text-muted hover:text-text-primary'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Pressable>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExportOpen(true)}
          icon={<FileDown size={12} />}
          className="!h-7 !px-2.5 !text-3xs font-black uppercase tracking-wider text-primary border-primary/25 bg-primary/10 hover:bg-primary/20 rounded-full shrink-0"
        >
          Eksport
        </Button>
      </div>

      <Suspense fallback={<ViewFallback />}>
        <Stats
          domain={activeDomain}
          photosSlot={<Photos />}
          runningSlot={<StravaWidget />}
          isExportOpen={isExportOpen}
          onCloseExport={() => setIsExportOpen(false)}
          onOpenExport={() => setIsExportOpen(true)}
        />
      </Suspense>
    </div>
  );
});
