import { useQuery } from "@tanstack/react-query";
import { IndianRupee, TrendingUp, Clock, CreditCard } from "lucide-react";
import api from "@/lib/api";
import type { BillingUsage, PaymentHistory } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import UsageGauge from "./UsageGauge";

const PLACEHOLDER_HISTORY: PaymentHistory[] = [
  { id: "1", date: "2025-03-01", amount: 149, status: "paid", invoice: "INV-2025-003" },
  { id: "2", date: "2025-02-01", amount: 129, status: "paid", invoice: "INV-2025-002" },
  { id: "3", date: "2025-01-01", amount: 99, status: "paid", invoice: "INV-2025-001" },
];

export default function BillingDashboard() {
  const { data: billing, isLoading } = useQuery<BillingUsage>({
    queryKey: ["billing"],
    queryFn: async () => {
      const { data } = await api.get<BillingUsage>("/billing/usage");
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  const totalGb = billing ? billing.total_bytes / (1024 ** 3) : 0;
  const maxGb = 100;
  const percentage = (totalGb / maxGb) * 100;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Storage Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <UsageGauge usedGb={billing?.gb_formatted ?? "0 GB"} percentage={percentage} />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Invoice</CardTitle>
            <IndianRupee className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-4">
            <p className="text-4xl font-bold text-foreground">
              ₹{billing?.estimated_bill_inr?.toFixed(2) ?? "0.00"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{billing?.currency ?? "INR"} · This billing cycle</p>
            <Button className="mt-6 w-full bg-razorpay text-razorpay-foreground hover:bg-razorpay/90">
              <CreditCard className="mr-2 h-4 w-4" />
              Pay Now with Razorpay
            </Button>
          </CardContent>
        </Card>

        <Card className="glass sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plan Details</CardTitle>
            <Clock className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <Badge variant="secondary">Pro</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Storage Limit</span>
              <span className="text-sm font-medium text-foreground">{maxGb} GB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Billing Cycle</span>
              <span className="text-sm font-medium text-foreground">Monthly</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PLACEHOLDER_HISTORY.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{item.invoice}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-foreground">₹{item.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        {item.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
