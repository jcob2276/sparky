import { EPISTEMIC_THRESHOLDS } from '@vanguard/domain'
import { allowedRelations } from './rules.ts'

export type ExtractedTriad = {
  source: string; target: string; relation: string; source_type: string; target_type: string;
  memory_type: string; confidence_score: number; keywords?: string; evidence_quote?: string;
  resolution?: { action: 'insert' | 'merge' | 'supersede'; conflicting_link?: { source: string; relation: string; target: string } };
}

const memoryTypes = new Set(['fact', 'hypothesis', 'preference', 'correlation', 'telemetry'])
const reasoning = /<\/?(?:think|analysis|reasoning)>|```|(?:^|\n)\s*(?:analysis|reasoning|chain of thought|rozumowanie|json schema)\s*:|^let me (?:think|analy[sz]e|reason)\b|^the (?:source|target) entity (?:represents|should|must)\b|^(?:source_entity|target_entity|source_type|target_type|confidence_score)$/i
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
function field(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text.length > 0 && text.length <= max && /[\p{L}\p{N}]/u.test(text) && !reasoning.test(text) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text) ? text : null
}

/** Validate each candidate before deduplication or any graph mutation; preserve independently valid facts. */
export function validateTriad(value: unknown, sourceText: string): ExtractedTriad | null {
  if (!object(value)) return null
  const source = field(value.source, 300), target = field(value.target, 300)
  const source_type = value.source_type === undefined ? 'concept' : field(value.source_type, 64)
  const target_type = value.target_type === undefined ? 'concept' : field(value.target_type, 64)
  const relation = field(value.relation, 64)
  const memory_type = value.memory_type === undefined ? 'fact' : field(value.memory_type, 32)
  const confidence = value.confidence_score === undefined ? 0.7 : value.confidence_score
  if (!source || !target || !source_type || !target_type || !relation || !allowedRelations.includes(relation) ||
    !memory_type || !memoryTypes.has(memory_type) || typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null
  const triad: ExtractedTriad = { source, target, source_type, target_type, relation, memory_type,
    confidence_score: memory_type === 'hypothesis' ? Math.min(confidence, EPISTEMIC_THRESHOLDS.GRAPH_HYPOTHESIS_MAX_CONFIDENCE) : confidence }
  if (value.keywords !== undefined) {
    const keywords = field(value.keywords, 500)
    if (!keywords) return null
    triad.keywords = keywords
  }
  if (value.evidence_quote !== undefined) {
    const quote = field(value.evidence_quote, 1000)
    if (!quote || !sourceText.includes(quote)) return null
    triad.evidence_quote = quote
  }
  if (value.resolution !== undefined) {
    if (!object(value.resolution) || !['insert', 'merge', 'supersede'].includes(String(value.resolution.action))) return null
    triad.resolution = { action: value.resolution.action as 'insert' | 'merge' | 'supersede' }
    const conflict = value.resolution.conflicting_link
    if (conflict !== undefined) {
      if (!object(conflict)) return null
      const source = field(conflict.source, 300), target = field(conflict.target, 300), relation = field(conflict.relation, 64)
      if (!source || !target || !relation || !allowedRelations.includes(relation)) return null
      triad.resolution.conflicting_link = { source, target, relation }
    }
  }
  return triad
}
