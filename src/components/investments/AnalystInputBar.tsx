import { FC } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Send } from 'lucide-react';

interface Props {
  inputVal: string;
  loading: boolean;
  onInputChange: (val: string) => void;
  onSend: () => void;
}

export const AnalystInputBar: FC<Props> = ({
  inputVal,
  loading,
  onInputChange,
  onSend,
}) => (
  <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-surface border border-border-custom shadow-xs flex items-center gap-2 sm:gap-3">
    <div className="flex-1 min-w-0">
      <Input
        type="text"
        size="md"
        value={inputVal}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSend();
        }}
        placeholder="Zadaj pytanie analitykowi: np. 'Kto kupował NVDA?', 'Szorty Dino'..."
        disabled={loading}
      />
    </div>
    <Button
      size="md"
      variant="primary"
      icon={<Send size={15} />}
      onClick={onSend}
      disabled={loading || !inputVal.trim()}
      className="rounded-xl font-bold shrink-0 px-3 sm:px-4"
    >
      <span className="hidden sm:inline">Wyślij ↵</span>
    </Button>
  </div>
);
