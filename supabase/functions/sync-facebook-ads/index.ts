import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors'

const FB_GRAPH_URL = 'https://graph.facebook.com/v19.0'

async function fetchFBInsights(accountId: string, accessToken: string, level: string, sinceDate: string, untilDate: string) {
  const fields = [
    'spend', 'impressions', 'clicks', 'ctr', 'cpc',
    'reach', 'frequency', 'actions', 'cost_per_action_type',
    'video_p25_watched_actions', 'video_p50_watched_actions',
    'video_p95_watched_actions', 'cost_per_unique_action_type',
    ...(level !== 'account' ? ['campaign_id', 'campaign_name'] : []),
    ...(level === 'adset' || level === 'ad' ? ['adset_id', 'adset_name'] : []),
    ...(level === 'ad' ? ['ad_id', 'ad_name'] : []),
  ].join(',')

  let url = `${FB_GRAPH_URL}/${accountId}/insights?fields=${fields}&access_token=${accessToken}&level=${level}&time_increment=1`
  url += `&time_range={"since":"${sinceDate}","until":"${untilDate}"}`
  url += `&limit=500`

  const allData: any[] = []
  let nextUrl: string | null = url

  while (nextUrl) {
    const resp: Response = await fetch(nextUrl)
    const json: any = await resp.json()
    if (json.error) throw new Error(`Facebook API error (${level}): ${json.error.message}`)
    if (json.data) allData.push(...json.data)
    nextUrl = json.paging?.next || null
  }

  return allData
}

function extractMetrics(row: any) {
  const leads = row.actions?.find((a: any) => a.action_type === 'lead') || { value: 0 }
  const conversions = row.actions?.find((a: any) =>
    a.action_type === 'offsite_conversion.fb_pixel_lead' ||
    a.action_type === 'lead' ||
    a.action_type === 'onsite_conversion.lead_grouped'
  ) || { value: 0 }
  const cpl = row.cost_per_action_type?.find((a: any) => a.action_type === 'lead') || { value: 0 }
  const cpr = row.cost_per_unique_action_type?.find((a: any) =>
    a.action_type === 'offsite_conversion.fb_pixel_lead' ||
    a.action_type === 'lead'
  ) || { value: 0 }

  return {
    ad_spend: parseFloat(row.spend || '0'),
    impressions: parseInt(row.impressions || '0'),
    clicks: parseInt(row.clicks || '0'),
    ctr: parseFloat(row.ctr || '0'),
    cpc: parseFloat(row.cpc || '0'),
    cpl: parseFloat(cpl.value || '0'),
    cpr: parseFloat(cpr.value || '0'),
    reach: parseInt(row.reach || '0'),
    frequency: parseFloat(row.frequency || '0'),
    three_second_views: parseInt(row.video_p25_watched_actions?.[0]?.value || '0'),
    fifty_percent_views: parseInt(row.video_p50_watched_actions?.[0]?.value || '0'),
    ninety_five_percent_views: parseInt(row.video_p95_watched_actions?.[0]?.value || '0'),
    conversions: parseInt(conversions.value || '0'),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const accessToken = Deno.env.get('FACEBOOK_ACCESS_TOKEN')
    const adAccountId = Deno.env.get('FACEBOOK_AD_ACCOUNT_ID')

    if (!accessToken || !adAccountId) {
      throw new Error('Facebook credentials not configured')
    }

    let sinceDate: string | null = null
    let untilDate: string | null = null

    if (req.method === 'POST') {
      try {
        const body = await req.json()
        if (body.since) sinceDate = body.since
        if (body.until) untilDate = body.until
      } catch { /* use defaults */ }
    }

    // Default: sync last 7 days to catch any missing data
    if (!sinceDate || !untilDate) {
      const now = new Date()
      untilDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().split('T')[0]
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60_000)
      sinceDate = weekAgo.toISOString().split('T')[0]
    }

    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
    console.log(`Syncing FB Ads: ${sinceDate} to ${untilDate}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Fetch account-level data (existing behavior)
    const accountData = await fetchFBInsights(accountId, accessToken, 'account', sinceDate, untilDate)
    let accountSynced = 0

    for (const row of accountData) {
      const metrics = extractMetrics(row)
      const { error } = await supabase
        .from('ad_daily_data')
        .upsert({
          date: row.date_start,
          ...metrics,
          is_manual_override: false,
        }, { onConflict: 'date' })
      if (!error) accountSynced++
      else console.error(`Error upserting account date ${row.date_start}:`, error)
    }

    // 2. Fetch campaign-level breakdown
    let breakdownSynced = 0
    for (const level of ['campaign', 'adset', 'ad'] as const) {
      try {
        const data = await fetchFBInsights(accountId, accessToken, level, sinceDate, untilDate)
        for (const row of data) {
          const metrics = extractMetrics(row)
          const record: any = {
            date: row.date_start,
            level,
            campaign_id: row.campaign_id || null,
            campaign_name: row.campaign_name || null,
            adset_id: level === 'adset' || level === 'ad' ? (row.adset_id || null) : null,
            adset_name: level === 'adset' || level === 'ad' ? (row.adset_name || null) : null,
            ad_id: level === 'ad' ? (row.ad_id || null) : null,
            ad_name: level === 'ad' ? (row.ad_name || null) : null,
            spend: metrics.ad_spend,
            impressions: metrics.impressions,
            clicks: metrics.clicks,
            ctr: metrics.ctr,
            cpc: metrics.cpc,
            cpl: metrics.cpl,
            cpr: metrics.cpr,
            reach: metrics.reach,
            frequency: metrics.frequency,
            conversions: metrics.conversions,
            three_second_views: metrics.three_second_views,
            fifty_percent_views: metrics.fifty_percent_views,
            ninety_five_percent_views: metrics.ninety_five_percent_views,
          }

          const { error } = await supabase
            .from('ad_breakdown')
            .upsert(record, { onConflict: 'date,level,campaign_id,adset_id,ad_id' })
          if (!error) breakdownSynced++
          else console.error(`Error upserting ${level}:`, error)
        }
      } catch (e) {
        console.error(`Error fetching ${level} data:`, e)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: accountSynced,
        breakdown_synced: breakdownSynced,
        date_range: { since: sinceDate, until: untilDate },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Sync error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
