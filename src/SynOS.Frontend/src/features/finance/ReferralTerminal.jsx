import React, { useState, useEffect, useRef } from 'react';
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
    MoreHorizontal,
    Zap,
    Printer,
    Download,
    Loader2,
    Calendar,
    ClipboardList
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { FinancePrintableSummaryModal } from './components/FinancePrintableSummaryModal';
import { formatCanonicalBillNo, isWithinTimeRange, isDraftEntity } from './components/FinanceUtils';
import { PartnerPerformanceTab } from './components/referral/PartnerPerformanceTab';
import { ReferralVisitsTab } from './components/referral/ReferralVisitsTab';
import { PartnerRegistryTab } from './components/referral/PartnerRegistryTab';
import { PendingPayoutsTab } from './components/referral/PendingPayoutsTab';
import { PartnerReceivablesTab } from './components/referral/PartnerReceivablesTab';
import { SettlementHistoryTab } from './components/referral/SettlementHistoryTab';
import { CommissionRulesTab } from './components/referral/CommissionRulesTab';
import { ReferralRateQueueTab } from './components/referral/ReferralRateQueueTab';
import { useGlobalFilter } from '@/context/GlobalFilterContext';
import { StandardFilterBar } from '@/components/layout/StandardFilterBar';
import { useAuth } from '@/context/AuthContext';

/**
 * Referral Commissions Management Terminal
 * Owner-focused financial oversight screen for understanding referral commissions,
 * partner volume, commission accruals, payables, and disbursements.
 */
