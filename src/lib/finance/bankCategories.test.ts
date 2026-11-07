import { describe, expect, it } from 'vitest';
import { BANK_CATEGORY_LABELS, bankCounterpartyKey, categorizeBankTransaction, type BankCategory } from '@vanguard/domain';

const debit = (counterparty: string | null, remittance: string | null = 'TRANSAKCJA KARTĄ PŁATNICZĄ') =>
  categorizeBankTransaction({ counterparty, remittance, direction: 'debit' });

describe('categorizeBankTransaction', () => {
  it.each<[string, BankCategory]>([
    ['JMP S.A. BIEDRONKA 309 RZESZOW', 'zakupy_spozywcze'],
    ['ZABKA Z8349 K.1        RZESZOW', 'zakupy_spozywcze'],
    ['DELIKATESY FRAC        RZESZOW', 'zakupy_spozywcze'],
    ['ELECLERC               RZESZOW', 'zakupy_spozywcze'],
    ['ALDI SP. Z O.O.        KROSNO', 'zakupy_spozywcze'],
    ['MCDONALDS 072 RZESZOW  RZESZOW', 'jedzenie_na_miescie'],
    ['KROKIECIK              RZESZOW', 'jedzenie_na_miescie'],
    ['POPEYES MILLENIUM      RZESZOW', 'jedzenie_na_miescie'],
    ['PL KFC KROSNO BIESZCZA KROSNO', 'jedzenie_na_miescie'],
    ['BAR TAURUS NR15        ZORY', 'jedzenie_na_miescie'],
    ['WOLF PUB         74113 KROSNO', 'jedzenie_na_miescie'],
    ['AUTOMATY VENDI MAR     RZESZOW', 'jedzenie_na_miescie'],
    ['GOOGLE PLAY APPS       DUBLIN', 'subskrypcje'],
    ['GOOGLE YOUTUBEPREMIUM  LONDON', 'subskrypcje'],
    ['BOLT.EU/R/2609240747   TALLINN', 'transport'],
    ['ORLEN STACJA NR 1454   KROSNO', 'transport'],
    ['ZTM RZESZOW BILETOMAT  RZESZOW', 'transport'],
    ['MARCEL SPRZEDA MOBIL   RZESZOW', 'transport'],
    ['ONO MOSNOV             MOSNOV', 'transport'],
    ['AUTOPAY S.A.', 'transport'],
    ['DECATHLON RZESZOW      RZESZOW', 'sport'],
    ['ENDORFINA PLATINIUM    RZESZOW', 'sport'],
    ['ALLEGROPAY             POZNAN', 'zakupy'],
    ['VINTED, UAB', 'zakupy'],
    ['DRUK PINGWINEK         RZESZOW', 'zakupy'],
    ['LINK.COM* CERTIVERSE   SOUTH SAN FR', 'zakupy'],
    ['PAYPRO S.A.', 'zakupy'],
    ['PAYU', 'zakupy'],
    ['LEROY MERLIN KROSNO    KROSNO', 'dom'],
    ['T-MOBILE POLSKA        WARSZAWA', 'telekom'],
    ['XTB.COM/PL', 'inwestycje'],
    ['POLICJA MANDAT KARNY 0 RZESZOW', 'oplaty'],
    ['AKADEMIA FRYZJERSKA NO RZESZOW', 'uroda'],
    ['ROSSMANN 03            KROSNO', 'uroda'],
    ['WWW.BOOKSY.COM', 'uroda'],
    ['RUBIN CLUB             RZESZOW', 'rozrywka'],
    ['GRYCAN LODZIARNIE FIRM KROSNO', 'jedzenie_na_miescie'],
    ['CHOCHOLOWSKIE TERMY WY CHOCHOLOW', 'rozrywka'],
    ['DREAM ZONE TOMASZ BOJA KROSNO', 'rozrywka'],
    ['KIWI.COM S.R.O', 'podroze'],
    ['TPN KALATOWKI          ZAKOPANE', 'podroze'],
    ['HOBBYKING.COM          INTERNET', 'zakupy'],
    ['REVOLUT**3862*         DUBLIN', 'przelewy_wlasne'],
    ['CASHBILL ECOMM', 'do_sprawdzenia'],
  ])('%s -> %s', (name, expected) => {
    expect(debit(name)).toBe(expected);
  });

  it('Uber Eats to jedzenie, a Uber to transport', () => {
    expect(debit('UBER EATS HELP.UBER.COM')).toBe('jedzenie_na_miescie');
    expect(debit('UBER *TRIP')).toBe('transport');
  });

  it('krótkie słowa muszą być całym słowem (BAR nie łapie "BARBER" ani "BARANOWSKI")', () => {
    expect(debit('BARANOWSKI SKLEP')).toBe('do_sprawdzenia');
    expect(debit('BARBER SHOP RZESZOW')).toBe('uroda');
  });

  it('przelewy na własne rachunki przez IBAN lub nazwisko właściciela', () => {
    expect(debit('JAN KOWALSKI', 'Przelew środków PRZELEW MOBILE')).toBe('do_sprawdzenia');
    expect(categorizeBankTransaction({ counterparty: 'JAN KOWALSKI', remittance: null, direction: 'debit' }, new Map(), [], ['JAN KOWALSKI'])).toBe('przelewy_wlasne');
    expect(categorizeBankTransaction({ counterparty: 'JAKUB ŁUKASZ SOBOŃ', remittance: 'Przelew środków', direction: 'debit' }, new Map(), [], ['Jakub Soboń'])).toBe('przelewy_wlasne');
    expect(categorizeBankTransaction({ counterparty: 'Jan', remittance: null, direction: 'debit', counterpartyIban: 'PL 123' }, new Map(), ['PL123'])).toBe('przelewy_wlasne');
  });

  it('bez znanej nazwy właściciela przelew na inne nazwisko nie jest uznany za własny', () => {
    expect(categorizeBankTransaction({ counterparty: 'JAN KOWALSKI', remittance: 'x', direction: 'debit' })).toBe('do_sprawdzenia');
  });

  it('przelew na telefon to przelew do osoby', () => {
    expect(debit('IGOR TRENER BIEGOWY', 'Przelew na telefon 48514***027. wrzesień')).toBe('przelewy_do_osob');
  });

  it('wpływy: wynagrodzenie, własny przelew, reszta', () => {
    expect(categorizeBankTransaction({ counterparty: 'FIRMA SP Z O O', remittance: 'Wynagrodzenie za wrzesień', direction: 'credit' })).toBe('wynagrodzenie');
    expect(categorizeBankTransaction({ counterparty: 'JAN KOWALSKI', remittance: 'Przelew', direction: 'credit' })).toBe('wplyw');
    expect(categorizeBankTransaction({ counterparty: 'ANNA NOWAK', remittance: 'zwrot', direction: 'credit' })).toBe('zwrot');
    expect(categorizeBankTransaction({ counterparty: 'FIRMA', remittance: 'Faktura 1', direction: 'credit' })).toBe('dzialalnosc');
    expect(categorizeBankTransaction({ counterparty: 'OSOBA', remittance: 'Przelew na telefon', direction: 'credit' })).toBe('wplyw');
  });

  it('puste dane zostają do sprawdzenia', () => {
    expect(debit(null, null)).toBe('do_sprawdzenia');
  });

  it('wypłata od brokera nie jest dochodem, a jawna dywidenda jest', () => {
    expect(categorizeBankTransaction({ counterparty: 'XTB', remittance: 'Wypłata środków', direction: 'credit' })).toBe('inwestycje');
    expect(categorizeBankTransaction({ counterparty: 'DEGIRO', remittance: 'Dywidenda', direction: 'credit' })).toBe('dochody_kapitalowe');
  });

  it('ręczny wybór użytkownika ma pierwszeństwo przed regułami i dotyczy kontrahenta niezależnie od zapisu', () => {
    const rules = new Map([[bankCounterpartyKey('PAYPRO S.A.'), 'zdrowie' as const]]);
    expect(categorizeBankTransaction({ counterparty: 'PAYPRO  S.A.', remittance: null, direction: 'debit' }, rules)).toBe('zdrowie');
    expect(categorizeBankTransaction({ counterparty: 'BIEDRONKA 1', remittance: null, direction: 'debit' }, rules)).toBe('zakupy_spozywcze');
    expect(categorizeBankTransaction({ counterparty: 'PAYPRO S.A.', remittance: null, direction: 'credit' }, rules)).toBe('wplyw');
  });

  it('każda kategoria ma polską etykietę', () => {
    for (const key of Object.keys(BANK_CATEGORY_LABELS)) {
      expect(BANK_CATEGORY_LABELS[key as BankCategory].length).toBeGreaterThan(2);
    }
  });
});
