import Button from '../ui/Button';
import { HelpCircle, X } from 'lucide-react';
import Modal from '../ui/Modal';
import { ClarificationRequestCard } from '../ai/ClarificationRequestCard';
import { SystemProposalCard } from './SystemProposalCard';
import { useActionCenterData } from '../../hooks/useActionCenterData';
import DataStateNotice from '../core/DataStateNotice';
export function ActionCenterSheet({
  open,
  onClose,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const { clarifications, proposals, loading, error, handleProposalResolved, handleAnswered } = useActionCenterData(open, onUpdated);
  const empty = !loading && !error && clarifications.length === 0 && proposals.length === 0;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      showCloseButton={false}
      padding="p-5 pb-8"
      overflowY={true}
      size="lg"
      overlayClassName="p-0 items-end justify-center sm:p-4"
      className="bg-surface-solid border border-border-custom rounded-t-[var(--ds-arbitrary-24px)] sm:rounded-b-[var(--ds-arbitrary-24px-coll-2)] max-h-[var(--ds-h-80vh)]"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-text-muted">
          <HelpCircle size={14} /> Oczekujące
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="rounded-full p-2 text-text-muted hover:bg-surface/80"
        >
          <X size={16} />
        </Button>
      </div>

      {loading && <p className="text-center text-sm text-text-muted py-6">Ładuję…</p>}
      {error && <DataStateNotice title="Nie udało się odczytać oczekujących akcji" detail={error.message} tone="warning" />}

      {empty && (
        <p className="text-center text-sm text-text-tertiary py-8">Brak propozycji ani pytań.</p>
      )}

      <div className="space-y-4">
        {proposals.map((p) => (
          <SystemProposalCard key={p.id} proposal={p} onResolved={handleProposalResolved} />
        ))}

        {clarifications.map((item) => (
          <ClarificationRequestCard
            key={item.id}
            request={{
              id: item.id,
              question: item.question,
              response_type: item.response_type as 'confirm' | 'single_choice' | 'multi_choice' | 'short_text',
              options: item.options ?? [],
              proposed_memory: item.proposed_memory ?? undefined,
              confidence: item.confidence ?? undefined,
            }}
            onAnswered={handleAnswered}
          />
        ))}
      </div>
    </Modal>
  );
}
