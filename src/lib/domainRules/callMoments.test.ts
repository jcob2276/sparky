import { describe, expect, it } from 'vitest';
import { groundCallMoments } from '@vanguard/domain';

const transcript = [
  { timestamp: '00:01:10', speaker: { display_name: 'Jakub' }, text: 'Ile kosztuje Pana obecny brak klientów?' },
  { timestamp: '00:04:30', speaker: { display_name: 'Klient' }, text: 'Muszę to przemyśleć, porozmawiam z żoną.' },
  { timestamp: '00:05:02', speaker: { display_name: 'Jakub' }, text: 'Rozumiem. To kosztuje 4 tysiące złotych.' },
];

describe('groundCallMoments', () => {
  it('zostawia moment z czasem i cytatem z transkryptu', () => {
    const [moment] = groundCallMoments([{ timestamp: '00:04:30', quote: 'porozmawiam z żoną', what: 'Klient odkłada decyzję.', why: 'Możliwe, że decyzja jest wspólna.', experiment: 'Zapytaj, czy żona może dołączyć do kolejnej rozmowy.' }], transcript);
    expect(moment).toEqual({ timestamp: '00:04:30', quote: 'porozmawiam z żoną', what: 'Klient odkłada decyzję.', why: 'Możliwe, że decyzja jest wspólna.', experiment: 'Zapytaj, czy żona może dołączyć do kolejnej rozmowy.' });
  });

  it('odrzuca moment ze zmyślonym czasem albo cytatem', () => {
    expect(groundCallMoments([{ timestamp: '00:20:00', what: 'Zamknięcie sprzedaży.' }], transcript)).toEqual([]);
    expect(groundCallMoments([{ timestamp: '00:05:02', quote: 'zwrot z inwestycji w miesiąc', what: 'Obietnica ROI.' }], transcript)).toEqual([]);
  });

  it('cytat porównuje bez wielkości liter i znaków interpunkcji, a czas z tolerancją', () => {
    expect(groundCallMoments([{ timestamp: '00:05:10', quote: 'TO KOSZTUJE 4 TYSIĄCE złotych!', what: 'Cena podana po wątpliwości.' }], transcript)).toHaveLength(1);
  });

  it('bez cytatu i eksperymentu zwraca null, najwyżej 5 momentów', () => {
    const many = Array.from({ length: 8 }, () => ({ timestamp: '00:01:10', what: 'Pytanie o koszt problemu.' }));
    const moments = groundCallMoments(many, transcript);
    expect(moments).toHaveLength(5);
    expect(moments[0]).toMatchObject({ quote: null, experiment: null });
  });
});
