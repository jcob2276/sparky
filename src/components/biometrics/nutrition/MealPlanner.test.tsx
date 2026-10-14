import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MealPlannerView } from './MealPlannerView';
import {parseMealPreferences,type MealPlanState} from '@vanguard/domain';

const mockState: MealPlanState = {
  revision: 1,
  draft: null,
  active: {
    notes: 'Uwagi do planu',
    warnings: ['Sprawdź etykiety.'],
    days: [
      {
        date: '2026-10-14',
        totals: { calories: 2000, protein: 150, carbs: 200, fat: 60, fiber: 30 },
        target: { calories: 2000, protein: 150 },
        meals: [
          {
            key: 'm1',
            name: 'Jajecznica z pieczywem',
            prepMinutes: 12,
            instructions: 'Usmaż na maśle.',
            totals: { calories: 500, protein: 35, carbs: 40, fat: 20, fiber: 5 },
            ingredients: [
              {
                product: { id: 'egg', name: 'Jaja kurze', source: 'curated_pl', verified: true, calories: 140, protein: 12, carbs: 1, fat: 10, fiber: 0 },
                grams: 180,
                macros: { calories: 252, protein: 21.6, carbs: 1.8, fat: 18, fiber: 0 },
              },
            ],
          },
        ],
      },
    ],
  },
  checkedProducts: [],
};

describe('MealPlannerView', () => {
  it('requires a fresh allergen check for a different stored draft with the same revision',()=>{
    const state={...mockState,active:null,draft:{...mockState.active!,preferencesRevision:1}};
    const props={date:'2026-10-14',state,targetKcal:2000,targetProtein:150,isGenerating:false,isApproving:false,
      preferences:{...parseMealPreferences(null),confirmed:true,revision:1,allergies:['mleko']},
      onGenerate:vi.fn(),onApprove:vi.fn(),onResizeMeal:vi.fn(),onToggleShoppingItem:vi.fn()};
    const view=render(<MealPlannerView {...props}/>);
    fireEvent.click(screen.getByLabelText(/Sprawdziłem skład i etykiety/));
    expect(screen.getByRole('button',{name:'Zatwierdź menu'})).toBeEnabled();
    view.rerender(<MealPlannerView {...props} date="2026-10-15" state={{...state,draft:{...state.draft,notes:'Inny szkic'}}}/>);
    expect(screen.getByRole('button',{name:'Zatwierdź menu'})).toBeDisabled();
  });
  it('shows a replacement draft while the active menu remains available for shopping', () => {
    const draft = structuredClone(mockState.active!);
    draft.days[0].meals[0].name='Nowy szkic';
    render(<MealPlannerView date="2026-10-14" state={{...mockState,draft}} targetKcal={2000} targetProtein={150}
      isGenerating={false} isApproving={false} onGenerate={vi.fn()} onApprove={vi.fn()} onResizeMeal={vi.fn()} onToggleShoppingItem={vi.fn()} />);
    expect(screen.getByText('Nowy szkic')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Zatwierdź menu'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Zakupy'}));
    expect(screen.getByText('180 g')).toBeInTheDocument();
  });
  it('renders empty prompt when state has no plan', () => {
    const onGenerate = vi.fn();
    render(
      <MealPlannerView
        date="2026-10-14"
        state={null}
        targetKcal={2200}
        targetProtein={150}
        isGenerating={false}
        isApproving={false}
        onGenerate={onGenerate}
        onApprove={vi.fn()}
        onResizeMeal={vi.fn()}
        onToggleShoppingItem={vi.fn()}
      />
    );

    expect(screen.getByText('Brak zaplanowanego jadłospisu na ten dzień')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Ułóż jadłospis'));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('renders active meals, portions and switches to shopping list', () => {
    const onToggle = vi.fn();
    const onResize = vi.fn();

    render(
      <MealPlannerView
        date="2026-10-14"
        state={mockState}
        targetKcal={2000}
        targetProtein={150}
        isGenerating={false}
        isApproving={false}
        onGenerate={vi.fn()}
        onApprove={vi.fn()}
        onResizeMeal={onResize}
        onToggleShoppingItem={onToggle}
      />
    );

    expect(screen.getByText('Jajecznica z pieczywem')).toBeInTheDocument();
    expect(screen.getByText('Jaja kurze')).toBeInTheDocument();
    expect(screen.getByText('2000 kcal')).toBeInTheDocument();

    // Click portion scale button 1.5x
    fireEvent.click(screen.getByText('1.5x'));
    expect(onResize).toHaveBeenCalledWith('m1', 1.5,'2026-10-14');

    // Switch to shopping list
    fireEvent.click(screen.getByText('Zakupy'));
    expect(screen.getByText(/Lista zakupów/)).toBeInTheDocument();
    expect(screen.getByText('180 g')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Jaja kurze/ }));
    expect(onToggle).toHaveBeenCalledWith('egg');
  });
});
