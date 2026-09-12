import type { LifeObligationKind } from '@vanguard/domain';

export interface StarterTemplate {
  id: string;
  kind: LifeObligationKind;
  /** Domyślna nazwa typu (bez osób / marek). */
  title: string;
  related_name: string | null;
  monthsAhead: number;
  blurb: string;
  titlePlaceholder: string;
  relatedPlaceholder: string;
}

/** Szybkie typy dla wszystkich 6 kategorii życiowych. */
export const STARTER_TEMPLATES: StarterTemplate[] = [
  // LUDZIE
  {
    id: 'birthday',
    kind: 'people',
    title: 'Urodziny',
    related_name: null,
    monthsAhead: 2,
    blurb: 'Przypomnienia 14 · 7 · w dniu',
    titlePlaceholder: 'np. Urodziny',
    relatedPlaceholder: 'Imię osoby',
  },
  {
    id: 'anniversary',
    kind: 'people',
    title: 'Rocznica',
    related_name: null,
    monthsAhead: 3,
    blurb: 'Przypomnienia 14 · 7 · w dniu',
    titlePlaceholder: 'np. Rocznica',
    relatedPlaceholder: 'Imię / opis',
  },
  {
    id: 'nameday',
    kind: 'people',
    title: 'Imieniny',
    related_name: null,
    monthsAhead: 1,
    blurb: 'Przypomnienia 7 · w dniu',
    titlePlaceholder: 'np. Imieniny',
    relatedPlaceholder: 'Imię osoby',
  },

  // POJAZD
  {
    id: 'vehicle-inspection',
    kind: 'vehicle',
    title: 'Przegląd techniczny',
    related_name: null,
    monthsAhead: 1,
    blurb: 'Przypomnienia 30 · 14 · 7',
    titlePlaceholder: 'np. Przegląd rejestracyjny',
    relatedPlaceholder: 'Marka / rejestracja',
  },
  {
    id: 'vehicle-insurance',
    kind: 'vehicle',
    title: 'Ubezpieczenie OC / AC',
    related_name: null,
    monthsAhead: 2,
    blurb: 'Przypomnienia 30 · 14 · 7',
    titlePlaceholder: 'np. Polisa OC / AC',
    relatedPlaceholder: 'Pojazd / ubezpieczyciel',
  },
  {
    id: 'vehicle-service',
    kind: 'vehicle',
    title: 'Serwis olejowy / filtry',
    related_name: null,
    monthsAhead: 4,
    blurb: 'Przypomnienia 30 · 14',
    titlePlaceholder: 'np. Wymiana oleju i filtrów',
    relatedPlaceholder: 'Pojazd / warsztat',
  },
  {
    id: 'vehicle-tires',
    kind: 'vehicle',
    title: 'Wymiana opon (sezon)',
    related_name: null,
    monthsAhead: 1,
    blurb: 'Przypomnienia 14 · 7',
    titlePlaceholder: 'np. Wymiana opon na letnie/zimowe',
    relatedPlaceholder: 'Pojazd',
  },

  // DOKUMENTY
  {
    id: 'passport',
    kind: 'document',
    title: 'Paszport',
    related_name: null,
    monthsAhead: 6,
    blurb: 'Przypomnienia 60 · 30 · 14',
    titlePlaceholder: 'np. Ważność paszportu',
    relatedPlaceholder: 'Dla kogo',
  },
  {
    id: 'id-card',
    kind: 'document',
    title: 'Dowód osobisty',
    related_name: null,
    monthsAhead: 6,
    blurb: 'Przypomnienia 60 · 30 · 14',
    titlePlaceholder: 'np. Ważność dowodu osobistego',
    relatedPlaceholder: 'Dla kogo',
  },
  {
    id: 'driving-license',
    kind: 'document',
    title: 'Prawo jazdy',
    related_name: null,
    monthsAhead: 6,
    blurb: 'Przypomnienia 60 · 30 · 14',
    titlePlaceholder: 'np. Ważność prawa jazdy',
    relatedPlaceholder: 'Dla kogo',
  },
  {
    id: 'insurance-policy',
    kind: 'document',
    title: 'Polisa na życie / majątek',
    related_name: null,
    monthsAhead: 3,
    blurb: 'Przypomnienia 60 · 30 · 14',
    titlePlaceholder: 'np. Polisa mieszkaniowa',
    relatedPlaceholder: 'Ubezpieczyciel / zakres',
  },

  // DOM
  {
    id: 'home-chimney',
    kind: 'home',
    title: 'Przegląd kominiarski',
    related_name: null,
    monthsAhead: 2,
    blurb: 'Przypomnienia 14 · 7 · w dniu',
    titlePlaceholder: 'np. Kontrola kominiarska',
    relatedPlaceholder: 'Adres / zarządca',
  },
  {
    id: 'home-gas',
    kind: 'home',
    title: 'Przegląd instalacji gazowej',
    related_name: null,
    monthsAhead: 3,
    blurb: 'Przypomnienia 14 · 7 · w dniu',
    titlePlaceholder: 'np. Przegląd szczelności gazu',
    relatedPlaceholder: 'Adres',
  },
  {
    id: 'home-ac',
    kind: 'home',
    title: 'Serwis klimatyzacji / pieca',
    related_name: null,
    monthsAhead: 1,
    blurb: 'Przypomnienia 14 · 7',
    titlePlaceholder: 'np. Serwis pieca / klimy',
    relatedPlaceholder: 'Urządzenie / serwisant',
  },

  // FINANSE
  {
    id: 'finance-pit',
    kind: 'finance',
    title: 'Rozliczenie podatkowe (PIT)',
    related_name: null,
    monthsAhead: 4,
    blurb: 'Przypomnienia 30 · 14 · 7',
    titlePlaceholder: 'np. Rozliczenie PIT roczne',
    relatedPlaceholder: 'Księgowość / US',
  },
  {
    id: 'finance-subscription',
    kind: 'finance',
    title: 'Roczna subskrypcja / domena',
    related_name: null,
    monthsAhead: 2,
    blurb: 'Przypomnienia 14 · 7',
    titlePlaceholder: 'np. Odnowienie hostingu / subskrypcji',
    relatedPlaceholder: 'Usługa / dostawca',
  },

  // ZDROWIE
  {
    id: 'health-blood',
    kind: 'health_admin',
    title: 'Badania profilaktyczne krwi',
    related_name: null,
    monthsAhead: 3,
    blurb: 'Przypomnienia 30 · 14 · 7',
    titlePlaceholder: 'np. Morfologia + biochemia roczna',
    relatedPlaceholder: 'Laboratorium / pakiet',
  },
  {
    id: 'health-dentist',
    kind: 'health_admin',
    title: 'Przegląd stomatologiczny',
    related_name: null,
    monthsAhead: 2,
    blurb: 'Przypomnienia 14 · 7',
    titlePlaceholder: 'np. Wizyta kontrolna + higienizacja',
    relatedPlaceholder: 'Gabinet / lekarz',
  },
];

export function templatesForKind(kind: LifeObligationKind): StarterTemplate[] {
  return STARTER_TEMPLATES.filter((t) => t.kind === kind);
}
