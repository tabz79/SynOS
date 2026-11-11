import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Building2, 
    Layers, 
    FileText, 
    CreditCard, 
    Printer, 
    Download, 
    History, 
    Search, 
    Filter, 
    Plus,
    LayoutDashboard,
    Clock,
    Receipt,
    FileSpreadsheet,
    DollarSign,
    CheckCircle2
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { useGlobalFilter } from '@/context/GlobalFilterContext';
import { StandardFilterBar } from '@/components/layout/StandardFilterBar';
import { FinancePrintableSummaryModal } from './components/FinancePrintableSummaryModal';
import { CommercialDocumentViewer } from './components/documents/CommercialDocumentViewer';
import { DynamicDocumentRenderer } from './components/documents/DynamicDocumentRenderer';
import { B2BAccountsOverviewTab } from './components/b2b/B2BAccountsOverviewTab';
import { B2BRecordPaymentModal } from './components/b2b/B2BRecordPaymentModal';
import { useAuth } from '@/context/AuthContext';

export const B2BReceivablesTerminal = () => {
    const { tab = 'overview' } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { presetRange, customDates, isConsolidated, effectiveBranchId, isAdmin } = useGlobalFilter();

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [claimDocData, setClaimDocData] = useState(null);
    const [isClaimDocOpen, setIsClaimDocOpen] = useState(false);
    const tabsRef = useRef(null);

    const tabs = [
        { id: 'overview', label: 'Accounts Overview', icon: LayoutDashboard },
        { id: 'ledger', label: 'Account Ledger', icon: FileSpreadsheet },
        { id: 'bills', label: 'Outstanding Bills', icon: Clock },
        { id: 'recoveries', label: 'Recoveries & Settlement', icon: Receipt },
        { id: 'statements', label: 'Account Statements', icon: FileText }
    ];

    const loadDashboard = async () => {
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
            const res = await FinanceApi.getB2BReceivablesDashboard(bId, isCons, presetRange, start, end);
            setDashboardData(res);
        } catch (err) {
            console.error("Failed to load B2B receivables dashboard", err);
        } finally {
            setLoading(false);
            setIsUpdating(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, [isConsolidated, effectiveBranchId, presetRange, customDates?.start, customDates?.end]);

    const setActiveTab = (id) => {
        const basePath = window.location.pathname.startsWith('/finance/b2b-receivables')
            ? '/finance/b2b-receivables'
            : '/finance/receivables';
        navigate(`${basePath}/${id}`);
    };

    const handleGenerateStatement = async (account) => {
        try {
            const res = await FinanceApi.getPartnerClaimStatement({
                partnerId: account.accountId,
                onlyUnsettled: true
            });
            setClaimDocData(res);
            setIsClaimDocOpen(true);
        } catch (err) {
            console.error("Failed to generate claim statement", err);
            alert("Could not generate claim statement: " + err.message);
        }
    };

    const handleDownloadCsv = () => {
        const accountsList = dashboardData?.accounts || [];
        if (!accountsList.length) return;

        const headers = [
            "Partner / Institution",
            "Type",
            "Visits",
            "Tests",
            "Gross Tariff",
            "Concessions",
            "Net Billed",
            "Recovered",
            "Outstanding",
            "Recovery Rate (%)",
            "Oldest Unpaid Bill",
            "Last Payment"
        ];

        const rows = accountsList.map(a => [
            `"${(a.accountName || '').replace(/"/g, '""')}"`,
            `"${a.accountType || ''}"`,
            a.visits || 0,
            a.tests || 0,
            a.grossTariff || 0,
            a.concessions || 0,
            a.netBilled || 0,
            a.recovered || 0,
            a.outstanding || 0,
            a.recoveryRate || 0,
            `"${a.oldestUnpaidBill || ''}"`,
            `"${a.lastPayment || ''}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `B2B_Receivables_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getPrintSummaryConfig = () => {
        const accountsList = dashboardData?.accounts || [];
        const kpis = dashboardData?.kpis || {};
        return {
            title: "B2B Diagnostic Receivables Statement",
            subtitle: "Hospital, clinic and corporate accounts — billing, concessions, recoveries, and outstanding balances",
            categoryLabel: "B2B RECEIVABLES",
            kpis: [
                { label: "Net Billed", value: `₹${Number(kpis.netBilled || 0).toLocaleString()}`, color: "text-blue-600", subtext: "Total billable" },
                { label: "Recovered", value: `₹${Number(kpis.amountRecovered || 0).toLocaleString()}`, color: "text-emerald-600", subtext: `${kpis.recoveryRatePct || 0}% recovery` },
                { label: "Outstanding", value: `₹${Number(kpis.outstandingBalance || 0).toLocaleString()}`, color: "text-rose-600", subtext: `${kpis.accountsCount || 0} accounts` }
            ],
            columns: [
                { key: 'accountName', label: 'Account Name' },
                { key: 'accountType', label: 'Type' },
                { key: 'visits', label: 'Visits', align: 'center' },
                { key: 'grossTariff', label: 'Gross (₹)', align: 'right', render: v => `₹${Number(v || 0).toLocaleString()}` },
                { key: 'concessions', label: 'Concessions (₹)', align: 'right', render: (v, r) => `₹${Number(v || 0).toLocaleString()} (${r.concessionsPct || 0}%)` },
                { key: 'netBilled', label: 'Net Billed (₹)', align: 'right', render: v => `₹${Number(v || 0).toLocaleString()}` },
                { key: 'recovered', label: 'Recovered (₹)', align: 'right', render: v => `₹${Number(v || 0).toLocaleString()}` },
                { key: 'outstanding', label: 'Outstanding (₹)', align: 'right', render: v => `₹${Number(v || 0).toLocaleString()}` },
                { key: 'recoveryRate', label: 'Rate %', align: 'center', render: v => `${v || 0}%` },
                { key: 'oldestUnpaidBill', label: 'Oldest Due' }
            ],
            data: accountsList,
            summaryTotals: {
                grossTariff: `₹${accountsList.reduce((s, a) => s + Number(a.grossTariff || 0), 0).toLocaleString()}`,
                netBilled: `₹${accountsList.reduce((s, a) => s + Number(a.netBilled || 0), 0).toLocaleString()}`,
                recovered: `₹${accountsList.reduce((s, a) => s + Number(a.recovered || 0), 0).toLocaleString()}`,
                outstanding: `₹${accountsList.reduce((s, a) => s + Number(a.outstanding || 0), 0).toLocaleString()}`
            }
        };
    };

    const printConfig = getPrintSummaryConfig();

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden animate-in fade-in duration-300">
            {/* TERMINAL HEADER MATCHING DESIGN SPEC */}
            <div className="px-8 pt-8 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div>
                        <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight">
                            B2B Receivables
                        </h1>
                        <p className="text-xs text-zinc-500 font-medium mt-1">
                            Hospital, clinic and corporate accounts — billing, concessions, recoveries, and outstanding balances
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
                            onClick={handleDownloadCsv}
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
                            onClick={loadDashboard} 
                            className="p-2 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 rounded-xl transition-all cursor-pointer" 
                            title="Refresh Data"
                        >
                            <History size={16} className="text-zinc-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* TAB NAVIGATION (SEGMENTED PILL) */}
            <div ref={tabsRef} className="px-8 pb-2 flex items-center gap-1 overflow-x-auto scrollbar-thin">
                <div className="flex items-center bg-slate-200/60 dark:bg-zinc-800/80 p-1 rounded-xl">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            data-active-tab={tab === t.id ? "true" : "false"}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                tab === t.id 
                                ? 'bg-white dark:bg-zinc-700 text-synos-primary shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                            }`}
                        >
                            <t.icon size={14} />
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {(tab === 'overview' || tab === 'ledger') && (
                    <B2BAccountsOverviewTab 
                        dashboardData={dashboardData}
                        loading={loading}
                        onRefresh={loadDashboard}
                        onNavigateToBills={() => setActiveTab('bills')}
                        onNavigateToRecoveries={() => setActiveTab('recoveries')}
                        onGenerateStatement={handleGenerateStatement}
                    />
                )}
                {tab === 'bills' && (
                    <div className="p-8">
                        <B2BAccountsOverviewTab 
                            dashboardData={dashboardData}
                            loading={loading}
                            onRefresh={loadDashboard}
                            onNavigateToBills={() => setActiveTab('bills')}
                            onNavigateToRecoveries={() => setActiveTab('recoveries')}
                            onGenerateStatement={handleGenerateStatement}
                        />
                    </div>
                )}
                {tab === 'recoveries' && (
                    <div className="p-8">
                        <B2BAccountsOverviewTab 
                            dashboardData={dashboardData}
                            loading={loading}
                            onRefresh={loadDashboard}
                            onNavigateToBills={() => setActiveTab('bills')}
                            onNavigateToRecoveries={() => setActiveTab('recoveries')}
                            onGenerateStatement={handleGenerateStatement}
                        />
                    </div>
                )}
                {tab === 'statements' && (
                    <div className="p-8">
                        <B2BAccountsOverviewTab 
                            dashboardData={dashboardData}
                            loading={loading}
                            onRefresh={loadDashboard}
                            onNavigateToBills={() => setActiveTab('bills')}
                            onNavigateToRecoveries={() => setActiveTab('recoveries')}
                            onGenerateStatement={handleGenerateStatement}
                        />
                    </div>
                )}
            </div>

            {/* PRINTABLE SUMMARY MODAL */}
            <FinancePrintableSummaryModal 
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                slotId="summary_b2b_receivables"
                title={printConfig.title}
                subtitle={printConfig.subtitle}
                categoryLabel={printConfig.categoryLabel}
                kpis={printConfig.kpis}
                columns={printConfig.columns}
                data={printConfig.data}
                summaryTotals={printConfig.summaryTotals}
                onDownloadCsv={handleDownloadCsv}
            />

            {/* COMMERCIAL A4 CLAIM STATEMENT VIEWER */}
            {claimDocData && (
                <CommercialDocumentViewer
                    isOpen={isClaimDocOpen}
                    onClose={() => setIsClaimDocOpen(false)}
                    title={`B2B Diagnostic Invoice — ${claimDocData?.partner?.name || 'Account'}`}
                >
                    <DynamicDocumentRenderer 
                        slotId="b2b_tax_invoice" 
                        documentData={claimDocData} 
                        customStyles="max-w-[210mm] mx-auto bg-white p-8"
                    />
                </CommercialDocumentViewer>
            )}

            {/* RECORD PAYMENT MODAL */}
            <B2BRecordPaymentModal 
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                accounts={dashboardData?.accounts || []}
                onSuccess={loadDashboard}
            />
        </div>
    );
};
