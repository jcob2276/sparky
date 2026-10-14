import {fireEvent,render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {GlycemicEstimate} from './GlycemicEstimate';
it('requires a matched study, carbohydrate definition and reviewed portion, and resets after editing food',()=>{
  const items=[{id:'rice',name:'Basmati',grams:200,carbs:56,fiber:6}];
  const view=render(<GlycemicEstimate items={items}/>);
  fireEvent.click(screen.getByText('Orientacyjny ładunek glikemiczny (GL)'));
  expect(screen.getByRole('status')).toHaveTextContent('brak wystarczających danych');
  fireEvent.change(screen.getByLabelText('Dane GI dla Basmati'),{target:{value:'basmati-white-uk-10min'}});
  fireEvent.change(screen.getByLabelText('Definicja węglowodanów dla Basmati'),{target:{value:'available'}});
  expect(screen.getByRole('status')).toHaveTextContent('brak wystarczających danych');
  fireEvent.click(screen.getByLabelText(/Potwierdzam porcję/));
  expect(screen.getByRole('status')).toHaveTextContent('Szacowany GL posiłku: 28');
  view.rerender(<GlycemicEstimate items={[{...items[0],grams:100,carbs:28,fiber:3}]}/>);
  fireEvent.click(screen.getByText('Orientacyjny ładunek glikemiczny (GL)'));
  expect(screen.getByRole('status')).toHaveTextContent('brak wystarczających danych');
});
