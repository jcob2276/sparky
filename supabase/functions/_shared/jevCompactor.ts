import { isJevAvailable, jevDecide, type JevAnswerNoul, type JevAnswerChoice } from "./jev.ts";

interface RedundancyCandidate {
  id: string;
  content: string;
  created_at?: string;
}

interface RedundancyCheckResult {
  isRedundant: boolean;
  redundantWithId: string | null;
  probability: number;
  confidence: number;
}

/**
 * Checks if a new note/stream content is 100% redundant with any of the candidate items.
 * Uses Jev's Noul (probability) + Choice (target ID) primitives in a single System 1 call.
 */
export async function checkRedundancyWithJev(
  newContent: string,
  candidates: RedundancyCandidate[],
  threshold = 0.95
): Promise<RedundancyCheckResult> {
  if (!isJevAvailable() || candidates.length === 0 || !newContent.trim()) {
    return { isRedundant: false, redundantWithId: null, probability: 0, confidence: 0 };
  }

  const trimmed = newContent.trim();
  const validCandidates = candidates.filter((c) => c.content && c.content.trim().length > 0).slice(0, 10);
  if (validCandidates.length === 0) {
    return { isRedundant: false, redundantWithId: null, probability: 0, confidence: 0 };
  }

  // Exact string match fast-path (zero latency)
  const exactMatch = validCandidates.find((c) => c.content.trim() === trimmed);
  if (exactMatch) {
    return {
      isRedundant: true,
      redundantWithId: exactMatch.id,
      probability: 1.0,
      confidence: 1.0,
    };
  }

  try {
    const candidateMap: Record<string, string> = {};
    const candidateCriteria: Record<string, string> = {
      none: "Not redundant with any listed candidate",
    };

    validCandidates.forEach((c, idx) => {
      const key = "item_" + idx;
      candidateMap[key] = c.id;
      candidateCriteria[key] = c.content.slice(0, 200);
    });

    const state = {
      new_entry: trimmed,
      candidates: validCandidates.map((c, idx) => ({
        index_key: "item_" + idx,
        snippet: c.content.slice(0, 300),
      })),
    };

    const decision = await jevDecide({
      state,
      questions: {
        is_redundant: {
          type: "noul",
          instructions:
            "Czy 'new_entry' jest w 100% semantycznie redundantny (czysty duplikat, ta sama informacja/fakt lub zamiar) z ktorymkolwiek z 'candidates'?",
        },
        redundant_target: {
          type: "choice",
          instructions: "Wskaz klucz kandydata ('item_X'), z ktorym 'new_entry' sie pokrywa, lub 'none'.",
          criteria: candidateCriteria,
        },
      },
      timeoutMs: 5000,
    });

    const noulAns = decision.answers.is_redundant as JevAnswerNoul;
    const choiceAns = decision.answers.redundant_target as JevAnswerChoice;

    const prob = noulAns?.noul ?? 0;
    const isRedundant = prob >= threshold;
    let redundantWithId: string | null = null;

    if (isRedundant && choiceAns?.choice && choiceAns.choice !== "none") {
      redundantWithId = candidateMap[choiceAns.choice] ?? null;
    } else if (isRedundant && validCandidates.length === 1) {
      redundantWithId = validCandidates[0].id;
    }

    return {
      isRedundant,
      redundantWithId,
      probability: prob,
      confidence: choiceAns?.confidence ?? 0,
    };
  } catch (err) {
    console.warn("[jevCompactor] Redundancy check failed, falling back to non-redundant:", err);
    return { isRedundant: false, redundantWithId: null, probability: 0, confidence: 0 };
  }
}