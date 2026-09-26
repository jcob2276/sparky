import React, { FC } from 'react';
import { AnalystConversation } from '../../lib/investments/analystHistoryService';
import { formatShortMonthLabel } from '../../lib/date';
import Button from '../ui/Button';
import { History, Plus, Trash2, MessageSquare, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface Props {
  conversations: AnalystConversation[];
  activeId: string | null;
  onSelectConversation: (conv: AnalystConversation) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function formatConversationDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return `Dziś, ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return formatShortMonthLabel(d);
  } catch {
    return '';
  }
}

export const AnalystHistorySidebar: FC<Props> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isCollapsed,
  onToggleCollapse,
}) => {
  if (isCollapsed) {
    return (
      <div className="hidden lg:flex flex-col items-center gap-3 p-2 rounded-3xl bg-surface/60 border border-border-custom shadow-xs shrink-0 w-14">
        <Button
          size="sm"
          variant="ghost"
          icon={<PanelLeftOpen size={16} />}
          onClick={onToggleCollapse}
          className="w-10 h-10 rounded-xl text-text-muted hover:text-text-primary"
          title="Rozwiń historię rozmów"
        />
        <Button
          size="sm"
          variant="tonal"
          icon={<Plus size={16} />}
          onClick={onNewChat}
          className="w-10 h-10 rounded-xl"
          title="Nowa rozmowa"
        />
        {conversations.length > 0 && (
          <div className="mt-2 flex flex-col items-center gap-1 font-mono text-3xs text-text-muted">
            <History size={13} />
            <span>{conversations.length}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full lg:w-72 xl:w-80 shrink-0 p-4 rounded-3xl bg-surface/60 border border-border-custom shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-custom/40">
          <div className="flex items-center gap-2">
            <History size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono">
              Historia rozmów
            </span>
            {conversations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md text-3xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                {conversations.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              icon={<Plus size={14} />}
              onClick={onNewChat}
              className="h-8 px-2 rounded-xl text-xs font-semibold text-primary"
              title="Nowa rozmowa"
            >
              <span>Nowa</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<PanelLeftClose size={15} />}
              onClick={onToggleCollapse}
              className="h-8 w-8 rounded-xl text-text-muted hover:text-text-primary"
              title="Zwiń panel historii"
            />
          </div>
        </div>

        {/* Conversation List */}
        {conversations.length === 0 ? (
          <div className="py-8 px-3 text-center">
            <MessageSquare size={22} strokeWidth={1.5} className="mx-auto text-text-muted mb-2" />
            <p className="text-xs font-medium text-text-secondary">Brak zapisanych rozmów</p>
            <p className="text-3xs text-text-muted mt-1 leading-relaxed">
              Każde nowe pytanie zadane analitykowi zostanie tutaj automatycznie zapisane.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-96 lg:max-h-128 overflow-y-auto pr-1">
            {conversations.map((conv) => {
              const isActive = conv.id === activeId;
              const count = conv.messages.length;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={`group relative flex items-center justify-between gap-2 p-3 rounded-2xl cursor-pointer text-left transition-all border ${
                    isActive
                      ? 'bg-primary/10 border-primary/25 text-text-primary shadow-xs'
                      : 'bg-surface/40 border-border-custom/30 text-text-secondary hover:text-text-primary hover:bg-surface-elevated/70'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <MessageSquare
                      size={14}
                      className={`shrink-0 mt-0.5 ${
                        isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-snug">
                        {conv.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-3xs font-mono text-text-muted">
                        <span>{formatConversationDate(conv.updatedAt || conv.createdAt)}</span>
                        <span>·</span>
                        <span>
                          {count} {count === 1 ? 'wpis' : count < 5 ? 'wpisy' : 'wpisów'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden group-hover:flex items-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={12} className="text-text-muted hover:text-danger transition-colors" />}
                      onClick={(e) => onDeleteConversation(conv.id, e)}
                      className="p-1 h-7 w-7 rounded-lg"
                      title="Usuń rozmowę"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="pt-3 mt-3 border-t border-border-custom/30 text-3xs font-mono text-text-muted text-center">
        Pamięć lokalna przeglądarki
      </div>
    </div>
  );
};
