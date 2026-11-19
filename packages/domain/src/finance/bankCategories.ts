/**
 * Kategorie transakcji bankowych liczone regułami po nazwie kontrahenta i opisie.
 * Czysta funkcja bez sieci: ten sam kod działa na krawędzi (zapis przy synchronizacji) i w aplikacji.
 * Własne transfery wymagają zgodności IBAN lub potwierdzenia użytkownika, a ręczne reguły uwzględniają kierunek.
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
  dzialalnosc: 'Działalność i faktury',
  dochody_kapitalowe: 'Dywidendy i odsetki',
  zwrot: 'Zwroty',
  gotowka: 'Gotówka',
  wplyw: 'Inne wpływy',
  inne: 'Inne',
  do_sprawdzenia: 'Do sprawdzenia',
} as const;

export type BankCategory = keyof typeof BANK_CATEGORY_LABELS | `custom:${string}`;

export function customBankCategoryLabel(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('custom:')) return null;
  const label = value.slice(7);
  return label.trim() === label && label.length > 0 && label.length <= 60 && !/\p{C}/u.test(label) ? label : null;
}

export function isBankCategory(value: unknown): value is BankCategory {
  return typeof value === 'string' && (Object.hasOwn(BANK_CATEGORY_LABELS, value) || customBankCategoryLabel(value) !== null);
}


export interface BankCategoryInput {
  counterparty: string | null;
  remittance: string | null;
  direction: 'debit' | 'credit';
  counterpartyIban?: string | null;
  /** Kategoria nadana przez sam bank (np. z eksportu CSV); używana dopiero, gdy żadna reguła nie rozpoznała kontrahenta. */
  bankCategory?: string | null;
}

/** Etykieta kategorii banku (po normalizacji) na naszą kategorię. Nieobecne etykiety („Bez kategorii”, „Inne”) zostają do sprawdzenia. */
const BANK_LABEL_TO_CATEGORY: Readonly<Record<string, BankCategory>> = {
  'ARTYKULY SPOZYWCZE': 'zakupy_spozywcze',
  'ALKOHOL': 'zakupy_spozywcze',
  'RESTAURACJE I KAWIARNIE': 'jedzenie_na_miescie',
  'PUBY I KLUBY': 'rozrywka',
  'SPORT': 'sport',
  'ZAKUPY PRZEZ INTERNET': 'zakupy',
  'UBRANIA': 'zakupy',
  'ARTYKULY SZKOLNE/BIUROWE': 'zakupy',
  'KOMPUTER, KONSOLA': 'zakupy',
  'SPRZET AGD I RTV': 'zakupy',
  'MULTIMEDIA': 'subskrypcje',
  'ZALOZENIE LOKATY, ZAKUP FUNDUSZY, AKCJI': 'inwestycje',
  'PALIWO': 'transport',
  'TRANSPORT PUBLICZNY': 'transport',
  'WYPLATA Z BANKOMATU': 'gotowka',
  'HOTELE': 'podroze',
  'INTERNET, TV, TELEFON': 'telekom',
  'WODA': 'dom',
  'OGROD': 'dom',
  'CZESNE, OPLATY ORGANIZACYJNE': 'oplaty',
};

const categoryFromBankLabel = (label: string | null | undefined): BankCategory | null =>
  BANK_LABEL_TO_CATEGORY[normalizeBankText(label ?? null)] ?? null;

