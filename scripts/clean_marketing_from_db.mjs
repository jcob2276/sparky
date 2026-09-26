import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SB_SECRET_KEY || env.VITE_SUPABASE_ANON_KEY);
const userId = '165ae341-670c-46ce-82dc-434c4dbfcdfd';

async function main() {
  console.log('Cleaning up marketing references and duplicates...');

  // 1. Delete duplicate note if exists
  await supabase.from('vanguard_notes').delete().eq('id', '707f92de-8733-4817-b8f3-f81f422ac84c');
  // also check if there is duplicate transcript note
  const { data: transNotes } = await supabase.from('vanguard_notes').select('id, title').ilike('title', '%Transkrypcja: Sesja%');
  if (transNotes && transNotes.length > 1) {
    console.log('Cleaning duplicate transcript note...');
    await supabase.from('vanguard_notes').delete().eq('id', transNotes[0].id);
  }

  // 2. Pure psychological content for the main note
  const cleanSynthesisContent = `# Sesja Hipnoterapii #1 (24.09.2026) – Diagnoza i Wnioski

**Data sesji:** 24.09.2026, godz. 10:09 (53 minuty)
**Prowadząca:** Hipnoterapeutka (Rzeszów)
**Kolejna sesja (Głęboka indukcja):** Środa, 30.09.2026, godz. 13:00

---

### 1. Diagnoza Somatyczna i Poczucie Wartości
* **Samoocena / Poczucie wartości:** **4.5 / 10** (trzewiowe poczucie prawa do istnienia, brania przestrzeni i stawiania na swoim).
* **Fizjologia lęku:** Każdy element nieznanego, konfrontacji lub odmowy wywołuje skurcz i ból w brzuchu oraz automatyczny odruch zamrożenia (freeze) lub ucieczki.

### 2. Odkryty Pierwotny Imprint: „Za bardzo grzeczne dziecko”
* Jakub w dzieciństwie był „za bardzo grzeczny”, posłuszny, z czerwonymi paskami na świadectwie, niedelikatny, niewychylający się, unikający jakichkolwiek zatargów.
* **Podświadomy program:** *„Jeśli jestem cichy, potulny i spełniam oczekiwania – jestem bezpieczny i akceptowany”*.
* **Konsekwencja u 24-latka:** Paraliż przed asertywnością, lęk przed odmową, brak męskiej ramy w relacjach z kobietami, ucieczka w rolę „nieszkodliwego kolegi / śmieszka” i wycofywanie się do bezpiecznego pokoju.

### 3. Zdemaskowane Mechanizmy Obronne
1. **Nadmierna kontrola głową:** (Metafora tańca: *„w tańcu nie da się kontrolować ruchów, a u mnie każdy ruch musi być pod kontrolą”*). Kontrola to zbroja przed lękiem przed nieznanym.
2. **Ucieczka w żart i uległość:** Gdy pojawia się napięcie społeczne, Jakub natychmiast rozładowuje je śmiechem, uśmiechem lub ustępowaniem, byle tylko nie poczuć konfrontacji.
3. **Zegarowa panika:** Poczucie, że *„w wieku 24 lat czas się kończy, wszystko przepadło”* – terapeutka wskazała, że to destrukcyjna iluzja, która drenuje energię życiową i służy jako podświadoma wymówka do ucieczki od działania.

### 4. Cel na Główną Sesję Hipnozy (30.09, godz. 13:00)
* Wejście w głęboką indukcję podświadomą.
* Uwolnienie pierwotnego lęku przed odrzuceniem i oceną.
* Przeprogramowanie reakcji z brzucha: zamiana ucieczki i kontroli na ugruntowane, spokojne zaufanie sobie w nieznanym.
* Integracja dojrzałej męskiej tożsamości: odwaga do mówienia „nie”, stawiania granic, inicjatywy i brania odpowiedzialności bez poczucia winy.

### 5. Praktyka Behawioralna do Środy
1. **Zasada 10 sekund:** Gdy pojawia się skurcz w brzuchu (przed trudną rozmową, wiadomością, kontaktem wzrokowym) – nie uciekać w żart ani telefon. Wytrzymać napięcie przez 10 sekund i oddychać do brzucha.
2. **Zero wieczornej ucieczki:** Detoks od porno, scrolla i nocnego rozładowywania stymulacją. Pozwolić ciału na ciszę i regenerację.
3. **Obecność na fotelu:** W środę wejść na sesję w 100% jako człowiek gotowy na wewnętrzną pracę w ciele, bez intelektualizowania.`;

  // Update existing note
  await supabase.from('vanguard_notes').update({
    title: '🧠 Sesja Hipnoterapii #1 (24.09.2026) – Diagnoza i Wnioski',
    content: cleanSynthesisContent,
    color: 'emerald',
    is_pinned: true,
    tags: ['hipnoza', 'tożsamość', 'męskość', 'psychologia', 'terapia']
  }).eq('id', '47d8737b-b8d9-47af-b41f-a06abdae4521');
  console.log('✓ Updated vanguard_notes with clean psychological synthesis.');

  // 3. Update Knowledge Insight Card
  await supabase.from('knowledge_insight_cards').update({
    title: 'Hipnoterapia: Rozbrojenie Imprintu Grzecznego Chłopca i Lęku przed Nieznanym',
    insight: 'Poczucie wartości Jakuba (4.5/10) jest spętane pierwotnym imprintem „za bardzo grzecznego, posłusznego dziecka”. Każdy pierwiastek nieznanego, konfrontacji czy męskiej inicjatywy (trudna rozmowa, odmowa, relacja z kobietą) odpala somatyczny odruch ucieczki w nadmierną kontrolę lub maskę śmieszka. Środowa hipnoza ma przeprogramować reakcję trzewną na ugruntowany spokój dorosłego mężczyzny i zaufanie sobie.',
    widget_type: 'identity_imprint',
    widget_data: {
      score: 4.5,
      root_cause: 'grzeczne_dziecko_posluszenstwo',
      defense: 'nadmierna_kontrola_fawn_freeze',
      next_session: '2026-09-30T13:00:00+02:00'
    },
    tags: ['hipnoza', 'tożsamość', 'męskość', 'napięcie']
  }).eq('id', '729ce5de-5b3d-4181-a755-a607bdba8e1e');
  console.log('✓ Updated knowledge_insight_cards with clean psychological insight.');

  // 4. Update vanguard_identity development theme and gap
  await supabase.from('vanguard_identity').update({
    development_theme: 'Inicjacja w dojrzałą męskość: tolerancja napięcia emocjonalnego, zaufanie sobie w nieznanym i odrzucenie programu posłusznego chłopca.',
    development_gap: 'Zablokowane poczucie wartości (4.5/10) i odruch ucieczki przed napięciem, konfrontacją i męską inicjatywą mimo wiedzy i wysokich ambicji.',
    updated_at: new Date().toISOString()
  }).eq('user_id', userId);
  console.log('✓ Updated vanguard_identity development fields.');

  console.log('\n=== MARKETING REMOVED COMPLETELY ===');
}

main().catch(console.error);
