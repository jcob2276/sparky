#!/usr/bin/env node
/**
 * Re-embed all claims in public.claims using Google Gemini gemini-embedding-001 (1536d).
 * Aligns the entire vector space with the Gemini embedding model.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

for (const envFile of [".env.local", ".env", "supabase/.env"]) {
  const fullPath = path.join(ROOT, envFile);
  if (fs.existsSync(fullPath)) {
    const text = fs.readFileSync(fullPath, "utf8");
    for (const line of text.split("\n")) {
      const eq = line.indexOf("=");
      if (eq > 0) {
        const k = line.slice(0, eq).trim();
        const v = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
        if (!process.env[k]) process.env[k] = v;
      }
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL || "https://pdvqkgfsqziqlhptatgf.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SB_SECRET_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

if (!geminiKey) {
  console.error("Missing GEMINI_API_KEY in environment");
  process.exit(1);
}

if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY / SB_SECRET_KEY");
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function getGeminiBatchEmbeddings(texts) {
  const requests = texts.map((t) => ({
    model: "models/gemini-embedding-001",
    content: { parts: [{ text: t.replace(/\n/g, " ").slice(0, 8000) }] },
    outputDimensionality: 1536,
  }));

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      }
    );

    if (res.status === 429) {
      console.warn(`[Gemini] Hit 429 rate limit (attempt ${attempt + 1}), waiting 40 seconds...`);
      await new Promise((r) => setTimeout(r, 40000));
      continue;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini embed error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.embeddings.map((e) => e.values);
  }

  throw new Error("Gemini embed failed after maximum retries due to 429.");
}

async function main() {
  console.log("Fetching claims from Supabase...");
  const claimsRes = await fetch(`${supabaseUrl}/rest/v1/claims?select=id,fact_text&order=id.asc`, { headers });
  if (!claimsRes.ok) {
    throw new Error(`Failed to fetch claims: ${claimsRes.status} ${await claimsRes.text()}`);
  }

  const claims = await claimsRes.json();
  const validClaims = claims.filter((c) => c.fact_text && c.fact_text.trim().length > 0);
  console.log(`Found ${claims.length} total claims (${validClaims.length} with fact_text).`);

  const BATCH_SIZE = 50;
  let updatedCount = 0;

  for (let i = 0; i < validClaims.length; i += BATCH_SIZE) {
    const chunk = validClaims.slice(i, i + BATCH_SIZE);
    const texts = chunk.map((c) => c.fact_text);
    console.log(`Embedding batch ${i + 1} - ${i + chunk.length} of ${validClaims.length}...`);

    const embeddings = await getGeminiBatchEmbeddings(texts);

    for (let j = 0; j < chunk.length; j++) {
      const claim = chunk[j];
      const emb = embeddings[j];
      const updateRes = await fetch(`${supabaseUrl}/rest/v1/claims?id=eq.${claim.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ embedding: emb }),
      });
      if (!updateRes.ok) {
        console.error(`Failed to update claim ${claim.id}:`, await updateRes.text());
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Successfully re-embedded and updated ${updatedCount} claims with Gemini 1536d vectors!`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