export const ReferralTerminal = () => {
    const { tab = 'performance' } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isReceptionView = user?.role === 'Receptionist' || 
                            (typeof window !== 'undefined' && window.location.search.includes('source=reception'));

    // Normalized effective tab ('overview' redirects to 'performance')
    const effectiveTab = tab === 'overview' ? 'performance' : tab;

    useEffect(() => {
        if (isReceptionView && effectiveTab === 'performance') {
            navigate('/finance/referrals/rate-queue', { replace: true });
        }
    }, [isReceptionView, effectiveTab]);

    const { presetRange, customDates, isConsolidated, effectiveBranchId, isAdmin } = useGlobalFilter();
    const [dashboardData, setDashboardData] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);
    const [unmappedQueueCount, setUnmappedQueueCount] = useState(0);
    const [tabData, setTabData] = useState({
        registry: [],
        payouts: [],
        receivables: [],
        history: [],
        rules: [],
        visits: []
    });
    const tabsRef = useRef(null);

    const rawTabs = [
        { id: 'performance', label: 'Partner Performance', icon: LayoutDashboard },
        { id: 'payouts', label: 'Commission Payouts', icon: ArrowUpRight },
        { id: 'rules', label: 'Rate Cards & Rules', icon: Settings, badge: unmappedQueueCount },
        { id: 'visits', label: 'Referral Visits', icon: Users },
        { id: 'history', label: 'Settlement History', icon: History },
        { id: 'registry', label: 'Doctor Registry', icon: Users },
        { id: 'receivables', label: 'Partner Receivables', icon: ArrowDownLeft }
    ];

    const tabs = isReceptionView ? rawTabs.filter(t => t.id !== 'performance') : rawTabs;

    const loadDashboardData = async () => {
        const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
        const isCons = isConsolidated && isAdmin;
        const start = presetRange === 'custom' ? customDates?.start : null;
        const end = presetRange === 'custom' ? customDates?.end : null;
        try {
            if (dashboardData) {
                setIsUpdating(true);
            } else {
                setLoading(true);
            }
            const [dashRes, sumRes] = await Promise.all([
                FinanceApi.getCommissionDashboard(bId, isCons, presetRange, start, end).catch(err => {
                    console.error("Failed to load commission dashboard", err);
                    return null;
                }),
                FinanceApi.getReferralSummary(bId, isCons, presetRange, start, end).catch(err => {
                    console.error("Failed to load referral summary", err);
                    return null;
                })
            ]);
            if (dashRes) setDashboardData(dashRes);
            if (sumRes) setSummary(sumRes);
        } catch (err) {
            console.error("Failed to load commission dashboard", err);
        } finally {
            setLoading(false);
            setIsUpdating(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
        loadUnmappedCount();
    }, [isConsolidated, effectiveBranchId, presetRange, customDates?.start, customDates?.end]);

    const loadUnmappedCount = async () => {
        try {
            const queue = await FinanceApi.getPendingLearningQueue();
            const total = (queue || []).reduce((acc, g) => acc + (g.unmappedTests?.length || 0), 0);
            setUnmappedQueueCount(total);
        } catch (e) {
            console.error("Failed to load rate queue count", e);
        }
    };

    useEffect(() => {
        if (tabsRef.current) {
            const activeTabEl = tabsRef.current.querySelector('[data-active-tab="true"]');
            if (activeTabEl) {
                activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
        ensureTabData(effectiveTab);
    }, [effectiveTab, isConsolidated, effectiveBranchId, presetRange]);

    const ensureTabData = async (targetTab = effectiveTab) => {
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
                const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
                const start = presetRange === 'custom' ? customDates?.start : null;
                const end = presetRange === 'custom' ? customDates?.end : null;
                const res = await FinanceApi.getReceivables('partner', bId, presetRange, start, end);
                const partnerOnly = (res || []).filter(r => {
                    if (isDraftEntity(r)) return false;
                    if (!isWithinTimeRange(r.occurredAt || r.date, presetRange, customDates)) return false;
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
            } else if (targetTab === 'visits') {
                const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
                const start = presetRange === 'custom' ? customDates?.start : null;
                const end = presetRange === 'custom' ? customDates?.end : null;
                const res = await FinanceApi.getCommissionVisits({
                    branchId: bId,
                    preset: presetRange,
                    startDate: start,
                    endDate: end,
                    pageSize: 100
                });
                setTabData(prev => ({ ...prev, visits: res?.items || [] }));
                return res?.items || [];
            }
        } catch (e) {
            console.error("Failed to load tab data for", targetTab, e);
        }
        return tabData[targetTab] || [];
    };

    const handleDownloadTabSummary = async () => {
        let headers = [];
        let rows = [];
        let filename = `synos_referral_${effectiveTab}_${new Date().toISOString().slice(0, 10)}.csv`;

        if (effectiveTab === 'performance') {
            const list = dashboardData?.partners || [];
            headers = [
                "Partner Organization", "Type", "Referred Patients", "Visits", "Investigations",
                "Gross Tariff", "Concessions", "Net Revenue", "Commission Accrued", "Commission Paid",
                "Outstanding", "Effective Rate (%)", "Last Referral"
            ];
            rows = list.map(p => [
                `"${(p.name || '').replace(/"/g, '""')}"`,
                `"${p.partnerType || ''}"`,
                p.referredPatients || 0,
                p.visits || 0,
                p.investigations || 0,
                p.grossTariff || 0,
                p.concessions || 0,
                p.netRevenue || 0,
                p.commissionAccrued || 0,
                p.commissionPaid || 0,
                p.outstanding || 0,
                p.effectiveRate || 0,
                `"${p.lastReferralDate || ''}"`
            ]);
        } else if (effectiveTab === 'visits') {
            const list = await ensureTabData('visits');
            headers = [
                "Token", "Date", "Patient Name", "MRN", "Primary Doctor", "Secondary Referral",
                "Commission Recipient", "Net Bill", "Bill Status", "Commission Accrued", "Commission Status"
            ];
            rows = list.map(v => [
                `"${v.token || ''}"`,
                `"${v.visitDate || ''}"`,
                `"${(v.patientName || '').replace(/"/g, '""')}"`,
                `"${v.patientMrn || ''}"`,
                `"${(v.primaryDoctorName || '').replace(/"/g, '""')}"`,
                `"${(v.secondaryDoctorName || 'None').replace(/"/g, '""')}"`,
                `"${(v.commissionRecipientName || '').replace(/"/g, '""')}"`,
                v.billNet || 0,
                `"${v.billPaymentStatus || ''}"`,
                v.commissionAccrued || 0,
                `"${v.commissionStatus || ''}"`
            ]);
        } else if (effectiveTab === 'payouts') {
            const list = await ensureTabData('payouts');
            headers = ["Doctor Name", "Patient", "Gross Amount", "Commission Rate", "Payout Due", "Status"];
            rows = list.map(p => [
                `"${(p.partnerName || '').replace(/"/g, '""')}"`,
                `"${(p.patientName || '').replace(/"/g, '""')}"`,
                p.grossAmount || 0,
                p.rate || 0,
                p.amountDue ?? p.amount ?? 0,
                p.status || "Pending"
            ]);
        } else if (effectiveTab === 'history') {
            const list = await ensureTabData('history');
            headers = ["Settlement Date", "Payee Name", "Reference / UTR", "Payment Mode", "Amount Cleared", "Notes"];
            rows = list.map(h => [
                new Date(h.occurredAt || h.date || Date.now()).toLocaleDateString(),
                `"${(h.payeeName || h.name || 'Partner').replace(/"/g, '""')}"`,
                `"${(h.reference || '-').replace(/"/g, '""')}"`,
                h.paymentMode || h.mode || 'Bank Transfer',
                h.amount || 0,
                `"${(h.notes || '-').replace(/"/g, '""')}"`
            ]);
        } else {
            headers = ["Financial Metric", "Value (INR / Count)"];
            rows = [
                ["Commission Accrued", dashboardData?.kpis?.commissionAccrued || 0],
                ["Commission Paid", dashboardData?.kpis?.commissionPaid || 0],
                ["Pending Commission Liability", dashboardData?.kpis?.pendingCommission || 0],
                ["Effective Commission Rate (%)", dashboardData?.kpis?.effectiveCommissionRate || 0],
                ["Eligible Revenue", dashboardData?.kpis?.eligibleRevenue || 0]
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
        if (effectiveTab === 'performance') {
            const partnersList = dashboardData?.partners || [];
            return {
                title: "Referral Commissions & Partner Performance Statement",
                subtitle: "Doctor & referral partner performance, commission accruals, payouts, and settlements",
                categoryLabel: "REFERRAL COMMISSIONS",
                kpis: [
                    { label: "Commission Accrued", value: `₹${Number(dashboardData?.kpis?.commissionAccrued || 0).toLocaleString()}`, color: "text-indigo-600", subtext: `${dashboardData?.kpis?.eligibleVisitCount || 0} visits` },
                    { label: "Commission Paid", value: `₹${Number(dashboardData?.kpis?.commissionPaid || 0).toLocaleString()}`, color: "text-emerald-600", subtext: `${dashboardData?.kpis?.settlementCount || 0} settlements` },
                    { label: "Pending Liability", value: `₹${Number(dashboardData?.kpis?.pendingCommission || 0).toLocaleString()}`, color: "text-rose-600", subtext: "Outstanding payable" },
                    { label: "Effective Rate", value: `${dashboardData?.kpis?.effectiveCommissionRate || 0}%`, color: "text-sky-600", subtext: "On eligible revenue" }
                ],
                columns: [
                    { key: 'name', label: 'Partner / Organization' },
                    { key: 'partnerType', label: 'Type' },
                    { key: 'visits', label: 'Visits', align: 'center' },
                    { key: 'investigations', label: 'Tests', align: 'center' },
                    { key: 'grossTariff', label: 'Gross (₹)', align: 'right', render: v => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'concessions', label: 'Concessions (₹)', align: 'right', render: (v, r) => `₹${Number(v || 0).toLocaleString()} (${r.concessionsPct || 0}%)` },
                    { key: 'netRevenue', label: 'Net Rev (₹)', align: 'right', render: v => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'commissionAccrued', label: 'Accrued (₹)', align: 'right', render: v => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'commissionPaid', label: 'Paid (₹)', align: 'right', render: v => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'outstanding', label: 'Outstanding (₹)', align: 'right', render: v => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'effectiveRate', label: 'Rate %', align: 'center', render: v => `${v || 0}%` },
                    { key: 'lastReferralDate', label: 'Last Referral' }
                ],
                data: partnersList,
                summaryTotals: {
                    grossTariff: `₹${partnersList.reduce((s, p) => s + Number(p.grossTariff || 0), 0).toLocaleString()}`,
                    netRevenue: `₹${partnersList.reduce((s, p) => s + Number(p.netRevenue || 0), 0).toLocaleString()}`,
                    commissionAccrued: `₹${partnersList.reduce((s, p) => s + Number(p.commissionAccrued || 0), 0).toLocaleString()}`,
                    outstanding: `₹${partnersList.reduce((s, p) => s + Number(p.outstanding || 0), 0).toLocaleString()}`
                }
            };
        } else if (effectiveTab === 'visits') {
            const visitsList = tabData.visits || [];
            return {
                title: "Referred Visits & Commission Attribution Ledger",
                subtitle: "Itemized clinical referral visits, concessions, and commission recipients",
                categoryLabel: "REFERRED VISITS LEDGER",
                kpis: [
                    { label: "Commission Accrued", value: `₹${Number(dashboardData?.kpis?.commissionAccrued || 0).toLocaleString()}`, color: "text-indigo-600", subtext: "Total period liability" },
                    { label: "Eligible Visits", value: dashboardData?.kpis?.eligibleVisitCount || 0, subtext: "Referred visits" }
                ],
                columns: [
                    { key: 'token', label: 'Token' },
                    { key: 'patientName', label: 'Patient Name' },
                    { key: 'primaryDoctorName', label: 'Referring Doctor' },
                    { key: 'commissionRecipientName', label: 'Commission Recipient' },
                    { key: 'billNet', label: 'Net Bill (₹)', align: 'right', render: v => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'billPaymentStatus', label: 'Bill Status', align: 'center' },
                    { key: 'commissionAccrued', label: 'Commission (₹)', align: 'right', render: v => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'commissionStatus', label: 'Comm Status', align: 'center' }
                ],
                data: visitsList,
                summaryTotals: {}
            };
        } else if (effectiveTab === 'payouts') {
            const data = tabData.payouts || [];
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
        } else if (effectiveTab === 'history') {
            const data = tabData.history || [];
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
        } else {
            return {
                title: "Referral Commission Management",
                subtitle: "Executive financial summary of clinical referral partnerships and commission obligations",
                categoryLabel: "REFERRAL COMMISSIONS",
                kpis: [],
                columns: [],
                data: [],
                summaryTotals: {}
            };
        }
    };

    const setActiveTab = (id) => {
        navigate(`/finance/referrals/${id}`);
    };

    const printConfig = getPrintSummaryConfig();

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden animate-in fade-in duration-300">
            {/* TERMINAL HEADER MATCHING DESIGN REFERENCE */}
            <div className="px-8 pt-8 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div>
                        <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight">
                            Referral Commissions
                        </h1>
                        <p className="text-xs text-zinc-500 font-medium mt-1">
                            Doctor & referral partner performance, commission accruals, payouts, and settlements
                        </p>
                    </div>

                    {isUpdating && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-synos-primary/10 border border-synos-primary/25 text-synos-primary shadow-xs animate-in fade-in duration-150">
                            <div className="relative flex items-center justify-center w-3 h-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-synos-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-synos-primary"></span>
                            </div>
                            <span className="text-xs font-bold tracking-wide uppercase">Updating...</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Unified Standard Filter Bar (Today, This Month, This Quarter, This Year, Custom Range & Branch Selectors) */}
                    <StandardFilterBar />

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleDownloadTabSummary}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-zinc-700 shadow-sm cursor-pointer"
                            title="Download CSV"
                        >
                            <Download size={14} className="text-zinc-500" />
                            <span>Download CSV</span>
                        </button>
                        <button 
                            onClick={() => setIsPrintSummaryOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-zinc-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="Print Report"
                        >
                            <Printer size={14} />
                            <span>Print Report</span>
                        </button>
                        <button 
                            onClick={loadDashboardData} 
                            className="p-2 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 rounded-xl transition-all cursor-pointer" 
                            title="Refresh Data"
                        >
                            <History size={16} className="text-zinc-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* TAB NAVIGATION (SEGMENTED PILL ON NATIVE CANVAS) */}
            <div ref={tabsRef} className="px-8 pb-2 flex items-center gap-1 overflow-x-auto scrollbar-thin">
                <div className="flex items-center bg-slate-200/60 dark:bg-zinc-800/80 p-1 rounded-xl">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            data-active-tab={effectiveTab === t.id ? "true" : "false"}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                effectiveTab === t.id 
                                ? 'bg-white dark:bg-zinc-700 text-synos-primary shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                            }`}
                        >
                            <t.icon size={14} />
                            <span>{t.label}</span>
                            {Boolean(t.badge && t.badge > 0) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {effectiveTab === 'performance' && (
                    <PartnerPerformanceTab 
                        dashboardData={dashboardData}
                        loading={loading}
                        onNavigateToPayouts={(p) => setActiveTab('payouts')}
                        onNavigateToVisits={() => setActiveTab('visits')}
                        onNavigateToHistory={() => setActiveTab('history')}
                    />
                )}
                {effectiveTab === 'visits' && <ReferralVisitsTab />}
                {effectiveTab === 'payouts' && <PendingPayoutsTab />}
                {effectiveTab === 'rules' && <CommissionRulesTab />}
                {effectiveTab === 'rate-queue' && <ReferralRateQueueTab onUpdateCount={setUnmappedQueueCount} />}
                {effectiveTab === 'history' && <SettlementHistoryTab />}
                {effectiveTab === 'registry' && <PartnerRegistryTab />}
                {effectiveTab === 'rmp' && <PartnerRegistryTab isRmpOnly={true} defaultPartnerType="RMP" />}
                {effectiveTab === 'receivables' && <PartnerReceivablesTab />}
            </div>

            {/* PRINTABLE SUMMARY MODAL */}
            <FinancePrintableSummaryModal 
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                slotId="summary_doctor_dues"
                title={printConfig.title}
                subtitle={printConfig.subtitle}
                categoryLabel={printConfig.categoryLabel}
                kpis={printConfig.kpis}
                columns={printConfig.columns}
                data={printConfig.data}
                summaryTotals={printConfig.summaryTotals}
                onDownloadCsv={handleDownloadTabSummary}
            />
        </div>
    );
};
