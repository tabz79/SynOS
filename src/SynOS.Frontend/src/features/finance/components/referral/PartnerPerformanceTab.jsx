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
    ArrowDownRight,
    Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
    const [isTableExpanded, setIsTableExpanded] = useState(false);

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

    // Initial 6 rows at a glance, expandable via Load More
    const visiblePartners = useMemo(() => {
        return isTableExpanded ? filteredPartners : filteredPartners.slice(0, 6);
    }, [filteredPartners, isTableExpanded]);

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

    // Split Slider Calculations for Row 1
    const paidVal = Number(kpis.commissionPaid || 0);
    const pendingVal = Number(kpis.pendingCommission || 0);
    const totalObligation = paidVal + pendingVal;

    let paidShare = 0;
    let pendingShare = 0;
    if (totalObligation > 0) {
        if (pendingVal === 0) {
            paidShare = 100;
            pendingShare = 0;
        } else if (paidVal === 0) {
            paidShare = 0;
            pendingShare = 100;
        } else {
            paidShare = Math.round((paidVal / totalObligation) * 1000) / 10;
            paidShare = Math.max(5, Math.min(95, paidShare));
            pendingShare = Math.round((100 - paidShare) * 10) / 10;
        }
    } else {
        paidShare = 61.4;
        pendingShare = 38.6;
    }

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
        Doctor: "bg-[#E0F2FE] text-[#0369A1] dark:bg-sky-950/40 dark:text-sky-300 border border-[#BAE6FD]/70",
        Hospital: "bg-[#EEF2FF] text-[#4338CA] dark:bg-indigo-950/40 dark:text-indigo-300 border border-[#C7D2FE]/70",
        Clinic: "bg-[#F3E8FF] text-[#7E22CE] dark:bg-purple-950/40 dark:text-purple-300 border border-[#E9D5FF]/70",
        RMP: "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/40 dark:text-amber-300 border border-[#FDE68A]/70"
    };

    return (
        <div className="space-y-3 sm:space-y-3.5 w-full animate-in fade-in duration-300">
            {/* ROW 1: SIGNATURE HERO SPLIT POD (TOTAL COMMISSION ACCRUED HERO + COMMISSION PAID VS PENDING LIABILITY) */}
            <div className="min-h-[85px] p-3 sm:p-3.5 rounded-[20px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-4 items-center">
                
                {/* Section 1 (4 Cols): Total Commission Accrued Hero Metric */}
                <div 
                    onClick={onNavigateToVisits}
                    className="lg:col-span-4 flex items-center gap-3 min-w-0 pr-0 lg:pr-2 cursor-pointer p-1 -m-1 rounded-xl hover:bg-white/70 dark:hover:bg-zinc-800/70 transition-all group"
                    title="Click to view all referral visits"
                >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] text-[#38BDF8] dark:bg-sky-950/40 dark:text-sky-400 shadow-2xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Layers size={20} strokeWidth={2.2} />
                    </div>

                    <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal group-hover:text-synos-primary transition-colors">
                                Total Commission Accrued
                            </h3>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]/70 dark:bg-emerald-950/50 dark:text-emerald-400 shadow-2xs">
                                {kpis.effectiveCommissionRate || 0}% Effective Rate
                            </span>
                        </div>
                        <p className="text-xl sm:text-2xl lg:text-[26px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-none my-0.5 tabular-nums">
                            ₹{(kpis.commissionAccrued || 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Section 2 (8 Cols): Commission Paid vs Pending Liability Split Slider */}
                <div className="lg:col-span-8 lg:border-l lg:border-slate-200 dark:lg:border-zinc-800 lg:pl-4 xl:pl-5 flex flex-col justify-between py-0.5 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                            Commission Paid vs Pending Liability
                        </h3>
                        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold">
                            <span className="text-slate-500 dark:text-zinc-400">Total Obligation:</span>
                            <span className="text-slate-900 dark:text-white tabular-nums font-extrabold">
                                ₹{totalObligation.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Sleek Pastel Split Bar */}
                    <div className="relative h-[11px] sm:h-[13px] rounded-full bg-[#E2ECF6] dark:bg-zinc-800 flex items-center overflow-visible shadow-inner">
                        <div 
                            className="h-full bg-gradient-to-r from-[#93C5FD] via-[#60A5FA] to-[#38BDF8] rounded-l-full transition-all duration-500 shadow-[0_2px_8px_rgba(56,189,248,0.25)]"
                            style={{ width: `${paidShare}%` }}
                        />
                        <div 
                            className="h-full bg-gradient-to-r from-[#FECDD3] via-[#FDA4AF] to-[#FCA5A5] rounded-r-full transition-all duration-500 shadow-[0_2px_8px_rgba(253,164,175,0.25)]"
                            style={{ width: `${pendingShare}%` }}
                        />
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-zinc-100 shadow-[0_2px_8px_rgba(15,35,60,0.22),0_0_0_2px_#FFFFFF] border border-slate-100 pointer-events-none transition-all duration-500 z-10 flex items-center justify-center"
                            style={{ left: `${paidShare}%` }}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        </div>
                    </div>

                    {/* Two Channel Stat Pods Below (Clean, No Subtext) */}
                    <div className="flex items-center justify-between pt-0.5">
                        {/* Left Stat Pod: Commission Paid */}
                        <div 
                            onClick={onNavigateToPayouts}
                            className="flex items-center gap-2 cursor-pointer p-1 -m-1 rounded-xl hover:bg-white/70 dark:hover:bg-zinc-800/70 transition-all group"
                            title="Click to view Commission Settlements & Payouts"
                        >
                            <div className="w-6 h-6 rounded-[7px] bg-[#EFF6FF] text-[#38BDF8] dark:bg-sky-950/40 dark:text-sky-400 border border-[#DBEAFE] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                <Wallet size={13} strokeWidth={2.3} />
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-none group-hover:text-synos-primary transition-colors">
                                    ₹{(kpis.commissionPaid || 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-bold text-[#0369A1] dark:text-sky-300 bg-[#E0F2FE] dark:bg-sky-950/60 px-1 py-0.2 rounded-md border border-[#BAE6FD] tabular-nums">
                                    {paidShare}%
                                </span>
                                <span className="text-xs text-slate-600 dark:text-zinc-400 font-bold ml-1">
                                    Commission Paid
                                </span>
                            </div>
                        </div>

                        {/* Right Stat Pod: Pending Commission */}
                        <div 
                            onClick={onNavigateToPayouts}
                            className="flex items-center gap-2 text-right cursor-pointer p-1 -m-1 rounded-xl hover:bg-white/70 dark:hover:bg-zinc-800/70 transition-all group"
                            title="Click to view Pending Payouts"
                        >
                            <div className="flex items-baseline gap-1.5 justify-end">
                                <span className="text-xs text-slate-600 dark:text-zinc-400 font-bold mr-1">
                                    Pending Liability
                                </span>
                                <span className="text-[10px] font-bold text-[#9F1239] dark:text-rose-300 bg-[#FFE4E6] dark:bg-rose-950/60 px-1 py-0.2 rounded-md border border-[#FECDD3] tabular-nums">
                                    {pendingShare}%
                                </span>
                                <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-none group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                    ₹{(kpis.pendingCommission || 0).toLocaleString()}
                                </span>
                            </div>
                            <div className="w-6 h-6 rounded-[7px] bg-[#FFF1F2] text-[#FB7185] dark:bg-rose-950/40 dark:text-rose-400 border border-[#FFE4E6] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                <Hourglass size={13} strokeWidth={2.3} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 2: COMMISSION TREND POD (7 COLS) & TOP REFERRAL PARTNERS POD (5 COLS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 items-stretch">
                {/* Left Pod: Commission Trend with Safe Pastel Day Pillars (7 cols) */}
                <div className="lg:col-span-7 p-3.5 sm:p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#EFF6FF] text-[#38BDF8] dark:bg-sky-950/40 dark:text-sky-400 border border-[#DBEAFE] flex items-center justify-center shrink-0 shadow-2xs">
                                <TrendingUp size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal leading-tight">
                                Commission Trend
                            </h3>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-3 text-xs font-semibold">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                                <span className="text-[11px] text-slate-600 dark:text-zinc-300 font-bold">Accrued</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#C084FC]" />
                                <span className="text-[11px] text-slate-600 dark:text-zinc-300 font-bold">Paid</span>
                            </div>
                        </div>
                    </div>

                    {/* SVG Curve Chart with Safe Day Pillars */}
                    <div className="relative w-full h-[160px] mt-1 select-none">
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
                                            stroke="#E2ECF6" 
                                            strokeDasharray="2 3"
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

                            {/* Safe Pastel Day Pillars (Never renders black) */}
                            {trend.map((t, idx) => {
                                const x = paddingX + (idx / Math.max(1, trend.length - 1)) * (chartWidth - paddingX * 2);
                                const isHovered = hoveredTrendIndex === idx;
                                const isLast = idx === trend.length - 1;
                                const pillarFill = isHovered 
                                    ? "#E0F2FE" 
                                    : (isLast ? "#E0F2FE" : "#F1F5F9");
                                return (
                                    <rect 
                                        key={`pillar-${idx}`}
                                        x={x - 14} 
                                        y={paddingY - 8} 
                                        width={28} 
                                        height={chartHeight - paddingY * 2 + 16} 
                                        rx={10} 
                                        fill={pillarFill}
                                        fillOpacity={isHovered ? 0.75 : (isLast ? 0.65 : 0.45)}
                                        className="transition-all"
                                    />
                                );
                            })}

                            {/* Accrued Smooth Curve (Pastel Sky) */}
                            <path 
                                d={accruedPath} 
                                fill="none" 
                                stroke="#38BDF8" 
                                strokeWidth="2.5" 
                                strokeLinecap="round"
                            />

                            {/* Paid Smooth Curve (Pastel Purple) */}
                            <path 
                                d={paidPath} 
                                fill="none" 
                                stroke="#C084FC" 
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
                                    fill="#ffffff"
                                    stroke="#38BDF8"
                                    className="transition-all cursor-pointer"
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
                                    fill="#ffffff"
                                    stroke="#C084FC"
                                    className="transition-all cursor-pointer"
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
                                        fill="#38BDF8" 
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
                                        fill="#C084FC" 
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
                                const isLast = idx === trend.length - 1;
                                return (
                                    <text 
                                        key={`label-${idx}`}
                                        x={x} 
                                        y={chartHeight - 4} 
                                        textAnchor="middle" 
                                        className={cn(
                                            "text-[9px] font-semibold",
                                            isLast ? "fill-sky-600 font-bold" : "fill-slate-400 dark:fill-zinc-500"
                                        )}
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

                {/* Right Pod: Top Referral Partners (by Commission) (5 cols) */}
                <div className="lg:col-span-5 p-3.5 sm:p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200 dark:border-zinc-800">
                            <div className="w-6 h-6 rounded-[7px] bg-[#FAF5FF] text-[#C084FC] dark:bg-purple-950/40 dark:text-purple-400 border border-[#F3E8FF] flex items-center justify-center shrink-0 shadow-2xs">
                                <User size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                                Top Referral Partners (by Commission)
                            </h3>
                        </div>

                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-2 py-2 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider border-b border-slate-200/60 dark:border-zinc-800/60">
                            <div className="col-span-4">Partner</div>
                            <div className="col-span-2">Type</div>
                            <div className="col-span-2 text-right">Net Rev</div>
                            <div className="col-span-2 text-right">Comm</div>
                            <div className="col-span-2 text-right">Share</div>
                        </div>

                        {/* Top 5 list */}
                        <div className="divide-y divide-slate-200/70 dark:divide-zinc-800/60 text-xs">
                            {topPartners.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 dark:text-zinc-500 text-xs">
                                    No referral commissions in this period.
                                </div>
                            ) : (
                                topPartners.map((p, idx) => (
                                    <div 
                                        key={p.partnerId || idx} 
                                        onClick={() => handlePartnerClick(p)}
                                        className="grid grid-cols-12 gap-2 py-2 items-center hover:bg-slate-200/40 dark:hover:bg-zinc-800/40 rounded-lg px-1 transition-colors cursor-pointer group"
                                    >
                                        {/* Partner Name + Avatar */}
                                        <div className="col-span-4 flex items-center gap-1.5 min-w-0">
                                            <div className="w-5.5 h-5.5 rounded-full bg-[#FAF5FF] text-[#C084FC] dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center text-[10px] font-extrabold shrink-0 shadow-2xs">
                                                {p.name ? p.name.charAt(0) : 'D'}
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-zinc-200 truncate group-hover:text-synos-primary transition-colors text-xs">
                                                {p.name}
                                            </span>
                                        </div>

                                        {/* Type */}
                                        <div className="col-span-2">
                                            <span className={cn("px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase", partnerTypeBadgeStyles[p.partnerType] || "bg-slate-100 text-slate-600")}>
                                                {p.partnerType}
                                            </span>
                                        </div>

                                        {/* Net Revenue */}
                                        <div className="col-span-2 text-right font-medium text-slate-600 dark:text-zinc-400 tabular-nums text-xs">
                                            ₹{(p.netRevenue || 0).toLocaleString()}
                                        </div>

                                        {/* Commission */}
                                        <div className="col-span-2 text-right font-extrabold text-slate-900 dark:text-white tabular-nums text-xs">
                                            ₹{(p.commission || 0).toLocaleString()}
                                        </div>

                                        {/* Share & Bar */}
                                        <div className="col-span-2 flex items-center justify-end gap-1.5">
                                            <div className="w-9 h-1.5 rounded-full bg-[#E2ECF6] dark:bg-zinc-800 overflow-hidden shadow-inner">
                                                <div 
                                                    className="h-full rounded-full bg-[#38BDF8]" 
                                                    style={{ width: `${Math.min(100, p.share || 0)}%` }} 
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 tabular-nums">
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

            {/* ROW 3: MAIN TABLE — REFERRAL PARTNER PERFORMANCE (INITIAL 6 ROWS WITH LOAD MORE) */}
            <div className="p-4 sm:p-5 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] space-y-3.5">
                {/* Table Header with Filters & Search */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Title */}
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-[8px] bg-[#EFF6FF] text-[#38BDF8] dark:bg-sky-950/40 dark:text-sky-400 border border-[#DBEAFE] flex items-center justify-center shrink-0 shadow-2xs">
                            <Layers size={15} strokeWidth={2.3} />
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-normal">
                            Referral Partner Performance
                        </h3>
                    </div>

                    {/* Filter Segmented Inset Pills */}
                    <div className="flex items-center gap-1 bg-[#D6E3EF] dark:bg-zinc-800/80 p-1 rounded-[12px] shadow-[inset_0_1px_2px_rgba(15,35,60,0.12)] border border-white/60 dark:border-zinc-700/60 flex-wrap">
                        {['All Partners', 'Doctors', 'Hospitals', 'Clinics', 'RMPs'].map((filterName) => {
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
                                placeholder="Search partner, clinic..."
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

                {/* Main Table */}
                <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                                <th className="py-2.5 px-3">Partner Organization</th>
                                <th className="py-2.5 px-2">Type</th>
                                <th className="py-2.5 px-2 text-center">Referred Patients</th>
                                <th className="py-2.5 px-2 text-center">Visits</th>
                                <th className="py-2.5 px-2 text-center">Investigations</th>
                                <th className="py-2.5 px-2 text-right">Gross Tariff</th>
                                <th className="py-2.5 px-2 text-right">Concessions</th>
                                <th className="py-2.5 px-2 text-right">Net Revenue</th>
                                <th className="py-2.5 px-2 text-right">Commission Accrued</th>
                                <th className="py-2.5 px-2 text-right">Commission Paid</th>
                                <th className="py-2.5 px-2 text-center">Outstanding</th>
                                <th className="py-2.5 px-2 text-right">Effective Rate ↓</th>
                                <th className="py-2.5 px-3 text-right">Last Referral</th>
                                <th className="py-2.5 px-2 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 dark:divide-zinc-800/60">
                            {visiblePartners.length === 0 ? (
                                <tr>
                                    <td colSpan={14} className="py-12 text-center text-slate-400 dark:text-zinc-500">
                                        No referral partner records found.
                                    </td>
                                </tr>
                            ) : (
                                visiblePartners.map((p) => (
                                    <tr 
                                        key={p.partnerId}
                                        className="hover:bg-slate-200/40 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                                        onClick={() => handlePartnerClick(p)}
                                    >
                                        {/* Partner Organization */}
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-6 h-6 rounded-full bg-[#FAF5FF] dark:bg-purple-950/40 text-[#C084FC] dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
                                                    <User size={12} />
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-zinc-100 group-hover:text-synos-primary transition-colors">
                                                    {p.name}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Type */}
                                        <td className="py-3 px-2">
                                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", partnerTypeBadgeStyles[p.partnerType] || "bg-slate-100 text-slate-600")}>
                                                {p.partnerType}
                                            </span>
                                        </td>

                                        {/* Referred Patients */}
                                        <td className="py-3 px-2 text-center font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                                            {p.referredPatients || 0}
                                        </td>

                                        {/* Visits */}
                                        <td className="py-3 px-2 text-center font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                                            {p.visits || 0}
                                        </td>

                                        {/* Investigations */}
                                        <td className="py-3 px-2 text-center font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                                            {p.investigations || 0}
                                        </td>

                                        {/* Gross Tariff */}
                                        <td className="py-3 px-2 text-right font-medium text-slate-600 dark:text-zinc-400 tabular-nums">
                                            ₹{(p.grossTariff || 0).toLocaleString()}
                                        </td>

                                        {/* Concessions */}
                                        <td className="py-3 px-2 text-right font-medium text-slate-600 dark:text-zinc-400 tabular-nums">
                                            ₹{(p.concessions || 0).toLocaleString()} <span className="text-slate-400 text-[10px]">({p.concessionsPct || 0}%)</span>
                                        </td>

                                        {/* Net Revenue */}
                                        <td className="py-3 px-2 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">
                                            ₹{(p.netRevenue || 0).toLocaleString()}
                                        </td>

                                        {/* Commission Accrued */}
                                        <td className="py-3 px-2 text-right font-black text-synos-primary dark:text-sky-400 tabular-nums">
                                            ₹{(p.commissionAccrued || 0).toLocaleString()}
                                        </td>

                                        {/* Commission Paid */}
                                        <td className="py-3 px-2 text-right font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                                            ₹{(p.commissionPaid || 0).toLocaleString()}
                                        </td>

                                        {/* Outstanding */}
                                        <td className="py-3 px-2 text-center">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums border",
                                                p.outstanding > 0 
                                                    ? 'bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]/70 dark:bg-rose-950/40 dark:text-rose-400' 
                                                    : 'bg-[#D1FAE5] text-[#047857] border-[#A7F3D0]/70 dark:bg-emerald-950/40 dark:text-emerald-400'
                                            )}>
                                                ₹{(p.outstanding || 0).toLocaleString()}
                                            </span>
                                        </td>

                                        {/* Effective Rate */}
                                        <td className="py-3 px-2 text-right font-bold text-slate-800 dark:text-zinc-200 tabular-nums">
                                            {p.effectiveRate || 0}%
                                        </td>

                                        {/* Last Referral */}
                                        <td className="py-3 px-3 text-right text-slate-500 dark:text-zinc-400 tabular-nums text-[11px]">
                                            {p.lastReferralDate || "—"}
                                        </td>

                                        {/* Action Arrow */}
                                        <td className="py-3 px-2 text-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePartnerClick(p);
                                                }}
                                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 group-hover:text-synos-primary transition-colors cursor-pointer"
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

                {/* Floating Load More Button (Top 6 rows at a glance initially) */}
                {filteredPartners.length > 6 && (
                    <div className="pt-2 flex justify-center">
                        <button
                            onClick={() => setIsTableExpanded(!isTableExpanded)}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/90 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-2xs hover:shadow-xs hover:bg-slate-50 dark:hover:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200 transition-all cursor-pointer group"
                        >
                            <span>{isTableExpanded ? 'Show Less' : `Load More (${filteredPartners.length - 6} more)`}</span>
                            <ChevronDown size={14} className={cn("text-slate-400 group-hover:text-synos-primary transition-transform duration-200", isTableExpanded && "rotate-180")} />
                        </button>
                    </div>
                )}
            </div>

            {/* ROW 4: 3 BOTTOM TACTILE PODS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-3.5 items-stretch">
                {/* Bottom Pod 1: Commission by Investigation (Top 5) */}
                <div className="p-3.5 sm:p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200 dark:border-zinc-800">
                            <div className="w-6 h-6 rounded-[7px] bg-[#EFF6FF] text-[#38BDF8] dark:bg-sky-950/40 dark:text-sky-400 border border-[#DBEAFE] flex items-center justify-center shrink-0 shadow-2xs">
                                <FlaskConical size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                                Commission by Investigation (Top 5)
                            </h3>
                        </div>

                        <div className="grid grid-cols-12 gap-1 py-2 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider border-b border-slate-200/60 dark:border-zinc-800/60">
                            <div className="col-span-4">Investigation</div>
                            <div className="col-span-3 text-center">Volume</div>
                            <div className="col-span-2 text-right">Net Rev</div>
                            <div className="col-span-2 text-right">Comm</div>
                            <div className="col-span-1 text-right">Rate</div>
                        </div>

                        <div className="divide-y divide-slate-200/70 dark:divide-zinc-800/60 text-xs">
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
                                            <div className="w-9 h-1.5 rounded-full bg-[#E2ECF6] dark:bg-zinc-800 overflow-hidden shadow-inner">
                                                <div 
                                                    className="h-full rounded-full bg-[#38BDF8]" 
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

                {/* Bottom Pod 2: Commission Calculation Base (Donut) */}
                <div className="p-3.5 sm:p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200 dark:border-zinc-800">
                            <div className="w-6 h-6 rounded-[7px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                <Percent size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                                Commission Calculation Base
                            </h3>
                        </div>

                        {/* Donut and Legend */}
                        <div className="flex items-center justify-between gap-3 py-3">
                            {/* SVG Donut */}
                            <div className="relative w-28 h-28 sm:w-30 sm:h-30 shrink-0 flex items-center justify-center">
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
                                    {/* Segment 1: After discount (Sky Blue) */}
                                    <circle
                                        cx="65"
                                        cy="65"
                                        r="52"
                                        fill="transparent"
                                        stroke="#7DD3FC"
                                        strokeWidth="15"
                                        strokeDasharray={`${afterStroke} ${donutCircumference}`}
                                        strokeDashoffset="0"
                                    />
                                    {/* Segment 2: Before discount (Purple) */}
                                    <circle
                                        cx="65"
                                        cy="65"
                                        r="52"
                                        fill="transparent"
                                        stroke="#C084FC"
                                        strokeWidth="15"
                                        strokeDasharray={`${beforeStroke} ${donutCircumference}`}
                                        strokeDashoffset={beforeOffset}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                                        ₹{(calculationBase.totalEligibleRevenue || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[8px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                        Eligible Rev
                                    </span>
                                </div>
                            </div>

                            {/* Legend items */}
                            <div className="flex-1 space-y-2.5 text-xs">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#7DD3FC] shrink-0" />
                                        <span className="font-extrabold text-slate-800 dark:text-zinc-200 text-[11px]">
                                            After Discount (Net Rev)
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 pl-3.5 mt-0.5">
                                        ₹{(calculationBase.afterDiscountAmount || 0).toLocaleString()} ({calculationBase.afterDiscountPct || 0}%)
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#C084FC] shrink-0" />
                                        <span className="font-extrabold text-slate-800 dark:text-zinc-200 text-[11px]">
                                            Before Discount (Gross)
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 pl-3.5 mt-0.5">
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

                {/* Bottom Pod 3: Recent Commission Activity */}
                <div className="p-3.5 sm:p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-[7px] bg-[#FAF5FF] text-[#C084FC] dark:bg-purple-950/40 dark:text-purple-400 border border-[#F3E8FF] flex items-center justify-center shrink-0 shadow-2xs">
                                    <FileText size={13} strokeWidth={2.3} />
                                </div>
                                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                                    Recent Commission Activity
                                </h3>
                            </div>
                            <button
                                onClick={onNavigateToHistory}
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
                                    No recent settlement or accrual activity.
                                </div>
                            ) : (
                                recentActivity.slice(0, 3).map((act, idx) => (
                                    <div key={act.id || idx} className="py-2 flex items-start gap-2.5">
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                            act.type === 'Settled'
                                                ? 'bg-[#D1FAE5] dark:bg-emerald-950/50 text-[#047857] dark:text-emerald-400'
                                                : 'bg-[#FAF5FF] dark:bg-purple-950/50 text-[#C084FC] dark:text-purple-400'
                                        }`}>
                                            {act.type === 'Settled' ? <ShieldCheck size={13} /> : <Layers size={13} />}
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
                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                                                {act.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
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
