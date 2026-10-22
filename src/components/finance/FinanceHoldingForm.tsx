import { useState } from 'react';
import { HOLDING_ASSET_LABELS, type HoldingAssetClass, type HoldingInput } from '@vanguard/domain';
import type { HoldingFormInput } from '../../lib/finance/holdingsApi';
import Button from '../ui/Button';
import { ControlInput, ControlSelect } from '../ui/ControlPrimitives';

interface FinanceHoldingFormProps {
  holding?: HoldingInput;
  pending: boolean;
  onSubmit: (input: HoldingFormInput) => Promise<boolean>;
  onRemove?: () => void;
  onDone: () => void;
}

const fieldClass = 'min-h-11 w-full rounded-xl border-0 bg-surface-2/70 px-3 text-sm ring-1 ring-border-custom/25 focus:ring-2 focus:ring-primary/35';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

export function FinanceHoldingForm({ holding, pending, onSubmit, onRemove, onDone }: FinanceHoldingFormProps) {
  const [ticker, setTicker] = useState(holding?.ticker ?? '');
  const [name, setName] = useState(holding?.name ?? '');
  const [assetClass, setAssetClass] = useState<HoldingAssetClass>(holding?.assetClass ?? 'etf');
  const [quantity, setQuantity] = useState(holding ? String(holding.quantity) : '');
  const [avgCost, setAvgCost] = useState(holding ? String(holding.avgCostPln) : '');
  const [target, setTarget] = useState(holding?.targetWeightPct != null ? String(holding.targetWeightPct) : '');

  const num = (value: string) => Number(value.replace(',', '.'));
  const valid = ticker.trim().length > 0 && name.trim().length > 0 && num(quantity) >= 0 && quantity !== '' && num(avgCost) >= 0 && avgCost !== '';

  return (
    <form
      className="space-y-3 px-1 pb-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!valid) return;
        const saved = await onSubmit({
          ticker,
          name,
          assetClass,
          quantity: num(quantity),
          avgCostPln: num(avgCost),
          targetWeightPct: target.trim() === '' ? null : num(target),
        });
        if (saved) onDone();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Symbol notowań">
          <ControlInput value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="np. VGWD.DE lub ETFBSPXPL.WA" autoCapitalize="characters" className={fieldClass} />
        </Field>
        <Field label="Nazwa">
          <ControlInput value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Vanguard All-World Div" className={fieldClass} />
        </Field>
        <Field label="Rodzaj">
          <ControlSelect value={assetClass} onChange={(e) => setAssetClass(e.target.value as HoldingAssetClass)} className={fieldClass}>
            {Object.entries(HOLDING_ASSET_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </ControlSelect>
        </Field>
        <Field label="Cel wagi w portfelu (%)">
          <ControlInput type="number" inputMode="decimal" min="0" max="100" step="0.1" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="opcjonalnie" className={fieldClass} />
        </Field>
        <Field label="Ilość jednostek">
          <ControlInput type="number" inputMode="decimal" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Średnia cena zakupu (PLN)">
          <ControlInput type="number" inputMode="decimal" min="0" step="any" value={avgCost} onChange={(e) => setAvgCost(e.target.value)} className={fieldClass} />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={pending} disabled={!valid} className="flex-1 rounded-xl">
          {holding ? 'Zapisz zmiany' : 'Dodaj pozycję'}
        </Button>
        {holding && onRemove && (
          <Button type="button" variant="ghost" onClick={onRemove} className="rounded-xl text-danger">Usuń</Button>
        )}
      </div>
    </form>
  );
}
