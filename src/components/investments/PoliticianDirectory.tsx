import { FC, useState } from 'react';
import type { PublicPolitician } from '../../lib/investments/publicDisclosures';
import Button from '../ui/Button';
import Input from '../ui/Input';

type PartyFilter = 'all' | 'D' | 'R';

interface Props {
  people: PublicPolitician[];
  party: PartyFilter;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function matches(person: PublicPolitician, party: PartyFilter, query: string): boolean {
  if (party !== 'all' && person.party !== party) return false;
  if (!query) return true;
  return person.name.toLowerCase().includes(query);
}

export const PoliticianDirectory: FC<Props> = ({ people, party, selectedId, onSelect }) => {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const visible = people.filter((person) => matches(person, party, needle));

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex-1">
          <Input
            type="text"
            size="sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj osoby w publicznym rejestrze…"
            aria-label="Szukaj polityka"
          />
        </div>
        <p className="text-xs font-mono text-text-secondary shrink-0">
          {visible.length} z {people.length}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto">
        <Button
          size="sm"
          variant={selectedId === null ? 'primary' : 'secondary'}
          onClick={() => onSelect(null)}
          className="rounded-xl text-xs"
        >
          Wszyscy
        </Button>
        {visible.map((person) => (
          <Button
            key={person.id}
            size="sm"
            variant={selectedId === person.id ? 'primary' : 'secondary'}
            onClick={() => onSelect(person.id)}
            className="rounded-xl text-xs"
          >
            {person.state ? `${person.name} (${person.state})` : person.name}
          </Button>
        ))}
      </div>
    </div>
  );
};
