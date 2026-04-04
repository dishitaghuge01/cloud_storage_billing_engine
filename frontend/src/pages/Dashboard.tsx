import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import FileUpload from "@/components/files/FileUpload";
import FileTable from "@/components/files/FileTable";
import BillingDashboard from "@/components/billing/BillingDashboard";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"files" | "billing">("files");

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "files" ? (
        <div className="space-y-6 animate-fade-in-up">
          <FileUpload />
          <FileTable />
        </div>
      ) : (
        <BillingDashboard />
      )}
    </DashboardLayout>
  );
}
