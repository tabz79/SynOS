import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Users, 
    TrendingUp, 
    DollarSign, 
    History, 
    Settings,
    Plus,
    Search,
    LayoutDashboard,
    ArrowUpRight,
    ArrowDownLeft,
    Filter,
    MoreHorizontal
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { FinancePrintableSummaryModal } from './components/FinancePrintableSummaryModal';
import { PartnerRegistryTab } from './components/referral/PartnerRegistryTab';
import { PendingPayoutsTab } from './components/referral/PendingPayoutsTab';
import { PartnerReceivablesTab } from './components/referral/PartnerReceivablesTab';
import { SettlementHistoryTab } from './components/referral/SettlementHistoryTab';
import { CommissionRulesTab } from './components/referral/CommissionRulesTab';
import { ReferralOverviewTab } from './components/referral/ReferralOverviewTab';
import { Printer, Download, Loader2 } from 'lucide-react';

/**
 * Referral Terminal
 * The command center for Doctor Relationship Finance Infrastructure.
 */
export const ReferralTerminal = () => {
    const { tab = 'overview' } = useParams();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);
    const [tabData, setTabData] = useState({
        registry: [],
        payouts: [],
        receivables: [],
        history: [],
        rules: []
    });
    const tabsRef = React.useRef(null);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'registry', label: 'Partner Registry', icon: Users },
        { id: 'payouts', label: 'Pending Payouts', icon: ArrowUpRight },
        { id: 'receivables', label: 'Partner Receivables', icon: ArrowDownLeft },
        { id: 'history', label: 'Settlement History', icon: History },
        { id: 'rules', label: 'Commission Rules', icon: Settings },
    ];

    useEffect(() => {
        loadSummary();
    }, []);

    useEffect(() => {
        if (tabsRef.current) {
            const activeTabEl = tabsRef.current.querySelector('[data-active-tab="true"]');
            if (activeTabEl) {
                activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
        ensureTabData(tab);
    }, [tab]);

    const loadSummary = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getReferralSummary();
            setSummary(data);
        } catch (err) {
            console.error("Failed to load referral summary", err);
        } finally {
            setLoading(false);
        }
    };

    const ensureTabData = async (targetTab = tab) => {
        try {
            if (targetTab === 'registry') {
                const res = await FinanceApi.getReferralPartners();
                setTabData(prev => ({ ...prev, registry: res || [] }));
                return res || [];
            } else if (targetTab === 'payouts') {
                const res = await FinanceApi.getReferralPayables();
                setTabData(prev => ({ ...prev, payouts: res || [] }));
                return res || [];
            } else if (targetTab === 'receivables') {
                const res = await FinanceApi.getReceivables('partner');
                const partnerOnly = (res || []).filter(r => {
                    const dt = String(r.debtorType || '').toLowerCase();
                    return dt === 'partner' || dt === '1' || (!r.corporateName && !r.corporateAccountId && !r.insuranceName && !r.insuranceCompanyId);
                });
                setTabData(prev => ({ ...prev, receivables: partnerOnly }));
                return partnerOnly;
            } else if (targetTab === 'history') {
                const res = await FinanceApi.getSettlementHistory();
                setTabData(prev => ({ ...prev, history: res || [] }));
                return res || [];
            } else if (targetTab === 'rules') {
                const res = await FinanceApi.getReferralRules();
                setTabData(prev => ({ ...prev, rules: res || [] }));
                return res || [];
            }
        } catch (e) {
            console.error("Failed to load tab data for", targetTab, e);
        }
        return tabData[targetTab] || [];
    };

    const handleDownloadTabSummary = async () => {
        const data = await ensureTabData(tab);
        let headers = [];
        let rows = [];
        let filename = `synos_referral_${tab}_${new Date().toISOString().slice(0, 10)}.csv`;

        if (tab === 'registry') {
            headers = ["Partner Name", "Partner Type", "Clinic / Hospital", "Phone", "Email", "Default Commission (%)", "Status"];
            rows = (data || []).map(p => [
                `"${(p.name || '').replace(/"/g, '""')}"`,
                `"${p.partnerType || 'Doctor'}"`,
                `"${(p.clinicName || '').replace(/"/g, '""')}"`,
                `"${p.phone || ''}"`,
                `"${p.email || ''}"`,
                p.commissionPercentage ?? p.defaultCommission ?? 0,
                p.isApproved ? "Active / Approved" : "Pending Approval"
            ]);
        } else if (tab === 'payouts') {
            headers = ["Partner Name", "Patient Name", "Visit / Invoice Token", "Gross Amount (INR)", "Commission Rate (%)", "Payout Due (INR)", "Status"];
            rows = (data || []).map(p => [
                `"${(p.partnerName || '').replace(/"/g, '""')}"`,
                `"${(p.patientName || '').replace(/"/g, '""')}"`,
                `"${p.visitToken || p.token || ''}"`,
                p.grossAmount || 0,
                p.rate || 0,
                p.amountDue || p.amount || 0,
                `"${p.status || 'Pending'}"`
            ]);
        } else if (tab === 'receivables') {
            headers = ["Partner / Clinic Name", "Visit Token", "Patient Name", "Tests / Investigations Billed", "Total Bill (INR)", "Paid (INR)", "Balance Due (INR)", "Status"];
            rows = (data || []).map(r => {
                const total = Number(r.totalAmount || r.amount || 0);
                const paid = Number(r.paidAmount || r.amountReceived || 0);
                const due = r.balanceDue !== undefined && !isNaN(r.balanceDue) ? Number(r.balanceDue) : (total - paid);
                const tests = r.testsSummary || (r.testNames?.join('; ')) || (r.tests?.join('; ')) || '-';
                return [
                    `"${(r.partnerName || r.clinicName || '').replace(/"/g, '""')}"`,
                    `"${r.visitToken || r.token || ''}"`,
                    `"${(r.patientName || '').replace(/"/g, '""')}"`,
                    `"${tests.replace(/"/g, '""')}"`,
                    total,
                    paid,
                    isNaN(due) ? 0 : due,
                    `"${r.status || 'Pending'}"`
                ];
            });
        } else if (tab === 'history') {
            headers = ["Date", "Payee / Doctor Name", "Transaction Type", "Reference No", "Payment Mode", "Amount (INR)", "Notes"];
            rows = (data || []).map(h => [
                `"${new Date(h.occurredAt || h.date || Date.now()).toLocaleDateString()}"`,
                `"${(h.payeeName || h.name || '').replace(/"/g, '""')}"`,
                `"${h.transactionType || h.type || 'Payout'}"`,
                `"${h.reference || h.refNo || ''}"`,
                `"${h.paymentMode || h.mode || 'Bank Transfer'}"`,
                h.amount || 0,
                `"${(h.notes || '').replace(/"/g, '""')}"`
            ]);
        } else if (tab === 'rules') {
            headers = ["Rule ID", "Partner / Doctor Scope", "Department / Service", "Rule Type", "Commission Rate (%)", "Status"];
            rows = (data || []).map(r => [
                `"${r.id || ''}"`,
                `"${(r.partnerName || 'Global Rule').replace(/"/g, '""')}"`,
                `"${(r.departmentName || r.department || 'All Departments').replace(/"/g, '""')}"`,
                `"${r.ruleType || 'Percentage'}"`,
                r.percentage ?? r.rate ?? 0,
                r.isActive !== false ? "Active" : "Disabled"
            ]);
        } else {
            headers = ["Financial Metric", "Value (INR / Count)"];
            rows = [
                ["Total Pending Payout Liability", summary?.totalPendingPayouts || 0],
                ["Total Pending Partner Receivables", summary?.totalPendingReceivables || 0],
                ["Active Referral Partners", summary?.activePartnersCount || 0],
                ["Settled This Month", summary?.settledThisMonth || 0]
            ];
        }

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getPrintSummaryConfig = () => {
        const data = tabData[tab] || [];
        if (tab === 'registry') {
            return {
                title: "Doctor Referral Partner Directory",
                subtitle: "Authorized clinical referral partners, clinic tie-ups, and contracted commission schedules",
                categoryLabel: "REFERRAL PARTNER DIRECTORY",
                kpis: [
                    { label: "Total Partners", value: data.length, subtext: "Registered Clinicians" },
                    { label: "Active Tie-ups", value: data.filter(p => p.isApproved).length, color: "text-emerald-600", subtext: "Approved & Operational" },
                    { label: "Avg Commission", value: `${Math.round(data.reduce((acc, p) => acc + (p.commissionPercentage || 0), 0) / (data.length || 1))}%`, color: "text-indigo-600", subtext: "Standard Tariff Split" }
                ],
                columns: [
                    { key: 'name', label: 'Doctor / Partner Name', render: (v) => v || 'Doctor' },
                    { key: 'partnerType', label: 'Classification', render: (v) => v || 'Doctor' },
                    { key: 'clinicName', label: 'Hospital / Clinic', render: (v) => v || '-' },
                    { key: 'phone', label: 'Contact Phone', render: (v) => v || '-' },
                    { key: 'commissionPercentage', label: 'Default Comm %', align: 'center', render: (v, r) => `${v ?? r.defaultCommission ?? 0}%` },
                    { key: 'isApproved', label: 'Status', align: 'center', render: (v) => v ? 'Active' : 'Pending' }
                ],
                data: data,
                summaryTotals: {}
            };
        } else if (tab === 'payouts') {
            const totalLiability = data.reduce((sum, p) => sum + (Number(p.amountDue || p.amount || 0)), 0);
            return {
                title: "Referral Commission Payouts Statement",
                subtitle: "Itemized clinical referral commissions pending disbursement and clearance",
                categoryLabel: "REFERRAL PAYOUTS AUDIT",
                kpis: [
                    { label: "Total Payout Due", value: `₹${totalLiability.toLocaleString()}`, color: "text-rose-600", subtext: `${data.length} Referral Line Items` },
                    { label: "Payable Doctors", value: new Set(data.map(p => p.partnerName || p.partnerId)).size, subtext: "Clinicians Due" },
                    { label: "Audit State", value: "Pending Clearance", color: "text-amber-600", subtext: "Finance Disbursement Queue" }
                ],
                columns: [
                    { key: 'partnerName', label: 'Referring Doctor' },
                    { key: 'patientName', label: 'Patient Name', render: (v, r) => v ? `${v} (${r.visitToken || '-'})` : '-' },
                    { key: 'grossAmount', label: 'Bill Gross (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'rate', label: 'Commission %', align: 'center', render: (v) => `${v || 0}%` },
                    { key: 'amountDue', label: 'Disbursement Due (₹)', align: 'right', render: (v, r) => `₹${Number(v ?? r.amount ?? 0).toLocaleString()}` },
                    { key: 'status', label: 'Status', align: 'center', render: (v) => v || 'Pending' }
                ],
                data: data,
                summaryTotals: {
                    amountDue: `₹${totalLiability.toLocaleString()}`
                }
            };
        } else if (tab === 'receivables') {
            const totalRec = data.reduce((sum, r) => {
                const due = r.balanceDue !== undefined && !isNaN(r.balanceDue)
                    ? Number(r.balanceDue)
                    : (Number(r.totalAmount || r.amount || 0) - Number(r.paidAmount || r.amountReceived || 0));
                return sum + (isNaN(due) ? 0 : due);
            }, 0);
            return {
                title: "Partner Clinic B2B Receivables Ledger",
                subtitle: "Diagnostic receivables and institutional invoices owed by clinical partners",
                categoryLabel: "PARTNER RECEIVABLES",
                kpis: [
                    { label: "Total Receivables", value: `₹${totalRec.toLocaleString()}`, color: "text-emerald-600", subtext: `${data.length} Invoiced Visits` },
                    { label: "Partner Accounts", value: new Set(data.map(r => r.partnerName || r.clinicName)).size, subtext: "Debtor Institutions" },
                    { label: "Collection Status", value: "Active", subtext: "Billing & Settlement Cycle" }
                ],
                columns: [
                    { key: 'partnerName', label: 'Partner / Clinic', render: (v, r) => v || r.clinicName || 'Clinic' },
                    { key: 'visitToken', label: 'Visit / Token', render: (v, r) => v || r.token || '-' },
                    { key: 'patientName', label: 'Patient', render: (v) => v || '-' },
                    { key: 'testsSummary', label: 'Tests / Investigations', render: (v, r) => v || (r.testNames?.join(', ')) || (r.tests?.join(', ')) || '-' },
                    { key: 'totalAmount', label: 'Invoice Total (₹)', align: 'right', render: (v, r) => `₹${Number(v || r.amount || 0).toLocaleString()}` },
                    { key: 'balanceDue', label: 'Balance Due (₹)', align: 'right', render: (v, r) => {
                        const due = v !== undefined && !isNaN(v) ? v : ((r.totalAmount || r.amount || 0) - (r.paidAmount || r.amountReceived || 0));
                        return `₹${Number(due || 0).toLocaleString()}`;
                    }},
                    { key: 'status', label: 'Status', align: 'center', render: (v) => v || 'Pending' }
                ],
                data: data,
                summaryTotals: {
                    totalAmount: `₹${data.reduce((sum, r) => sum + Number(r.totalAmount || r.amount || 0), 0).toLocaleString()}`,
                    balanceDue: `₹${totalRec.toLocaleString()}`
                }
            };
        } else if (tab === 'history') {
            const totalPaid = data.reduce((sum, h) => sum + (Number(h.amount || 0)), 0);
            return {
                title: "Referral Financial Settlement & Clearance History",
                subtitle: "Audited clearance vouchers, NEFT/cash disbursements, and partner payments",
                categoryLabel: "REFERRAL SETTLEMENT AUDIT",
                kpis: [
                    { label: "Total Disbursed", value: `₹${totalPaid.toLocaleString()}`, color: "text-indigo-600", subtext: `${data.length} Settlements Processed` },
                    { label: "Disbursement Feed", value: "Verified Vouchers", subtext: "Signed Banking Confirmations" },
                    { label: "Cycle Status", value: "Audited", color: "text-emerald-600", subtext: "General Ledger Posted" }
                ],
                columns: [
                    { key: 'occurredAt', label: 'Settlement Date', render: (v, r) => new Date(v || r.date || Date.now()).toLocaleDateString() },
                    { key: 'payeeName', label: 'Recipient Doctor / Partner', render: (v, r) => v || r.name || 'Partner' },
                    { key: 'reference', label: 'Reference Voucher / UTR', render: (v) => v || '-' },
                    { key: 'paymentMode', label: 'Payment Mode', render: (v, r) => v || r.mode || 'Bank Transfer' },
                    { key: 'amount', label: 'Amount Cleared (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'notes', label: 'Audit Notes', render: (v) => v || '-' }
                ],
                data: data,
                summaryTotals: {
                    amount: `₹${totalPaid.toLocaleString()}`
                }
            };
        } else if (tab === 'rules') {
            return {
                title: "Doctor Commission Matrix & Tariff Configuration",
                subtitle: "Contracted department-level and modality-specific commission sharing rules",
                categoryLabel: "COMMISSION RULES MATRIX",
                kpis: [
                    { label: "Active Commission Rules", value: data.length, subtext: "Tariff Matrix Entries" },
                    { label: "Rule Target", value: "Multi-Partner", color: "text-indigo-600", subtext: "Automated Calculation" },
                    { label: "Enforcement", value: "Active", color: "text-emerald-600", subtext: "Auto-Split on Invoicing" }
                ],
                columns: [
                    { key: 'id', label: 'Rule ID', render: (v) => v ? v.slice(0, 8) : '-' },
                    { key: 'partnerName', label: 'Target Doctor / Scope', render: (v) => v || 'Global (All Partners)' },
                    { key: 'departmentName', label: 'Department / Investigation', render: (v, r) => v || r.department || 'All Departments' },
                    { key: 'percentage', label: 'Commission Rate (%)', align: 'center', render: (v, r) => `${v ?? r.rate ?? 0}%` },
                    { key: 'ruleType', label: 'Type', align: 'center', render: (v) => v || 'Percentage' }
                ],
                data: data,
                summaryTotals: {}
            };
        } else {
            const overviewRows = [
                { metric: "Total Pending Payout Liability", val: `₹${(summary?.totalPendingPayouts || 0).toLocaleString()}`, desc: "Disbursements due to referring clinicians" },
                { metric: "Total Partner Receivables", val: `₹${(summary?.totalPendingReceivables || 0).toLocaleString()}`, desc: "Unpaid institutional partner balances" },
                { metric: "Active Referral Partners", val: `${summary?.activePartnersCount || 0} Doctors`, desc: "Registered practitioners in good standing" },
                { metric: "Cleared This Month", val: `₹${(summary?.settledThisMonth || 0).toLocaleString()}`, desc: "Commissions paid in current calendar month" }
            ];
            return {
                title: "Doctor Referral Relationship Finance Overview",
                subtitle: "Executive financial summary of clinical referral partnerships and commission obligations",
                categoryLabel: "REFERRAL FINANCE OVERVIEW",
                kpis: [
                    { label: "Pending Payouts", value: `₹${(summary?.totalPendingPayouts || 0).toLocaleString()}`, color: "text-rose-600", subtext: "Disbursement Liability" },
                    { label: "Partner Receivables", value: `₹${(summary?.totalPendingReceivables || 0).toLocaleString()}`, color: "text-emerald-600", subtext: "Diagnostic Invoices Due" }
                ],
                columns: [
                    { key: 'metric', label: 'Financial / Operational Metric' },
                    { key: 'val', label: 'Recorded Value', align: 'right' },
                    { key: 'desc', label: 'Financial Context & Audit Scope' }
                ],
                data: overviewRows,
                summaryTotals: {}
            };
        }
    };

    const setActiveTab = (id) => {
        navigate(`/finance/referrals/${id}`);
    };

    const printConfig = getPrintSummaryConfig();

    return (
        <div className="flex flex-col h-full bg-zinc-50 dark:bg-black overflow-hidden animate-in fade-in duration-700">
            {/* TERMINAL HEADER */}
            <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-zinc-950 border-b dark:border-zinc-900 border-zinc-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-synos-primary/10 text-synos-primary rounded-2xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold dark:text-white text-zinc-900 tracking-tight">Referral Terminal</h1>
                        <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">Doctor Relationship Finance Infrastructure</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {summary && (
                        <>
                            <div className="text-right">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Total Payout Liability</p>
                                <p className="text-sm font-bold text-rose-500">₹{summary.totalPendingPayouts?.toLocaleString()}</p>
                            </div>
                            <div className="w-px h-8 bg-zinc-100 dark:bg-zinc-900" />
                            <div className="text-right">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Partner Receivables</p>
                                <p className="text-sm font-bold text-emerald-500">₹{summary.totalPendingReceivables?.toLocaleString()}</p>
                            </div>
                        </>
                    )}
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleDownloadTabSummary}
                            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                            title={`Download ${tab.toUpperCase()} Summary (CSV)`}
                        >
                            <Download size={14} className="text-zinc-500" />
                            <span>Download Summary</span>
                        </button>
                        <button 
                            onClick={() => setIsPrintSummaryOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-synos-primary/10 hover:bg-synos-primary/20 text-synos-primary rounded-xl text-xs font-bold transition-all border border-synos-primary/20 shadow-sm"
                            title={`Print Printable ${tab.toUpperCase()} Statement`}
                        >
                            <Printer size={14} />
                            <span>Print Summary</span>
                        </button>
                    </div>
                    <button onClick={loadSummary} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all" title="Refresh Summary">
                        <History size={18} className="text-zinc-400" />
                    </button>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div ref={tabsRef} className="flex items-center gap-1 px-8 py-2 bg-white dark:bg-zinc-950 border-b dark:border-zinc-900 border-zinc-100 overflow-x-auto scrollbar-thin">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        data-active-tab={tab === t.id ? "true" : "false"}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            tab === t.id 
                            ? 'bg-synos-primary/10 text-synos-primary' 
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'
                        }`}
                    >
                        <t.icon size={16} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {tab === 'overview' && <ReferralOverviewTab summary={summary} loading={loading} />}
                {tab === 'registry' && <PartnerRegistryTab />}
                {tab === 'payouts' && <PendingPayoutsTab />}
                {tab === 'receivables' && <PartnerReceivablesTab />}
                {tab === 'history' && <SettlementHistoryTab />}
                {tab === 'rules' && <CommissionRulesTab />}
            </div>

            {/* PRINTABLE SUMMARY MODAL */}
            <FinancePrintableSummaryModal 
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                title={printConfig.title}
                subtitle={printConfig.subtitle}
                categoryLabel={printConfig.categoryLabel}
                kpis={printConfig.kpis}
                columns={printConfig.columns}
                data={printConfig.data}
                summaryTotals={printConfig.summaryTotals}
                onExportCsv={handleDownloadTabSummary}
            />
        </div>
    );
};
