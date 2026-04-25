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

    const systemPrompt = `You are an elite Meta (Facebook) Ads performance strategist for a course-selling business in INR (₹). 
Analyze ONLY the running ads for ${date} and give SHORT, scannable, actionable recommendations per ad.

For EACH ad return one verdict:
- ✅ SCALE (increase budget %) — strong CPR/CTR/ROAS
- ⚠️ OPTIMIZE — workable but watch metrics
- ❌ PAUSE — wasting spend, no conversions, high CPR / low CTR / high frequency

Output format (markdown, compact):
1. **Quick Summary** (2-3 lines)
2. **Per-Ad Actions** — bullet list: \`Ad name\` → ✅/⚠️/❌ + 1-line reason + suggested action (e.g. "increase budget 30%", "pause", "test new creative")
3. **🎯 Top 3 Next Steps** for today

Be direct. No fluff. Use INR (₹). Mention specific numbers.`;

    const userPrompt = `Account totals for ${date}:
${JSON.stringify(accountTotals, null, 2)}

Running ads (only ads with spend > 0 today):
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
