import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BrainCircuit, Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIAdvisor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: adData } = useQuery({
    queryKey: ["ad-data-all"],
    queryFn: async () => {
      const { data } = await supabase.from("ad_daily_data").select("*").order("date", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const { data: salesData } = useQuery({
    queryKey: ["sales-all"],
    queryFn: async () => {
      const { data } = await supabase.from("sales_entries").select("*").order("date", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const { data: breakdownData } = useQuery({
    queryKey: ["ad-breakdown-advisor"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ad_breakdown")
        .select("*")
        .order("date", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const contextData = {
        recent_ad_data: adData?.slice(0, 14),
        recent_sales: salesData?.slice(0, 14),
        campaign_breakdown: breakdownData?.filter((b) => b.level === "campaign").slice(0, 30),
        adset_breakdown: breakdownData?.filter((b) => b.level === "adset").slice(0, 30),
        ad_breakdown: breakdownData?.filter((b) => b.level === "ad").slice(0, 30),
      };

      const allMessages = [...messages, userMsg];

      const response = await supabase.functions.invoke("ai-advisor", {
        body: { messages: allMessages, context: contextData },
      });

      if (response.error) throw response.error;

      const assistantContent = response.data?.content || response.data?.message || "No response";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantContent }]);
    } catch (e: any) {
      toast.error(e.message || "AI error");
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: Could not get response. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Analyze my campaign performance — which ones should I scale and which should I pause?",
    "Which ad set is performing best? Give me a full breakdown.",
    "What's my best performing ad? Should I increase its budget?",
    "Give me a complete strategy recommendation based on my data",
    "Analyze my CPR and CPL trends — how can I optimize?",
    "Compare my campaigns and tell me the winner",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> AI Marketing Advisor
        </h1>
        <p className="text-sm text-muted-foreground">
          Your personal Meta Ads strategist — analyzes campaigns, ad sets & ads to give you actionable advice
        </p>
      </div>

      <Card className="flex flex-col h-[calc(100vh-200px)]">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-primary" />
            Chat with AI Advisor
            {breakdownData && breakdownData.length > 0 && (
              <span className="text-[10px] text-muted-foreground font-normal ml-auto">
                {breakdownData.filter(b => b.level === 'campaign').length} campaigns • {breakdownData.filter(b => b.level === 'adset').length} ad sets • {breakdownData.filter(b => b.level === 'ad').length} ads loaded
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BrainCircuit className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm font-medium mb-1">Ask anything about your ad performance!</p>
              <p className="text-xs mb-6">I can analyze your campaigns, ad sets, and individual ads</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                {quickPrompts.map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    className="text-xs text-left h-auto py-2 px-3 whitespace-normal"
                    onClick={() => { setInput(q); }}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}>
                {m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Analyzing your data...</span>
              </div>
            </div>
          )}
        </CardContent>
        <div className="border-t p-4 flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your campaigns, ad sets, ads..."
            className="resize-none min-h-[40px] max-h-[100px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
