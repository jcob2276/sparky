/**
 * Kategorie transakcji bankowych liczone regułami po nazwie kontrahenta i opisie.
 * Czysta funkcja bez sieci: ten sam kod działa na krawędzi (zapis przy synchronizacji) i w aplikacji.
 * Nazwy właściciela rachunku przychodzą z danych (bank_accounts.name), nie są wpisane w kodzie.
 */

export const BANK_CATEGORY_LABELS = {
  zakupy_spozywcze: 'Zakupy spożywcze',
  jedzenie_na_miescie: 'Jedzenie na mieście',
  transport: 'Transport i paliwo',
  podroze: 'Podróże',
  sport: 'Sport',
  subskrypcje: 'Subskrypcje',
  zakupy: 'Zakupy',
  dom: 'Dom i remont',
  telekom: 'Telefon i internet',
  zdrowie: 'Zdrowie',
  uroda: 'Uroda',
  rozrywka: 'Rozrywka',
  inwestycje: 'Inwestycje',
  oplaty: 'Opłaty i mandaty',
  przelewy_do_osob: 'Przelewy do osób',
  przelewy_wlasne: 'Przelewy własne',
  wynagrodzenie: 'Wynagrodzenie',
  wplyw: 'Inne wpływy',
  inne: 'Inne',
  do_sprawdzenia: 'Do sprawdzenia',
} as const;

export type BankCategory = keyof typeof BANK_CATEGORY_LABELS;

export interface BankCategoryInput {
  counterparty: string | null;
  remittance: string | null;
  direction: 'debit' | 'credit';
}

