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
    RefreshCw
} from 'lucide-react';
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
        Hospital: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/50",
        Clinic: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-200/50",
        Corporate: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/50"
    };

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-300">
            {/* ROW 1: 5 TOP KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Gross Tariff (B2B) */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
                            <Layers size={20} />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60">
                            +{kpis.grossTariffChangePct || 14.8}%
                        </span>
                    </div>
                    <div className="mt-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">
                            Gross Tariff (B2B)
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums tracking-tight">
                            ₹{(kpis.grossTariff || 0).toLocaleString()}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 block mt-1">
                            From {(kpis.visitsCount || 0).toLocaleString()} visits • {(kpis.testsCount || 0).toLocaleString()} tests
                        </span>
                    </div>
                </div>

                {/* 2. Concessions Granted */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-800/40">
                            <Tag size={20} />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60">
                            {kpis.concessionsPct || 11.9}%
                        </span>
                    </div>
                    <div className="mt-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">
                            Concessions Granted
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums tracking-tight">
                            ₹{(kpis.concessionsGranted || 0).toLocaleString()}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 block mt-1">
                            Of gross tariff value
                        </span>
                    </div>
                </div>

                {/* 3. Net Billed */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
                            <FileText size={20} />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60">
                            +{kpis.netBilledChangePct || 14.2}%
                        </span>
                    </div>
                    <div className="mt-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">
                            Net Billed
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums tracking-tight">
                            ₹{(kpis.netBilled || 0).toLocaleString()}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 block mt-1">
                            Billable after concessions
                        </span>
                    </div>
                </div>

                {/* 4. Amount Recovered */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-800/40">
                            <Wallet size={20} />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60">
                            {kpis.recoveryRatePct || 77.8}%
                        </span>
                    </div>
                    <div className="mt-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">
                            Amount Recovered
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums tracking-tight">
                            ₹{(kpis.amountRecovered || 0).toLocaleString()}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 block mt-1">
                            Recovery rate (of net billed)
                        </span>
                    </div>
                </div>

                {/* 5. Outstanding Balance */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-800/40">
                            <Hourglass size={20} />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60">
                            {kpis.outstandingPct || 22.2}%
                        </span>
                    </div>
                    <div className="mt-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">
                            Outstanding Balance
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums tracking-tight">
                            ₹{(kpis.outstandingBalance || 0).toLocaleString()}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 block mt-1">
                            {kpis.accountsCount || 0} partners • {kpis.unpaidBillsCount || 0} unpaid bills
                        </span>
                    </div>
                </div>
            </div>

            {/* ROW 2: RECEIVABLES AGEING (LEFT), TREND (MIDDLE), RECOVERY RATE (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Card 1: Receivables Ageing (4 cols) */}
                <div className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                            <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                Receivables Ageing <span className="text-xs font-normal text-slate-400">(Outstanding ₹{(kpis.outstandingBalance || 0).toLocaleString()})</span>
                            </h3>
                        </div>

                        {/* Donut and Age buckets */}
                        <div className="flex items-center justify-between gap-4 py-3">
                            {/* SVG Donut */}
                            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                                <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
                                    <circle
                                        cx="65"
                                        cy="65"
                                        r="52"
                                        fill="transparent"
                                        stroke="#e2e8f0"
                                        strokeWidth="16"
                                        className="dark:stroke-zinc-800"
                                    />
                                    {/* 0-30 days (Blue) */}
                                    <circle
                                        cx="65"
                                        cy="65"
                                        r="52"
                                        fill="transparent"
                                        stroke="#3b82f6"
                                        strokeWidth="16"
                                        strokeDasharray={`${s0_dash} ${ageingCircumference}`}
                                        strokeDashoffset="0"
                                    />
                                    {/* 31-60 days (Purple) */}
                                    <circle
                                        cx="65"
                                        cy="65"
                                        r="52"
                                        fill="transparent"
                                        stroke="#a855f7"
                                        strokeWidth="16"
                                        strokeDasharray={`${s1_dash} ${ageingCircumference}`}
                                        strokeDashoffset={s1_offset}
                                    />
                                    {/* 61-90 days (Rose) */}
                                    <circle
                                        cx="65"
                                        cy="65"
                                        r="52"
                                        fill="transparent"
                                        stroke="#f43f5e"
                                        strokeWidth="16"
                                        strokeDasharray={`${s2_dash} ${ageingCircumference}`}
                                        strokeDashoffset={s2_offset}
                                    />
                                    {/* >90 days (Dark Red) */}
                                    <circle
                                        cx="65"
                                        cy="65"
                                        r="52"
                                        fill="transparent"
                                        stroke="#be123c"
                                        strokeWidth="16"
                                        strokeDasharray={`${s3_dash} ${ageingCircumference}`}
                                        strokeDashoffset={s3_offset}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                                        {ageing.formattedTotal || `₹${((kpis.outstandingBalance || 0) / 100000).toFixed(2)}L`}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                        OUTSTANDING
                                    </span>
                                </div>
                            </div>

                            {/* Legend items */}
                            <div className="flex-1 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">0 - 30 Days</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                                        ₹{(ageing.bucket_0_30?.amount || 0).toLocaleString()} <span className="text-slate-400 text-[10px]">({ageing.bucket_0_30?.pct || 0}%)</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">31 - 60 Days</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                                        ₹{(ageing.bucket_31_60?.amount || 0).toLocaleString()} <span className="text-slate-400 text-[10px]">({ageing.bucket_31_60?.pct || 0}%)</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">61 - 90 Days</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                                        ₹{(ageing.bucket_61_90?.amount || 0).toLocaleString()} <span className="text-slate-400 text-[10px]">({ageing.bucket_61_90?.pct || 0}%)</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-700 shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">&gt; 90 Days</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                                        ₹{(ageing.bucket_90_plus?.amount || 0).toLocaleString()} <span className="text-slate-400 text-[10px]">({ageing.bucket_90_plus?.pct || 0}%)</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2: Billing & Recovery Trend (5 cols) */}
                <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                        <div>
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="text-indigo-600 dark:text-indigo-400" />
                                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                    Billing & Recovery Trend
                                </h3>
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                                Net billed vs recovered (last 7 days)
                            </p>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 text-xs font-semibold">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <span className="text-slate-600 dark:text-zinc-300">Net Billed</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                                <span className="text-slate-600 dark:text-zinc-300">Recovered</span>
                            </div>
                        </div>
                    </div>

                    {/* SVG Chart */}
                    <div className="relative w-full h-[160px] mt-2 select-none">
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

                            {/* Net Billed Smooth Curve */}
                            <path d={billedPath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />

                            {/* Recovered Smooth Curve */}
                            <path d={recoveredPath} fill="none" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" />

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
                                    className="fill-white dark:fill-zinc-900 stroke-purple-600 transition-all cursor-pointer"
                                    strokeWidth="2.5"
                                    onMouseEnter={() => setHoveredTrendIndex(idx)}
                                    onMouseLeave={() => setHoveredTrendIndex(null)}
                                />
                            ))}

                            {/* Callout badges on last points */}
                            {lastBilled && (
                                <g transform={`translate(${lastBilled.x + 8}, ${lastBilled.y - 12})`}>
                                    <rect x="0" y="0" width="52" height="20" rx="6" fill="#2563eb" />
                                    <text x="26" y="13" textAnchor="middle" fill="#ffffff" className="text-[10px] font-bold font-mono">
                                        ₹{(lastBilled.netBilled >= 100000 ? `${(lastBilled.netBilled / 100000).toFixed(2)}L` : `${Math.round(lastBilled.netBilled / 1000)}K`)}
                                    </text>
                                </g>
                            )}

                            {lastRecovered && (
                                <g transform={`translate(${lastRecovered.x + 8}, ${lastRecovered.y + 2})`}>
                                    <rect x="0" y="0" width="52" height="20" rx="6" fill="#9333ea" />
                                    <text x="26" y="13" textAnchor="middle" fill="#ffffff" className="text-[10px] font-bold font-mono">
                                        ₹{(lastRecovered.recovered >= 100000 ? `${(lastRecovered.recovered / 100000).toFixed(2)}L` : `${Math.round(lastRecovered.recovered / 1000)}K`)}
                                    </text>
                                </g>
                            )}

                            {/* X-axis day labels */}
                            {trend.map((t, idx) => {
                                const x = paddingX + (idx / Math.max(1, trend.length - 1)) * (chartWidth - paddingX * 2);
                                return (
                                    <text 
                                        key={`label-${idx}`}
                                        x={x} 
                                        y={chartHeight - 4} 
                                        textAnchor="middle" 
                                        className="text-[9px] fill-slate-400 dark:fill-zinc-500 font-semibold"
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
                                <span className="text-purple-300">Recovered: ₹{(trend[hoveredTrendIndex].recovered || 0).toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Card 3: Recovery Rate (3 cols) */}
                <div className="lg:col-span-3 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                            <PieChart size={16} className="text-indigo-600 dark:text-indigo-400" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                Recovery Rate
                            </h3>
                        </div>

                        {/* Gauge & Legend */}
                        <div className="flex items-center justify-between gap-3 py-4">
                            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="50"
                                        fill="transparent"
                                        stroke="#e2e8f0"
                                        strokeWidth="14"
                                        className="dark:stroke-zinc-800"
                                    />
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="50"
                                        fill="transparent"
                                        stroke="#3b82f6"
                                        strokeWidth="14"
                                        strokeDasharray={`${recStroke} ${recoveryCircumference}`}
                                        strokeDashoffset="0"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                                        {recoveryRate.ratePct || 77.8}%
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                        RECOVERED
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 text-xs flex-1">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">Recovered</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-xs pl-4 block mt-0.5">
                                        ₹{(recoveryRate.recoveredAmount || 0).toLocaleString()}
                                    </span>
                                </div>

                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">Outstanding</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-xs pl-4 block mt-0.5">
                                        ₹{(recoveryRate.outstandingAmount || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 text-center pt-1 border-t border-slate-100 dark:border-zinc-800">
                        Of ₹{(recoveryRate.totalNetBilled || 0).toLocaleString()} net billed
                    </p>
                </div>
            </div>

            {/* ROW 3: MAIN TABLE — B2B PARTNER ACCOUNTS (HOSPITALS, CLINICS & CORPORATE) */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
                {/* Header with Filters & Search */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Building2 size={16} />
                        </div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                            B2B Partner Accounts (Hospitals, Clinics & Corporate)
                        </h3>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl flex-wrap">
                        {['All Partners', 'Hospitals', 'Clinics', 'Corporate'].map((filterName) => {
                            const val = filterName === 'All Partners' ? 'All' : filterName;
                            return (
                                <button
                                    key={filterName}
                                    onClick={() => setTypeFilter(val)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        typeFilter === val
                                            ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                                            : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400'
                                    }`}
                                >
                                    {filterName}
                                </button>
                            );
                        })}
                    </div>

                    {/* Search & Export */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search partner..."
                                className="pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 shadow-2xs w-48"
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
                <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                <th className="py-3 px-3">Partner / Institution</th>
                                <th className="py-3 px-2">Type</th>
                                <th className="py-3 px-2 text-center">Visits</th>
                                <th className="py-3 px-2 text-center">Tests</th>
                                <th className="py-3 px-2 text-right">Gross Tariff</th>
                                <th className="py-3 px-2 text-right">Concessions</th>
                                <th className="py-3 px-2 text-right">Net Billed</th>
                                <th className="py-3 px-2 text-right">Recovered</th>
                                <th className="py-3 px-2 text-center">Outstanding</th>
                                <th className="py-3 px-2 text-right">Recovery Rate</th>
                                <th className="py-3 px-2 text-right">Oldest Unpaid Bill</th>
                                <th className="py-3 px-3 text-right">Last Payment</th>
                                <th className="py-3 px-2 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
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
                                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                                        onClick={() => handleAccountClick(a)}
                                    >
                                        {/* Partner / Institution */}
                                        <td className="py-3.5 px-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                                    <Building2 size={13} />
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">
                                                    {a.accountName}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Type */}
                                        <td className="py-3.5 px-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${typeBadgeStyles[a.accountType] || "bg-slate-100 text-slate-600"}`}>
                                                {a.accountType}
                                            </span>
                                        </td>

                                        {/* Visits */}
                                        <td className="py-3.5 px-2 text-center font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                                            {a.visits || 0}
                                        </td>

                                        {/* Tests */}
                                        <td className="py-3.5 px-2 text-center font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                                            {a.tests || 0}
                                        </td>

                                        {/* Gross Tariff */}
                                        <td className="py-3.5 px-2 text-right font-medium text-slate-600 dark:text-zinc-400 tabular-nums">
                                            ₹{(a.grossTariff || 0).toLocaleString()}
                                        </td>

                                        {/* Concessions */}
                                        <td className="py-3.5 px-2 text-right font-medium text-slate-600 dark:text-zinc-400 tabular-nums">
                                            ₹{(a.concessions || 0).toLocaleString()} <span className="text-slate-400 text-[10px]">({a.concessionsPct || 0}%)</span>
                                        </td>

                                        {/* Net Billed */}
                                        <td className="py-3.5 px-2 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                                            ₹{(a.netBilled || 0).toLocaleString()}
                                        </td>

                                        {/* Recovered */}
                                        <td className="py-3.5 px-2 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                            ₹{(a.recovered || 0).toLocaleString()}
                                        </td>

                                        {/* Outstanding */}
                                        <td className="py-3.5 px-2 text-center">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                                                a.outstanding > 0 
                                                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' 
                                                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                            }`}>
                                                ₹{(a.outstanding || 0).toLocaleString()}
                                            </span>
                                        </td>

                                        {/* Recovery Rate */}
                                        <td className="py-3.5 px-2 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className="font-bold text-slate-800 dark:text-zinc-200 tabular-nums text-[11px]">
                                                    {a.recoveryRate || 0}%
                                                </span>
                                                <div className="w-10 h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                                                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, a.recoveryRate || 0)}%` }} />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Oldest Unpaid Bill */}
                                        <td className="py-3.5 px-2 text-right text-slate-500 dark:text-zinc-400 tabular-nums text-[11px]">
                                            {a.oldestUnpaidBill !== '-' ? `${a.oldestUnpaidBill} (${a.oldestUnpaidDays}d)` : '-'}
                                        </td>

                                        {/* Last Payment */}
                                        <td className="py-3.5 px-3 text-right text-slate-500 dark:text-zinc-400 tabular-nums text-[11px]">
                                            {a.lastPayment || '-'}
                                        </td>

                                        {/* Action Arrow */}
                                        <td className="py-3.5 px-2 text-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAccountClick(a);
                                                }}
                                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 group-hover:text-indigo-600 transition-colors cursor-pointer"
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

            {/* ROW 4: 3 BOTTOM CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
                {/* Bottom Card 1: Concession Analysis (B2B) */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                                <Tag size={16} className="text-indigo-600 dark:text-indigo-400" />
                                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                    Concession Analysis (B2B)
                                </h3>
                            </div>
                        </div>

                        <div className="py-3">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                                    ₹{(concessionAnalysis.totalConcessions || 0).toLocaleString()}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60">
                                    {concessionAnalysis.concessionsPct || 11.9}%
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                                Total concessions on ₹{(concessionAnalysis.grossTariff || 0).toLocaleString()} gross tariff
                            </p>

                            {/* Split Progress Bar */}
                            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-zinc-800 flex overflow-hidden my-3">
                                <div className="bg-blue-500 h-full" style={{ width: `${concessionAnalysis.negotiatedPct || 70.6}%` }} />
                                <div className="bg-purple-500 h-full" style={{ width: `${concessionAnalysis.adHocPct || 23.1}%` }} />
                                <div className="bg-teal-500 h-full" style={{ width: `${concessionAnalysis.otherAdjustmentsPct || 6.3}%` }} />
                            </div>

                            {/* Breakdown List */}
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">Negotiated / Rate Card</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                                        ₹{(concessionAnalysis.negotiatedAmount || 0).toLocaleString()} <span className="text-slate-400 text-[10px]">({concessionAnalysis.negotiatedPct || 0}%)</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">Ad-hoc (Reception)</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                                        ₹{(concessionAnalysis.adHocAmount || 0).toLocaleString()} <span className="text-slate-400 text-[10px]">({concessionAnalysis.adHocPct || 0}%)</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
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

                {/* Bottom Card 2: Top Accounts by Outstanding */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                            <Building2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                Top Accounts by Outstanding
                            </h3>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs mt-1">
                            {topAccounts.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 dark:text-zinc-500 text-xs">
                                    No accounts with outstanding dues.
                                </div>
                            ) : (
                                topAccounts.map((a, idx) => (
                                    <div 
                                        key={a.accountId || idx} 
                                        onClick={() => handleAccountClick(a)}
                                        className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 rounded-lg px-1 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                                <Building2 size={12} />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 transition-colors">
                                                {a.name}
                                            </span>
                                        </div>

                                        <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, a.sharePct || 20)}%` }} />
                                        </div>

                                        <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums shrink-0">
                                            ₹{(a.outstanding || 0).toLocaleString()}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Card 3: Recent Recovery Activity */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                                <Receipt size={16} className="text-indigo-600 dark:text-indigo-400" />
                                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                    Recent Recovery Activity
                                </h3>
                            </div>
                            <button
                                onClick={onNavigateToRecoveries}
                                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                                <span>View All</span>
                                <ArrowRight size={12} />
                            </button>
                        </div>

                        {/* Activity Feed */}
                        <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 mt-1">
                            {recentActivity.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 dark:text-zinc-500 text-xs">
                                    No recent payment recovery activity.
                                </div>
                            ) : (
                                recentActivity.slice(0, 3).map((act, idx) => (
                                    <div key={act.id || idx} className="py-2.5 flex items-start gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                            <CreditCard size={14} />
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
                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                                                {act.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="pt-2 text-[10px] text-slate-400 dark:text-zinc-500 text-center">
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
