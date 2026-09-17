/**
 * associativeGraph.ts — Associative Graph Recall (HippoRAG pattern).
 * Performs a 2-hop graph expansion on entities and claims to surface non-obvious,
 * connected behavioral memories and commitments.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ClaimRow {
  id: string;
  subject_id: string;
  object_id: string;
  fact_text: string;
  weight: number | null;
  evidence_count: number | null;
}

export async function fetchAssociativeGraphContext(
  supabase: SupabaseClient,
  userId: string,
  primaryEntityIds: string[],
): Promise<string> {
  if (!primaryEntityIds || primaryEntityIds.length === 0) return "";

  try {
    const filter = primaryEntityIds.map(id => `subject_id.eq.${id},object_id.eq.${id}`).join(",");
    const { data: hop1Claims } = await supabase
      .from("claims")
      .select("id, subject_id, object_id, fact_text, weight, evidence_count")
      .eq("user_id", userId)
      .eq("status", "active")
      .or(filter)
      .order("weight", { ascending: false })
      .limit(8);

    if (!hop1Claims || hop1Claims.length === 0) return "";

    const lines: string[] = ["[BEZPOŚREDNIE FAKTY I CELE Z GRAFU]:"];
    const neighborIds = new Set<string>();

    for (const c of hop1Claims as ClaimRow[]) {
      lines.push(`- ${c.fact_text} (waga: ${c.weight ?? 1}, dowody: ${c.evidence_count ?? 1})`);
      if (c.subject_id && !primaryEntityIds.includes(c.subject_id)) neighborIds.add(c.subject_id);
      if (c.object_id && !primaryEntityIds.includes(c.object_id)) neighborIds.add(c.object_id);
    }

    // 2-hop associative expansion (HippoRAG)
    const neighborList = Array.from(neighborIds).slice(0, 4);
    if (neighborList.length > 0) {
      const hop2Filter = neighborList.map(id => `subject_id.eq.${id},object_id.eq.${id}`).join(",");
      const { data: hop2Claims } = await supabase
        .from("claims")
        .select("id, fact_text, weight")
        .eq("user_id", userId)
        .eq("status", "active")
        .or(hop2Filter)
        .order("weight", { ascending: false })
        .limit(4);

      if (hop2Claims && hop2Claims.length > 0) {
        lines.push("\n[POWIĄZANIA ASOCJACYJNE (2-hop Graph)]: ");
        for (const c of hop2Claims) {
          lines.push(`• Relacja: ${c.fact_text}`);
        }
      }
    }

    return lines.join("\n");
  } catch (err) {
    console.error("[associativeGraph] graph recall error:", err);
    return "";
  }
}