/** Wielkie litery bez polskich znaków i nadmiarowych spacji, żeby reguły były odporne na zapis banku. */
export function normalizeBankText(text: string | null): string {
  return (text ?? '')
    .replace(/[łŁ]/g, 'l')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9.*@ -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Słowo kluczowe z prefiksem `w:` musi być całym słowem (np. BAR, KFC), reszta może być fragmentem. */
type Keyword = string;

const RULES: ReadonlyArray<readonly [BankCategory, readonly Keyword[]]> = [
  ['subskrypcje', ['GOOGLE PLAY', 'YOUTUBE', 'NETFLIX', 'SPOTIFY', 'APPLE.COM', 'ICLOUD', 'OPENAI', 'CHATGPT',
    'ANTHROPIC', 'CLAUDE.AI', 'DISNEY', 'HBO', 'TWITCH']],
  ['jedzenie_na_miescie', ['MCDONALD', 'w:KFC', 'KROKIECIK', 'POPEYES', 'KEBAB', 'DONER', 'MEXICO', 'RESTAURACJA',
    'w:BAR', 'PIZZ', 'BURGER', 'STARBUCKS', 'COSTA COFFEE', 'KAWIARNIA', 'PYSZNE', 'GLOVO', 'WOLT', 'UBER EATS',
    'GRECKIE', 'SUSHI', 'CUKIERNIA', 'LODZIAR', 'PIEROGARNIA', 'BISTRO']],
  ['zakupy_spozywcze', ['BIEDRONKA', 'ZABKA', 'FRAC', 'ZIELONY KOSZYK', 'DELIKATESY', 'LECLERC', 'SPOZYWCZY',
    'w:PSS', 'SPOLEM', 'LIDL', 'KAUFLAND', 'CARREFOUR', 'AUCHAN', 'STOKROTKA', 'w:DINO', 'NETTO', 'POLOMARKET',
    'POLVEND', 'PIEKARNIA', 'ZOO CENTRUM']],
  ['transport', ['w:BOLT', 'BOLT.EU', 'w:UBER', 'ORLEN', 'w:BP', 'SHELL', 'CIRCLE K', 'MOYA', 'LOTOS', 'w:ZTM',
    'BILETOMAT', 'w:PKP', 'INTERCITY', 'FLIXBUS', 'PARKING', 'MYJNIA', 'TAXI', 'JAKDOJADE', 'w:MPK']],
  ['podroze', ['KIWI.COM', 'RYANAIR', 'WIZZ', 'BOOKING.COM', 'AIRBNB', 'HOTEL', 'HOSTEL', 'LOT POLISH']],
  ['sport', ['DECATHLON', 'WRSPORT', 'TRENER', 'SILOWNIA', 'FITNESS', 'w:GYM', 'BASEN', 'w:SPORT']],
  ['zakupy', ['HOBBYKING', 'ALLEGRO', 'ALIEXPRESS', 'ALIPAY', 'VINTED', 'w:OLX', 'w:TEMU', 'AMAZON', 'ZALANDO', 'EMPIK',
    'MEDIAEXPERT', 'MEDIA MARKT', 'EURO AGD', 'RTV EURO']],
  ['dom', ['LEROY', 'CASTORAMA', 'w:OBI', 'IKEA', 'BRICOMAN', 'JYSK']],
  ['telekom', ['T-MOBILE', 'TMOBILE', 'ORANGE', 'w:PLAY', 'w:PLUS', 'VECTRA', 'NETIA', 'INEA']],
  ['zdrowie', ['APTEKA', 'MEDICOVER', 'LUXMED', 'LUX MED', 'DENTYST', 'STOMATOLOG', 'OPTYK', 'LEKARZ',
    'CENTRUM MEDYCZNE', 'SZPITAL']],
  ['uroda', ['FRYZJER', 'BARBER', 'KOSMETYCZ', 'MANICURE', 'PAZNOKCI']],
  ['rozrywka', ['KINO', 'CINEMA', 'w:CLUB', 'w:KLUB', 'STEAM', 'PLAYSTATION', 'XBOX', 'MUZEUM', 'BOWLING',
    'TERMY', 'AQUAPARK', 'FORTUNA', 'BETCLIC', 'w:STS', 'ESCAPE ROOM']],
  ['inwestycje', ['w:XTB', 'XTB.COM', 'TRADE REPUBLIC', 'DEGIRO', 'BINANCE', 'COINBASE', 'KRAKEN', 'BITSTAMP',
    'ZONDA']],
  ['oplaty', ['MANDAT', 'POLICJA', 'URZAD', 'w:ZUS', 'PODATEK', 'PROWIZJA', 'ODSETKI', 'OPLATA ZA']],
];

function matches(haystack: string, keyword: Keyword): boolean {
  if (keyword.startsWith('w:')) {
    const word = keyword.slice(2);
    return new RegExp(`(^| )${word.replace(/\./g, '\\.')}( |$)`).test(haystack);
  }
  return haystack.includes(keyword);
}

/** Klucz kontrahenta do zapamiętanych wyborów użytkownika: znormalizowana nazwa. */
export const bankCounterpartyKey = (counterparty: string | null): string => normalizeBankText(counterparty);

/**
 * @param ownNames nazwy właściciela rachunków (z bank_accounts.name): przelew do samego siebie to nie wydatek.
 * @param userRules ręczne wybory użytkownika (klucz kontrahenta -> kategoria); mają pierwszeństwo przed regułami.
 *                  Nierozpoznane transakcje zostają `do_sprawdzenia`, żeby użytkownik mógł je przypisać sam.
 */
export function categorizeBankTransaction(
  input: BankCategoryInput, ownNames: readonly string[] = [], userRules: ReadonlyMap<string, BankCategory> = new Map(),
): BankCategory {
  const party = normalizeBankText(input.counterparty);
  const remembered = party ? userRules.get(party) : undefined;
  if (remembered) return remembered;
  const text = `${party} ${normalizeBankText(input.remittance)}`.trim();

  const own = ownNames.map(normalizeBankText).filter((n) => n.length >= 5);
  if (party && (own.some((n) => party === n || party.includes(n)) || party.startsWith('REVOLUT'))) return 'przelewy_wlasne';
  if (normalizeBankText(input.remittance).includes('PRZELEW NA TELEFON')) return 'przelewy_do_osob';

  if (input.direction === 'credit') {
    return /WYNAGRODZENIE|PENSJA|UMOWA ZLECENIE|FAKTURA/.test(text) ? 'wynagrodzenie' : 'wplyw';
  }
  for (const [category, keywords] of RULES) {
    if (keywords.some((k) => matches(text, k))) return category;
  }
  return 'do_sprawdzenia';
}
