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
  const fullTranscript = fs.readFileSync('SESJA_HIPNOTERAPIA_24_09_2026.md', 'utf-8');

  // 1. Insert into vanguard_stream
  console.log('1. Inserting into vanguard_stream...');
  const { data: streamRes, error: streamErr } = await supabase.from('vanguard_stream').insert({
    user_id: userId,
    source: 'hypnotherapy_session',
    category: 'psychology',
    content: fullTranscript,
    metadata: {
      type: 'hypnotherapy_session',
      session_number: 1,
      session_type: 'wywiad_diagnostyczny',
      session_date: '2026-09-24',
      duration_seconds: 3190,
      duration_minutes: 53,
      therapist: 'Hipnoterapeutka (Rzeszów)',
      cost_pln: 200,
      self_worth_score: 4.5,
      core_imprint: 'Za bardzo grzeczne dziecko z paskiem na świadectwie; unikanie napięcia i konfrontacji',
      defense_mechanisms: ['nadmierna kontrola', 'intelektualizacja / rola eksperta', 'maska śmieszka / uległość', 'ucieczka w izolację'],
      next_session: '2026-09-30T13:00:00+02:00',
      audio_file: '24.09.2026 10.09.m4a'
    }
  }).select('id');

  if (streamErr) console.error('streamErr:', streamErr);
  else console.log('✓ vanguard_stream inserted:', streamRes?.[0]?.id);

  // 2. Insert Synthesis Note into vanguard_notes
  console.log('2. Inserting synthesis note into vanguard_notes...');
  const synthesisContent = `# Sesja Hipnoterapii #1 (24.09.2026) – Diagnoza i Wnioski

**Data sesji:** 24.09.2026, godz. 10:09 (53 minuty)
**Prowadząca:** Hipnoterapeutka (Rzeszów)
**Kolejna sesja (Głęboka indukcja):** Środa, 30.09.2026, godz. 13:00

---

### 1. Diagnoza Somatyczna i Poczucie Wartości
* **Samoocena / Poczucie wartości:** **4.5 / 10** (oddzielone od technicznych kompetencji; trzewiowe poczucie prawa do brania od życia tego, co swoje).
* **Fizjologia lęku:** Każdy element nieznanego, konfrontacji lub odmowy wywołuje skurcz i ból w brzuchu oraz automatyczny odruch zamrożenia (freeze) lub ucieczki.

### 2. Odkryty Pierwotny Imprint: „Za bardzo grzeczne dziecko”
* Jakub w dzieciństwie był „za bardzo grzeczny”, posłuszny, z czerwonymi paskami na świadectwie, niedelikatny, niewychylający się.
* **Program:** *„Jeśli jestem cichy, potulny i spełniam oczekiwania – jestem bezpieczny i akceptowany”*.
* **Konsekwencja u 24-latka:** Paraliż przed męską asertywnością, lęk przed odmową, problem z twardą wyceną (np. 20k w sprzedaży), brak ramy przy kobietach i ucieczka w maskę „śmieszka/kolegi”.

### 3. Zdemaskowane Mechanizmy Obronne
1. **Nadmierna kontrola głową:** (Metafora tańca: *„w tańcu nie da się kontrolować ruchów, a u mnie każdy ruch musi być pod kontrolą”*). Kontrola to zbroja przed lękiem przed nieznanym.
2. **Ucieczka w rolę eksperta:** Pod koniec sesji Jakub zaczął uczyć terapeutkę marketingu High Ticket – bezpieczny mechanizm intelektualizacji, aby odzyskać status i kontrolę.
3. **Zegarowa panika:** Poczucie, że *„w wieku 24 lat czas się kończy”* – terapeutka wskazała, że to iluzja drenująca energię i będąca wymówką do ucieczki.

### 4. Cel na Sesję Hipnozy (30.09, 13:00)
* Wejście w głęboką indukcję podświadomą.
* Przepracowanie pierwotnego lęku przed odrzuceniem.
* Przeprogramowanie reakcji z brzucha: zamiana ucieczki/kontroli na spokojne zaufanie sobie w nieznanym i integrację dorosłej, męskiej energii.

### 5. Zadania Behawioralne do Środy
1. **Zasada 10 sekund:** Przy skurczu w brzuchu nie uciekać w żart ani telefon – posiedzieć z napięciem 10 sekund i oddychać.
2. **Zero wieczornej ucieczki:** Detoks od porno, scrolla i nocnego rozładowywania stymulacją.
3. **Zdjęcie kapelusza eksperta:** Na sesję w środę wejść bez udowadniania wiedzy marketingowej – pozwolić sobie na bezbronność.`;

  const { data: note1Res, error: note1Err } = await supabase.from('vanguard_notes').insert({
    user_id: userId,
    title: '🧠 Sesja Hipnoterapii #1 (24.09.2026) – Diagnoza i Wnioski',
    content: synthesisContent,
    color: 'emerald',
    is_pinned: true,
    tags: ['hipnoza', 'tożsamość', 'psychologia', 'wnioski', 'terapia']
  }).select('id');

  if (note1Err) console.error('note1Err:', note1Err);
  else console.log('✓ vanguard_notes synthesis inserted:', note1Res?.[0]?.id);

  // 3. Insert Transcript Note into vanguard_notes
  console.log('3. Inserting transcript note into vanguard_notes...');
  const { data: note2Res, error: note2Err } = await supabase.from('vanguard_notes').insert({
    user_id: userId,
    title: '📜 Transkrypcja: Sesja Hipnoterapeutyczna #1 (24.09.2026)',
    content: fullTranscript,
    color: 'slate',
    is_pinned: false,
    tags: ['transkrypcja', 'hipnoza', 'archiwum', 'audio']
  }).select('id');

  if (note2Err) console.error('note2Err:', note2Err);
  else console.log('✓ vanguard_notes transcript inserted:', note2Res?.[0]?.id);

  // 4. Insert Knowledge Insight Card
  console.log('4. Inserting knowledge insight card...');
  const { data: cardRes, error: cardErr } = await supabase.from('knowledge_insight_cards').insert({
    user_id: userId,
    template_id: 'trend',
    title: 'Hipnoterapia: Rozbrojenie Imprintu Grzecznego Chłopca i Lęku przed Nieznanym',
    insight: 'Poczucie wartości Jakuba (4.5/10) jest spętane pierwotnym imprintem „za bardzo grzecznego, posłusznego dziecka”. Każdy pierwiastek nieznanego (rozmowa sprzedażowa, pricing 20k, kontakt z kobietą, konfrontacja) odpala somatyczny odruch ucieczki w nadmierną kontrolę lub maskę śmieszka. Środowa hipnoza ma przeprogramować reakcję trzewną na ugruntowany spokój dorosłego mężczyzny.',
    widget_type: 'identity_imprint',
    widget_data: {
      score: 4.5,
      root_cause: 'grzeczne_dziecko_fawn_freeze',
      defense: 'nadmierna_kontrola_intelektualizacja',
      next_session: '2026-09-30T13:00:00+02:00'
    },
    is_pinned: true,
    tags: ['hipnoza', 'tożsamość', 'męskość', 'napięcie']
  }).select('id');

  if (cardErr) console.error('cardErr:', cardErr);
  else console.log('✓ knowledge_insight_cards inserted:', cardRes?.[0]?.id);

  // 5. Update vanguard_identity development theme and gap
  console.log('5. Updating vanguard_identity...');
  const { error: viErr } = await supabase.from('vanguard_identity').update({
    development_theme: 'Inicjacja w dojrzałą męskość: tolerancja napięcia, zaufanie sobie w nieznanym i odrzucenie maski posłusznego chłopca.',
    development_gap: 'Rozjazd między wysoką wiedzą i kompetencjami (marketing, tech, cyber, sprzedaż) a podświadomym lękiem przed konfrontacją, wyceną i ekspozycją (poczucie wartości 4.5/10).',
    updated_at: new Date().toISOString()
  }).eq('user_id', userId);

  if (viErr) console.error('viErr:', viErr);
  else console.log('✓ vanguard_identity updated successfully.');

  console.log('\n=== ALL PERSISTENCE COMPLETED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
