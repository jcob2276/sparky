import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Modal from '../../ui/Modal';
import { Pressable } from '../../ui/ControlPrimitives';
import { WORKSPACE_TOOLS, type WorkspaceToolDef } from '../../shared/UnifiedToolsCatalog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const TOOL_GROUPS = [
  { category: 'operacje', label: 'Na co dzień' },
  { category: 'strategia_zdrowie', label: 'Rozwój, zdrowie i historia' },
] as const;

export default function DesktopToolsLauncherModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate();

  const handleSelect = (tool: WorkspaceToolDef) => {
    navigate(tool.path);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Katalog narzędzi Sparky" size="lg">
      <div className="space-y-5 pt-2 pb-1">
        {TOOL_GROUPS.map(({ category, label }) => (
          <section key={category} aria-labelledby={`desktop-tools-${category}`}>
            <h4 id={`desktop-tools-${category}`} className="mb-2 text-xs font-semibold text-text-muted">
              {label}
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {WORKSPACE_TOOLS.filter((tool) => tool.category === category).map((tool) => {
                const Icon = tool.icon;
                return (
                  <Pressable
                    key={tool.id}
                    variant="ghost"
                    onClick={() => handleSelect(tool)}
                    className="group flex min-h-11 items-center gap-3 rounded-xl border border-border-custom/60 bg-surface-solid/5 px-3 py-2 text-left hover:border-primary/40 hover:bg-surface-solid/15 ui-interactive"
                  >
                    <Icon size={18} aria-hidden="true" className="shrink-0 text-primary" />
                    <span className="min-w-0 flex flex-1 flex-col">
                      <span className="text-sm font-semibold text-text-primary">{tool.label}</span>
                      <span className="text-xs text-text-secondary">{tool.description}</span>
                    </span>
                    <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-text-muted" />
                  </Pressable>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
