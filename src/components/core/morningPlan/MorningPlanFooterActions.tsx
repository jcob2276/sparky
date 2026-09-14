import { ChevronLeft, ChevronRight, Send } from 'lucide-react';
import Button from '../../ui/Button';

interface Props {
  step: 1 | 2;
  setStep: (step: 1 | 2) => void;
  planningTomorrow: boolean;
  sending: boolean;
  onSubmit: () => void;
}

export default function MorningPlanFooterActions({
  step,
  setStep,
  planningTomorrow,
  sending,
  onSubmit,
}: Props) {
  return (
    <div className="p-4 border-t border-border-custom/20 flex items-center justify-between">
      {!planningTomorrow && step === 2 && (
        <Button variant="outline" size="sm" icon={<ChevronLeft size={16} />} onClick={() => setStep(1)}>
          Wróć
        </Button>
      )}
      {planningTomorrow ? (
        <Button className="ml-auto" size="sm" icon={<Send size={14} />} loading={sending} onClick={onSubmit}>
          {sending ? 'Zapisuję plan…' : 'Zatwierdź plan na jutro'}
        </Button>
      ) : step === 1 ? (
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<ChevronRight size={16} />}
            iconPosition="right"
            onClick={() => setStep(2)}
          >
            Ułóż godziny
          </Button>
          <Button size="sm" icon={<Send size={14} />} loading={sending} onClick={onSubmit}>
            {sending ? 'Zapisuję plan…' : 'Zatwierdź plan'}
          </Button>
        </div>
      ) : (
        <Button className="ml-auto" size="sm" icon={<Send size={14} />} loading={sending} onClick={onSubmit}>
          {sending ? 'Zapisuję plan…' : 'Zatwierdź plan'}
        </Button>
      )}
    </div>
  );
}
