import { SenateSession } from './senateDisclosureClient.ts';

Deno.test('Senate session uses the public agreement then keeps document access after discovery 503', async () => {
  const calls: Array<{url:string;init?:RequestInit}>=[];
  const transport=(async (input: string | URL | Request,init?:RequestInit) => {
    const url=String(input);calls.push({url,init});
    if(calls.length===1)return new Response('<input name="csrfmiddlewaretoken" value="csrf"><input id="agree_statement" value="agreement">',
      {headers:{'Set-Cookie':'csrftoken=csrf; Path=/'}});
    if(calls.length===2)return new Response(null,{status:302,headers:{Location:'/search/','Set-Cookie':'sessionid=session; Path=/'}});
    if(calls.length===3)return new Response('/search/report/data/');
    if(url.endsWith('/search/report/data/'))return new Response('maintenance',{status:503});
    return new Response('<h1>Periodic Transaction Report</h1>');
  }) as typeof fetch;
  const session=new SenateSession(transport);
  await session.open();let failed=false;
  try {await session.discover();}catch(error){failed=String(error).includes('503');}
  if(!failed)throw new Error('Turned unavailable index into an empty success');
  await session.report('https://efdsearch.senate.gov/search/view/ptr/a0010f4a-c31a-4824-8b6d-6399b3ccb6f0/');
  if(!new Headers(calls[4].init?.headers).get('Cookie')?.includes('sessionid=session'))throw new Error('Lost agreement session');
  if(!String(calls[1].init?.body).includes('prohibition_agreement=agreement'))throw new Error('Skipped public agreement');
});

Deno.test('Senate session rejects cross-site redirects without requesting them', async () => {
  let calls=0;
  const session=new SenateSession((async () => ++calls===1
    ? new Response('<input name="csrfmiddlewaretoken" value="csrf"><input id="agree_statement" value="agreement">')
    : new Response(null,{status:302,headers:{Location:'https://example.com/search/'}})) as typeof fetch);
  let failed=false;try{await session.open();}catch{failed=true;}
  if(!failed || calls!==2)throw new Error('Followed untrusted redirect');
});
