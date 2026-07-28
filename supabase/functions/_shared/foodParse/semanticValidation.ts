import type { ParsedFoodItem } from '../foodParseCore.ts'
import { normalizePl, scaleParsedItem } from './matching.ts'

const MIN_TRUSTED_MATCH_SCORE = 0.82
const UNVERIFIED_LIBRARY_SOURCES = new Set(['yazio_import', 'logged', 'history', 'import'])

interface DensityRule {
  test: RegExp
  minKcalPer100g: number
  label: string
}

const DENSITY_RULES: DensityRule[] = [
  { test: /\b(bulka|chleb|bagietka|kajzerka)\b/, minKcalPer100g: 180, label: 'pieczywa' },
  { test: /\b(kebab|burger|pizza|zapiekanka|hot dog)\b/, minKcalPer100g: 120, label: 'dania złożonego' },
]

const MIN_PORTION_RULES = [
  { test: /\b(rosol|zupa|krupnik|barszcz|zurek|chlodnik)\b/, minGrams: 100, label: 'zupy' },
  { test: /\b(kebab|obiad|danie|gulasz|curry)\b/, minGrams: 80, label: 'dania' },
]

function lowerConfidence(item: ParsedFoodItem): 'medium' | 'low' {
  return item.confidence === 'low' ? 'low' : 'medium'
}

export function validateParsedItems(
  items: ParsedFoodItem[],
  _originalText: string,
): ParsedFoodItem[] {
  return items.map((item) => {
    const warnings: string[] = [...(item.parseMeta?.warnings ?? [])]
    let current = item
    let confidence = item.confidence

    const quantity = item.parseMeta?.quantity
    if (
      item.parseMeta?.unit === 'bowl'
      && quantity != null
      && quantity > 0
      && item.grams <= quantity * 2
    ) {
      const targetGrams = quantity * 300
      current = scaleParsedItem(item, targetGrams / item.grams)
      confidence = item.confidence === 'low' ? 'low' : 'medium'
      warnings.push(`przeliczono ${quantity} miskę/miski na ~${targetGrams}g`)
    }

    const normalizedName = normalizePl(current.name)

    for (const rule of MIN_PORTION_RULES) {
      if (rule.test.test(normalizedName) && current.grams < rule.minGrams) {
        warnings.push(`nierealistycznie mała porcja ${rule.label}: ${current.grams}g`)
        confidence = 'low'
      }
    }

    const kcalPer100g = current.grams > 0 ? current.calories * 100 / current.grams : 0
    for (const rule of DENSITY_RULES) {
      if (rule.test.test(normalizedName) && kcalPer100g < rule.minKcalPer100g) {
        warnings.push(
          `podejrzana gęstość energetyczna ${rule.label}: ${Math.round(kcalPer100g)} kcal/100g`,
        )
        confidence = 'low'
      }
    }

    const matchScore = current.parseMeta?.matchScore
    if (matchScore != null && matchScore < MIN_TRUSTED_MATCH_SCORE) {
      warnings.push(`niepewne dopasowanie nazwy: ${Math.round(matchScore * 100)}%`)
      confidence = 'low'
    }

    const dataSource = current.parseMeta?.dataSource
    if (dataSource && UNVERIFIED_LIBRARY_SOURCES.has(dataSource) && confidence === 'high') {
      warnings.push(`niezweryfikowane źródło biblioteki: ${dataSource}`)
      confidence = lowerConfidence(item)
    }

    const validationStatus = warnings.length ? 'review' : 'accepted'
    return {
      ...current,
      confidence,
      assumptions: warnings.length
        ? [...(current.assumptions ?? []), ...warnings]
        : current.assumptions,
      parseMeta: {
        ...(current.parseMeta ?? {
          macroSource: 'llm_estimate' as const,
          parserVersion: 'unknown',
        }),
        warnings: warnings.length ? warnings : undefined,
        validationStatus,
      },
    }
  })
}
