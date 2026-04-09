import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors'

const FB_GRAPH_URL = 'https://graph.facebook.com/v19.0'

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

    // Parse optional date range from request body
    let datePreset = 'yesterday'
    let sinceDate: string | null = null
    let untilDate: string | null = null

    if (req.method === 'POST') {
      try {
        const body = await req.json()
        if (body.date_preset) datePreset = body.date_preset
        if (body.since) sinceDate = body.since
        if (body.until) untilDate = body.until
      } catch {
        // No body or invalid JSON, use defaults
      }
    }

    // Build Facebook API URL
    const fields = [
      'spend', 'impressions', 'clicks', 'ctr', 'cpc',
      'reach', 'frequency', 'actions', 'cost_per_action_type',
      'video_avg_time_watched_actions', 'video_p25_watched_actions',
      'video_p50_watched_actions', 'video_p75_watched_actions',
      'video_p95_watched_actions', 'video_p100_watched_actions',
      'cost_per_unique_action_type'
    ].join(',')

    // Ensure account ID has act_ prefix
    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`

    let url = `${FB_GRAPH_URL}/${accountId}/insights?fields=${fields}&access_token=${accessToken}&level=account`

    if (sinceDate && untilDate) {
      url += `&time_range={"since":"${sinceDate}","until":"${untilDate}"}`
    } else {
      url += `&date_preset=${datePreset}`
    }

    console.log(`Fetching FB Ads data for ${sinceDate && untilDate ? `${sinceDate} to ${untilDate}` : datePreset}`)

    const fbResponse = await fetch(url)
    const fbData = await fbResponse.json()

    if (fbData.error) {
      throw new Error(`Facebook API error: ${fbData.error.message}`)
    }

    if (!fbData.data || fbData.data.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No data available for the selected period', synced: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const results = []

    for (const row of fbData.data) {
      // Extract lead count from actions
      const leads = row.actions?.find((a: any) => a.action_type === 'lead') || { value: 0 }
      const conversions = row.actions?.find((a: any) =>
        a.action_type === 'offsite_conversion.fb_pixel_lead' ||
        a.action_type === 'lead' ||
        a.action_type === 'onsite_conversion.lead_grouped'
      ) || { value: 0 }

      // Extract cost per lead
      const cpl = row.cost_per_action_type?.find((a: any) => a.action_type === 'lead') || { value: 0 }
      const cpr = row.cost_per_unique_action_type?.find((a: any) =>
        a.action_type === 'offsite_conversion.fb_pixel_lead' ||
        a.action_type === 'lead'
      ) || { value: 0 }

      // Extract video views
      const videoP25 = row.video_p25_watched_actions?.[0]?.value || 0
      const videoP50 = row.video_p50_watched_actions?.[0]?.value || 0
      const videoP95 = row.video_p95_watched_actions?.[0]?.value || 0

      // Use date_start from FB response
      const date = row.date_start

      const record = {
        date,
        ad_spend: parseFloat(row.spend || '0'),
        impressions: parseInt(row.impressions || '0'),
        clicks: parseInt(row.clicks || '0'),
        ctr: parseFloat(row.ctr || '0'),
        cpc: parseFloat(row.cpc || '0'),
        cpl: parseFloat(cpl.value || '0'),
        cpr: parseFloat(cpr.value || '0'),
        reach: parseInt(row.reach || '0'),
        frequency: parseFloat(row.frequency || '0'),
        three_second_views: parseInt(videoP25 || '0'),
        fifty_percent_views: parseInt(videoP50 || '0'),
        ninety_five_percent_views: parseInt(videoP95 || '0'),
        conversions: parseInt(conversions.value || '0'),
        is_manual_override: false,
      }

      const { error } = await supabase
        .from('ad_daily_data')
        .upsert(record, { onConflict: 'date' })

      if (error) {
        console.error(`Error upserting date ${date}:`, error)
      } else {
        results.push(date)
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced: results.length, dates: results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Sync error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
