import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {describe,expect,it,vi} from 'vitest';
import FoodPlanningAssistantContainer from './FoodPlanningAssistantContainer';
import {scanRestaurantMenu,scanFridgeIngredients} from '../../../lib/health/foodAssistApi';
import {normalizeMenuAnalysis,normalizeFridgeAnalysis} from '@vanguard/domain';
vi.mock('../../../lib/health/foodAssistApi',()=>({scanRestaurantMenu:vi.fn(),scanFridgeIngredients:vi.fn()}));
vi.mock('../../../lib/native/platform',()=>({isNativePlatform:()=>false}));
describe('food planning assistant',()=>{
  it('routes text menu and fridge image into advisory analysis and shows real results without logging consumption',async()=>{
    vi.mocked(scanRestaurantMenu).mockResolvedValue(normalizeMenuAnalysis({summary:'Propozycja z karty',dishes:[{name:'Ryba z ziemniakami',estimatedKcal:550,whyRecommended:'Pasuje do ustalonego celu.'}]}));
    vi.mocked(scanFridgeIngredients).mockResolvedValue(normalizeFridgeAnalysis({detectedIngredients:[{name:'Jajka'}],suggestions:[{name:'Omlet',ingredientsUsed:['Jajka'],missingIngredients:['Sól'],instructions:'Usmaż.'}]}));
    render(<FoodPlanningAssistantContainer userId="owner" />);
    fireEvent.change(screen.getByRole('textbox'),{target:{value:'Ryba, burger'}});
    fireEvent.click(screen.getByRole('button',{name:'Zaproponuj dania'}));
    expect(await screen.findByText('Ryba z ziemniakami')).toBeInTheDocument();
    expect(scanRestaurantMenu).toHaveBeenCalledWith({text:'Ryba, burger',file:undefined},'owner');
    fireEvent.click(screen.getByRole('button',{name:'Moja lodówka'}));
    const photo=new File(['image'],'lodowka.jpg',{type:'image/jpeg'});
    fireEvent.change(screen.getByLabelText('Dodaj zdjęcie menu lub składników'),{target:{files:[photo]}});
    fireEvent.change(screen.getByRole('textbox'),{target:{value:'Mam jajka'}});
    fireEvent.click(screen.getByRole('button',{name:'Zaproponuj dania'}));
    await waitFor(()=>expect(screen.getByText('Omlet')).toBeInTheDocument());
    expect(scanFridgeIngredients).toHaveBeenCalledWith({text:'Mam jajka',file:photo},'owner');
    expect(screen.getByText(/Przepis nie zapisuje zjedzonego posiłku/)).toBeInTheDocument();
  });
  it('does not turn malformed or missing model estimates into zero-calorie facts',()=>{
    const menu=normalizeMenuAnalysis({dishes:[null,{name:'Danie',estimatedKcal:'?',estimatedProtein:-5},{}]});
    expect(menu.dishes).toHaveLength(1);expect(menu.dishes[0].estimatedKcal).toBeNull();expect(menu.dishes[0].estimatedProtein).toBeNull();
    const fridge=normalizeFridgeAnalysis({suggestions:[{name:'Przepis',prepMinutes:'szybko'}]});
    expect(fridge.suggestions[0].prepMinutes).toBeNull();expect(fridge.suggestions[0].estimatedKcal).toBeNull();
  });
});
