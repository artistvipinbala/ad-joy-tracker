import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState(0);
  const [prodGST, setProdGST] = useState(18);
  const [catName, setCatName] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("product_config").select("*").order("created_at");
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("expense_categories").select("*").order("name");
      return data ?? [];
    },
  });

  const addProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_config").insert({
        product_name: prodName,
        price: prodPrice,
        gst_rate_percent: prodGST,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setProdName(""); setProdPrice(0); setProdGST(18);
      toast.success("Product added!");
    },
    onError: (e) => toast.error(e.message),
  });

  const addCategory = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expense_categories").insert({ name: catName });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      setCatName("");
      toast.success("Category added!");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Product pricing, GST rates & expense categories</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Products & GST</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Product Name</Label>
                <Input value={prodName} onChange={(e) => setProdName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Price (₹)</Label>
                <Input type="number" value={prodPrice} onChange={(e) => setProdPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">GST %</Label>
                <Input type="number" value={prodGST} onChange={(e) => setProdGST(Number(e.target.value))} />
              </div>
            </div>
            <Button size="sm" onClick={() => addProduct.mutate()} disabled={!prodName || addProduct.isPending}>
              <Plus className="h-3 w-3 mr-1" /> Add Product
            </Button>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>GST %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.product_name}</TableCell>
                    <TableCell>₹{Number(p.price).toLocaleString()}</TableCell>
                    <TableCell>{Number(p.gst_rate_percent)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Expense Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Category name" />
              <Button size="sm" onClick={() => addCategory.mutate()} disabled={!catName || addCategory.isPending}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-1">
              {categories?.map((c) => (
                <div key={c.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/50 text-sm">
                  {c.name}
                  {c.description && <span className="text-xs text-muted-foreground">— {c.description}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Facebook API Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Facebook Marketing API connect ചെയ്ത് automatic ആയി ad data fetch ചെയ്യാൻ, Settings-ൽ Facebook Access Token & Ad Account ID add ചെയ്യണം.
          </p>
          <p className="text-xs text-muted-foreground">
            Coming soon — edge function setup required. ഇപ്പോൾ Daily Data page-ൽ manually add ചെയ്യാം.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
