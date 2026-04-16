import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";
import {
  Plus, Pencil, RefreshCw, TrendingUp, TrendingDown, IndianRupee,
  ShoppingCart, DollarSign, Euro, Target, Percent, Wallet, ChevronDown, ChevronRight,
  Megaphone, Layers, FileImage,
} from "lucide-react";
import { toast } from "sonner";

const PRICE_PER_SALE = 589;
const COMMISSION_RATE = 0.025;

const defaultRow = {
  date: new Date().toISOString().split("T")[0],
  ad_spend: 0, impressions: 0, clicks: 0, ctr: 0, cpl: 0, cpr: 0, cpc: 0,
  three_second_views: 0, fifty_percent_views: 0, ninety_five_percent_views: 0,
  frequency: 0, reach: 0, conversions: 0,
};

type AdRow = typeof defaultRow;

function BreakdownRow({ name, data, subtitle }: { name: string; data: any; subtitle?: string | null }) {
  return (
    <div className="bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs font-medium truncate max-w-[200px]">{name}</p>
          {subtitle && <p className="text-[9px] text-muted-foreground truncate max-w-[200px]">{subtitle}</p>}
        </div>
        <span className="text-xs font-bold text-destructive">{formatINR(Number(data.spend))}</span>
      </div>
      <div className="grid grid-cols-4 md:grid-cols-6 gap-x-3 gap-y-1 text-[10px]">
        <div><span className="text-muted-foreground">Clicks</span> <span className="font-medium block">{data.clicks}</span></div>
        <div><span className="text-muted-foreground">CTR</span> <span className="font-medium block">{formatPercent(Number(data.ctr))}</span></div>
        <div><span className="text-muted-foreground">CPC</span> <span className="font-medium block">{formatINR(Number(data.cpc))}</span></div>
        <div><span className="text-muted-foreground">CPR</span> <span className="font-medium block">{Number(data.cpr) > 0 ? formatINR(Number(data.cpr)) : "—"}</span></div>
        <div><span className="text-muted-foreground">Reach</span> <span className="font-medium block">{formatNumber(data.reach)}</span></div>
        <div><span className="text-muted-foreground">Freq</span> <span className="font-medium block">{Number(data.frequency).toFixed(2)}</span></div>
      </div>
    </div>
  );
}

