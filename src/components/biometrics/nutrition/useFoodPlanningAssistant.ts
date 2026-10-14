import {useState} from 'react';
import {scanRestaurantMenu,scanFridgeIngredients} from '../../../lib/health/foodAssistApi';
import {pickMealPhotoNative} from '../../../lib/native/mealPhotoCapture';
import {isNativePlatform} from '../../../lib/native/platform';
import type {RestaurantMenuAnalysis,FridgeIngredientsAnalysis} from '@vanguard/domain';
export function useFoodPlanningAssistant(userId:string) {
  const [mode,setMode]=useState<'menu'|'fridge'>('menu'),[text,setText]=useState(''),[file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
  const [menu,setMenu]=useState<RestaurantMenuAnalysis|null>(null),[fridge,setFridge]=useState<FridgeIngredientsAnalysis|null>(null);
  async function analyze() {
    if (busy) return;setBusy(true);setError(null);setMenu(null);setFridge(null);
    try {const input={text,file:file ?? undefined};if (mode === 'menu') setMenu(await scanRestaurantMenu(input,userId));else setFridge(await scanFridgeIngredients(input,userId));}
    catch (cause) {setError(cause instanceof Error?cause.message:'Nie udało się przygotować propozycji.');}
    finally {setBusy(false);}
  }
  async function camera() {try {setFile(await pickMealPhotoNative('camera'));}catch(cause){setError(cause instanceof Error?cause.message:'Nie udało się wybrać zdjęcia.');}}
  return {mode,setMode,text,setText,file,setFile,busy,error,menu,fridge,analyze,camera,native:isNativePlatform()};
}
