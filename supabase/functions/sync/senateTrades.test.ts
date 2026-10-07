import { runSenateSync } from './senateTrades.ts';

Deno.test('Senate/congress aliases cannot import data without service credentials', async () => {
  const previous=Deno.env.get('SB_SECRET_KEY');
  const previousFetch=globalThis.fetch;
  Deno.env.set('SB_SECRET_KEY','senate-test-service-secret');
  let requests=0;
  globalThis.fetch=(() => {requests++;throw new Error('Unauthorized request reached upstream');}) as typeof fetch;
  try {
    const result=await runSenateSync(new Request('https://example.com/sync?service=senate',{method:'POST',body:'{}'}));
    if(!(result instanceof Response) || result.status!==401 || requests!==0)throw new Error('Unprotected market importer');
  } finally {
    globalThis.fetch=previousFetch;
    if(previous===undefined)Deno.env.delete('SB_SECRET_KEY');else Deno.env.set('SB_SECRET_KEY',previous);
  }
});
