import {assertEquals} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {parseRestaurantMenu} from './foodAssistVision.ts';
Deno.test('text menu analysis sends a text-only Gemini request and preserves missing macro estimates',async()=>{
  const savedFetch=globalThis.fetch,previousKey=Deno.env.get('GEMINI_API_KEY');Deno.env.set('GEMINI_API_KEY','test-key');
  try {
    globalThis.fetch=(_input,init)=>{
      const body=JSON.parse(String(init?.body));assertEquals(body.contents[0].parts.length,1);assertEquals(typeof body.contents[0].parts[0].text,'string');
      return Promise.resolve(Response.json({candidates:[{content:{parts:[{text:JSON.stringify({summary:'Karta',dishes:[{name:'Ryba'}]})}]}}]}));
    };
    const result=await parseRestaurantMenu({text:'Ryba',ctx:{profileLine:'Nieustalony profil',targetKcal:null,targetProtein:null,favoritesBlock:'',correctionsBlock:'',historyBlock:'',portionsBlock:''}});
    assertEquals(result.dishes[0].estimatedKcal,null);
  } finally {globalThis.fetch=savedFetch;if (previousKey == null) Deno.env.delete('GEMINI_API_KEY');else Deno.env.set('GEMINI_API_KEY',previousKey);}
});
