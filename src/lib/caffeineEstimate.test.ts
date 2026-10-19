import { describe, expect, it } from 'vitest'
import { estimateCaffeineMg as edgeEstimate } from '../../supabase/functions/_shared/caffeineEstimate.ts'
import { estimateCaffeineMg as appEstimate } from '@vanguard/domain'

describe.each([['app', appEstimate], ['edge', edgeEstimate]] as const)('estimateCaffeineMg (%s)', (_name, estimateCaffeineMg) => {
  it('uses explicit mg from name', () => {
    expect(estimateCaffeineMg('Kawa domowa (90mg kofeiny)')).toBe(90)
  })

  it('falls back to heuristics', () => {
    expect(estimateCaffeineMg('latte')).toBe(95)
    expect(estimateCaffeineMg('Barista Style Latte Caramel')).toBe(95)
    expect(estimateCaffeineMg('Ice Latte Caramel')).toBe(95)
    expect(estimateCaffeineMg('starbucks grand cup')).toBe(95)
    expect(estimateCaffeineMg('herbata')).toBe(47)
  })

  it.each([
    'Domowa pizza (2 kawałki)', 'Kawałek ciasta', 'Steak z ziemniakami',
    'Czekolada mleczna', 'Magnez 200mg', 'Witamina C 1000 mg',
    'Kawa bezkofeinowa', 'Decaf latte', 'Herbata ziołowa', 'Herbal tea',
  ])('does not invent caffeine for %s', (name) => {
    expect(estimateCaffeineMg(name)).toBe(0)
  })

  it('preserves real caffeine sources and explicit caffeine doses', () => {
    expect(estimateCaffeineMg('Kawę z mlekiem')).toBe(95)
    expect(estimateCaffeineMg('Pepsi Zero')).toBe(35)
    expect(estimateCaffeineMg('Kofeina 200 mg')).toBe(200)
  })
})
