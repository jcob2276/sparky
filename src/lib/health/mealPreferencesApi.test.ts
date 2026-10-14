import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {fetchMealPreferences,saveMealPreferences} from './mealPreferencesApi';
import {parseMealPreferences} from '@vanguard/domain';
vi.mock('../supabase',async()=>{
  const {createClient}=await import('@supabase/supabase-js');
  return {supabase:createClient('https://example.supabase.co','test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(...args)=>fetch(...args)}})};
});
let stored:string|null=null,race=false,writes=0;
beforeEach(()=>{
  stored=null;race=false;writes=0;
  vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=new URL(input instanceof Request?input.url:String(input)),method=init?.method ?? 'GET';
    expect(url.pathname).toBe('/rest/v1/vanguard_preferences');
    if(method === 'GET') {
      expect(url.searchParams.get('user_id')).toBe('eq.owner-one');
      expect(url.searchParams.get('key')).toBe('eq.health_coach:meal_preferences');
      return Response.json(stored?[{value:stored}]:[]);
    }
    const payload=JSON.parse(String(init?.body));expect(payload.user_id).toBe('owner-one');
    if(race && stored) {stored=JSON.stringify({...JSON.parse(stored),revision:2,maxPrepMinutes:60});race=false;}
    if(method === 'PATCH') {
      expect(url.searchParams.get('user_id')).toBe('eq.owner-one');
      if(url.searchParams.get('value') !== `eq.${stored}`) return Response.json([]);
    } else if(stored) return Response.json([]);
    stored=payload.value;writes++;return Response.json([{value:stored}]);
  });
});
afterEach(()=>vi.unstubAllGlobals());
it('persists an explicit declaration, reloads it and refuses to overwrite a concurrent change',async()=>{
  const initial=await fetchMealPreferences('owner-one');expect(initial.confirmed).toBe(false);
  await expect(saveMealPreferences('owner-one',initial)).rejects.toThrow('Potwierdź');
  const saved=await saveMealPreferences('owner-one',{...initial,confirmed:true,allergies:['mleko']});
  expect(saved.revision).toBe(1);expect((await fetchMealPreferences('owner-one')).allergies).toEqual(['mleko']);
  race=true;
  await expect(saveMealPreferences('owner-one',{...saved,preferences:'Szybkie dania'})).rejects.toThrow('zmieniły się');
  expect(writes).toBe(1);expect(parseMealPreferences(stored).maxPrepMinutes).toBe(60);
});
