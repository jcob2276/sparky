import Button from '../ui/Button';

import { ControlInput } from '../ui/ControlPrimitives';



interface QuickAddProps {

  fields: { key: string; placeholder: string; type?: string; defaultValue?: string }[];

  onSubmit: (values: Record<string, string>) => void;

  submitLabel?: string;

}



export function QuickAddForm({ fields, onSubmit, submitLabel = 'Dodaj' }: QuickAddProps) {

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault();

    const fd = new FormData(e.currentTarget);

    const values: Record<string, string> = {};

    fields.forEach((f) => { values[f.key] = String(fd.get(f.key) ?? ''); });

    onSubmit(values);

    e.currentTarget.reset();

  };



  return (

    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 px-4 pb-4 pt-1">

      {fields.map((f) => (

        <ControlInput

          key={f.key}

          name={f.key}

          type={f.type ?? 'text'}

          placeholder={f.placeholder}

          defaultValue={f.defaultValue}

          required

          className="min-h-11 min-w-[var(--finance-range-width)] flex-1 rounded-xl border-0 bg-surface-2/70 px-3 py-2 text-sm ring-1 ring-border-custom/25 focus:ring-2 focus:ring-primary/35"
        />

      ))}

      <Button type="submit" size="sm" className="rounded-xl active:scale-[var(--scale-pressed)]">
        {submitLabel}

      </Button>

    </form>

  );

}

