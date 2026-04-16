import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatINR } from "@/lib/format";
import { ChevronDown, Calculator } from "lucide-react";
import { useState } from "react";

interface ProfitBreakdownProps {
  totalRevenue: number;
  totalSalesCount: number;
  totalGpayCount: number;
  totalUsdCount: number;
  totalEurCount: number;
  platformCount: number;
  amountPerSale: number;
  usdAmountTotal: number;
  eurAmountTotal: number;
  commissionDeduction: number;
  totalSpendRaw: number;
  adGst: number;
  totalSpendWithGst: number;
  totalGST: number;
  gstPayable: number;
  totalExpenses: number;
  netProfit: number;
  price: number;
  gstRate: number;
  commissionRate: number;
}

export default function ProfitBreakdown({
  totalRevenue,
  totalSalesCount,
  totalGpayCount,
  totalUsdCount,
  totalEurCount,
  platformCount,
  amountPerSale,
  usdAmountTotal,
  eurAmountTotal,
  commissionDeduction,
  totalSpendRaw,
  adGst,
  totalSpendWithGst,
  totalGST,
  gstPayable,
  totalExpenses,
  netProfit,
  price,
  gstRate,
  commissionRate,
}: ProfitBreakdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-primary/20">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">📖 How is Net Profit calculated? (Step by Step)</CardTitle>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 text-sm">

            {/* Step 1 */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-2">
              <h3 className="font-bold text-green-600 flex items-center gap-1">✅ Step 1: How much money did we EARN?</h3>
              <p className="text-muted-foreground text-xs">This is the total money customers paid us (including GST tax).</p>
              <div className="bg-background/50 rounded p-3 space-y-1 text-xs font-mono">
                <div>We sold <strong>{totalSalesCount}</strong> items</div>
                <div>Each item price = ₹{price} + {(gstRate * 100)}% GST = <strong>{formatINR(amountPerSale)}</strong></div>
                {totalUsdCount > 0 && <div>+ {totalUsdCount} USD sales = {formatINR(usdAmountTotal)}</div>}
                {totalEurCount > 0 && <div>+ {totalEurCount} EUR sales = {formatINR(eurAmountTotal)}</div>}
                <div className="border-t border-border pt-1 mt-1 text-green-600 font-bold">
                  💰 Total Revenue = {formatINR(totalRevenue)}
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2">
              <h3 className="font-bold text-amber-600 flex items-center gap-1">🏦 Step 2: How much COMMISSION does the platform take?</h3>
              <p className="text-muted-foreground text-xs">
                The payment platform charges {(commissionRate * 100)}% on each sale. But GPay payments have NO commission! 🎉
              </p>
              <div className="bg-background/50 rounded p-3 space-y-1 text-xs font-mono">
                <div>Platform sales (charged {(commissionRate * 100)}%): <strong>{platformCount}</strong> sales</div>
                <div>→ {platformCount} × {formatINR(amountPerSale)} × {(commissionRate * 100)}% = {formatINR(platformCount * amountPerSale * commissionRate)}</div>
                {(usdAmountTotal + eurAmountTotal) > 0 && (
                  <div>→ International commission: ({formatINR(usdAmountTotal)} + {formatINR(eurAmountTotal)}) × {(commissionRate * 100)}% = {formatINR((usdAmountTotal + eurAmountTotal) * commissionRate)}</div>
                )}
                <div>GPay sales (FREE! No commission): <strong>{totalGpayCount}</strong> sales = ₹0</div>
                <div className="border-t border-border pt-1 mt-1 text-amber-600 font-bold">
                  💸 Total Commission = -{formatINR(commissionDeduction)}
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
              <h3 className="font-bold text-destructive flex items-center gap-1">📢 Step 3: How much did we SPEND on Ads?</h3>
              <p className="text-muted-foreground text-xs">
                Facebook charges us for showing ads. We also pay 18% GST on the ad cost.
              </p>
              <div className="bg-background/50 rounded p-3 space-y-1 text-xs font-mono">
                <div>Ad Spend (what Facebook charged) = {formatINR(totalSpendRaw)}</div>
                <div>+ 18% GST on ads = {formatINR(totalSpendRaw)} × 18% = {formatINR(adGst)}</div>
                <div className="border-t border-border pt-1 mt-1 text-destructive font-bold">
                  📢 Total Ad Cost = {formatINR(totalSpendRaw)} + {formatINR(adGst)} = -{formatINR(totalSpendWithGst)}
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 space-y-2">
              <h3 className="font-bold text-orange-600 flex items-center gap-1">🧾 Step 4: How much GST do we PAY to the government?</h3>
              <p className="text-muted-foreground text-xs">
                We collected GST from customers, but we can subtract the GST we paid on ads (this is called "Input Credit").
              </p>
              <div className="bg-background/50 rounded p-3 space-y-1 text-xs font-mono">
                <div>GST we collected from customers = {formatINR(totalGST)}</div>
                <div>GST we paid on ads (we get this back!) = -{formatINR(adGst)}</div>
                <div className="border-t border-border pt-1 mt-1 text-orange-600 font-bold">
                  🧾 GST Payable = {formatINR(totalGST)} - {formatINR(adGst)} = -{formatINR(gstPayable)}
                </div>
              </div>
            </div>

            {/* Step 5 */}
            {totalExpenses > 0 && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 space-y-2">
                <h3 className="font-bold text-purple-600 flex items-center gap-1">🛒 Step 5: Other Expenses</h3>
                <p className="text-muted-foreground text-xs">
                  Any other money we spent (tools, services, etc.)
                </p>
                <div className="bg-background/50 rounded p-3 text-xs font-mono text-purple-600 font-bold">
                  🛒 Other Expenses = -{formatINR(totalExpenses)}
                </div>
              </div>
            )}

            {/* Final Answer */}
            <div className={`border-2 rounded-lg p-4 space-y-2 ${netProfit >= 0 ? "bg-green-500/10 border-green-500/40" : "bg-destructive/10 border-destructive/40"}`}>
              <h3 className={`font-bold text-base flex items-center gap-1 ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                🎯 Final Answer: Net Profit
              </h3>
              <div className="bg-background/50 rounded p-3 space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span>💰 Total Revenue (what we earned)</span>
                  <span className="text-green-600 font-bold">+{formatINR(totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>💸 Commission (platform fees)</span>
                  <span className="text-amber-600">-{formatINR(commissionDeduction)}</span>
                </div>
                <div className="flex justify-between">
                  <span>📢 Ad Spend with GST (advertising cost)</span>
                  <span className="text-destructive">-{formatINR(totalSpendWithGst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>🧾 GST Payable (tax to government)</span>
                  <span className="text-orange-600">-{formatINR(gstPayable)}</span>
                </div>
                {totalExpenses > 0 && (
                  <div className="flex justify-between">
                    <span>🛒 Other Expenses</span>
                    <span className="text-purple-600">-{formatINR(totalExpenses)}</span>
                  </div>
                )}
                <div className={`border-t-2 border-border pt-2 mt-2 flex justify-between text-sm font-bold ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                  <span>🎯 Net Profit</span>
                  <span>{formatINR(netProfit)}</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Simple formula: <strong>Revenue - Commission - Ad Cost - GST Payable - Expenses = Profit</strong>
              </p>
            </div>

          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
