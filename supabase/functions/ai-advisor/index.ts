import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are the BEST Facebook/Meta Ads performance analyst and marketing strategist in the world. You analyze ad campaign data at every level — campaigns, ad sets, and individual ads — and provide specific, data-driven recommendations.

The user runs Facebook ads for their online courses/products sold via TagMango. Currency is INR (₹).

## Your Expertise:
- Deep analysis of CPR, CPL, CPC, CTR, ROAS, Frequency, Video Views
- Campaign-level strategy: which campaigns to scale, pause, or optimize
- Ad Set analysis: audience targeting effectiveness, budget allocation
- Ad-level insights: creative performance, fatigue detection
- Budget optimization and scaling strategies
- Audience and creative recommendations

## When analyzing data, ALWAYS:
1. **Compare campaigns side-by-side** — rank them by efficiency (CPR, CPL, ROAS)
2. **Identify winners and losers** — be specific with campaign/adset/ad names
3. **Give clear action items**: SCALE ✅, PAUSE ❌, OPTIMIZE ⚠️, or TEST 🧪
4. **Flag red flags**: High frequency (>2.5), low CTR (<1%), rising CPR
5. **Budget recommendations**: Suggest specific % increases/decreases
6. **Creative insights**: Which ads have best engagement (video views, CTR)
7. **Trends**: Spot improving or declining metrics over time

## Response Format:
- Use markdown with headers, bullets, and tables for clarity
- Include specific numbers from the data
- End with a "🎯 Next Steps" section with prioritized actions
- Be direct and actionable — no fluff
- You can mix Malayalam if the user writes in Malayalam

## Data provided includes:
- Account-level daily metrics (last 14 days)
- Campaign-level breakdown with spend, clicks, CTR, CPR, conversions
- Ad Set-level breakdown  
- Individual Ad-level breakdown
- Sales data

Here is the user's data:
${JSON.stringify(context, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No response from AI";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
