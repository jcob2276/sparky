export interface DailyFuelQuote {
  text: string;
  author?: string;
  source?: string;
}

const DAILY_FUEL_QUOTES: DailyFuelQuote[] = [
  {
    text: 'Entuzjazm to nie nastrój.\nTo decyzja którą podejmujesz rano.',
    author: 'Sparky Core',
  },
  {
    text: 'Przestań być konsumentem. Zacznij być producentem. Konsumpcja kosztuje cię wolność, produkcja ją kupuje.',
    author: 'MJ DeMarco',
    source: 'Fastlane Milionera',
  },
  {
    text: 'Negocjacje nie polegają na kompromisie. Chodzi o doprowadzenie drugiej strony do poczucia, że rozwiązanie to ich własny pomysł.',
    author: 'Chris Voss',
    source: 'Never Split the Difference',
  },
  {
    text: 'Ludzie zrobią znacznie więcej, by uniknąć straty, niż by zyskać coś o dokładnie tej samej wartości.',
    author: 'Robert Cialdini',
    source: 'Wywieranie wpływu na ludzi',
  },
  {
    text: 'Cena jest problemem tylko wtedy, gdy wartość nie została bezdyskusyjnie i namacalnie udowodniona.',
    author: 'Dan Lok',
    source: 'F.U. Money',
  },
  {
    text: 'Zrób ofertę tak dobrą i bezdyskusyjną, że ludzie poczują się głupio, mówiąc »nie«.',
    author: 'Alex Hormozi',
    source: '$100M Offers',
  },
  {
    text: 'Prawdziwe negocjacje zaczynają się w chwili, gdy słyszysz pierwsze »nie«. Wcześniej to tylko wstępna wymiana uprzejmości.',
    author: 'Chris Voss',
    source: 'Never Split the Difference',
  },
  {
    text: 'Świat nie płaci ci za to, jak ciężko pracujesz, ale za to, co twoja praca realnie zmienia na rynku i jak trudno cię zastąpić.',
    author: 'MJ DeMarco',
    source: 'Fastlane Milionera',
  },
  {
    text: 'Dźwignia to kod, media i kapitał — pracują bez twojej obecności, kiedy śpisz lub trenujesz.',
    author: 'Naval Ravikant',
    source: 'Almanak Navala',
  },
  {
    text: 'Brak umiejętności zamykania sprzedaży zamienia twoją ciężką pracę i pasję w zwykły wolontariat.',
    author: 'Dan Lok',
    source: 'Unlock It',
  },
  {
    text: 'Konsekwencja to najpotężniejszy mechanizm psychologiczny — gdy publicznie zadeklarujesz kierunek, twój mózg wymusi działanie.',
    author: 'Robert Cialdini',
    source: 'Wywieranie wpływu na ludzi',
  },
  {
    text: 'Spowolnij tempo wypowiedzi. Pośpiech podświadomie sygnalizuje brak kontroli i desperację.',
    author: 'Chris Voss',
    source: 'Never Split the Difference',
  },
  {
    text: 'Nie musisz mieć ochoty na wykonanie zadania. Musisz tylko usiąść i zrobić pierwszą minutę.',
    author: 'Sparky Core',
  },
  {
    text: 'Jeśli chcesz zarobić miliony, musisz rozwiązać krytyczny problem setek lub ułatwić życie milionom.',
    author: 'MJ DeMarco',
    source: 'Fastlane Milionera',
  },
  {
    text: 'Nie sprzedawaj produktu ani procesu. Sprzedawaj to, kim twój klient stanie się dzięki współpracy z tobą.',
    author: 'Dan Lok',
    source: 'High-Ticket Closing',
  },
  {
    text: 'Najważniejsza zasada perswazji: daj ludziom powód, by poczuli, że to oni mają kontrolę nad decyzją.',
    author: 'Chris Voss',
    source: 'Never Split the Difference',
  },
  {
    text: 'Bogactwo to nie drogie przedmioty, które kupujesz, ale wolność decydowania o każdej minucie swojego dnia.',
    author: 'MJ DeMarco',
    source: 'Fastlane Milionera',
  },
  {
    text: 'Prawdziwa pewność siebie to nie przekonanie, że wygrasz, ale gotowość do zniesienia tylu prób, ile będzie trzeba.',
    author: 'Alex Hormozi',
    source: '$100M Leads',
  },
  {
    text: 'Ludzie znacznie bardziej ufają temu, co sami powiedzieli, niż argumentom, którymi próbujesz ich przekonać.',
    author: 'Robert Cialdini',
    source: 'Pre-Suazja',
  },
  {
    text: 'Komfort to cichy zabójca ambicji. Wszystko, na czym ci naprawdę zależy, znajduje się po drugiej stronie oporu.',
    author: 'Dan Lok',
    source: 'F.U. Money',
  },
  {
    text: 'Wiatr gasi świecę, ale podsyca ogień. Bądź ogniem i wykorzystuj przeciwności jako paliwo.',
    author: 'Nassim Nicholas Taleb',
    source: 'Antykruchość',
  },
  {
    text: 'Przyszłe ty ma nadzieję,\nże dzisiejsze ty nie odpuści.',
    author: 'Sparky Core',
  },
  {
    text: 'Zanim poprosisz o cokolwiek, stwórz autentyczną wartość. Wzajemność to najstarsza dźwignia w historii ludzkości.',
    author: 'Robert Cialdini',
    source: 'Wywieranie wpływu na ludzi',
  },
  {
    text: 'Nie patrz na słowa, których ludzie używają. Zwracaj uwagę na ukryte emocje i lęki, które nimi kierują.',
    author: 'Chris Voss',
    source: 'Never Split the Difference',
  },
  {
    text: 'Przewagę rynkową buduje się robiąc nudne, trudne rzeczy z niewzruszoną powtarzalnością przez lata.',
    author: 'Alex Hormozi',
    source: '$100M Offers',
  },
  {
    text: 'Za rok będziesz tu\nalbo znacznie dalej.\nTy decydujesz dziś.',
    author: 'Sparky Core',
  },
  {
    text: 'Dopóki wymieniasz czas na pieniądze, twoje możliwości zarobkowe są ograniczone fizyczną liczbą godzin w dobie.',
    author: 'MJ DeMarco',
    source: 'Fastlane Milionera',
  },
  {
    text: 'Odrzuć gry o sumie zerowej. Skup się wyłącznie na reputacji, długich horyzontach i partnerstwach o sumie dodatniej.',
    author: 'Naval Ravikant',
    source: 'Almanak Navala',
  },
  {
    text: 'Kiedy zmieniasz nastawienie z »muszę wygrać tę dyskusję« na »muszę zrozumieć drugą stronę«, natychmiast przejmujesz inicjatywę.',
    author: 'Chris Voss',
    source: 'Never Split the Difference',
  },
  {
    text: 'Twoje najlepsze lata nie są za tobą.\nOne dopiero się zaczynają.',
    author: 'Sparky Core',
  },
];

export function getDailyFuelQuote(livedDays: number): DailyFuelQuote {
  const index = Math.abs(livedDays) % DAILY_FUEL_QUOTES.length;
  return DAILY_FUEL_QUOTES[index];
}