function CampaignTree({ campaign, adsets, ads }: { campaign: any; adsets: any[]; ads: any[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border border-border rounded-lg overflow-hidden">
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted/80 transition-colors text-left">
          {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
          <Megaphone className="h-3 w-3 shrink-0 text-primary" />
          <span className="text-xs font-semibold truncate flex-1">{campaign.campaign_name || "Unknown Campaign"}</span>
          <span className="text-xs font-bold text-destructive shrink-0">{formatINR(Number(campaign.spend))}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 py-2 space-y-1.5 border-t border-border/50">
          {/* Campaign metrics */}
          <div className="grid grid-cols-4 md:grid-cols-6 gap-x-3 gap-y-1 text-[10px] mb-2">
            <div><span className="text-muted-foreground">Clicks</span> <span className="font-medium block">{campaign.clicks}</span></div>
            <div><span className="text-muted-foreground">CTR</span> <span className="font-medium block">{formatPercent(Number(campaign.ctr))}</span></div>
            <div><span className="text-muted-foreground">CPC</span> <span className="font-medium block">{formatINR(Number(campaign.cpc))}</span></div>
            <div><span className="text-muted-foreground">CPR</span> <span className="font-medium block">{Number(campaign.cpr) > 0 ? formatINR(Number(campaign.cpr)) : "—"}</span></div>
            <div><span className="text-muted-foreground">Reach</span> <span className="font-medium block">{formatNumber(campaign.reach)}</span></div>
            <div><span className="text-muted-foreground">Freq</span> <span className="font-medium block">{Number(campaign.frequency).toFixed(2)}</span></div>
          </div>
          {/* Ad Sets under this campaign */}
          {adsets.length > 0 && adsets.map((adset) => (
            <AdSetTree key={adset.id} adset={adset} ads={ads.filter((a) => a.adset_id === adset.adset_id)} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AdSetTree({ adset, ads }: { adset: any; ads: any[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="ml-3 border-l-2 border-primary/20 pl-2">
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/60 transition-colors text-left">
          {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
          <Layers className="h-3 w-3 shrink-0 text-amber-500" />
          <span className="text-[11px] font-medium truncate flex-1">{adset.adset_name || "Unknown Ad Set"}</span>
          <span className="text-[11px] font-bold text-destructive shrink-0">{formatINR(Number(adset.spend))}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-4 py-1 space-y-1.5">
          {/* Ad Set metrics */}
          <div className="grid grid-cols-4 md:grid-cols-6 gap-x-3 gap-y-1 text-[10px] mb-1">
            <div><span className="text-muted-foreground">Clicks</span> <span className="font-medium block">{adset.clicks}</span></div>
            <div><span className="text-muted-foreground">CTR</span> <span className="font-medium block">{formatPercent(Number(adset.ctr))}</span></div>
            <div><span className="text-muted-foreground">CPC</span> <span className="font-medium block">{formatINR(Number(adset.cpc))}</span></div>
            <div><span className="text-muted-foreground">CPR</span> <span className="font-medium block">{Number(adset.cpr) > 0 ? formatINR(Number(adset.cpr)) : "—"}</span></div>
            <div><span className="text-muted-foreground">Reach</span> <span className="font-medium block">{formatNumber(adset.reach)}</span></div>
            <div><span className="text-muted-foreground">Freq</span> <span className="font-medium block">{Number(adset.frequency).toFixed(2)}</span></div>
          </div>
          {/* Ads under this ad set */}
          {ads.length > 0 && (
            <div className="space-y-1">
              {ads.map((ad) => (
                <div key={ad.id} className="flex items-start gap-2 ml-2 border-l border-muted-foreground/20 pl-2 py-1">
                  <FileImage className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium truncate">{ad.ad_name || "Unknown Ad"}</p>
                      <span className="text-[10px] font-bold text-destructive shrink-0 ml-2">{formatINR(Number(ad.spend))}</span>
                    </div>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-x-3 text-[10px] mt-0.5">
                      <div><span className="text-muted-foreground">Clicks</span> <span className="font-medium block">{ad.clicks}</span></div>
                      <div><span className="text-muted-foreground">CTR</span> <span className="font-medium block">{formatPercent(Number(ad.ctr))}</span></div>
                      <div><span className="text-muted-foreground">CPC</span> <span className="font-medium block">{formatINR(Number(ad.cpc))}</span></div>
                      <div><span className="text-muted-foreground">CPR</span> <span className="font-medium block">{Number(ad.cpr) > 0 ? formatINR(Number(ad.cpr)) : "—"}</span></div>
                      <div><span className="text-muted-foreground">Reach</span> <span className="font-medium block">{formatNumber(ad.reach)}</span></div>
                      <div><span className="text-muted-foreground">Freq</span> <span className="font-medium block">{Number(ad.frequency).toFixed(2)}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function DailyData() {
  const queryClient = useQueryClient();
  const [editRow, setEditRow] = useState<AdRow | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Sales edit state
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const [salesDate, setSalesDate] = useState("");
  const [salesTotal, setSalesTotal] = useState("");
  const [salesGpay, setSalesGpay] = useState("");
  const [salesUsd, setSalesUsd] = useState("");
  const [salesEur, setSalesEur] = useState("");
  const [usdRate, setUsdRate] = useState(0);
  const [eurRate, setEurRate] = useState(0);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [editSalesId, setEditSalesId] = useState<string | null>(null);

  const { data: productConfig } = useQuery({
    queryKey: ["product-config"],
    queryFn: async () => {
      const { data } = await supabase.from("product_config").select("*").eq("is_active", true).limit(1).single();
      return data;
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Sync last 30 days to catch all missing data
      const now = new Date();
      const today = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
        .toISOString()
        .split("T")[0];
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60_000)
        .toISOString()
        .split("T")[0];

      const { data, error } = await supabase.functions.invoke("sync-facebook-ads", {
        body: { since: monthAgo, until: today },
      });

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ad-daily"] }),
        queryClient.invalidateQueries({ queryKey: ["ad-data-all"] }),
        queryClient.invalidateQueries({ queryKey: ["ad-breakdown"] }),
      ]);

      if (data?.synced > 0 || data?.breakdown_synced > 0) {
        toast.success(`Synced! Account: ${data.synced} days, Campaigns: ${data.breakdown_synced} entries`);
      } else {
        toast.info(data?.message || "No new data found");
      }
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const { data: rows, isLoading } = useQuery({
    queryKey: ["ad-daily"],
    queryFn: async () => {
      const { data } = await supabase.from("ad_daily_data").select("*").order("date", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
  });

  const { data: salesData } = useQuery({
    queryKey: ["sales-all"],
    queryFn: async () => {
      const { data } = await supabase.from("sales_entries").select("*");
      return data ?? [];
    },
    refetchInterval: 10 * 60 * 1000,
  });

  const { data: expensesData } = useQuery({
    queryKey: ["expenses-all"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*");
      return data ?? [];
    },
    refetchInterval: 10 * 60 * 1000,
  });

  const { data: breakdownData } = useQuery({
    queryKey: ["ad-breakdown"],
    queryFn: async () => {
      const { data } = await supabase.from("ad_breakdown").select("*").order("date", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 10 * 60 * 1000,
  });

  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  const getBreakdownForDate = (date: string) => ({
    campaigns: breakdownData?.filter((b) => b.date === date && b.level === "campaign") ?? [],
    adsets: breakdownData?.filter((b) => b.date === date && b.level === "adset") ?? [],
    ads: breakdownData?.filter((b) => b.date === date && b.level === "ad") ?? [],
  });

  useEffect(() => {
    const channel = supabase
      .channel("ad-daily-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_daily_data" }, () => {
        queryClient.invalidateQueries({ queryKey: ["ad-daily"] });
        queryClient.invalidateQueries({ queryKey: ["ad-data-all"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_entries" }, () => {
        queryClient.invalidateQueries({ queryKey: ["sales-all"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const upsertMutation = useMutation({
    mutationFn: async (row: AdRow & { id?: string }) => {
      if (row.id) {
        const { error } = await supabase.from("ad_daily_data").update({ ...row, is_manual_override: true }).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ad_daily_data").insert({ ...row, is_manual_override: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-daily"] });
      setDialogOpen(false);
      setEditRow(null);
      setEditId(null);
      toast.success("Data saved!");
    },
    onError: (e) => toast.error(e.message),
  });

  const salesMutation = useMutation({
    mutationFn: async (params: {
      date: string; quantity: number; gpayQty: number;
      usdQty: number; eurQty: number; usdRate: number; eurRate: number;
      existingId?: string | null;
    }) => {
      const price = Number(productConfig?.price || 499);
      const gstRate = Number(productConfig?.gst_rate_percent || 18) / 100;
      const amountPerSale = price * (1 + gstRate);
      const inrQty = params.quantity - params.gpayQty - params.usdQty - params.eurQty;
      const totalAmountInr = inrQty * amountPerSale + params.gpayQty * amountPerSale;
      const usdAmountInr = params.usdQty * 7 * params.usdRate; // $7 per sale × rate
      const eurAmountInr = params.eurQty * 7 * params.eurRate; // €7 per sale × rate
      const gstCollected = price * gstRate * (params.quantity - params.usdQty - params.eurQty);

      const record = {
        date: params.date,
        quantity: params.quantity,
        gpay_quantity: params.gpayQty,
        usd_quantity: params.usdQty,
        eur_quantity: params.eurQty,
        usd_rate: params.usdRate,
        eur_rate: params.eurRate,
        usd_amount_inr: usdAmountInr,
        eur_amount_inr: eurAmountInr,
        amount_per_sale: amountPerSale,
        total_amount: totalAmountInr + usdAmountInr + eurAmountInr,
        gst_collected: gstCollected,
      };

      if (params.existingId) {
        const { error } = await supabase.from("sales_entries").update(record).eq("id", params.existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sales_entries").insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-all"] });
      setSalesDialogOpen(false);
      toast.success("Sales saved!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fetchExchangeRates = async (date: string) => {
    setFetchingRates(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-exchange-rates", {
        body: { date },
      });
      if (error) throw error;
      setUsdRate(data.usd_to_inr || 0);
      setEurRate(data.eur_to_inr || 0);
    } catch (e: any) {
      toast.error("Rate fetch failed: " + (e.message || "Unknown error"));
    } finally {
      setFetchingRates(false);
    }
  };

  const openSalesDialog = (date: string) => {
    const existing = salesData?.find((s) => s.date === date);
    setSalesDate(date);
    setSalesTotal(String(existing?.quantity ?? 0));
    setSalesGpay(String(existing?.gpay_quantity ?? 0));
    setSalesUsd(String(existing?.usd_quantity ?? 0));
    setSalesEur(String(existing?.eur_quantity ?? 0));
    setUsdRate(Number(existing?.usd_rate ?? 0));
    setEurRate(Number(existing?.eur_rate ?? 0));
    setEditSalesId(existing?.id ?? null);
    setSalesDialogOpen(true);
    fetchExchangeRates(date);
  };

  const handleSaveSales = () => {
    const total = Number(salesTotal);
    const gpay = Number(salesGpay || 0);
    const usd = Number(salesUsd || 0);
    const eur = Number(salesEur || 0);
    if (total < 0 || gpay < 0 || usd < 0 || eur < 0 || (gpay + usd + eur) > total) {
      toast.error("Invalid values — GPay + USD + EUR cannot exceed total");
      return;
    }
    salesMutation.mutate({
      date: salesDate, quantity: total, gpayQty: gpay,
      usdQty: usd, eurQty: eur, usdRate, eurRate,
      existingId: editSalesId,
    });
  };

  const handleSave = () => {
    if (!editRow) return;
    upsertMutation.mutate(editId ? { ...editRow, id: editId } : editRow);
  };

  const fields: { key: keyof AdRow; label: string; type?: string }[] = [
    { key: "date", label: "Date", type: "date" },
    { key: "ad_spend", label: "Ad Spend (₹)", type: "number" },
    { key: "impressions", label: "Impressions", type: "number" },
    { key: "clicks", label: "Clicks", type: "number" },
    { key: "ctr", label: "CTR (%)", type: "number" },
    { key: "cpl", label: "CPL (₹)", type: "number" },
    { key: "cpr", label: "CPR (₹)", type: "number" },
    { key: "cpc", label: "CPC (₹)", type: "number" },
    { key: "three_second_views", label: "3s Views", type: "number" },
    { key: "fifty_percent_views", label: "50% Views", type: "number" },
    { key: "ninety_five_percent_views", label: "95% Views", type: "number" },
    { key: "frequency", label: "Frequency", type: "number" },
    { key: "reach", label: "Reach", type: "number" },
    { key: "conversions", label: "Conversions", type: "number" },
  ];

  // Helper: get sales for a date
  const getSalesForDate = (date: string) => salesData?.find((s) => s.date === date);
  const getExpensesForDate = (date: string) =>
    expensesData?.filter((e) => e.date === date).reduce((s, e) => s + Number(e.amount), 0) ?? 0;

  // Compute daily metrics
  const computeDayMetrics = (adRow: NonNullable<typeof rows>[0]) => {
    const sale = getSalesForDate(adRow.date);
    const qty = sale?.quantity ?? 0;
    const gpay = sale?.gpay_quantity ?? 0;
    const usdQty = sale?.usd_quantity ?? 0;
    const eurQty = sale?.eur_quantity ?? 0;
    const platformQty = qty - gpay - usdQty - eurQty;
    const spend = Number(adRow.ad_spend);
    const adGst = spend * 0.18;
    const spendWithGst = spend + adGst;
    const expenses = getExpensesForDate(adRow.date);

    const price = Number(productConfig?.price || 499);
    const gstRate = Number(productConfig?.gst_rate_percent || 18) / 100;
    const amountPerSale = price * (1 + gstRate);

    const inrRevenue = (platformQty + gpay) * amountPerSale;
    const usdAmountInr = Number(sale?.usd_amount_inr ?? 0);
    const eurAmountInr = Number(sale?.eur_amount_inr ?? 0);
    const totalRevenue = inrRevenue + usdAmountInr + eurAmountInr;

    // Commission: 2.5% on platform INR sales only (not GPay)
    const commission = platformQty * amountPerSale * COMMISSION_RATE;
    // Also 2.5% on USD/EUR after conversion
    const usdCommission = usdAmountInr * COMMISSION_RATE;
    const eurCommission = eurAmountInr * COMMISSION_RATE;
    const totalCommission = commission + usdCommission + eurCommission;

    const gstCollected = Number(sale?.gst_collected ?? 0);
    const gstPayable = gstCollected - adGst; // GST collected minus ad GST input credit
    const profit = totalRevenue - totalCommission - spendWithGst - expenses - gstPayable;
    const cac = qty > 0 ? spendWithGst / qty : 0;

    return { qty, gpay, usdQty, eurQty, totalRevenue, totalCommission, gst: gstCollected, gstPayable, profit, cac, spend: spendWithGst, usdAmountInr, eurAmountInr };
  };

  // Yearly totals
  const yearlyTotals = (() => {
    const totalSpend = rows?.reduce((s, r) => s + Number(r.ad_spend), 0) ?? 0;
    const totalSales = salesData?.reduce((s, r) => s + r.quantity, 0) ?? 0;
    const totalGpay = salesData?.reduce((s, r) => s + (r.gpay_quantity ?? 0), 0) ?? 0;
    const totalUsd = salesData?.reduce((s, r) => s + (r.usd_quantity ?? 0), 0) ?? 0;
    const totalEur = salesData?.reduce((s, r) => s + (r.eur_quantity ?? 0), 0) ?? 0;
    const totalRevenue = salesData?.reduce((s, r) => s + Number(r.total_amount), 0) ?? 0;
    const totalGST = salesData?.reduce((s, r) => s + Number(r.gst_collected), 0) ?? 0;
    const totalExpenses = expensesData?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
    const platformQty = totalSales - totalGpay - totalUsd - totalEur;
    const usdAmountTotal = salesData?.reduce((s, r) => s + Number(r.usd_amount_inr ?? 0), 0) ?? 0;
    const eurAmountTotal = salesData?.reduce((s, r) => s + Number(r.eur_amount_inr ?? 0), 0) ?? 0;
    const price = Number(productConfig?.price || 499);
    const gstRate = Number(productConfig?.gst_rate_percent || 18) / 100;
    const amountPerSale = price * (1 + gstRate);
    const commission = platformQty * amountPerSale * COMMISSION_RATE + (usdAmountTotal + eurAmountTotal) * COMMISSION_RATE;
    const profit = totalRevenue - commission - totalSpend - totalExpenses - totalGST;
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const cac = totalSales > 0 ? totalSpend / totalSales : 0;

    return { totalSpend, totalSales, totalGpay, totalUsd, totalEur, totalRevenue, totalGST, totalExpenses, commission, profit, roas, cac };
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Ad Data</h1>
          <p className="text-sm text-muted-foreground">ഓരോ ദിവസത്തെയും Facebook Ad metrics & Sales</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={syncing} className="gap-1.5">
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync FB Ads"}
            </Button>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditRow({ ...defaultRow }); setEditId(null); }} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Entry
              </Button>
            </DialogTrigger>
          </div>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit" : "Add"} Daily Data</DialogTitle>
            </DialogHeader>
            {editRow && (
              <div className="grid grid-cols-2 gap-4">
                {fields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      type={f.type || "text"}
                      value={editRow[f.key]}
                      onChange={(e) =>
                        setEditRow({
                          ...editRow,
                          [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
                        })
                      }
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <Button onClick={handleSave} className="w-full" disabled={upsertMutation.isPending}>
                    {upsertMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Yearly Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard icon={<IndianRupee className="h-3.5 w-3.5" />} label="Total Ad Spend" value={formatINR(yearlyTotals.totalSpend)} variant="destructive" />
        <MetricCard icon={<ShoppingCart className="h-3.5 w-3.5" />} label="Total Sales" value={`${yearlyTotals.totalSales}`} variant="success" subtitle={`GPay: ${yearlyTotals.totalGpay} • USD: ${yearlyTotals.totalUsd} • EUR: ${yearlyTotals.totalEur}`} />
        <MetricCard icon={<Wallet className="h-3.5 w-3.5" />} label="Total Revenue" value={formatINR(yearlyTotals.totalRevenue)} variant="primary" subtitle={`Comm: -${formatINR(yearlyTotals.commission)}`} />
        <MetricCard icon={yearlyTotals.profit >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />} label="Net Profit" value={formatINR(yearlyTotals.profit)} variant={yearlyTotals.profit >= 0 ? "success" : "destructive"} />
        <MetricCard icon={<Target className="h-3.5 w-3.5" />} label="ROAS" value={`${yearlyTotals.roas.toFixed(2)}x`} variant="primary" />
        <MetricCard icon={<Percent className="h-3.5 w-3.5" />} label="Avg CAC" value={formatINR(yearlyTotals.cac)} variant="warning" />
      </div>

      {/* Sales Edit Dialog */}
      <Dialog open={salesDialogOpen} onOpenChange={setSalesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Sales — {salesDate}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Total Sales</Label>
                <Input type="number" value={salesTotal} onChange={(e) => setSalesTotal(e.target.value)} autoFocus />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">GPay (no commission)</Label>
                <Input type="number" value={salesGpay} onChange={(e) => setSalesGpay(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><DollarSign className="h-3 w-3" /> USD Sales ($7)</Label>
                <Input type="number" value={salesUsd} onChange={(e) => setSalesUsd(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Euro className="h-3 w-3" /> EUR Sales (€7)</Label>
                <Input type="number" value={salesEur} onChange={(e) => setSalesEur(e.target.value)} />
              </div>
            </div>
            <div className="bg-muted/60 rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">USD Rate</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">₹{usdRate.toFixed(2)}</span>
                  {fetchingRates && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">EUR Rate</span>
                <span className="font-semibold">₹{eurRate.toFixed(2)}</span>
              </div>
              {Number(salesUsd || 0) > 0 && (
                <div className="flex justify-between text-primary">
                  <span>USD → INR ({salesUsd} × $7 × {usdRate.toFixed(2)})</span>
                  <span className="font-semibold">{formatINR(Number(salesUsd) * 7 * usdRate)}</span>
                </div>
              )}
              {Number(salesEur || 0) > 0 && (
                <div className="flex justify-between text-primary">
                  <span>EUR → INR ({salesEur} × €7 × {eurRate.toFixed(2)})</span>
                  <span className="font-semibold">{formatINR(Number(salesEur) * 7 * eurRate)}</span>
                </div>
              )}
            </div>
            <Button onClick={handleSaveSales} disabled={salesMutation.isPending}>
              {salesMutation.isPending ? "Saving..." : editSalesId ? "Update Sales" : "Add Sales"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Daily Data Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : rows && rows.length > 0 ? (
          rows.map((r) => {
            const m = computeDayMetrics(r);
            const sale = getSalesForDate(r.date);
            return (
              <Card key={r.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Date Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{r.date}</span>
                    {m.qty > 0 && (
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {m.qty} sales
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => openSalesDialog(r.date)}>
                      <ShoppingCart className="h-3 w-3" /> Sales
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => {
                        setEditRow({
                          date: r.date, ad_spend: Number(r.ad_spend), impressions: r.impressions,
                          clicks: r.clicks, ctr: Number(r.ctr), cpl: Number(r.cpl), cpr: Number(r.cpr),
                          cpc: Number(r.cpc), three_second_views: r.three_second_views,
                          fifty_percent_views: r.fifty_percent_views,
                          ninety_five_percent_views: r.ninety_five_percent_views,
                          frequency: Number(r.frequency), reach: r.reach, conversions: r.conversions,
                        });
                        setEditId(r.id);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4">
                  {/* Top metrics row: Profit, Revenue, Spend, CAC */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <MiniMetric label="Profit" value={formatINR(m.profit)} color={m.profit >= 0 ? "text-green-600" : "text-destructive"} />
                    <MiniMetric label="Revenue" value={formatINR(m.totalRevenue)} color="text-primary" />
                    <MiniMetric label="Ad Spend" value={formatINR(m.spend)} color="text-destructive" />
                    <MiniMetric label="CAC" value={m.cac > 0 ? formatINR(m.cac) : "—"} color="text-amber-600" />
                  </div>

                  {/* Sales breakdown */}
                  {m.qty > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {m.gpay > 0 && <Badge variant="outline" className="text-[10px]">GPay: {m.gpay}</Badge>}
                      {m.usdQty > 0 && <Badge variant="outline" className="text-[10px]">USD: {m.usdQty} ({formatINR(m.usdAmountInr)})</Badge>}
                      {m.eurQty > 0 && <Badge variant="outline" className="text-[10px]">EUR: {m.eurQty} ({formatINR(m.eurAmountInr)})</Badge>}
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Comm: -{formatINR(m.totalCommission)}</Badge>
                      {m.gst > 0 && <Badge variant="outline" className="text-[10px] text-amber-600">GST: {formatINR(m.gst)}</Badge>}
                    </div>
                  )}

                  {/* Ad metrics grid */}
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-x-4 gap-y-1.5 text-xs">
                    <AdMetric label="Impressions" value={formatNumber(r.impressions)} />
                    <AdMetric label="Clicks" value={formatNumber(r.clicks)} />
                    <AdMetric label="CTR" value={formatPercent(Number(r.ctr))} />
                    <AdMetric label="CPC" value={formatINR(Number(r.cpc))} />
                    <AdMetric label="Reach" value={formatNumber(r.reach)} />
                    <AdMetric label="Frequency" value={Number(r.frequency).toFixed(2)} />
                    <AdMetric label="Conv" value={String(r.conversions)} />
                  </div>

                  {/* Campaign Breakdown Dropdown — hierarchical: Campaign > Ad Sets > Ads */}
                  {(() => {
                    const bd = getBreakdownForDate(r.date);
                    if (bd.campaigns.length === 0) return null;
                    const isExpanded = expandedDates.has(r.date);
                    return (
                      <Collapsible open={isExpanded} onOpenChange={() => toggleDate(r.date)} className="mt-3">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            <Megaphone className="h-3 w-3" />
                            {bd.campaigns.length} Campaigns • {bd.adsets.length} Ad Sets • {bd.ads.length} Ads
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2">
                          {bd.campaigns.map((campaign) => {
                            const campaignAdsets = bd.adsets.filter((a) => a.campaign_id === campaign.campaign_id);
                            return (
                              <CampaignTree key={campaign.id} campaign={campaign} adsets={campaignAdsets} ads={bd.ads} />
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })()}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground">
              No data yet. Add your first entry or sync from Facebook!
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Sub-components
function MetricCard({ icon, label, value, variant, subtitle }: {
  icon: React.ReactNode; label: string; value: string;
  variant: "destructive" | "success" | "primary" | "warning"; subtitle?: string;
}) {
  const colorMap = {
    destructive: "text-destructive",
    success: "text-green-600",
    primary: "text-primary",
    warning: "text-amber-600",
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-1 p-3">
        <CardTitle className="text-[10px] font-medium text-muted-foreground">{label}</CardTitle>
        <span className={colorMap[variant]}>{icon}</span>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className={`text-sm font-bold ${colorMap[variant]}`}>{value}</p>
        {subtitle && <p className="text-[9px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

function AdMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[9px]">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

