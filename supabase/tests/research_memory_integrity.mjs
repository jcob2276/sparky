import { readFile } from 'node:fs/promises';
// Scratch dependency, no application package or lockfile changes:
// npm install --prefix .tmp/research-memory-db --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.10
const { PGlite } = await import('../../.tmp/research-memory-db/node_modules/@electric-sql/pglite/dist/index.js');
const db = new PGlite();
try {
  await db.exec(await readFile(new URL('research_memory_bootstrap.sql', import.meta.url), 'utf8'));
  const resolver = await readFile(new URL('../migrations/20260708190000_entity_resolution.sql', import.meta.url), 'utf8');
  await db.exec(resolver.slice(0, resolver.indexOf('-- 2. Trigger')));
  await db.exec("ALTER FUNCTION public.resolve_entity(uuid,text,text) SET search_path = ''");
  await db.exec(await readFile(new URL('../migrations/20261019140236_research_memory_integrity.sql', import.meta.url), 'utf8'));
  await db.exec(`CREATE TRIGGER tr_sync_entity_links_to_claims AFTER INSERT OR UPDATE OR DELETE ON public.vanguard_entity_links FOR EACH ROW EXECUTE FUNCTION public.sync_vanguard_entity_links_to_claims()`);
  await db.exec(await readFile(new URL('research_memory_integrity.sql', import.meta.url), 'utf8'));
  console.log('Research memory SQL contracts passed (isolated PostgreSQL; real functions, triggers, RLS).');
} catch (error) {
  console.error(`${error.code ?? ''}: ${error.message}`);
  if (error.where) console.error(error.where);
  process.exitCode = 1;
} finally { await db.close(); }