/** Wielkie litery bez polskich znaków i nadmiarowych spacji, żeby reguły były odporne na zapis banku. */
export function normalizeBankText(text: string | null): string {
  return (text ?? '')
    .replace(/[łŁ]/g, 'l')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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
    'GRECKIE', 'SUSHI', 'CUKIERNIA', 'LODZIAR', 'PIEROGARNIA', 'BISTRO', 'w:PUB', 'VENDI', 'w:AUTOMAT', 'LUCEX']],
  ['zakupy_spozywcze', ['BIEDRONKA', 'ZABKA', 'FRAC', 'ZIELONY KOSZYK', 'DELIKATESY', 'LECLERC', 'SPOZYWCZY',
    'w:PSS', 'SPOLEM', 'LIDL', 'KAUFLAND', 'CARREFOUR', 'AUCHAN', 'STOKROTKA', 'w:DINO', 'NETTO', 'POLOMARKET',
    'POLVEND', 'PIEKARNIA', 'ZOO CENTRUM', 'ALDI']],
  ['transport', ['w:BOLT', 'BOLT.EU', 'w:UBER', 'ORLEN', 'w:BP', 'SHELL', 'CIRCLE K', 'MOYA', 'LOTOS', 'w:ZTM',
    'BILETOMAT', 'w:PKP', 'INTERCITY', 'FLIXBUS', 'PARKING', 'MYJNIA', 'TAXI', 'JAKDOJADE', 'w:MPK', 'MARCEL',
    'w:ONO', 'AUTOPAY', 'w:KCA']],
  ['podroze', ['KIWI.COM', 'RYANAIR', 'WIZZ', 'BOOKING.COM', 'AIRBNB', 'HOTEL', 'HOSTEL', 'LOT POLISH', 'TPN', 'KALATOWKI']],
  ['sport', ['DECATHLON', 'WRSPORT', 'TRENER', 'SILOWNIA', 'FITNESS', 'w:GYM', 'BASEN', 'w:SPORT', 'ENDORFINA', 'PLATINIUM']],
  ['zakupy', ['HOBBYKING', 'ALLEGRO', 'ALIEXPRESS', 'ALIPAY', 'VINTED', 'w:OLX', 'w:TEMU', 'AMAZON', 'ZALANDO', 'EMPIK',
    'MEDIAEXPERT', 'MEDIA MARKT', 'EURO AGD', 'RTV EURO', 'PINGWINEK', 'CERTIVERSE', 'HENRICKMEDIA', 'PAYPRO', 'PAYU', 'NUVEI']],
  ['dom', ['LEROY', 'CASTORAMA', 'w:OBI', 'IKEA', 'BRICOMAN', 'JYSK']],
  ['telekom', ['T-MOBILE', 'TMOBILE', 'ORANGE', 'w:PLAY', 'w:PLUS', 'VECTRA', 'NETIA', 'INEA']],
  ['zdrowie', ['APTEKA', 'MEDICOVER', 'LUXMED', 'LUX MED', 'DENTYST', 'STOMATOLOG', 'OPTYK', 'LEKARZ',
    'CENTRUM MEDYCZNE', 'SZPITAL']],
  ['uroda', ['FRYZJER', 'BARBER', 'KOSMETYCZ', 'MANICURE', 'PAZNOKCI', 'ROSSMANN', 'BOOKSY', 'HEBE', 'SEPHORA', 'DOUGLAS']],
  ['rozrywka', ['KINO', 'CINEMA', 'w:CLUB', 'w:KLUB', 'STEAM', 'PLAYSTATION', 'XBOX', 'MUZEUM', 'BOWLING',
    'TERMY', 'AQUAPARK', 'FORTUNA', 'BETCLIC', 'w:STS', 'ESCAPE ROOM', 'DREAM ZONE']],
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
export const bankCounterpartyKey = (counterparty: string | null, direction?: 'debit' | 'credit'): string => {
  const key = normalizeBankText(counterparty);
  return key && direction ? `${direction}:${key}` : key;
};

/** Własność rachunku potwierdzona przez użytkownika; klucz obejmuje oba kierunki tylko tego IBAN. */
export const bankOwnIbanKey = (iban: string | null | undefined): string => {
  const normalized = (iban ?? '').replace(/\s/g, '').toUpperCase();
  return normalized ? `own-iban:${normalized}` : '';
};

/**
 * @param userRules ręczne wybory użytkownika (klucz kontrahenta -> kategoria); mają pierwszeństwo przed regułami.
 * @param ownIbans IBAN-y własnych rachunków użytkownika.
 *                  Nierozpoznane transakcje zostają `do_sprawdzenia`, żeby użytkownik mógł je przypisać sam.
 */
export function categorizeBankTransaction(
  input: BankCategoryInput,
  userRules: ReadonlyMap<string, BankCategory> = new Map(),
  ownIbans: readonly string[] = [],
): BankCategory {
  const ownKey = bankOwnIbanKey(input.counterpartyIban);
  if (ownKey && userRules.get(ownKey) === 'przelewy_wlasne') return 'przelewy_wlasne';
  const party = normalizeBankText(input.counterparty);
  const remembered = party ? userRules.get(bankCounterpartyKey(input.counterparty, input.direction))
    ?? (input.direction === 'debit' ? userRules.get(party) : undefined) : undefined;
  if (remembered) return remembered;
  const text = `${party} ${normalizeBankText(input.remittance)}`.trim();

  const iban = input.counterpartyIban?.replace(/\s/g, '').toUpperCase();
  if (iban && ownIbans.some(own => own.replace(/\s/g, '').toUpperCase() === iban)) return 'przelewy_wlasne';

  if (input.direction === 'credit') {
    if (/ZWROT|REFUND|REKLAMACJ/.test(text)) return 'zwrot';
    if (/WYNAGRODZENIE|PENSJA|UMOWA ZLECENIE/.test(text)) return 'wynagrodzenie';
    if (/FAKTURA/.test(text)) return 'dzialalnosc';
    if (/DYWIDEND|ODSETKI/.test(text)) return 'dochody_kapitalowe';
    const investments = RULES.find(([category]) => category === 'inwestycje');
    if (investments?.[1].some(keyword => matches(text, keyword))) return 'inwestycje';
    return 'wplyw';
  }
  if (/WYPLATA.*BANKOMAT|BANKOMAT|ATM CASH/.test(text)) return 'gotowka';
  if (normalizeBankText(input.remittance).includes('PRZELEW NA TELEFON')) return 'przelewy_do_osob';
  for (const [category, keywords] of RULES) {
    if (keywords.some((k) => matches(text, k))) return category;
  }
  return categoryFromBankLabel(input.bankCategory) ?? 'do_sprawdzenia';
}
