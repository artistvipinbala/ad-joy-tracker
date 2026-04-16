import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatINR } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Expenses() {
  const queryClient = useQueryClient();

  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [saleQty, setSaleQty] = useState(1);
  const [saleAmount, setSaleAmount] = useState(0);
  const [saleGST, setSaleGST] = useState(0);
  const [saleNotes, setSaleNotes] = useState("");

  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expAmount, setExpAmount] = useState(0);
  const [expCatId, setExpCatId] = useState("");
  const [expDesc, setExpDesc] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("expense_categories").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["sales-all"],
    queryFn: async () => {
      const { data } = await supabase.from("sales_entries").select("*").order("date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ["expenses-all"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*, expense_categories(name)").order("date", { ascending: false });
      return data ?? [];
    },
  });

  const addSale = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sales_entries").insert({
        date: saleDate, quantity: saleQty, amount_per_sale: saleAmount,
        total_amount: saleQty * saleAmount, gst_collected: saleGST, notes: saleNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-all"] });
      setSaleQty(1); setSaleAmount(0); setSaleGST(0); setSaleNotes("");
      toast.success("Sale added!");
    },
    onError: (e) => toast.error(e.message),
  });

  const addExpense = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").insert({
        date: expDate, category_id: expCatId || null, amount: expAmount, description: expDesc || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses-all"] });
      setExpAmount(0); setExpDesc("");
      toast.success("Expense added!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses-all"] });
      toast.success("Expense deleted!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-all"] });
      toast.success("Sale deleted!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Expenses & Sales</h1>
        <p className="text-sm text-muted-foreground">TagMango sales & other expenses manually add ചെയ്യുക</p>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">TagMango Sales</TabsTrigger>
          <TabsTrigger value="expenses">Other Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Add Sale Entry</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" value={saleQty} onChange={(e) => setSaleQty(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Amount/Sale (₹)</Label>
                  <Input type="number" value={saleAmount} onChange={(e) => setSaleAmount(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">GST Collected (₹)</Label>
                  <Input type="number" value={saleGST} onChange={(e) => setSaleGST(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Input value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <Button className="mt-4" onClick={() => addSale.mutate()} disabled={addSale.isPending}>
                <Plus className="h-4 w-4 mr-1" /> Add Sale
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Amount/Sale</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>GST</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales && sales.length > 0 ? sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.date}</TableCell>
                      <TableCell>{s.quantity}</TableCell>
                      <TableCell>{formatINR(Number(s.amount_per_sale))}</TableCell>
                      <TableCell className="font-medium">{formatINR(Number(s.total_amount))}</TableCell>
                      <TableCell>{formatINR(Number(s.gst_collected))}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{s.notes || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm("Delete this sale?")) deleteSale.mutate(s.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No sales yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Add Expense</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={expCatId} onValueChange={setExpCatId}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input type="number" value={expAmount} onChange={(e) => setExpAmount(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="What for?" />
                </div>
              </div>
              <Button className="mt-4" onClick={() => addExpense.mutate()} disabled={addExpense.isPending}>
                <Plus className="h-4 w-4 mr-1" /> Add Expense
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses && expenses.length > 0 ? expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.date}</TableCell>
                      <TableCell>{(e as any).expense_categories?.name ?? "-"}</TableCell>
                      <TableCell className="font-medium">{formatINR(Number(e.amount))}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{e.description || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm("Delete this expense?")) deleteExpense.mutate(e.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No expenses yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}