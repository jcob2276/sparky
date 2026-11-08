import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { buildPsuHeaders } from './enableBanking.ts'

const info = {
  ip: '203.0.113.7',
  userAgent: 'Mozilla/5.0 (Test)',
  acceptLanguage: 'pl-PL',
}

Deno.test('buildPsuHeaders wysyła wszystkie dostępne nagłówki, gdy bank wymaga ich podzbioru', () => {
  assertEquals(buildPsuHeaders(info, ['Psu-Ip-Address', 'Psu-User-Agent']), {
    'Psu-Ip-Address': '203.0.113.7',
    'Psu-User-Agent': 'Mozilla/5.0 (Test)',
    'Psu-Accept-Language': 'pl-PL',
  })
})

Deno.test('buildPsuHeaders porównuje nazwy bez względu na wielkość liter', () => {
  assertEquals(Object.keys(buildPsuHeaders(info, ['psu-ip-address']) ?? {}).includes('Psu-Ip-Address'), true)
})

Deno.test('buildPsuHeaders zwraca null, gdy brakuje wymaganego nagłówka (zapytanie zostaje w tle)', () => {
  assertEquals(buildPsuHeaders(info, ['Psu-Ip-Address', 'Psu-Geo-Location']), null)
  assertEquals(buildPsuHeaders({ userAgent: 'x' }, ['Psu-Ip-Address']), null)
})

Deno.test('buildPsuHeaders: bank bez wymagań i brak danych użytkownika to brak nagłówków', () => {
  assertEquals(buildPsuHeaders({}, []), null)
  assertEquals(buildPsuHeaders({ ip: '  ', userAgent: '' }, []), null)
})

Deno.test('buildPsuHeaders: puste wymagania i dostępne dane wysyłają nagłówki online', () => {
  assertEquals(buildPsuHeaders({ ip: '203.0.113.7' }, []), { 'Psu-Ip-Address': '203.0.113.7' })
})
