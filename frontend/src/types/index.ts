export interface StorageFile {
  name: string;
  size_bytes: number;
  last_modified: string;
}

export interface BillingUsage {
  total_bytes: number;
  gb_formatted: string;
  estimated_bill_inr: number;
  currency: string;
}

export interface PresignedPostResponse {
  url: string;
  fields: Record<string, string>;
}

export interface DownloadResponse {
  download_url: string;
}

export interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  invoice: string;
}
