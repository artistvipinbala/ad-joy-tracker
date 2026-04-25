import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { date, runningAds, accountTotals } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const totalSpend = Number(accountTotals?.spend || 0);
    const manualSales = Number(accountTotals?.manual_sales || 0);
    const realCAC = manualSales > 0 ? totalSpend / manualSales : 0;

    const systemPrompt = `You are an elite Meta (Facebook) Ads strategist for a course business in INR (₹).

IMPORTANT — DATA RULES:
- Facebook "conversions" pixel data is UNRELIABLE for this business. IGNORE the FB conversion field.
- The TRUE conversion source is MANUAL SALES (manual_sales) entered by the owner. Use this for ROAS/CAC truth.
- For per-ad analysis, use SPEND, CTR, CPC, CPR, FREQ, REACH only. Do NOT cite FB conversions per ad.
- True account CAC = Total Spend ÷ Manual Sales = ₹${realCAC.toFixed(0)}

OUTPUT FORMAT (strict markdown, no fluff):

### 📊 Day Summary
2 short lines. Mention: total spend, manual sales, true CAC, profit verdict.

### 🎯 Per-Ad Action Table
A markdown table with these EXACT columns:

| Ad | Spend | CTR | CPC | Freq | Verdict | Action |
|---|---|---|---|---|---|---|

- Verdict: ✅ SCALE / ⚠️ OPTIMIZE / ❌ PAUSE
- Action: ONE short phrase (e.g. "+30% budget", "Pause now", "New creative", "Lower bid")
- Sort by spend desc. Truncate ad name to ~25 chars.

### 🚀 Top 3 Next Steps
Numbered list, 1 line each, specific actions for tomorrow.

Be direct. Use ₹. No paragraphs of explanation — the table is the answer.`;

    const userPrompt = `Date: ${date}
Account totals (truth):
${JSON.stringify({ ...accountTotals, true_cac: realCAC }, null, 2)}

Running ads (FB metrics — ignore the 'conv' field, it's wrong):
${JSON.stringify(runningAds, null, 2)}`;

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
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
    console.error("ai-daily-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
