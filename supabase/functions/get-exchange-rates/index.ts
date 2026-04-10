const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { date } = await req.json()
    
    // Use frankfurter.app (free, no API key needed) for historical rates
    // It provides ECB reference rates
    const url = date 
      ? `https://api.frankfurter.app/${date}?from=USD&to=INR`
      : `https://api.frankfurter.app/latest?from=USD&to=INR`
    
    const usdResponse = await fetch(url)
    const usdData = await usdResponse.json()
    
    const eurUrl = date
      ? `https://api.frankfurter.app/${date}?from=EUR&to=INR`
      : `https://api.frankfurter.app/latest?from=EUR&to=INR`
    
    const eurResponse = await fetch(eurUrl)
    const eurData = await eurResponse.json()
    
    return new Response(
      JSON.stringify({
        date: date || new Date().toISOString().split('T')[0],
        usd_to_inr: usdData.rates?.INR || 0,
        eur_to_inr: eurData.rates?.INR || 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Exchange rate error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
