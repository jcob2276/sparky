export async function fetchHealthspanContext(supabase: any, userId: string) {
  const [snapshots, checkins, levers] = await Promise.all([
    supabase.from('healthspan_snapshots')
      .select('snapshot_date, model_version, profile, pace, input_summary')
      .eq('user_id', userId).order('snapshot_date', { ascending: false }).limit(2),
    supabase.from('healthspan_checkins')
      .select('checkin_date, period, payload')
      .eq('user_id', userId).order('checkin_date', { ascending: false }).limit(7),
    supabase.from('healthspan_levers')
      .select('week_start, title, target_label, status, outcome, baseline_score, actual_score')
      .eq('user_id', userId).order('week_start', { ascending: false }).limit(10),
  ]);
  if (snapshots.error || !snapshots.data?.length) return '';
  return `[HEALTHSPAN — MODEL WELLNESS, NIE DIAGNOZA]:
Profil: ${JSON.stringify(snapshots.data)}
Check-iny: ${JSON.stringify(checkins.data ?? [])}
Dźwignie i rozliczenia: ${JSON.stringify(levers.data ?? [])}
Wiek funkcjonalny zawsze podawaj jako przedział wraz z pewnością i pokryciem danych. Wyjaśnij czynniki oraz źródła. Nie nazywaj go wiekiem biologicznym i nie formułuj diagnozy. Tempo porównuje bieżące okno z własną bazą użytkownika, nie przewiduje długości życia.`;
}
