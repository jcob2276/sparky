import { createServiceClient, resolveUserScope } from '../_shared/supabase.ts'

export async function runNextDnsSync(req: Request): Promise<unknown> {
  const body = await req.json().catch(() => ({}))
  const { userId } = await resolveUserScope(req, body.userId ?? null)
  if (!userId) throw new Error('Missing userId for nextdns sync')
  const supabase = createServiceClient()

  // 1. Fetch NextDNS config from vanguard_preferences or env
  const { data: pref } = await supabase
    .from('vanguard_preferences')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'nextdns_config')
    .eq('is_active', true)
    .maybeSingle()

  let apiKey = Deno.env.get('NEXTDNS_API_KEY')
  let profileId = Deno.env.get('NEXTDNS_PROFILE_ID')

  if (pref?.value) {
    try {
      const parsed = JSON.parse(pref.value)
      if (parsed.apiKey) apiKey = parsed.apiKey
      if (parsed.profileId) profileId = parsed.profileId
    } catch {
      // ignore JSON parse error
    }
  }

  if (!apiKey || !profileId) {
    return { ok: true, skipped: true, reason: 'nextdns_not_configured' }
  }

  // 2. Fetch analytics domains from NextDNS REST API
  const url = `https://api.nextdns.io/profiles/${profileId}/analytics/domains?limit=25`
  const res = await fetch(url, {
    headers: { 'X-Api-Key': apiKey },
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    throw new Error(`NextDNS API error: ${res.status} ${await res.text().catch(() => '')}`)
  }

  const json = await res.json()
  const domains = Array.isArray(json.data) ? json.data : []

  // 3. Store/update today's web_domains in aw_daily_summary
  const today = new Date().toISOString().slice(0, 10)

  if (domains.length > 0) {
    const webDomains = domains.map((d: { root?: string; domain?: string; name?: string; queries?: number }) => ({
      domain: d.root || d.domain || d.name || 'unknown',
      queries: d.queries || 1,
    }))

    const { data: existing } = await supabase
      .from('aw_daily_summary')
      .select('id, web_domains')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()

    if (existing) {
      const existingDomains = Array.isArray(existing.web_domains) ? existing.web_domains : [];
      
      // Merge logic: match by domain
      const mergedMap = new Map();
      
      // Add existing (from ActivityWatch or previous NextDNS syncs)
      for (const ed of existingDomains) {
        if (ed && ed.domain) {
          mergedMap.set(ed.domain, { ...ed });
        }
      }
      
      // Add/Update with new NextDNS data
      for (const nd of webDomains) {
        if (mergedMap.has(nd.domain)) {
          const current = mergedMap.get(nd.domain);
          current.queries = (current.queries || 0) + nd.queries;
          mergedMap.set(nd.domain, current);
        } else {
          mergedMap.set(nd.domain, { ...nd });
        }
      }

      const finalWebDomains = Array.from(mergedMap.values())
        .sort((a, b) => ((b.seconds || 0) + (b.queries || 0)) - ((a.seconds || 0) + (a.queries || 0)))
        .slice(0, 50);

      await supabase
        .from('aw_daily_summary')
        .update({
          web_domains: finalWebDomains,
          created_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('aw_daily_summary')
        .insert({
          user_id: userId,
          date: today,
          total_active_seconds: 0,
          web_domains: webDomains,
        })
    }
  }

  return { ok: true, domains_count: domains.length, date: today }
}
