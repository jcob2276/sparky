import {useState} from 'react';
import {estimateGlycemicResponse,GLYCEMIC_REFERENCES,type CarbDefinition} from '@vanguard/domain';
import {ControlInput,ControlSelect} from '../../ui/ControlPrimitives';
export interface GlycemicPortion {id:string;name:string;grams:number;carbs:number|null;fiber?:number|null}
interface Choice {referenceId:string;carbDefinition:CarbDefinition;confirmed:boolean}
/** A changed food/portion remounts the assessment, so confirmations never survive edits. */
export function GlycemicEstimate({items}:{items:GlycemicPortion[]}) {
  return <Assessment key={JSON.stringify(items)} items={items}/>;
}
function Assessment({items}:{items:GlycemicPortion[]}) {
  const [choices,setChoices]=useState<Record<string,Choice>>({});
  const choice=(id:string):Choice=>choices[id] ?? {referenceId:'',carbDefinition:'unknown',confirmed:false};
  const change=(id:string,patch:Partial<Choice>)=>setChoices({...choices,[id]:{...choice(id),confirmed:false,...patch}});
  const result=estimateGlycemicResponse(items.map(item=>({id:item.id,name:item.name,grams:item.grams,
    carbsPer100g:item.carbs == null || item.grams<=0?null:item.carbs*100/item.grams,
    fiberPer100g:item.fiber == null || item.grams<=0?null:item.fiber*100/item.grams,
    ...choice(item.id),portionConfirmed:choice(item.id).confirmed})));
  return <details className="rounded-xl border border-border-custom p-3 text-xs">
    <summary className="cursor-pointer font-semibold">Orientacyjny ładunek glikemiczny (GL)</summary>
    <div className="mt-3 space-y-3">
      <p className="text-text-muted">Wybierz wyłącznie pasujący produkt i sposób przygotowania. Katalog obejmuje wybrane zmierzone produkty; brak odpowiednika oznacza brak oszacowania.</p>
      {items.map(item=>{
        const selected=choice(item.id),reference=GLYCEMIC_REFERENCES.find(row=>row.id === selected.referenceId);
        return <fieldset key={item.id} className="space-y-2 rounded-lg border border-border-custom p-2">
          <legend>{item.name} · {item.grams} g</legend>
          <label className="block">Dane GI dla {item.name}<ControlSelect className="mt-1 w-full" value={selected.referenceId} onChange={event=>change(item.id,{referenceId:event.target.value})}>
            <option value="">Brak potwierdzonego odpowiednika</option>
            {GLYCEMIC_REFERENCES.map(row=><option key={row.id} value={row.id}>{row.name} · GI {row.gi}</option>)}
          </ControlSelect></label>
          <label className="block">Definicja węglowodanów dla {item.name}<ControlSelect className="mt-1 w-full" value={selected.carbDefinition} onChange={event=>change(item.id,{carbDefinition:event.target.value as CarbDefinition})}>
            <option value="unknown">Nie wiem — nie obliczaj</option><option value="available">Przyswajalne, bez błonnika (np. etykieta UE)</option><option value="total_including_fiber">Całkowite, razem z błonnikiem</option>
          </ControlSelect></label>
          <label className="flex gap-2"><ControlInput type="checkbox" checked={selected.confirmed} onChange={event=>change(item.id,{confirmed:event.target.checked})}/>Potwierdzam porcję, definicję węglowodanów i zgodność przygotowania {item.name} z wybranym badaniem.</label>
          {reference && <p className="text-text-muted">{reference.study}; N={reference.n}. <a className="text-primary underline" href={result.source} target="_blank" rel="noreferrer">Źródło GI</a></p>}
        </fieldset>;
      })}
      <p role="status">{result.estimatedLoad == null?'GL całego posiłku: brak wystarczających danych':`Szacowany GL posiłku: ${result.estimatedLoad}`}</p>
      {result.state === 'partial' && <p className="text-text-muted">Znana część GL: {result.knownLoad}; pokrycie {result.coveredCount}/{result.totalCount} składników. Braki: {result.uncovered.join(', ')}.</p>}
      <p className="text-text-muted">{result.notice} <a className="text-primary underline" href="https://glycemicindex.com/faqs/" target="_blank" rel="noreferrer">Jak liczymy GL</a></p>
    </div>
  </details>;
}
