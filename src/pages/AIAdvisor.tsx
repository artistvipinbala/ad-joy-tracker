import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BrainCircuit, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIAdvisor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

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
      };

      const allMessages = [
        ...messages,
        userMsg,
      ];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Advisor</h1>
        <p className="text-sm text-muted-foreground">
          നിങ്ങളുടെ ad data analyze ചെയ്ത് next steps suggest ചെയ്യും
        </p>
      </div>

      <Card className="flex flex-col h-[calc(100vh-200px)]">
        <CardHeader className="border-b">
          <CardTitle className="text-sm flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-primary" />
            Chat with AI
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <BrainCircuit className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Ask anything about your ad performance!</p>
              <div className="mt-4 space-y-2">
                {[
                  "Analyze my ad performance this week",
                  "Should I increase my ad budget?",
                  "What's my best performing day?",
                  "How can I reduce my CPR?",
                ].map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    className="text-xs"
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
              <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}>
                <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </CardContent>
        <div className="border-t p-4 flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your ads..."
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
