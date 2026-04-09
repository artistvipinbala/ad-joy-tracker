import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.25.76'

const AdDataSchema = z.object({
  date: z.string().min(1),
  ad_spend: z.number().default(0),
  impressions: z.number().int().default(0),
  clicks: z.number().int().default(0),
  ctr: z.number().default(0),
  cpl: z.number().default(0),
  cpr: z.number().default(0),
  cpc: z.number().default(0),
  three_second_views: z.number().int().default(0),
  fifty_percent_views: z.number().int().default(0),
  ninety_five_percent_views: z.number().int().default(0),
  frequency: z.number().default(0),
  reach: z.number().int().default(0),
  conversions: z.number().int().default(0),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const parsed = AdDataSchema.safeParse(body)

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid data', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error } = await supabase
      .from('ad_daily_data')
      .upsert(
        { ...parsed.data, is_manual_override: false },
        { onConflict: 'date' }
      )

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, date: parsed.data.date }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
