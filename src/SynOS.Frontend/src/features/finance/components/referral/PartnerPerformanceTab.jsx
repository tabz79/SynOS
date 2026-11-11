import React, { useState, useEffect, useMemo } from 'react';
import { 
    Layers, 
    Wallet, 
    Hourglass, 
    Percent, 
    TrendingUp, 
    Search, 
    Download, 
    ArrowRight, 
    User, 
    FlaskConical, 
    FileText, 
    ShieldCheck, 
    AlertCircle, 
    CheckCircle2, 
    Info, 
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { PartnerDetailDrawer } from './PartnerDetailDrawer';

export const PartnerPerformanceTab = ({ 
    dashboardData, 
    loading, 
    onNavigateToPayouts,
    onNavigateToVisits,
    onNavigateToHistory 
}) => {
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [hoveredTrendIndex, setHoveredTrendIndex] = useState(null);

    const kpis = dashboardData?.kpis || {};
    const trend = dashboardData?.trend || [];
    const topPartners = dashboardData?.topPartners || [];
    const partners = dashboardData?.partners || [];
    const topInvestigations = dashboardData?.topInvestigations || [];
    const calculationBase = dashboardData?.calculationBase || {};
    const recentActivity = dashboardData?.recentActivity || [];

    // Filter partners by search and partnerType
    const filteredPartners = useMemo(() => {
        return partners.filter(p => {
            const matchesSearch = !searchQuery || 
                (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (p.clinicName && p.clinicName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (p.location && p.location.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesType = typeFilter === 'All' || 
                (typeFilter === 'Doctors' && p.partnerType === 'Doctor') ||
                (typeFilter === 'Hospitals' && p.partnerType === 'Hospital') ||
                (typeFilter === 'Clinics' && p.partnerType === 'Clinic') ||
                (typeFilter === 'RMPs' && p.partnerType === 'RMP');

            return matchesSearch && matchesType;
        });
    }, [partners, searchQuery, typeFilter]);

    const handlePartnerClick = (p) => {
        setSelectedPartner(p);
        setIsDrawerOpen(true);
    };

    const handleExportCsv = () => {
        if (!filteredPartners || filteredPartners.length === 0) return;
        const headers = [
            "Partner / Organization",
            "Type",
            "Referred Patients",
            "Visits",
            "Investigations",
            "Gross Tariff",
            "Concessions",
            "Net Revenue",
            "Commission Accrued",
            "Commission Paid",
            "Outstanding",
            "Effective Rate (%)",
            "Last Referral Date"
        ];

        const rows = filteredPartners.map(p => [
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

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Referral_Partner_Performance_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Trend SVG calculations
    const trendMax = useMemo(() => {
        const maxVal = Math.max(
            ...trend.map(t => Math.max(t.accrued || 0, t.paid || 0)), 
            30000
        );
        return Math.ceil(maxVal / 10000) * 10000;
    }, [trend]);

    const chartWidth = 560;
    const chartHeight = 160;
    const paddingX = 40;
    const paddingY = 25;

    const accruedPoints = useMemo(() => {
        if (!trend || trend.length === 0) return [];
        return trend.map((t, idx) => {
            const x = paddingX + (idx / Math.max(1, trend.length - 1)) * (chartWidth - paddingX * 2);
            const y = chartHeight - paddingY - ((t.accrued || 0) / trendMax) * (chartHeight - paddingY * 2);
            return { x, y, ...t };
        });
    }, [trend, trendMax]);

    const paidPoints = useMemo(() => {
        if (!trend || trend.length === 0) return [];
        return trend.map((t, idx) => {
            const x = paddingX + (idx / Math.max(1, trend.length - 1)) * (chartWidth - paddingX * 2);
            const y = chartHeight - paddingY - ((t.paid || 0) / trendMax) * (chartHeight - paddingY * 2);
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

    const accruedPath = useMemo(() => createSmoothPath(accruedPoints), [accruedPoints]);
    const paidPath = useMemo(() => createSmoothPath(paidPoints), [paidPoints]);

    const lastAccrued = accruedPoints[accruedPoints.length - 1];
    const lastPaid = paidPoints[paidPoints.length - 1];

    // Donut chart calculations
    const donutCircumference = 2 * Math.PI * 52;
    const afterPct = (calculationBase?.afterDiscountPct || 82.8) / 100;
    const beforePct = (calculationBase?.beforeDiscountPct || 17.2) / 100;
    const afterStroke = afterPct * donutCircumference;
    const beforeStroke = beforePct * donutCircumference;
    const beforeOffset = -afterStroke;

    const partnerTypeBadgeStyles = {
        Doctor: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/50",
        Hospital: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/50",
        Clinic: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-200/50",
        RMP: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/50"
    };

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-300">
            {/* ROW 1: 4 TOP KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Commission Accrued */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-800/40">
                            <Layers size={20} />
                        </div>
                        {kpis.accruedChangePct !== undefined && (
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-0.5 ${
                                kpis.accruedChangePct >= 0 
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60'
                                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60'
                            }`}>
                                {kpis.accruedChangePct >= 0 ? '+' : ''}{kpis.accruedChangePct}% vs Last Month
                            </span>
                        )}
                    </div>
                    <div className="mt-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">
                            Commission Accrued
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums tracking-tight">
                            ₹{(kpis.commissionAccrued || 0).toLocaleString()}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 block mt-1">
                            From {(kpis.eligibleVisitCount || 0).toLocaleString()} eligible visits (including unpaid)
                        </span>
                    </div>
                </div>

                {/* 2. Commission Paid */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-800/40">
                        <Wallet size={20} />
                    </div>
                    <div className="mt-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">
                            Commission Paid
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums tracking-tight">
                            ₹{(kpis.commissionPaid || 0).toLocaleString()}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 block mt-1">
                            {kpis.settlementCount || 0} settlements • {kpis.settledPartnerCount || 0} partners
                        </span>
                    </div>
                </div>

                {/* 3. Pending Commission */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-800/40">
                        <Hourglass size={20} />
                    </div>
                    <div className="mt-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">
                            Pending Commission
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums tracking-tight">
                            ₹{(kpis.pendingCommission || 0).toLocaleString()}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 block mt-1">
                            {kpis.pendingPctOfAccrued || 0}% of accrued
                        </span>
                    </div>
                </div>

                {/* 4. Effective Commission Rate */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
                        <Percent size={20} />
                    </div>
                    <div className="mt-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">
                            Effective Commission Rate
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums tracking-tight">
                            {kpis.effectiveCommissionRate || 0}%
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 block mt-1">
                            On ₹{(kpis.eligibleRevenue || 0).toLocaleString()} eligible revenue
                        </span>
                    </div>
                </div>
            </div>

            {/* ROW 2: COMMISSION TREND (LEFT) & TOP REFERRAL PARTNERS (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Left: Commission Trend (7 cols) */}
                <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="text-indigo-600 dark:text-indigo-400" />
                                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                    Commission Trend
                                </h3>
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                                Commission accrued vs paid (last 7 days)
                            </p>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 text-xs font-semibold">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                                <span className="text-slate-600 dark:text-zinc-300">Accrued</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                                <span className="text-slate-600 dark:text-zinc-300">Paid</span>
                            </div>
                        </div>
                    </div>

                    {/* SVG Curve Chart */}
                    <div className="relative w-full h-[180px] mt-2 select-none">
                        <svg 
                            viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                            className="w-full h-full overflow-visible"
                        >
                            {/* Horizontal Grid lines and Y labels */}
                            {[0, 10000, 20000, 30000].map((val) => {
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
                                            ₹{val === 0 ? '0' : `${val / 1000}K`}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Accrued Smooth Curve */}
                            <path 
                                d={accruedPath} 
                                fill="none" 
                                stroke="#0284c7" 
                                strokeWidth="2.5" 
                                strokeLinecap="round"
                            />

                            {/* Paid Smooth Curve */}
                            <path 
                                d={paidPath} 
                                fill="none" 
                                stroke="#9333ea" 
                                strokeWidth="2.5" 
                                strokeLinecap="round"
                            />

                            {/* Data points for Accrued */}
                            {accruedPoints.map((pt, idx) => (
                                <circle 
                                    key={`acc-${idx}`}
                                    cx={pt.x} 
                                    cy={pt.y} 
                                    r={hoveredTrendIndex === idx ? 5 : 3.5}
                                    className="fill-white dark:fill-zinc-900 stroke-sky-600 transition-all cursor-pointer"
                                    strokeWidth="2.5"
                                    onMouseEnter={() => setHoveredTrendIndex(idx)}
                                    onMouseLeave={() => setHoveredTrendIndex(null)}
                                />
                            ))}

                            {/* Data points for Paid */}
                            {paidPoints.map((pt, idx) => (
                                <circle 
                                    key={`paid-${idx}`}
                                    cx={pt.x} 
                                    cy={pt.y} 
                                    r={hoveredTrendIndex === idx ? 5 : 3.5}
                                    className="fill-white dark:fill-zinc-900 stroke-purple-600 transition-all cursor-pointer"
                                    strokeWidth="2.5"
                                    onMouseEnter={() => setHoveredTrendIndex(idx)}
                                    onMouseLeave={() => setHoveredTrendIndex(null)}
                                />
                            ))}

                            {/* Callout badges on the last data points */}
                            {lastAccrued && (
                                <g transform={`translate(${lastAccrued.x + 8}, ${lastAccrued.y - 12})`}>
                                    <rect 
                                        x="0" 
                                        y="0" 
                                        width="52" 
                                        height="20" 
                                        rx="6" 
                                        fill="#0284c7" 
                                    />
                                    <text 
                                        x="26" 
                                        y="13" 
                                        textAnchor="middle" 
                                        fill="#ffffff" 
                                        className="text-[10px] font-bold font-mono"
                                    >
                                        ₹{(lastAccrued.accrued >= 1000 ? `${(lastAccrued.accrued / 1000).toFixed(1)}K` : lastAccrued.accrued)}
                                    </text>
                                </g>
                            )}

                            {lastPaid && (
                                <g transform={`translate(${lastPaid.x + 8}, ${lastPaid.y + 2})`}>
                                    <rect 
                                        x="0" 
                                        y="0" 
                                        width="52" 
                                        height="20" 
                                        rx="6" 
                                        fill="#9333ea" 
                                    />
                                    <text 
                                        x="26" 
                                        y="13" 
                                        textAnchor="middle" 
                                        fill="#ffffff" 
                                        className="text-[10px] font-bold font-mono"
                                    >
                                        ₹{(lastPaid.paid >= 1000 ? `${(lastPaid.paid / 1000).toFixed(1)}K` : lastPaid.paid)}
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
                            <div 
                                className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-lg pointer-events-none z-10 flex items-center gap-3 backdrop-blur-xs"
                            >
                                <span className="font-bold">{trend[hoveredTrendIndex].date}</span>
                                <span className="text-sky-300">Accrued: ₹{(trend[hoveredTrendIndex].accrued || 0).toLocaleString()}</span>
                                <span className="text-purple-300">Paid: ₹{(trend[hoveredTrendIndex].paid || 0).toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Top Referral Partners (by Commission) (5 cols) */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                            <User size={16} className="text-indigo-600 dark:text-indigo-400" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                Top Referral Partners (by Commission)
                            </h3>
                        </div>

                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-2 py-2 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                            <div className="col-span-4">Partner</div>
                            <div className="col-span-2">Type</div>
                            <div className="col-span-2 text-right">Net Rev</div>
                            <div className="col-span-2 text-right">Commission</div>
                            <div className="col-span-2 text-right">Share</div>
                        </div>

                        {/* Top 5 list */}
                        <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                            {topPartners.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 dark:text-zinc-500 text-xs">
                                    No referral commissions in this period.
                                </div>
                            ) : (
                                topPartners.map((p, idx) => (
                                    <div 
                                        key={p.partnerId || idx} 
                                        onClick={() => handlePartnerClick(p)}
                                        className="grid grid-cols-12 gap-2 py-2.5 items-center hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 rounded-lg px-1 transition-colors cursor-pointer group"
                                    >
                                        {/* Partner Name + Avatar */}
                                        <div className="col-span-4 flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                {p.name ? p.name.charAt(0) : 'D'}
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 transition-colors">
                                                {p.name}
                                            </span>
                                        </div>

                                        {/* Type */}
                                        <div className="col-span-2">
                                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${partnerTypeBadgeStyles[p.partnerType] || "bg-slate-100 text-slate-600"}`}>
                                                {p.partnerType}
                                            </span>
                                        </div>

                                        {/* Net Revenue */}
                                        <div className="col-span-2 text-right font-medium text-slate-600 dark:text-zinc-400 tabular-nums">
                                            ₹{(p.netRevenue || 0).toLocaleString()}
                                        </div>

                                        {/* Commission */}
                                        <div className="col-span-2 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                                            ₹{(p.commission || 0).toLocaleString()}
                                        </div>

                                        {/* Share & Bar */}
                                        <div className="col-span-2 flex items-center justify-end gap-1.5">
                                            <div className="w-10 h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                                                <div 
                                                    className="h-full rounded-full bg-sky-500" 
                                                    style={{ width: `${Math.min(100, p.share || 0)}%` }} 
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 tabular-nums">
                                                {p.share || 0}%
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 3: MAIN TABLE — REFERRAL PARTNER PERFORMANCE */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
                {/* Table Header with Filters & Search */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Title */}
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Layers size={16} />
                        </div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                            Referral Partner Performance
                        </h3>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl flex-wrap">
                        {['All Partners', 'Doctors', 'Hospitals', 'Clinics', 'RMPs'].map((filterName) => {
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

                {/* Main Table */}
                <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                <th className="py-3 px-3">Partner Organization</th>
                                <th className="py-3 px-2">Type</th>
                                <th className="py-3 px-2 text-center">Referred Patients</th>
                                <th className="py-3 px-2 text-center">Visits</th>
                                <th className="py-3 px-2 text-center">Investigations</th>
                                <th className="py-3 px-2 text-right">Gross Tariff</th>
                                <th className="py-3 px-2 text-right">Concessions</th>
                                <th className="py-3 px-2 text-right">Net Revenue</th>
                                <th className="py-3 px-2 text-right">Commission Accrued</th>
                                <th className="py-3 px-2 text-right">Commission Paid</th>
                                <th className="py-3 px-2 text-center">Outstanding</th>
                                <th className="py-3 px-2 text-right">Effective Rate ↓</th>
                                <th className="py-3 px-3 text-right">Last Referral</th>
                                <th className="py-3 px-2 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                            {filteredPartners.length === 0 ? (
                                <tr>
                                    <td colSpan={14} className="py-12 text-center text-slate-400 dark:text-zinc-500">
                                        No referral partner records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredPartners.map((p) => (
                                    <tr 
                                        key={p.partnerId}
                                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                                        onClick={() => handlePartnerClick(p)}
                                    >
                                        {/* Partner Organization */}
                                        <td className="py-3.5 px-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                                    <User size={13} />
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">
                                                    {p.name}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Type */}
                                        <td className="py-3.5 px-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${partnerTypeBadgeStyles[p.partnerType] || "bg-slate-100 text-slate-600"}`}>
                                                {p.partnerType}
                                            </span>
                                        </td>

                                        {/* Referred Patients */}
                                        <td className="py-3.5 px-2 text-center font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                                            {p.referredPatients || 0}
                                        </td>

                                        {/* Visits */}
                                        <td className="py-3.5 px-2 text-center font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                                            {p.visits || 0}
                                        </td>

                                        {/* Investigations */}
                                        <td className="py-3.5 px-2 text-center font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                                            {p.investigations || 0}
                                        </td>

                                        {/* Gross Tariff */}
                                        <td className="py-3.5 px-2 text-right font-medium text-slate-600 dark:text-zinc-400 tabular-nums">
                                            ₹{(p.grossTariff || 0).toLocaleString()}
                                        </td>

                                        {/* Concessions */}
                                        <td className="py-3.5 px-2 text-right font-medium text-slate-600 dark:text-zinc-400 tabular-nums">
                                            ₹{(p.concessions || 0).toLocaleString()} <span className="text-slate-400 text-[10px]">({p.concessionsPct || 0}%)</span>
                                        </td>

                                        {/* Net Revenue */}
                                        <td className="py-3.5 px-2 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                                            ₹{(p.netRevenue || 0).toLocaleString()}
                                        </td>

                                        {/* Commission Accrued */}
                                        <td className="py-3.5 px-2 text-right font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                                            ₹{(p.commissionAccrued || 0).toLocaleString()}
                                        </td>

                                        {/* Commission Paid */}
                                        <td className="py-3.5 px-2 text-right font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                                            ₹{(p.commissionPaid || 0).toLocaleString()}
                                        </td>

                                        {/* Outstanding */}
                                        <td className="py-3.5 px-2 text-center">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                                                p.outstanding > 0 
                                                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' 
                                                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                            }`}>
                                                ₹{(p.outstanding || 0).toLocaleString()}
                                            </span>
                                        </td>

                                        {/* Effective Rate */}
                                        <td className="py-3.5 px-2 text-right font-bold text-slate-800 dark:text-zinc-200 tabular-nums">
                                            {p.effectiveRate || 0}%
                                        </td>

                                        {/* Last Referral */}
                                        <td className="py-3.5 px-3 text-right text-slate-500 dark:text-zinc-400 tabular-nums text-[11px]">
                                            {p.lastReferralDate || "—"}
                                        </td>

                                        {/* Action Arrow */}
                                        <td className="py-3.5 px-2 text-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePartnerClick(p);
                                                }}
                                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 group-hover:text-indigo-600 transition-colors"
                                                title="View Partner Details & Visits"
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
                {/* Bottom Card 1: Commission by Investigation (Top 5) */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                            <FlaskConical size={16} className="text-indigo-600 dark:text-indigo-400" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                Commission by Investigation (Top 5)
                            </h3>
                        </div>

                        <div className="grid grid-cols-12 gap-1 py-2 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                            <div className="col-span-4">Investigation</div>
                            <div className="col-span-3 text-center">Volume</div>
                            <div className="col-span-2 text-right">Net Rev</div>
                            <div className="col-span-2 text-right">Comm</div>
                            <div className="col-span-1 text-right">Rate</div>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                            {topInvestigations.length === 0 ? (
                                <div className="py-6 text-center text-slate-400 dark:text-zinc-500 text-xs">
                                    No investigation breakdown available.
                                </div>
                            ) : (
                                topInvestigations.map((t, idx) => (
                                    <div key={t.testId || idx} className="grid grid-cols-12 gap-1 py-2 items-center">
                                        <div className="col-span-4 font-bold text-slate-800 dark:text-zinc-200 truncate" title={t.testName}>
                                            {t.testName}
                                        </div>
                                        <div className="col-span-3 flex items-center justify-center gap-1.5">
                                            <div className="w-10 h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                                                <div 
                                                    className="h-full rounded-full bg-sky-500" 
                                                    style={{ width: `${Math.min(100, (t.volume / (topInvestigations[0]?.volume || 1)) * 100)}%` }} 
                                                />
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400 tabular-nums">
                                                {t.volume}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-right text-slate-600 dark:text-zinc-400 tabular-nums text-[11px]">
                                            ₹{(t.netRevenue || 0).toLocaleString()}
                                        </div>
                                        <div className="col-span-2 text-right font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                                            ₹{(t.commission || 0).toLocaleString()}
                                        </div>
                                        <div className="col-span-1 text-right text-slate-500 dark:text-zinc-400 text-[10px]">
                                            {t.rate || 15}%
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Card 2: Commission Calculation Base (Donut) */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                            <Percent size={16} className="text-indigo-600 dark:text-indigo-400" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                Commission Calculation Base
                            </h3>
                        </div>

                        {/* Donut and Legend */}
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
                                    {/* Segment 1: After discount (Blue) */}
                                    <circle
                                        cx="65"
                                        cy="65"
                                        r="52"
                                        fill="transparent"
                                        stroke="#3b82f6"
                                        strokeWidth="16"
                                        strokeDasharray={`${afterStroke} ${donutCircumference}`}
                                        strokeDashoffset="0"
                                    />
                                    {/* Segment 2: Before discount (Purple) */}
                                    <circle
                                        cx="65"
                                        cy="65"
                                        r="52"
                                        fill="transparent"
                                        stroke="#c084fc"
                                        strokeWidth="16"
                                        strokeDasharray={`${beforeStroke} ${donutCircumference}`}
                                        strokeDashoffset={beforeOffset}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                                        ₹{(calculationBase.totalEligibleRevenue || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[9px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                        Eligible Revenue
                                    </span>
                                </div>
                            </div>

                            {/* Legend items */}
                            <div className="flex-1 space-y-3 text-xs">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                                        <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px]">
                                            After Discount (Net Revenue)
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 pl-4 mt-0.5">
                                        ₹{(calculationBase.afterDiscountAmount || 0).toLocaleString()} ({calculationBase.afterDiscountPct || 0}%)
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
                                        <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px]">
                                            Before Discount (Gross)
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 pl-4 mt-0.5">
                                        ₹{(calculationBase.beforeDiscountAmount || 0).toLocaleString()} ({calculationBase.beforeDiscountPct || 0}%)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info Note Pill */}
                    <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-800/40 flex items-center gap-2 text-[11px] text-sky-700 dark:text-sky-300">
                        <Info size={14} className="shrink-0" />
                        <span>Commission rules use: <strong>Net Revenue (After Discount)</strong></span>
                    </div>
                </div>

                {/* Bottom Card 3: Recent Commission Activity */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-indigo-600 dark:text-indigo-400" />
                                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                    Recent Commission Activity
                                </h3>
                            </div>
                            <button
                                onClick={onNavigateToHistory}
                                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                            >
                                <span>View All</span>
                                <ArrowRight size={12} />
                            </button>
                        </div>

                        {/* Activity Feed */}
                        <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 mt-1">
                            {recentActivity.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 dark:text-zinc-500 text-xs">
                                    No recent settlement or accrual activity.
                                </div>
                            ) : (
                                recentActivity.slice(0, 3).map((act, idx) => (
                                    <div key={act.id || idx} className="py-2.5 flex items-start gap-3">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                            act.type === 'Settled'
                                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400'
                                        }`}>
                                            {act.type === 'Settled' ? <ShieldCheck size={14} /> : <Layers size={14} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-1">
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                                                    {act.title}
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
                        Audited laboratory commission ledger & real-time accruals
                    </div>
                </div>
            </div>

            {/* Slide-out Partner Detail Drawer */}
            <PartnerDetailDrawer 
                partner={selectedPartner}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onNavigateToPayouts={onNavigateToPayouts}
            />
        </div>
    );
};
