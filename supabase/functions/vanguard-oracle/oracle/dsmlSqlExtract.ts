const DSML_OPEN = /<\s*\|\s*\|\s*DSML\b/i;
const DSML_ANY = /<\s*\/?\s*\|\s*\|\s*DSML[\s\S]*?>/gi;

export function containsDsmlToolMarkup(content: string): boolean {
  return DSML_OPEN.test(content);
}

function normalizeSql(candidate: string): string | null {
  const sql = candidate
    .replace(DSML_ANY, "")
    .replace(/<\s*\/\s*\|\s*\|\s*DSML[\s\S]*$/i, "")
    .trim()
    .replace(/;+\s*$/, "");
  if (!/^\s*(SELECT|WITH)\b/i.test(sql)) return null;
  return sql;
}

function collectSqlCandidates(content: string): string[] {
  const found: string[] = [];

  const namedParam =
    /<\s*\|\s*\|\s*DSML\s*\|\s*\|\s*parameter\s+name\s*=\s*['"]sql['"]\s+string\s*=\s*['"]true['"]\s*>([\s\S]*?)<\s*\/\s*\|\s*\|\s*DSML\s*\|\s*\|\s*parameter\s*>/gi;
  for (const match of content.matchAll(namedParam)) {
    const sql = normalizeSql(match[1]);
    if (sql) found.push(sql);
  }

  const parameterBlocks = content.matchAll(
    /<\s*\|\s*\|\s*DSML\s*\|\s*\|\s*parameter[^>]*>\s*([\s\S]*?)(?=<\s*\|\s*\|\s*DSML|$)/gi,
  );
  for (const block of parameterBlocks) {
    const sql = normalizeSql(block[1]);
    if (sql) found.push(sql);
  }

  if (found.length === 0 && containsDsmlToolMarkup(content)) {
    const bare = /((?:SELECT|WITH)\b[\s\S]*?)(?=<\s*\|\s*\|\s*DSML|$)/gi;
    for (const match of content.matchAll(bare)) {
      const sql = normalizeSql(match[1]);
      if (sql) found.push(sql);
    }
  }

  return [...new Set(found)];
}

export function extractAllSqlFromDsml(content: string): string[] {
  if (!content.trim()) return [];
  return collectSqlCandidates(content);
}

export function stripDsmlMarkup(content: string): string {
  return content.replace(DSML_ANY, "").replace(/\n{3,}/g, "\n\n").trim();
}
