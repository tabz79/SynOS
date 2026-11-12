import React, { useState, useMemo } from 'react';
import { 
    Layers, 
    Tag, 
    FileText, 
    Wallet, 
    Hourglass, 
    Building2, 
    TrendingUp, 
    Search, 
    Download, 
    ArrowRight, 
    CreditCard, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    PieChart, 
    ShieldCheck, 
    Receipt,
    RefreshCw,
    Percent,
    Banknote
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { B2BAccountDetailDrawer } from './B2BAccountDetailDrawer';
import { B2BRecordPaymentModal } from './B2BRecordPaymentModal';

export const B2BAccountsOverviewTab = ({ 
    dashboardData, 
    loading, 
    onRefresh,
    onNavigateToBills,
    onNavigateToRecoveries,
    onGenerateStatement 
}) => {
    const [selectedAccountId, setSelectedAccountId] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentAccount, setPaymentAccount] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [hoveredTrendIndex, setHoveredTrendIndex] = useState(null);

    const kpis = dashboardData?.kpis || {};
    const ageing = dashboardData?.ageing || {};
    const trend = dashboardData?.trend || [];
    const recoveryRate = dashboardData?.recoveryRate || {};
    const accounts = dashboardData?.accounts || [];
    const concessionAnalysis = dashboardData?.concessionAnalysis || {};
    const topAccounts = dashboardData?.topAccounts || [];
    const recentActivity = dashboardData?.recentActivity || [];

    // Filter accounts by search and type
    const filteredAccounts = useMemo(() => {
        return accounts.filter(a => {
            const matchesSearch = !searchQuery || 
                (a.accountName && a.accountName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (a.clinicName && a.clinicName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (a.location && a.location.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesType = typeFilter === 'All' || 
                (typeFilter === 'Hospitals' && a.accountType === 'Hospital') ||
                (typeFilter === 'Clinics' && a.accountType === 'Clinic') ||
                (typeFilter === 'Corporate' && a.accountType === 'Corporate');

            return matchesSearch && matchesType;
        });
    }, [accounts, searchQuery, typeFilter]);

    const handleAccountClick = (a) => {
        setSelectedAccountId(a.accountId);
        setIsDrawerOpen(true);
    };

    const handleOpenPayment = (acc) => {
        setPaymentAccount(acc);
        setIsPaymentModalOpen(true);
    };

    const handleExportCsv = () => {
        if (!filteredAccounts || filteredAccounts.length === 0) return;
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

        const rows = filteredAccounts.map(a => [
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
        link.setAttribute("download", `B2B_Receivables_Accounts_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Split Bar Calculations for Row 1
    const recoveredVal = Number(kpis.amountRecovered || 0);
    const outstandingVal = Number(kpis.outstandingBalance || 0);
    const totalObligation = recoveredVal + outstandingVal;
    
    let recoveredShare = 0;
    let outstandingShare = 0;
    if (totalObligation > 0) {
        if (outstandingVal === 0) {
            recoveredShare = 100;
            outstandingShare = 0;
        } else if (recoveredVal === 0) {
            recoveredShare = 0;
            outstandingShare = 100;
        } else {
            recoveredShare = Math.round((recoveredVal / totalObligation) * 1000) / 10;
            recoveredShare = Math.max(5, Math.min(95, recoveredShare));
            outstandingShare = Math.round((100 - recoveredShare) * 10) / 10;
        }
    } else {
        recoveredShare = 77.8;
        outstandingShare = 22.2;
    }

    // Trend SVG Curve Calculations
    const trendMax = useMemo(() => {
        const maxVal = Math.max(
            ...trend.map(t => Math.max(t.netBilled || 0, t.recovered || 0)), 
            600000
        );
        return Math.ceil(maxVal / 100000) * 100000;
    }, [trend]);

    const chartWidth = 560;
    const chartHeight = 160;
    const paddingX = 40;
    const paddingY = 25;

    const billedPoints = useMemo(() => {
        if (!trend || trend.length === 0) return [];
        return trend.map((t, idx) => {
            const x = paddingX + (idx / Math.max(1, trend.length - 1)) * (chartWidth - paddingX * 2);
            const y = chartHeight - paddingY - ((t.netBilled || 0) / trendMax) * (chartHeight - paddingY * 2);
            return { x, y, ...t };
        });
    }, [trend, trendMax]);

    const recoveredPoints = useMemo(() => {
        if (!trend || trend.length === 0) return [];
        return trend.map((t, idx) => {
            const x = paddingX + (idx / Math.max(1, trend.length - 1)) * (chartWidth - paddingX * 2);
            const y = chartHeight - paddingY - ((t.recovered || 0) / trendMax) * (chartHeight - paddingY * 2);
            return { x, y, ...t };
        });
    }, [trend, trendMax]);

    const createSmoothPath = (pts) => {
        if (!pts || pts.length === 0) return '';
        if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = i > 0 ? pts[i - 1] : pts[i];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = i < pts.length - 2 ? pts[i + 2] : p2;
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;
            d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
        }
        return d;
    };

    const billedPath = useMemo(() => createSmoothPath(billedPoints), [billedPoints]);
    const recoveredPath = useMemo(() => createSmoothPath(recoveredPoints), [recoveredPoints]);

    const lastBilled = billedPoints[billedPoints.length - 1];
    const lastRecovered = recoveredPoints[recoveredPoints.length - 1];

    // Ageing Donut Multi-segment Calculations
    const ageingCircumference = 2 * Math.PI * 52;
    const b0_pct = (ageing?.bucket_0_30?.pct || 64.6) / 100;
    const b1_pct = (ageing?.bucket_31_60?.pct || 22.3) / 100;
    const b2_pct = (ageing?.bucket_61_90?.pct || 8.9) / 100;
    const b3_pct = (ageing?.bucket_90_plus?.pct || 4.2) / 100;

    const s0_dash = b0_pct * ageingCircumference;
    const s1_dash = b1_pct * ageingCircumference;
    const s2_dash = b2_pct * ageingCircumference;
    const s3_dash = b3_pct * ageingCircumference;

    const s1_offset = -s0_dash;
    const s2_offset = -(s0_dash + s1_dash);
    const s3_offset = -(s0_dash + s1_dash + s2_dash);

    // Recovery Rate Gauge calculation
    const recoveryCircumference = 2 * Math.PI * 50;
    const recPct = Math.min(1, Math.max(0, (recoveryRate?.ratePct || 77.8) / 100));
    const recStroke = recPct * recoveryCircumference;

    const typeBadgeStyles = {
        Hospital: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200/70",
        Clinic: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/70",
        Corporate: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200/70"
    };

    return (
        <div className="space-y-3 sm:space-y-3.5 w-full animate-in fade-in duration-300">
            {/* ROW 1: SIGNATURE HERO SPLIT POD (TOTAL B2B NET BILLED HERO + AMOUNT RECOVERED VS OUTSTANDING BALANCE) */}
            <div className="min-h-[95px] p-3 sm:p-3.5 rounded-[20px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-4 items-center">
                
                {/* Section 1 (4 Cols): Total B2B Net Billed Hero Metric */}
                <div 
                    onClick={onNavigateToBills}
                    className="lg:col-span-4 flex items-center gap-3 min-w-0 pr-0 lg:pr-2 cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-white/70 dark:hover:bg-zinc-800/70 transition-all group"
                    title="Click to view all B2B invoices and bills"
                >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-b from-[#EBF5FF] to-[#D6EBFE] border border-white/90 dark:border-white/10 shadow-[0_4px_12px_rgba(37,99,235,0.12)] flex items-center justify-center text-[#1C6CF2] dark:text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Building2 size={22} strokeWidth={2.2} />
                    </div>

                    <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal group-hover:text-synos-primary transition-colors">
                                Total B2B Net Billed
                            </h3>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]/70 dark:bg-emerald-950/50 dark:text-emerald-400 shadow-2xs">
                                {kpis.recoveryRatePct || 77.8}% Recovery Rate
                            </span>
                        </div>
                        <p className="text-xl sm:text-2xl lg:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-none my-0.5 tabular-nums">
                            ₹{(kpis.netBilled || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-zinc-400 truncate">
                            ₹{(kpis.grossTariff || 0).toLocaleString()} Gross Tariff &nbsp;•&nbsp; ₹{(kpis.concessionsGranted || 0).toLocaleString()} Concessions ({kpis.concessionsPct || 11.9}%)
                        </p>
                    </div>
                </div>

                {/* Section 2 (8 Cols): Recovered vs Outstanding Dues Split Slider */}
                <div className="lg:col-span-8 lg:border-l lg:border-slate-200 dark:lg:border-zinc-800 lg:pl-4 xl:pl-5 flex flex-col justify-between py-0.5 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                            Amount Recovered vs Outstanding Balance
                        </h3>
                        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold">
                            <span className="text-slate-500 dark:text-zinc-400">Total B2B Invoiced:</span>
                            <span className="text-slate-900 dark:text-white tabular-nums font-extrabold">
                                ₹{(kpis.netBilled || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Sleek Dual-Channel Split Bar */}
                    <div className="relative h-[12px] sm:h-[14px] rounded-full bg-[#E2ECF6] dark:bg-zinc-800 flex items-center overflow-visible shadow-inner">
                        <div 
                            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-l-full transition-all duration-500 shadow-[0_2px_8px_rgba(16,185,129,0.25)]"
                            style={{ width: `${recoveredShare}%` }}
                        />
                        <div 
                            className="h-full bg-gradient-to-r from-[#FCA5A5] via-[#FDA4AF] to-[#FECDD3] rounded-r-full transition-all duration-500 shadow-[0_2px_8px_rgba(253,164,175,0.25)]"
                            style={{ width: `${outstandingShare}%` }}
                        />
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-white dark:bg-zinc-100 shadow-[0_2px_8px_rgba(15,35,60,0.22),0_0_0_2px_#FFFFFF] border border-slate-100 pointer-events-none transition-all duration-500 z-10 flex items-center justify-center"
                            style={{ left: `${recoveredShare}%` }}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                        </div>
                    </div>

                    {/* Two Channel Stat Pods Below */}
                    <div className="flex items-center justify-between pt-0.5">
                        {/* Left Stat Pod: Amount Recovered */}
                        <div 
                            onClick={onNavigateToRecoveries}
                            className="flex items-center gap-2 cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-white/70 dark:hover:bg-zinc-800/70 transition-all group"
                            title="Click to view Recoveries & Settlements"
                        >
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-[8px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100/90 dark:border-emerald-800/40 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                <Wallet size={14} strokeWidth={2.3} />
                            </div>
                            <div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-none group-hover:text-emerald-600 transition-colors">
                                        ₹{(kpis.amountRecovered || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded-md border border-emerald-200/60 tabular-nums">
                                        {recoveredShare}%
                                    </span>
                                </div>
                                <span className="text-[10px] sm:text-[11px] text-slate-600 dark:text-zinc-400 font-bold block">
                                    Amount Recovered
                                </span>
                            </div>
                        </div>

                        {/* Right Stat Pod: Outstanding Balance */}
                        <div 
                            onClick={onNavigateToBills}
                            className="flex items-center gap-2 text-right cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-white/70 dark:hover:bg-zinc-800/70 transition-all group"
                            title="Click to view Outstanding Bills"
                        >
                            <div>
                                <div className="flex items-baseline gap-1.5 justify-end">
                                    <span className="text-[10px] font-bold text-[#E11D48] dark:text-rose-400 bg-[#FFF1F2] dark:bg-rose-950/60 px-1 py-0.2 rounded-md border border-rose-100 dark:border-rose-800/40 tabular-nums">
                                        {outstandingShare}%
                                    </span>
                                    <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-none group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                        ₹{(kpis.outstandingBalance || 0).toLocaleString()}
                                    </span>
                                </div>
                                <span className="text-[10px] sm:text-[11px] text-slate-600 dark:text-zinc-400 font-bold block">
                                    Outstanding Due ({kpis.accountsCount || 0} Partners • {kpis.unpaidBillsCount || 0} Bills)
                                </span>
                            </div>
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-[8px] bg-[#FFF1F2] text-[#FB7185] dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100/90 dark:border-rose-800/40 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                <Hourglass size={14} strokeWidth={2.3} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 2: 5 ESSENTIAL B2B KPI CARDS (GROSS TARIFF, CONCESSIONS, NET BILLED, AMOUNT RECOVERED, OUTSTANDING BALANCE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5">
                {/* 1. Gross Tariff (B2B) */}
                <div 
                    onClick={onNavigateToBills}
                    className="p-3 sm:p-3.5 rounded-[20px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer hover:shadow-[0_10px_28px_rgba(15,23,42,0.1)] transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[8px] bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <Layers size={15} strokeWidth={2.3} />
                        </div>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]/70 dark:bg-emerald-950/50 dark:text-emerald-400 shadow-2xs tabular-nums">
                            {kpis.grossTariffChangePct !== undefined ? `${kpis.grossTariffChangePct >= 0 ? '+' : ''}${kpis.grossTariffChangePct}%` : '+14.8%'}
                        </span>
                    </div>
                    <div className="mt-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block tracking-normal">
                            Gross Tariff (B2B)
                        </span>
                        <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-tight my-0.5 group-hover:text-synos-primary transition-colors">
                            ₹{(kpis.grossTariff || 0).toLocaleString()}
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block truncate">
                            From {(kpis.visitsCount || 0).toLocaleString()} visits • {(kpis.testsCount || 0).toLocaleString()} tests
                        </span>
                    </div>
                </div>

                {/* 2. Concessions Granted */}
                <div 
                    onClick={onNavigateToBills}
                    className="p-3 sm:p-3.5 rounded-[20px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer hover:shadow-[0_10px_28px_rgba(15,23,42,0.1)] transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[8px] bg-[#FAF5FF] text-[#A855F7] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100/90 dark:border-purple-800/40 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <Tag size={15} strokeWidth={2.3} />
                        </div>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FFF1F2] text-[#E11D48] border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 shadow-2xs tabular-nums">
                            {kpis.concessionsPct || 42.7}%
                        </span>
                    </div>
                    <div className="mt-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block tracking-normal">
                            Concessions Granted
                        </span>
                        <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-tight my-0.5 group-hover:text-purple-600 transition-colors">
                            ₹{(kpis.concessionsGranted || 0).toLocaleString()}
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block truncate">
                            Of gross tariff value
                        </span>
                    </div>
                </div>

                {/* 3. Net Billed */}
                <div 
                    onClick={onNavigateToBills}
                    className="p-3 sm:p-3.5 rounded-[20px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer hover:shadow-[0_10px_28px_rgba(15,23,42,0.1)] transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[8px] bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <FileText size={15} strokeWidth={2.3} />
                        </div>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]/70 dark:bg-emerald-950/50 dark:text-emerald-400 shadow-2xs tabular-nums">
                            {kpis.netBilledChangePct !== undefined ? `${kpis.netBilledChangePct >= 0 ? '+' : ''}${kpis.netBilledChangePct}%` : '+233%'}
                        </span>
                    </div>
                    <div className="mt-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block tracking-normal">
                            Net Billed
                        </span>
                        <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-tight my-0.5 group-hover:text-synos-primary transition-colors">
                            ₹{(kpis.netBilled || 0).toLocaleString()}
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block truncate">
                            Billable after concessions
                        </span>
                    </div>
                </div>

                {/* 4. Amount Recovered */}
                <div 
                    onClick={onNavigateToRecoveries}
                    className="p-3 sm:p-3.5 rounded-[20px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer hover:shadow-[0_10px_28px_rgba(15,23,42,0.1)] transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[8px] bg-[#FAF5FF] text-[#A855F7] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100/90 dark:border-purple-800/40 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <Wallet size={15} strokeWidth={2.3} />
                        </div>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]/70 dark:bg-emerald-950/50 dark:text-emerald-400 shadow-2xs tabular-nums">
                            {kpis.recoveryRatePct || 163.2}%
                        </span>
                    </div>
                    <div className="mt-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block tracking-normal">
                            Amount Recovered
                        </span>
                        <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-tight my-0.5 group-hover:text-emerald-600 transition-colors">
                            ₹{(kpis.amountRecovered || 0).toLocaleString()}
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block truncate">
                            Recovery rate (of net billed)
                        </span>
                    </div>
                </div>

                {/* 5. Outstanding Balance */}
                <div 
                    onClick={onNavigateToBills}
                    className="p-3 sm:p-3.5 rounded-[20px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer hover:shadow-[0_10px_28px_rgba(15,23,42,0.1)] transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[8px] bg-[#FAF5FF] text-[#A855F7] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100/90 dark:border-purple-800/40 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <Hourglass size={15} strokeWidth={2.3} />
                        </div>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FFF1F2] text-[#E11D48] border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 shadow-2xs tabular-nums">
                            {kpis.outstandingPct || 95.1}%
                        </span>
                    </div>
                    <div className="mt-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block tracking-normal">
                            Outstanding Balance
                        </span>
                        <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-tight my-0.5 group-hover:text-rose-600 transition-colors">
                            ₹{(kpis.outstandingBalance || 0).toLocaleString()}
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block truncate">
                            {(kpis.accountsCount || 0).toLocaleString()} partners • {(kpis.unpaidBillsCount || 0).toLocaleString()} unpaid bills
                        </span>
                    </div>
                </div>
            </div>

            {/* ROW 3: RECEIVABLES AGEING (LEFT), TREND WITH DAY PILLARS (MIDDLE), RECOVERY RATE (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 items-stretch">
                {/* Pod 1: Receivables Ageing (4 cols) */}
                <div className="lg:col-span-4 p-3.5 sm:p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200 dark:border-zinc-800">
                            <div className="w-6 h-6 rounded-[7px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                <Clock size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                                Receivables Ageing <span className="text-[11px] font-normal text-slate-400 dark:text-zinc-500">(Due ₹{(kpis.outstandingBalance || 0).toLocaleString()})</span>
                            </h3>
                        </div>

                        {/* Donut and Age buckets */}
                        <div className="flex items-center justify-between gap-3 py-3">
                            {/* SVG Donut */}
                            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center">
                                <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
                                    <circle
                                        cx="65"
                                        cy="65"
                                        r="52"
                                        fill="transparent"
                                        stroke="#E2ECF6"
                                        strokeWidth="15"
                                        className="dark:stroke-zinc-800"
                                    />
                                    {/* 0-30 days (Sky Blue) */}
                                    <circle
                                        cx="65"
                                        cy="65"
                                        r="52"
                                        fill="transparent"
                                        stroke="#38BDF8"
                                        strokeWidth="15"
                                        strokeDasharray={`${s0_dash} ${ageingCircumference}`}
                                        strokeDashoffset="0"
                                    />
                                    {/* 31-60 days (Purple) */}
                                    <circle
                                        cx="65"
                                        cy="65"
                                        r="52"
                                        fill="transparent"
                                        stroke="#A855F7"
                                        strokeWidth="15"
                                        strokeDasharray={`${s1_dash} ${ageingCircumference}`}
                                        strokeDashoffset={s1_offset}
                                    />
                                    {/* 61-90 days (Rose) */}
                                    <circle
                                        cx="65"
                                        cy="65"
                                        r="52"
                                        fill="transparent"
                                        stroke="#FB7185"
                                        strokeWidth="15"
                                        strokeDasharray={`${s2_dash} ${ageingCircumference}`}
                                        strokeDashoffset={s2_offset}
                                    />
                                    {/* >90 days (Crimson) */}
                                    <circle
                                        cx="65"
                                        cy="65"
                                        r="52"
                                        fill="transparent"
                                        stroke="#E11D48"
                                        strokeWidth="15"
                                        strokeDasharray={`${s3_dash} ${ageingCircumference}`}
                                        strokeDashoffset={s3_offset}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                                        {ageing.formattedTotal || `₹${((kpis.outstandingBalance || 0) / 100000).toFixed(2)}L`}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                        OUTSTANDING
                                    </span>
                                </div>
                            </div>

                            {/* Legend items */}
                            <div className="flex-1 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#38BDF8] shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">0 - 30 Days</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                                        ₹{(ageing.bucket_0_30?.amount || 0).toLocaleString()} <span className="text-slate-400 dark:text-zinc-500 text-[10px]">({ageing.bucket_0_30?.pct || 0}%)</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#A855F7] shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">31 - 60 Days</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                                        ₹{(ageing.bucket_31_60?.amount || 0).toLocaleString()} <span className="text-slate-400 dark:text-zinc-500 text-[10px]">({ageing.bucket_31_60?.pct || 0}%)</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#FB7185] shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">61 - 90 Days</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                                        ₹{(ageing.bucket_61_90?.amount || 0).toLocaleString()} <span className="text-slate-400 dark:text-zinc-500 text-[10px]">({ageing.bucket_61_90?.pct || 0}%)</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#E11D48] shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">&gt; 90 Days</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                                        ₹{(ageing.bucket_90_plus?.amount || 0).toLocaleString()} <span className="text-slate-400 dark:text-zinc-500 text-[10px]">({ageing.bucket_90_plus?.pct || 0}%)</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pod 2: Billing & Recovery Trend with Day Pillars (5 cols) */}
                <div className="lg:col-span-5 p-3.5 sm:p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100 dark:border-sky-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                <TrendingUp size={13} strokeWidth={2.3} />
                            </div>
                            <div>
                                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal leading-tight">
                                    Billing & Recovery Trend
                                </h3>
                                <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-none">
                                    7-day trajectory & recovery velocity
                                </p>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-3 text-xs font-semibold">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                                <span className="text-[11px] text-slate-600 dark:text-zinc-300 font-bold">Net Billed</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                                <span className="text-[11px] text-slate-600 dark:text-zinc-300 font-bold">Recovered</span>
                            </div>
                        </div>
                    </div>

                    {/* SVG Chart with Signature Day Pillars */}
                    <div className="relative w-full h-[150px] mt-1 select-none">
                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                            {/* Horizontal Grid lines */}
                            {[0, 200000, 400000, 600000].map((val) => {
                                const y = chartHeight - paddingY - (val / trendMax) * (chartHeight - paddingY * 2);
                                return (
                                    <g key={val}>
                                        <line 
                                            x1={paddingX - 10} 
                                            y1={y} 
                                            x2={chartWidth - paddingX + 15} 
                                            y2={y} 
                                            stroke="currentColor" 
                                            strokeDasharray="2 3"
                                            className="text-slate-200 dark:text-zinc-800"
                                            strokeWidth="1"
                                        />
                                        <text 
                                            x={paddingX - 15} 
                                            y={y + 3} 
                                            textAnchor="end" 
                                            className="text-[9px] fill-slate-400 dark:fill-zinc-500 font-medium"
                                        >
                                            ₹{val === 0 ? '0' : `${val / 100000}L`}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Tactile Day Pillars (Capsule columns behind each day) */}
                            {trend.map((t, idx) => {
                                const x = paddingX + (idx / Math.max(1, trend.length - 1)) * (chartWidth - paddingX * 2);
                                const isHovered = hoveredTrendIndex === idx;
                                const isLast = idx === trend.length - 1;
                                return (
                                    <rect 
                                        key={`pillar-${idx}`}
                                        x={x - 14} 
                                        y={paddingY - 8} 
                                        width={28} 
                                        height={chartHeight - paddingY * 2 + 16} 
                                        rx={10} 
                                        className={cn(
                                            "transition-colors",
                                            isHovered 
                                                ? "fill-sky-500/15 dark:fill-sky-400/20" 
                                                : isLast 
                                                    ? "fill-blue-500/8 dark:fill-blue-500/15" 
                                                    : "fill-slate-200/40 dark:fill-zinc-800/30"
                                        )}
                                    />
                                );
                            })}

                            {/* Net Billed Smooth Curve */}
                            <path d={billedPath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />

                            {/* Recovered Smooth Curve */}
                            <path d={recoveredPath} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />

                            {/* Data points */}
                            {billedPoints.map((pt, idx) => (
                                <circle 
                                    key={`bill-${idx}`}
                                    cx={pt.x} 
                                    cy={pt.y} 
                                    r={hoveredTrendIndex === idx ? 5 : 3.5}
                                    className="fill-white dark:fill-zinc-900 stroke-blue-600 transition-all cursor-pointer"
                                    strokeWidth="2.5"
                                    onMouseEnter={() => setHoveredTrendIndex(idx)}
                                    onMouseLeave={() => setHoveredTrendIndex(null)}
                                />
                            ))}

                            {recoveredPoints.map((pt, idx) => (
                                <circle 
                                    key={`rec-${idx}`}
                                    cx={pt.x} 
                                    cy={pt.y} 
                                    r={hoveredTrendIndex === idx ? 5 : 3.5}
                                    className="fill-white dark:fill-zinc-900 stroke-emerald-500 transition-all cursor-pointer"
                                    strokeWidth="2.5"
                                    onMouseEnter={() => setHoveredTrendIndex(idx)}
                                    onMouseLeave={() => setHoveredTrendIndex(null)}
                                />
                            ))}

                            {/* Callout badges on last points */}
                            {lastBilled && (
                                <g transform={`translate(${lastBilled.x + 8}, ${lastBilled.y - 12})`}>
                                    <rect x="0" y="0" width="52" height="20" rx="6" fill="#2563EB" />
                                    <text x="26" y="13" textAnchor="middle" fill="#ffffff" className="text-[10px] font-bold font-mono">
                                        ₹{(lastBilled.netBilled >= 100000 ? `${(lastBilled.netBilled / 100000).toFixed(2)}L` : `${Math.round(lastBilled.netBilled / 1000)}K`)}
                                    </text>
                                </g>
                            )}

                            {lastRecovered && (
                                <g transform={`translate(${lastRecovered.x + 8}, ${lastRecovered.y + 2})`}>
                                    <rect x="0" y="0" width="52" height="20" rx="6" fill="#10B981" />
                                    <text x="26" y="13" textAnchor="middle" fill="#ffffff" className="text-[10px] font-bold font-mono">
                                        ₹{(lastRecovered.recovered >= 100000 ? `${(lastRecovered.recovered / 100000).toFixed(2)}L` : `${Math.round(lastRecovered.recovered / 1000)}K`)}
                                    </text>
                                </g>
                            )}

                            {/* X-axis day labels */}
                            {trend.map((t, idx) => {
                                const x = paddingX + (idx / Math.max(1, trend.length - 1)) * (chartWidth - paddingX * 2);
                                const isLast = idx === trend.length - 1;
                                return (
                                    <text 
                                        key={`label-${idx}`}
                                        x={x} 
                                        y={chartHeight - 4} 
                                        textAnchor="middle" 
                                        className={cn(
                                            "text-[9px] font-semibold",
                                            isLast ? "fill-blue-600 font-bold" : "fill-slate-400 dark:fill-zinc-500"
                                        )}
                                    >
                                        {t.day} {t.label ? t.label.split(' ')[0] : ''}
                                    </text>
                                );
                            })}
                        </svg>

                        {/* Interactive Tooltip */}
                        {hoveredTrendIndex !== null && trend[hoveredTrendIndex] && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-lg pointer-events-none z-10 flex items-center gap-3 backdrop-blur-xs">
                                <span className="font-bold">{trend[hoveredTrendIndex].date}</span>
                                <span className="text-blue-300">Net Billed: ₹{(trend[hoveredTrendIndex].netBilled || 0).toLocaleString()}</span>
                                <span className="text-emerald-300">Recovered: ₹{(trend[hoveredTrendIndex].recovered || 0).toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pod 3: Recovery Rate Gauge (3 cols) */}
                <div className="lg:col-span-3 p-3.5 sm:p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200 dark:border-zinc-800">
                            <div className="w-6 h-6 rounded-[7px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                <PieChart size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                                Recovery Rate
                            </h3>
                        </div>

                        {/* Gauge & Legend */}
                        <div className="flex items-center justify-between gap-3 py-3">
                            <div className="relative w-24 h-24 sm:w-26 sm:h-26 shrink-0 flex items-center justify-center">
                                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="50"
                                        fill="transparent"
                                        stroke="#E2ECF6"
                                        strokeWidth="12"
                                        className="dark:stroke-zinc-800"
                                    />
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="50"
                                        fill="transparent"
                                        stroke="#10B981"
                                        strokeWidth="12"
                                        strokeDasharray={`${recStroke} ${recoveryCircumference}`}
                                        strokeDashoffset="0"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                                        {recoveryRate.ratePct || 77.8}%
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                        RECOVERED
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs flex-1">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">Recovered</span>
                                    </div>
                                    <span className="font-extrabold text-slate-900 dark:text-white tabular-nums text-xs pl-3.5 block mt-0.5">
                                        ₹{(recoveryRate.recoveredAmount || 0).toLocaleString()}
                                    </span>
                                </div>

                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">Outstanding</span>
                                    </div>
                                    <span className="font-extrabold text-slate-900 dark:text-white tabular-nums text-xs pl-3.5 block mt-0.5">
                                        ₹{(recoveryRate.outstandingAmount || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 text-center pt-1.5 border-t border-slate-200 dark:border-zinc-800">
                        Of ₹{(recoveryRate.totalNetBilled || 0).toLocaleString()} net billed
                    </p>
                </div>
            </div>

            {/* ROW 3: MAIN TABLE — B2B PARTNER ACCOUNTS (HOSPITALS, CLINICS & CORPORATE) */}
            <div className="p-4 sm:p-5 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] space-y-3.5">
                {/* Header with Filters & Search */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-[8px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                            <Building2 size={15} strokeWidth={2.3} />
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-normal">
                            B2B Partner Accounts (Hospitals, Clinics & Corporate)
                        </h3>
                    </div>

                    {/* Filter Segmented Inset Pills */}
                    <div className="flex items-center gap-1 bg-[#D6E3EF] dark:bg-zinc-800/80 p-1 rounded-[12px] shadow-[inset_0_1px_2px_rgba(15,35,60,0.12)] border border-white/60 dark:border-zinc-700/60 flex-wrap">
                        {['All Partners', 'Hospitals', 'Clinics', 'Corporate'].map((filterName) => {
                            const val = filterName === 'All Partners' ? 'All' : filterName;
                            const isActive = typeFilter === val;
                            return (
                                <button
                                    key={filterName}
                                    onClick={() => setTypeFilter(val)}
                                    className={cn(
                                        "px-3 py-1 rounded-[8px] text-xs transition-all cursor-pointer whitespace-nowrap",
                                        isActive
                                            ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs font-extrabold"
                                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 font-semibold"
                                    )}
                                >
                                    {filterName}
                                </button>
                            );
                        })}
                    </div>

                    {/* Search & Export */}
                    <div className="flex items-center gap-2.5">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search partner, clinic, location..."
                                className="pl-8.5 pr-3 py-1.5 bg-white/90 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-hidden focus:border-synos-primary shadow-2xs w-52"
                            />
                        </div>

                        <button 
                            onClick={handleExportCsv}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 transition-all shadow-2xs cursor-pointer"
                        >
                            <Download size={13} className="text-slate-400" />
                            <span>Export</span>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                                <th className="py-2.5 px-3">Partner / Institution</th>
                                <th className="py-2.5 px-2">Type</th>
                                <th className="py-2.5 px-2 text-center">Visits</th>
                                <th className="py-2.5 px-2 text-center">Tests</th>
                                <th className="py-2.5 px-2 text-right">Gross Tariff</th>
                                <th className="py-2.5 px-2 text-right">Concessions</th>
                                <th className="py-2.5 px-2 text-right">Net Billed</th>
                                <th className="py-2.5 px-2 text-right">Recovered</th>
                                <th className="py-2.5 px-2 text-center">Outstanding</th>
                                <th className="py-2.5 px-2 text-right">Recovery Rate</th>
                                <th className="py-2.5 px-2 text-right">Oldest Unpaid Bill</th>
                                <th className="py-2.5 px-3 text-right">Last Payment</th>
                                <th className="py-2.5 px-2 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 dark:divide-zinc-800/60">
                            {filteredAccounts.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="py-12 text-center text-slate-400 dark:text-zinc-500">
                                        No B2B accounts found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredAccounts.map((a) => (
                                    <tr 
                                        key={a.accountId}
                                        className="hover:bg-slate-200/40 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                                        onClick={() => handleAccountClick(a)}
                                    >
                                        {/* Partner / Institution */}
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-6 h-6 rounded-full bg-[#EBF5FF] dark:bg-sky-950/40 text-[#1C6CF2] dark:text-sky-400 flex items-center justify-center shrink-0">
                                                    <Building2 size={12} />
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-zinc-100 group-hover:text-synos-primary transition-colors">
                                                    {a.accountName}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Type */}
                                        <td className="py-3 px-2">
                                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", typeBadgeStyles[a.accountType] || "bg-slate-100 text-slate-600")}>
                                                {a.accountType}
                                            </span>
                                        </td>

                                        {/* Visits */}
                                        <td className="py-3 px-2 text-center font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                                            {a.visits || 0}
                                        </td>

                                        {/* Tests */}
                                        <td className="py-3 px-2 text-center font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                                            {a.tests || 0}
                                        </td>

                                        {/* Gross Tariff */}
                                        <td className="py-3 px-2 text-right font-medium text-slate-600 dark:text-zinc-400 tabular-nums">
                                            ₹{(a.grossTariff || 0).toLocaleString()}
                                        </td>

                                        {/* Concessions */}
                                        <td className="py-3 px-2 text-right font-medium text-slate-600 dark:text-zinc-400 tabular-nums">
                                            ₹{(a.concessions || 0).toLocaleString()} <span className="text-slate-400 text-[10px]">({a.concessionsPct || 0}%)</span>
                                        </td>

                                        {/* Net Billed */}
                                        <td className="py-3 px-2 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">
                                            ₹{(a.netBilled || 0).toLocaleString()}
                                        </td>

                                        {/* Recovered */}
                                        <td className="py-3 px-2 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                            ₹{(a.recovered || 0).toLocaleString()}
                                        </td>

                                        {/* Outstanding */}
                                        <td className="py-3 px-2 text-center">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums border",
                                                a.outstanding > 0 
                                                    ? 'bg-[#FFF1F2] text-[#E11D48] border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400' 
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400'
                                            )}>
                                                ₹{(a.outstanding || 0).toLocaleString()}
                                            </span>
                                        </td>

                                        {/* Recovery Rate */}
                                        <td className="py-3 px-2 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className="font-bold text-slate-800 dark:text-zinc-200 tabular-nums text-[11px]">
                                                    {a.recoveryRate || 0}%
                                                </span>
                                                <div className="w-10 h-1.5 rounded-full bg-[#E2ECF6] dark:bg-zinc-800 overflow-hidden shrink-0">
                                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, a.recoveryRate || 0)}%` }} />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Oldest Unpaid Bill */}
                                        <td className="py-3 px-2 text-right text-slate-500 dark:text-zinc-400 tabular-nums text-[11px]">
                                            {a.oldestUnpaidBill !== '-' ? `${a.oldestUnpaidBill} (${a.oldestUnpaidDays}d)` : '-'}
                                        </td>

                                        {/* Last Payment */}
                                        <td className="py-3 px-3 text-right text-slate-500 dark:text-zinc-400 tabular-nums text-[11px]">
                                            {a.lastPayment || '-'}
                                        </td>

                                        {/* Action Arrow */}
                                        <td className="py-3 px-2 text-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAccountClick(a);
                                                }}
                                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 group-hover:text-synos-primary transition-colors cursor-pointer"
                                                title="View Account Profile & Invoices"
                                            >
                                                <ArrowRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ROW 4: 3 BOTTOM TACTILE PODS (CONCESSION ANALYSIS, TOP ACCOUNTS, RECENT ACTIVITY) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-3.5 items-stretch">
                {/* Bottom Pod 1: Concession Analysis (B2B) */}
                <div className="p-3.5 sm:p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-[7px] bg-[#FAF5FF] text-[#A855F7] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                    <Tag size={13} strokeWidth={2.3} />
                                </div>
                                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                                    Concession Analysis (B2B)
                                </h3>
                            </div>
                        </div>

                        <div className="py-2.5">
                            <div className="flex items-center gap-2">
                                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                                    ₹{(concessionAnalysis.totalConcessions || 0).toLocaleString()}
                                </span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FFF1F2] text-[#E11D48] border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400">
                                    {concessionAnalysis.concessionsPct || 11.9}%
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                                Total concessions on ₹{(concessionAnalysis.grossTariff || 0).toLocaleString()} gross tariff
                            </p>

                            {/* Split Progress Bar */}
                            <div className="w-full h-2 rounded-full bg-[#E2ECF6] dark:bg-zinc-800 flex overflow-hidden my-3 shadow-inner">
                                <div className="bg-[#38BDF8] h-full" style={{ width: `${concessionAnalysis.negotiatedPct || 70.6}%` }} />
                                <div className="bg-[#A855F7] h-full" style={{ width: `${concessionAnalysis.adHocPct || 23.1}%` }} />
                                <div className="bg-[#2DD4BF] h-full" style={{ width: `${concessionAnalysis.otherAdjustmentsPct || 6.3}%` }} />
                            </div>

                            {/* Breakdown List */}
                            <div className="space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#38BDF8] shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">Negotiated / Rate Card</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                                        ₹{(concessionAnalysis.negotiatedAmount || 0).toLocaleString()} <span className="text-slate-400 text-[10px]">({concessionAnalysis.negotiatedPct || 0}%)</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#A855F7] shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">Ad-hoc (Reception)</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                                        ₹{(concessionAnalysis.adHocAmount || 0).toLocaleString()} <span className="text-slate-400 text-[10px]">({concessionAnalysis.adHocPct || 0}%)</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#2DD4BF] shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">Other Adjustments</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                                        ₹{(concessionAnalysis.otherAdjustmentsAmount || 0).toLocaleString()} <span className="text-slate-400 text-[10px]">({concessionAnalysis.otherAdjustmentsPct || 0}%)</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Pod 2: Top Accounts by Outstanding */}
                <div className="p-3.5 sm:p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200 dark:border-zinc-800">
                            <div className="w-6 h-6 rounded-[7px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                <Building2 size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                                Top Accounts by Outstanding
                            </h3>
                        </div>

                        <div className="divide-y divide-slate-200/70 dark:divide-zinc-800/60 text-xs mt-1">
                            {topAccounts.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 dark:text-zinc-500 text-xs">
                                    No accounts with outstanding dues.
                                </div>
                            ) : (
                                topAccounts.map((a, idx) => (
                                    <div 
                                        key={a.accountId || idx} 
                                        onClick={() => handleAccountClick(a)}
                                        className="py-2 flex items-center justify-between gap-3 hover:bg-slate-200/40 dark:hover:bg-zinc-800/40 rounded-lg px-1 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div className="w-5.5 h-5.5 rounded-full bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-2xs">
                                                <Building2 size={11} />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-zinc-200 truncate group-hover:text-synos-primary transition-colors text-xs">
                                                {a.name}
                                            </span>
                                        </div>

                                        <div className="w-16 h-1.5 rounded-full bg-[#E2ECF6] dark:bg-zinc-800 overflow-hidden shrink-0 shadow-inner">
                                            <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(100, a.sharePct || 20)}%` }} />
                                        </div>

                                        <span className="text-xs font-extrabold text-slate-900 dark:text-white tabular-nums shrink-0">
                                            ₹{(a.outstanding || 0).toLocaleString()}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Pod 3: Recent Recovery Activity */}
                <div className="p-3.5 sm:p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-[7px] bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                    <Receipt size={13} strokeWidth={2.3} />
                                </div>
                                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                                    Recent Recovery Activity
                                </h3>
                            </div>
                            <button
                                onClick={onNavigateToRecoveries}
                                className="text-[11px] font-bold text-synos-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                                <span>View All</span>
                                <ArrowRight size={12} />
                            </button>
                        </div>

                        {/* Activity Feed */}
                        <div className="divide-y divide-slate-200/70 dark:divide-zinc-800/60 mt-1">
                            {recentActivity.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 dark:text-zinc-500 text-xs">
                                    No recent payment recovery activity.
                                </div>
                            ) : (
                                recentActivity.slice(0, 3).map((act, idx) => (
                                    <div key={act.id || idx} className="py-2 flex items-start gap-2.5">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                            <CreditCard size={13} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-1">
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                                                    Payment received: {act.accountName}
                                                </h4>
                                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0">
                                                    {act.timestamp}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                                                {act.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="pt-2 text-[10px] text-slate-500 dark:text-zinc-400 text-center border-t border-slate-200 dark:border-zinc-800">
                        Audited B2B receivables ledger & payment recoveries
                    </div>
                </div>
            </div>

            {/* Slide-out Account Detail Drawer */}
            <B2BAccountDetailDrawer 
                accountId={selectedAccountId}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onRecordPayment={handleOpenPayment}
                onGenerateStatement={onGenerateStatement}
            />

            {/* Record Payment Modal */}
            <B2BRecordPaymentModal 
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                account={paymentAccount}
                accounts={accounts}
                onSuccess={onRefresh}
            />
        </div>
    );
};
