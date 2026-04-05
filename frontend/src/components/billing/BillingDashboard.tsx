import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IndianRupee, TrendingUp, Clock, CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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

interface RazorpayOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key: string;
}

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export default function BillingDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: billing, isLoading, error } = useQuery<BillingUsage>({
    queryKey: ["billing"],
    queryFn: async () => {
      const { data } = await api.get<BillingUsage>("/billing/usage");
      return data;
    },
    staleTime: 60000, // 1 minute
    retry: 2,
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

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-destructive">Failed to load billing data. Please try again later.</p>
      </div>
    );
  }

  /**
   * STEP 1: ORDER CREATION (The Handshake)
   * Calls POST /billing/pay to create a Razorpay order
   */
  const handlePayNow = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Step 1: Create order with backend
      const { data: orderData } = await api.post<RazorpayOrderResponse>("/billing/pay", {});

      if (!orderData.order_id) {
        throw new Error("No order ID received from server");
      }

      // Step 2: Ensure Razorpay script is loaded
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        throw new Error("Razorpay SDK not loaded. Please refresh the page and try again.");
      }

      /**
       * STEP 2: RAZORPAY MODAL INTEGRATION
       * Open checkout with backend-provided data
       */
      const options = {
        key: orderData.key, // Razorpay Key ID from backend
        amount: orderData.amount, // Amount in Paise
        currency: orderData.currency, // INR
        name: "Nexus Storage",
        description: "Cloud Storage Billing Payment",
        order_id: orderData.order_id,
        handler: async (response: RazorpayPaymentResponse) => {
          try {
            /**
             * STEP 3: SERVER-SIDE VERIFICATION (CRITICAL)
             * Verify HMAC signature to prevent fraud
             */
            const verifyResult = await api.post("/billing/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            // Step 4: Post-Payment State Management
            if (verifyResult.data.status === "success") {
              toast({
                title: "✅ Payment Successful!",
                description: "Your balance has been reset. Thank you!",
                duration: 5000,
              });

              // Refresh billing data
              queryClient.invalidateQueries({ queryKey: ["billing"] });
            }
          } catch (verifyError: any) {
            const errorMessage =
              verifyError.response?.data?.detail ||
              verifyError.message ||
              "Payment verification failed. Please contact support.";

            toast({
              title: "❌ Verification Failed",
              description: errorMessage,
              variant: "destructive",
              duration: 5000,
            });
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: "Nexus User",
          email: "user@example.com",
        },
        theme: {
          color: "#3b82f6",
        },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Failed to initiate payment. Please try again.";

      toast({
        title: "❌ Payment Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
      setIsProcessing(false);
    }
  };

  // Safely calculate GB usage
  const totalBytes = billing?.total_bytes ?? 0;
  const totalGb = totalBytes / (1024 ** 3);
  const maxGb = 100;
  const percentage = Math.min((totalGb / maxGb) * 100, 100);
  const gbFormatted = billing?.gb_formatted ?? "0 GB";
  const estimatedBill = billing?.estimated_bill_inr ?? 0;
  const currency = billing?.currency ?? "INR";

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
            <UsageGauge usedGb={gbFormatted} percentage={percentage} />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Invoice</CardTitle>
            <IndianRupee className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-4">
            <p className="text-4xl font-bold text-foreground">
              ₹{estimatedBill.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{currency} · This billing cycle</p>
            <Button
              onClick={handlePayNow}
              disabled={isProcessing}
              className="mt-6 w-full bg-razorpay text-razorpay-foreground hover:bg-razorpay/90 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay Now with Razorpay
                </>
              )}
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
