import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

const defaultRow = {
  date: new Date().toISOString().split("T")[0],
  ad_spend: 0, impressions: 0, clicks: 0, ctr: 0, cpl: 0, cpr: 0, cpc: 0,
  three_second_views: 0, fifty_percent_views: 0, ninety_five_percent_views: 0,
  frequency: 0, reach: 0, conversions: 0,
};

type AdRow = typeof defaultRow;

export default function DailyData() {
  const queryClient = useQueryClient();
  const [editRow, setEditRow] = useState<AdRow | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["ad-daily"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ad_daily_data")
        .select("*")
        .order("date", { ascending: false });
      return data ?? [];
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["ad-data-all"] });
      setDialogOpen(false);
      setEditRow(null);
      setEditId(null);
      toast.success("Data saved!");
    },
    onError: (e) => toast.error(e.message),
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily Ad Data</h1>
          <p className="text-sm text-muted-foreground">ഓരോ ദിവസത്തെയും Facebook Ad metrics</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditRow({ ...defaultRow }); setEditId(null); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Entry
            </Button>
          </DialogTrigger>
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

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Spend</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>CPL</TableHead>
                  <TableHead>CPR</TableHead>
                  <TableHead>CPC</TableHead>
                  <TableHead>3s Views</TableHead>
                  <TableHead>50%</TableHead>
                  <TableHead>95%</TableHead>
                  <TableHead>Freq</TableHead>
                  <TableHead>Reach</TableHead>
                  <TableHead>Conv</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={15} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : rows && rows.length > 0 ? (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium whitespace-nowrap">{r.date}</TableCell>
                      <TableCell>{formatINR(Number(r.ad_spend))}</TableCell>
                      <TableCell>{formatNumber(r.impressions)}</TableCell>
                      <TableCell>{formatNumber(r.clicks)}</TableCell>
                      <TableCell>{formatPercent(Number(r.ctr))}</TableCell>
                      <TableCell>{formatINR(Number(r.cpl))}</TableCell>
                      <TableCell>{formatINR(Number(r.cpr))}</TableCell>
                      <TableCell>{formatINR(Number(r.cpc))}</TableCell>
                      <TableCell>{formatNumber(r.three_second_views)}</TableCell>
                      <TableCell>{formatNumber(r.fifty_percent_views)}</TableCell>
                      <TableCell>{formatNumber(r.ninety_five_percent_views)}</TableCell>
                      <TableCell>{Number(r.frequency).toFixed(2)}</TableCell>
                      <TableCell>{formatNumber(r.reach)}</TableCell>
                      <TableCell>{r.conversions}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditRow({
                              date: r.date,
                              ad_spend: Number(r.ad_spend),
                              impressions: r.impressions,
                              clicks: r.clicks,
                              ctr: Number(r.ctr),
                              cpl: Number(r.cpl),
                              cpr: Number(r.cpr),
                              cpc: Number(r.cpc),
                              three_second_views: r.three_second_views,
                              fifty_percent_views: r.fifty_percent_views,
                              ninety_five_percent_views: r.ninety_five_percent_views,
                              frequency: Number(r.frequency),
                              reach: r.reach,
                              conversions: r.conversions,
                            });
                            setEditId(r.id);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={15} className="text-center py-8 text-muted-foreground">No data yet. Add your first entry!</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
