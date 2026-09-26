import { FC, useState } from 'react';
import type { PortfolioPosition } from '../../../lib/investments/jakubPortfolioStorage';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import { notify } from '../../../lib/notify';

interface Props {
  onAddPosition: (newPos: PortfolioPosition) => void;
  onClose: () => void;
}

export const JakubAddPositionForm: FC<Props> = ({ onAddPosition, onClose }) => {
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'Akcje' | 'ETF'>('Akcje');
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTicker = ticker.trim().toUpperCase();
    const cleanName = name.trim();
    const numShares = parseFloat(shares.replace(',', '.'));
    const numPrice = parseFloat(buyPrice.replace(',', '.'));

    if (!cleanTicker || !cleanName || isNaN(numShares) || isNaN(numPrice)) {
      notify('Uzupełnij wszystkie pola transakcji', 'error');
      return;
    }

    const val = numShares * numPrice;
    const newPos: PortfolioPosition = {
      id: `pos-${cleanTicker.toLowerCase()}-${Date.now()}`,
      ticker: cleanTicker,
      name: cleanName,
      type,
      market: cleanTicker.endsWith('.PL') || cleanTicker === 'CDR' || cleanTicker === 'DNP' ? 'GPW' : 'US',
      shares: numShares,
      avgBuyPrice: numPrice,
      currentPrice: numPrice,
      currentValue: val,
      pnlPln: 0,
      pnlPct: 0,
    };

    onAddPosition(newPos);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="text-3xs font-mono text-text-muted uppercase">Dodaj nową pozycję</div>

      <div className="grid grid-cols-2 gap-2.5">
        <Input
          size="sm"
          label="Ticker"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="np. NVDA, ZAB"
          className="uppercase font-mono"
        />

        <Select
          controlSize="sm"
          label="Typ"
          value={type}
          onChange={(e) => setType(e.target.value as 'Akcje' | 'ETF')}
          options={[
            { value: 'Akcje', label: 'Akcje' },
            { value: 'ETF', label: 'ETF' },
          ]}
        />
      </div>

      <Input
        size="sm"
        label="Pełna nazwa"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="np. Nvidia Corp lub Żabka Group"
      />

      <div className="grid grid-cols-2 gap-2.5">
        <Input
          size="sm"
          label="Liczba jednostek"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          placeholder="np. 5 lub 0.5"
          className="font-mono"
        />

        <Input
          size="sm"
          label="Średnia cena zakupu (PLN)"
          value={buyPrice}
          onChange={(e) => setBuyPrice(e.target.value)}
          placeholder="np. 120.50"
          className="font-mono"
        />
      </div>

      <div className="pt-2 flex justify-end gap-2">
        <Button size="sm" variant="ghost" type="button" onClick={onClose} className="rounded-xl text-xs">
          Anuluj
        </Button>
        <Button size="sm" variant="primary" type="submit" className="rounded-xl text-xs">
          Dodaj do portfela
        </Button>
      </div>
    </form>
  );
};
