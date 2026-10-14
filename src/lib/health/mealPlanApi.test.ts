import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMealPlan, mealShoppingList, resizePlannedMeal } from '@vanguard/domain';
import {
  fetchMealPlanProducts,
  fetchMealPlannerState,
  approveMealPlan,
  toggleShoppingItem,
  resizeMealInPlanState,
} from './mealPlanApi';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const products = [{id:'oats',name:'Płatki',source:'user_custom',verified:true,calories:400,protein:10,carbs:60,fat:10,fiber:8}];
const targets = [{date:'2026-10-14',calories:400,protein:10}];
const request = {notes:'Przygotuj na ciepło',days:[{date:'2026-10-14',meals:[{key:'m1',name:'Owsianka',prepMinutes:10,ingredients:[{productId:'oats',grams:100}],instructions:'Ugotuj.'}]}]};

describe('meal planning domain', () => {
  it('calculates portions from product macros and derives shopping without recording consumption', () => {
    const result = buildMealPlan(request,products,targets,{maxPrepMinutes:30,excluded:[]});
    expect(result.errors).toEqual([]);
    expect(result.plan?.days[0].totals.calories).toBe(400);
    expect(mealShoppingList(result.plan!)).toEqual([{productId:'oats',name:'Płatki',grams:100}]);
    const resized = resizePlannedMeal(result.plan!,'2026-10-14','m1',1.5);
    expect(resized.days[0].totals.calories).toBe(600);
    expect(resizePlannedMeal(resized,'2026-10-14','m1',1).days[0].totals.calories).toBe(400);
    expect(mealShoppingList(resized)[0].grams).toBe(150);
    expect(result.plan?.days[0].totals.calories).toBe(400);
  });
  it('rejects invented products, missing days, exclusions and a recipe exceeding available time', () => {
    expect(buildMealPlan(request,[],targets,{maxPrepMinutes:30,excluded:[]}).errors.length).toBeGreaterThan(0);
    expect(buildMealPlan({...request,days:[]},products,targets,{maxPrepMinutes:30,excluded:[]}).plan).toBeNull();
    expect(buildMealPlan(request,products,targets,{maxPrepMinutes:5,excluded:['płatki']}).plan).toBeNull();
  });
});

describe('mealPlanApi client', () => {
  it('keeps a covering active week available beside a draft stored on the exact date',async()=>{
    const plan=buildMealPlan(request,products,targets,{maxPrepMinutes:30,excluded:[]}).plan!;
    const exact={revision:1,draft:plan,active:null},active={revision:3,active:plan,draft:null};
    vi.mocked(supabase.from).mockImplementation((()=>{
      let covering=false;
      const query={select:()=>query,eq:()=>query,contains:()=>{covering=true;return query;},order:()=>query,limit:()=>query,
        maybeSingle:async()=>({data:covering?{date:'2026-10-14',meal_plan:active}:{meal_plan:exact},error:null})};
      return query;
    }) as never);
    expect(await fetchMealPlannerState('u1','2026-10-15')).toEqual({storageDate:'2026-10-15',state:exact,coveringActive:{storageDate:'2026-10-14',state:active}});
  });
  it('finds an approved week on a later day while retaining its original storage row',async()=>{
    const plan=buildMealPlan(request,products,targets,{maxPrepMinutes:30,excluded:[]}).plan!;
    const state={revision:3,active:plan,draft:null};
    const owners:string[]=[],dates:string[]=[];let activeLookup=false;
    vi.mocked(supabase.from).mockImplementation((()=>{
      const query={select:()=>query,eq:(field:string,value:string)=>{if(field === 'user_id') owners.push(value);if(field === 'date') dates.push(value);return query;},
        contains:(_field:string,value:unknown)=>{expect(value).toEqual({active:{days:[{date:'2026-10-15'}]}});activeLookup=true;return query;},order:()=>query,limit:()=>query,
        maybeSingle:async()=>({data:activeLookup?{date:'2026-10-14',meal_plan:state}:null,error:null})};
      return query;
    }) as never);
    expect(await fetchMealPlannerState('u1','2026-10-15')).toEqual({storageDate:'2026-10-14',state});
    expect(owners).toEqual(['u1','u1']);expect(dates).toEqual(['2026-10-15']);
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches products from reference and user library, deduplicating case-insensitively', async () => {
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'food_reference_pl') {
        return {
          select: () => ({
            limit: () => Promise.resolve({
              data: [{ id: 'ref-1', name: 'Jajko kurze', calories: 143, protein: 12.5, carbs: 0.7, fat: 9.5, fiber: 0 }],
            }),
          }),
        };
      }
      if (table === 'food_library') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({
                data: [
                  { id: 'lib-1', name: 'jajko kurze', calories: 140, protein: 12, carbs: 1, fat: 9, fiber: 0, source: 'manual' },
                  { id: 'lib-2', name: 'Oliwa z oliwek', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, brand: 'Monini', barcode: '123' },
                ],
              }),
            }),
          }),
        };
      }
      return { select: () => ({}) };
    }) as never);

    const result = await fetchMealPlanProducts('u1');
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Jajko kurze');
    expect(result[0].verified).toBe(true);
    expect(result[1].name).toBe('Oliwa z oliwek');
    expect(result[1].verified).toBe(false);
  });

  it('approves once, preserves revisions on shopping and detects concurrent writes', async () => {
    const draftPlan = buildMealPlan(request,products,targets,{maxPrepMinutes:30,excluded:[]}).plan;
    let stored = {revision:1,draft:draftPlan,active:null as typeof draftPlan,checkedProducts:[] as string[],approvalKey:''};
    let failNextWrite = false, writes = 0;
    vi.mocked(supabase.from).mockImplementation((() => {
      const read = {eq:()=>read,maybeSingle:async()=>({data:{meal_plan:structuredClone(stored)},error:null})};
      return {select:()=>read,update:(payload:{meal_plan:typeof stored})=>{
        let expected = -1;
        const write = {eq:()=>write,contains:(_column:string,value:{revision:number})=>{expected=value.revision;return write;},select:()=>write,
          maybeSingle:async()=>{
            if (failNextWrite) {stored={...stored,revision:stored.revision+1};failNextWrite=false;}
            if (stored.revision !== expected) return {data:null,error:null};
            stored=payload.meal_plan;writes++;return {data:{meal_plan:stored},error:null};
          }};
        return write;
      }};
    }) as never);
    const approved = await approveMealPlan('u1','2026-10-14','key-test',1);
    expect(approved.revision).toBe(2);
    expect(approved.draft).toBeNull();
    expect((await approveMealPlan('u1','2026-10-14','key-test',1)).revision).toBe(2);
    expect(writes).toBe(1);
    const toggled = await toggleShoppingItem('u1','2026-10-14','oats');
    expect(toggled.checkedProducts).toContain('oats');
    expect(toggled.revision).toBe(3);
    const resized = await resizeMealInPlanState('u1','2026-10-14','m1',1.5);
    expect(resized.active?.days[0].totals.calories).toBe(600);
    failNextWrite=true;
    await expect(toggleShoppingItem('u1','2026-10-14','oats')).rejects.toThrow('zmienił się');
    expect(stored.active?.days[0].totals.calories).toBe(600);
    expect(stored.checkedProducts).toContain('oats');
  });
});
