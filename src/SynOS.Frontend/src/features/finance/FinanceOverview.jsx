import React, { useState, useEffect } from 'react';
import { DepartmentOverview } from './components/FinanceShared';
import { FinanceApi } from '@/api/finance';

export const FinanceOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const data = await FinanceApi.getProfitabilitySummary(start.toISOString(), new Date().toISOString());
      setStats(data);
    } catch (err) {
      console.error("Failed to load finance overview:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-zinc-500">Synchronizing truth streams...</div>;
  if (!stats) return <div className="p-20 text-center text-zinc-500">Failed to load financial truth. Check backend logs.</div>;

  return (
    <DepartmentOverview 
      title="Finance Intelligence Hub"
      description="Operational financial command center for laboratory economics."
      stats={[
        { title: "Operational Position", value: `₹${((stats.operationalNetPosition || 0) / 100000).toFixed(2)}L`, type: (stats.operationalNetPosition || 0) > 0 ? 'positive' : 'negative' },
        { title: "Pending Collections", value: `₹${(stats.pendingCollections || 0).toLocaleString()}` },
        { title: "Cash Inflow (30d)", value: `₹${((stats.cashInflow || 0) / 100000).toFixed(2)}L`, type: 'positive' },
        { title: "Payout Liability", value: `₹${(stats.totalPayoutLiability || 0).toLocaleString()}`, type: 'negative' }
      ]}
      activity={[
        { title: "Cash Margin", meta: "Direct movement fidelity", amount: `${(stats.cashMarginPercentage || 0).toFixed(1)}%`, time: "Live" },
        { title: "Accrual Margin", meta: "Commitment-based fidelity", amount: `${(stats.accrualMarginPercentage || 0).toFixed(1)}%`, time: "Live" }
      ]}
      shortcuts={["Generate Monthly Report", "Review Payout Exceptions", "Download Truth Audit"]}
    />
  );
};

export const ExpensesOverview = () => (
  <DepartmentOverview 
    title="Operational Expenses"
    description="Manage procurement liabilities and recurring costs."
    stats={[
      { title: "Total Recorded Expenses", value: "8,20,000", type: 'negative' },
      { title: "Pending Vendor Payables", value: "1,45,000" },
      { title: "Unpaid POs", value: "12" },
      { title: "Payment Efficiency", value: "98%" }
    ]}
    activity={[
      { title: "Vendor Bill Recorded", meta: "MICRO-SYSTEMS • Inventory", amount: "18,500", time: "2 hours ago" },
      { title: "Consumable Payout", meta: "SYR-SUPPLY CO", amount: "5,400", time: "1 day ago" }
    ]}
    shortcuts={["Record New Expense", "Approve Vendor Bills", "Purchase Order Audit"]}
  />
);

export const PartnersOverview = () => (
  <DepartmentOverview 
    title="Referral Partners"
    description="Manage partner registries and commission settlements."
    stats={[
      { title: "Total Payout Liability", value: "1,85,000", type: 'negative' },
      { title: "Settled This Month", value: "1,40,000" },
      { title: "Active Partners", value: "42" },
      { title: "Average Payout/Partner", value: "4,400" }
    ]}
    activity={[
      { title: "Partner Settlement", meta: "DR. RAO • ID: REF-009", amount: "12,000", time: "6 hours ago" },
      { title: "New Partner Registered", meta: "SRI LAKSHMI CLINIC", amount: "0", time: "2 days ago" }
    ]}
    shortcuts={["Register New Partner", "Run Payout Batch", "Review Commission Rules"]}
  />
);

export const OutsourcingOverview = () => (
  <DepartmentOverview 
    title="Outsourced Tests"
    description="Financial tracking of reference lab liabilities."
    stats={[
      { title: "Reference Lab Liability", value: "95,000", type: 'negative' },
      { title: "Settled This Month", value: "65,000" },
      { title: "Active Ref Labs", value: "8" },
      { title: "Cost/Test Average", value: "850" }
    ]}
    activity={[
      { title: "Lab Payout", meta: "METRO-DIAGNOSTICS • Invoice 882", amount: "32,000", time: "1 day ago" },
      { title: "New Liability Recorded", meta: "TEST: BIO-MARKERS", amount: "1,400", time: "1 day ago" }
    ]}
    shortcuts={["Review Ref Lab Invoices", "Settle Lab Dues", "Manage Ref Labs"]}
  />
);
