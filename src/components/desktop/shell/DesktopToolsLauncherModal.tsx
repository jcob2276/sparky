import { useNavigate } from 'react-router-dom';
import { LayoutGrid, ChevronRight } from 'lucide-react';
import Modal from '../../ui/Modal';
import { Pressable } from '../../ui/ControlPrimitives';
import { WORKSPACE_TOOLS, type WorkspaceToolDef } from '../../shared/UnifiedToolsCatalog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  naukaBadge?: number;
}

export default function DesktopToolsLauncherModal({ isOpen, onClose, naukaBadge }: Props) {
  const navigate = useNavigate();

  const handleSelect = (tool: WorkspaceToolDef) => {
    navigate(tool.path);
    onClose();
  };

  const operacje = WORKSPACE_TOOLS.filter((t) => t.category === 'operacje');
  const strategia = WORKSPACE_TOOLS.filter((t) => t.category === 'strategia_zdrowie');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <LayoutGrid size={18} className="text-primary" />
          <span>Katalog Narzędzi Vanguard OS</span>
        </div>
      }
      subtitle="Zintegrowany dostęp do wszystkich modułów i aplikacji systemu."
      size="lg"
    >
      <div className="space-y-6 pt-2 pb-1">
        {/* Codzienny obieg */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xs font-black uppercase tracking-wider text-text-muted">
              Codzienne Narzędzia Operacyjne
            </span>
            <div className="h-px flex-1 bg-border-custom/50" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {operacje.map((tool) => {
              const Icon = tool.icon;
              return (
                <Pressable
                  key={tool.id}
                  variant="ghost"
                  onClick={() => handleSelect(tool)}
                  className="flex flex-col items-start p-3 rounded-2xl border border-border-custom/60 bg-surface-solid/5 hover:bg-surface-solid/15 hover:border-primary/40 active:scale-[0.98] transition-all text-left group"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm group-hover:scale-105 transition-transform">
                      <Icon size={18} />
                    </div>
                    <ChevronRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">
                    {tool.label}
                  </span>
                  <span className="text-3xs text-text-secondary line-clamp-1 mt-0.5">
                    {tool.description}
                  </span>
                </Pressable>
              );
            })}
          </div>
        </div>

        {/* Strategia, Zdrowie i Pamięć */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xs font-black uppercase tracking-wider text-text-muted">
              Strategia, Zdrowie & Pamięć Długoterminowa
            </span>
            <div className="h-px flex-1 bg-border-custom/50" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {strategia.map((tool) => {
              const Icon = tool.icon;
              const hasBadge = tool.badgeKey === 'naukaBadge' && (naukaBadge ?? 0) > 0;
              return (
                <Pressable
                  key={tool.id}
                  variant="ghost"
                  onClick={() => handleSelect(tool)}
                  className="flex flex-col items-start p-3 rounded-2xl border border-border-custom/60 bg-surface-solid/5 hover:bg-surface-solid/15 hover:border-primary/40 active:scale-[0.98] transition-all text-left group relative"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm group-hover:scale-105 transition-transform">
                      <Icon size={18} />
                    </div>
                    {hasBadge ? (
                      <span className="h-4 min-w-4 rounded-full bg-danger text-on-accent px-1 text-3xs font-bold leading-4">
                        {naukaBadge}
                      </span>
                    ) : (
                      <ChevronRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">
                    {tool.label}
                  </span>
                  <span className="text-3xs text-text-secondary line-clamp-1 mt-0.5">
                    {tool.description}
                  </span>
                </Pressable>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
