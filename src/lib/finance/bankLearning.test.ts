import { describe, expect, it } from 'vitest';
import { buildCategoryLearner, merchantTokens } from '@vanguard/domain';

const tx = (id: string, name: string, category: string | null, amount = -20) => ({ id, amount, counterparty_name: name, category, category_source: 'manual' });

describe('bank category learner', () => {
  it('ignores automatic keyword categories and wallet processors', () => {
    const auto = { id: '1', amount: -5, counterparty_name: 'Foo Bar', category: 'zakupy', category_source: 'auto' };
    expect(buildCategoryLearner([auto, { ...auto, id: '2' }]).suggest(tx('3', 'Foo Bar', null))).toBeNull();
    expect(merchantTokens('REVOLUT**3862* DUBLIN')).toEqual([]);
    expect(merchantTokens('BANK PEKAO S.A.')).toEqual([]);
  });
  it('drops numbers and generic words from merchant names', () => {
    expect(merchantTokens('PLATNOSC KARTA Kebab Hanka 1234 Warszawa')).toEqual(['KEBAB', 'HANKA']);
  });
  it('suggests the dominant category for a similar merchant', () => {
    const learner = buildCategoryLearner([tx('1', 'Kebab Hanka', 'jedzenie_na_miescie'), tx('2', 'KEBAB HANKA 22', 'jedzenie_na_miescie')]);
    expect(learner.suggest(tx('3', 'Hanka Grill', 'do_sprawdzenia'))?.category).toBe('jedzenie_na_miescie');
  });
  it('does not guess from a single observation or a split vote', () => {
    expect(buildCategoryLearner([tx('1', 'Hanka', 'zakupy')]).suggest(tx('2', 'Hanka', null))).toBeNull();
    const split = buildCategoryLearner([tx('1', 'Hanka', 'zakupy'), tx('2', 'Hanka', 'dom'), tx('3', 'Hanka', 'zakupy'), tx('4', 'Hanka', 'dom')]);
    expect(split.suggest(tx('5', 'Hanka', null))).toBeNull();
  });
  it('keeps income and spending apart and ignores unreviewed history', () => {
    const learner = buildCategoryLearner([tx('1', 'Acme', 'wynagrodzenie', 100), tx('2', 'Acme', 'wynagrodzenie', 100), tx('3', 'Acme', 'do_sprawdzenia')]);
    expect(learner.suggest(tx('4', 'Acme', null, -5))).toBeNull();
    expect(learner.suggest(tx('5', 'Acme', null, 100))?.category).toBe('wynagrodzenie');
  });
});
