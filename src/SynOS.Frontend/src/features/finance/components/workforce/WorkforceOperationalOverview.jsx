import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    Calendar, 
    CalendarCheck, 
    Wallet, 
    Layers, 
    TrendingUp, 
    PieChart, 
    Bell, 
    ChevronRight, 
    CheckCircle2, 
    Clock, 
    Zap, 
    Play, 
    FileText, 
    RotateCw,
    UserPlus,
    CalendarX,
    ArrowUpRight,
    Building2,
    ShieldAlert
} from 'lucide-react';
import { cn } from '../../../../lib/utils';

export const WorkforceOperationalOverview = ({ data, loading, onRefresh, lastUpdated }) => {
    const navigate = useNavigate();
    const [hoveredTrendIdx, setHoveredTrendIdx] = useState(null);

    const operational = data?.operational || {};
    const kpis = operational.kpis || {};
    const attendanceTrend = operational.attendanceTrend || [];
    const deptBreakdown = operational.workforceByDepartment || [];
    const attentionCenter = operational.attentionCenter || [];
    const payrollOverview = operational.payrollOverview || {};
    const recentActivity = operational.recentActivity || [];

    // Format currency in Indian format
    const formatInr = (val) => {
        const num = Number(val || 0);
        return `₹${num.toLocaleString('en-IN')}`;
    };

    // Calculate SVG dimensions for attendance trend
    const chartWidth = 540;
    const chartHeight = 180;
    const paddingX = 35;
    const paddingY = 25;

    // Attendance chart calculations (y-scale from 88% to 100%)
    const minPct = 88;
    const maxPct = 100;
    const getTrendX = (index) => {
        const count = Math.max(1, attendanceTrend.length - 1);
        return paddingX + (index / count) * (chartWidth - paddingX * 2);
    };
    const getTrendY = (pct) => {
        const clamped = Math.max(minPct, Math.min(maxPct, pct));
        return chartHeight - paddingY - ((clamped - minPct) / (maxPct - minPct)) * (chartHeight - paddingY * 2);
    };

    // Build SVG path
    let trendPathD = '';
    let trendAreaD = '';
    if (attendanceTrend.length > 0) {
        trendPathD = attendanceTrend.reduce((acc, curr, idx) => {
            const x = getTrendX(idx);
            const y = getTrendY(curr.attendancePct);
            return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
        }, '');
        const firstX = getTrendX(0);
        const lastX = getTrendX(attendanceTrend.length - 1);
        const bottomY = chartHeight - paddingY;
        trendAreaD = `${trendPathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }

    // Donut chart angles for Department Breakdown
    const totalStaff = kpis.activeEmployees || deptBreakdown.reduce((sum, d) => sum + (d.count || 0), 0) || 1;
    const deptColors = ['#38BDF8', '#FBBF24', '#34D399', '#A78BFA', '#FB923C', '#94A3B8'];
    
    let cumulativePercent = 0;
    const donutSlices = deptBreakdown.map((dept, idx) => {
        const pct = (dept.count || 0) / totalStaff;
        const startAngle = cumulativePercent * 360;
        cumulativePercent += pct;
        const endAngle = cumulativePercent * 360;
        return {
            ...dept,
            startAngle,
            endAngle,
            color: deptColors[idx % deptColors.length]
        };
    });

    const getCoordinatesForPercent = (percent) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* ROW 1: 5 KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* 1. Active Employees */}
                <div 
                    onClick={() => navigate('/finance/workforce/staff')}
                    className="p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-[#BAE6FD] dark:border-sky-800/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                            <Users size={18} strokeWidth={2.4} />
                        </div>
                        {kpis.newJoinersDelta > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400 border border-[#A7F3D0] dark:border-emerald-800/50">
                                +{kpis.newJoinersDelta}
                            </span>
                        )}
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wide">
                            Active Employees
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {kpis.activeEmployees || 0}
                        </div>
                    </div>
                </div>

                {/* 2. Attendance Exceptions */}
                <div 
                    onClick={() => navigate('/finance/workforce/attendance')}
                    className="p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FAF5FF] text-[#9333EA] dark:bg-purple-950/40 dark:text-purple-400 border border-[#F3E8FF] dark:border-purple-800/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                            <CalendarX size={18} strokeWidth={2.4} />
                        </div>
                        {kpis.exceptionDelta !== undefined && (
                            <span className={cn(
                                "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold border",
                                kpis.exceptionDelta <= 0 
                                    ? "bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400 border-[#A7F3D0] dark:border-emerald-800/50"
                                    : "bg-[#FFF1F2] text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400 border-[#FECDD3] dark:border-rose-800/50"
                            )}>
                                {kpis.exceptionDelta > 0 ? `+${kpis.exceptionDelta}` : `${kpis.exceptionDelta}`}
                            </span>
                        )}
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wide">
                            Attendance Exceptions
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {kpis.todayExceptions || 0}
                        </div>
                    </div>
                </div>

                {/* 3. Leave Requests */}
                <div 
                    onClick={() => navigate('/finance/workforce/attendance')}
                    className="p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400 border border-[#A7F3D0] dark:border-emerald-800/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                            <CalendarCheck size={18} strokeWidth={2.4} />
                        </div>
                        {kpis.leaveRequests > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400 border border-[#A7F3D0] dark:border-emerald-800/50">
                                Awaiting approval
                            </span>
                        )}
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wide">
                            Leave Requests
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {kpis.leaveRequests || 0}
                        </div>
                    </div>
                </div>

                {/* 4. Pending Advances */}
                <div 
                    onClick={() => navigate('/finance/workforce/adjustments')}
                    className="p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] text-[#D97706] dark:bg-amber-950/40 dark:text-amber-400 border border-[#FDE68A] dark:border-amber-800/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                            <ShieldAlert size={18} strokeWidth={2.4} />
                        </div>
                        {kpis.pendingAdvancesCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FFFBEB] text-[#D97706] dark:bg-amber-950/40 dark:text-amber-400 border border-[#FDE68A] dark:border-amber-800/50">
                                {kpis.pendingAdvancesCount} requests
                            </span>
                        )}
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wide">
                            Pending Advances
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {formatInr(kpis.pendingAdvances)}
                        </div>
                    </div>
                </div>

                {/* 5. Departments */}
                <div 
                    onClick={() => navigate('/finance/workforce/staff')}
                    className="p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-[#F5F3FF] text-[#7C3AED] dark:bg-violet-950/40 dark:text-violet-400 border border-[#DDD6FE] dark:border-violet-800/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                            <Layers size={18} strokeWidth={2.4} />
                        </div>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wide">
                            Departments
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {kpis.departments || deptBreakdown.length || 0}
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 2: ATTENDANCE TREND, WORKFORCE BY DEPARTMENT, HR ATTENTION CENTER */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                {/* Pod 1: Attendance Trend (5 cols) */}
                <div className="lg:col-span-5 p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-[#BAE6FD] flex items-center justify-center shrink-0 shadow-2xs">
                                <TrendingUp size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                Attendance Trend
                            </h3>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-3 text-xs font-semibold">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                                <span className="text-[11px] text-slate-600 dark:text-zinc-300 font-bold">Attendance %</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#C084FC]" />
                                <span className="text-[11px] text-slate-600 dark:text-zinc-300 font-bold">Exceptions</span>
                            </div>
                        </div>
                    </div>

                    {/* SVG Chart with Pastel Colors & Zero Black Bars */}
                    <div className="relative w-full h-[160px] mt-2 select-none">
                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                            <defs>
                                <linearGradient id="attAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                                </linearGradient>
                            </defs>

                            {/* Horizontal Grid lines */}
                            {[90, 94, 98].map((val) => {
                                const y = getTrendY(val);
                                return (
                                    <g key={val}>
                                        <line 
                                            x1={paddingX - 10} 
                                            y1={y} 
                                            x2={chartWidth - paddingX + 10} 
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
                                            {val}%
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Exception Bars at the Bottom (Soft Pastel Purple, never black) */}
                            {attendanceTrend.map((t, idx) => {
                                const x = getTrendX(idx);
                                const barH = Math.min(22, (t.exceptions || 0) * 6);
                                if (barH <= 0) return null;
                                return (
                                    <rect 
                                        key={`exc-${idx}`}
                                        x={x - 4} 
                                        y={chartHeight - paddingY - barH} 
                                        width={8} 
                                        height={barH} 
                                        rx={2.5} 
                                        fill="#DDD6FE"
                                        fillOpacity={0.8}
                                        className="transition-all"
                                    />
                                );
                            })}

                            {/* Area Fill */}
                            {trendAreaD && <path d={trendAreaD} fill="url(#attAreaGrad)" />}

                            {/* Trend Line */}
                            {trendPathD && (
                                <path 
                                    d={trendPathD} 
                                    fill="none" 
                                    stroke="#38BDF8" 
                                    strokeWidth="2.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                />
                            )}

                            {/* Data points */}
                            {attendanceTrend.map((t, idx) => {
                                const x = getTrendX(idx);
                                const y = getTrendY(t.attendancePct);
                                const isHovered = hoveredTrendIdx === idx;
                                const isLast = idx === attendanceTrend.length - 1;

                                return (
                                    <g key={`pt-${idx}`}>
                                        <circle 
                                            cx={x} 
                                            cy={y} 
                                            r={isHovered ? 4.5 : (isLast ? 3.5 : 2.5)} 
                                            fill="#FFFFFF" 
                                            stroke="#0284C7" 
                                            strokeWidth={isHovered ? 2.5 : 2}
                                            className="cursor-pointer transition-all"
                                            onMouseEnter={() => setHoveredTrendIdx(idx)}
                                            onMouseLeave={() => setHoveredTrendIdx(null)}
                                        />
                                    </g>
                                );
                            })}

                            {/* Hover / Last Day Callout Badge */}
                            {attendanceTrend.length > 0 && (() => {
                                const activeIdx = hoveredTrendIdx !== null ? hoveredTrendIdx : attendanceTrend.length - 1;
                                const item = attendanceTrend[activeIdx];
                                if (!item) return null;
                                const x = Math.min(chartWidth - 55, Math.max(45, getTrendX(activeIdx)));
                                const y = Math.max(16, getTrendY(item.attendancePct) - 18);

                                return (
                                    <g transform={`translate(${x - 30}, ${y})`} className="pointer-events-none">
                                        <rect x="0" y="0" width="60" height="22" rx="6" fill="#0284C7" />
                                        <text x="30" y="14" textAnchor="middle" fill="#FFFFFF" className="text-[10px] font-bold font-mono">
                                            {item.attendancePct}%
                                        </text>
                                    </g>
                                );
                            })()}

                            {/* X-axis Day Labels */}
                            {attendanceTrend.map((t, idx) => {
                                if (idx % 5 !== 0 && idx !== attendanceTrend.length - 1) return null;
                                const x = getTrendX(idx);
                                return (
                                    <text 
                                        key={`label-${idx}`}
                                        x={x} 
                                        y={chartHeight - 8} 
                                        textAnchor="middle" 
                                        className="text-[9px] fill-slate-400 dark:fill-zinc-500 font-medium"
                                    >
                                        {t.label}
                                    </text>
                                );
                            })}
                        </svg>
                    </div>
                </div>

                {/* Pod 2: Workforce by Department (4 cols) */}
                <div className="lg:col-span-4 p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-[#BAE6FD] flex items-center justify-center shrink-0 shadow-2xs">
                                <PieChart size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                Workforce by Department
                            </h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 py-2">
                        {/* Donut Chart SVG */}
                        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                            <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full -rotate-90">
                                {donutSlices.map((slice, i) => {
                                    const [startX, startY] = getCoordinatesForPercent(slice.startAngle / 360);
                                    const [endX, endY] = getCoordinatesForPercent(slice.endAngle / 360);
                                    const largeArcFlag = slice.endAngle - slice.startAngle > 180 ? 1 : 0;
                                    const pathData = `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;
                                    return (
                                        <path 
                                            key={i} 
                                            d={pathData} 
                                            fill={slice.color} 
                                            stroke="#FFFFFF" 
                                            strokeWidth="0.05"
                                        />
                                    );
                                })}
                                {/* Inner circle for donut hole */}
                                <circle cx="0" cy="0" r="0.65" fill="#F8FAFC" className="dark:fill-zinc-900" />
                            </svg>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                <span className="text-base font-black text-slate-900 dark:text-white leading-tight">
                                    {totalStaff}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase">
                                    Staff
                                </span>
                            </div>
                        </div>

                        {/* Department Legend */}
                        <div className="flex-1 space-y-1.5">
                            {deptBreakdown.slice(0, 5).map((d, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: deptColors[idx % deptColors.length] }} />
                                        <span className="text-slate-600 dark:text-zinc-300 font-medium truncate">
                                            {d.department}
                                        </span>
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-zinc-200 ml-2 shrink-0">
                                        {d.percentage}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Pod 3: HR Attention Center (3 cols) */}
                <div className="lg:col-span-3 p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#FFFBEB] text-[#D97706] dark:bg-amber-950/40 dark:text-amber-400 border border-[#FDE68A] flex items-center justify-center shrink-0 shadow-2xs">
                                <Bell size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                HR Attention Center
                            </h3>
                            {attentionCenter.reduce((sum, a) => sum + (a.count || 0), 0) > 0 && (
                                <span className="w-4 h-4 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center">
                                    {attentionCenter.reduce((sum, a) => sum + (a.count || 0), 0)}
                                </span>
                            )}
                        </div>
                        <button 
                            onClick={() => navigate('/finance/workforce/attendance')}
                            className="text-[11px] font-bold text-synos-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                            View All <ChevronRight size={12} />
                        </button>
                    </div>

                    <div className="space-y-1.5 py-1">
                        {attentionCenter.map((item, idx) => (
                            <div 
                                key={item.id || idx}
                                onClick={() => navigate(`/finance/workforce/${item.tab || 'attendance'}`)}
                                className="p-2 rounded-xl bg-white/70 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-zinc-800 transition-all group"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-5 h-5 rounded-md bg-[#FAF5FF] text-[#9333EA] dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                                        {item.count || 0}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200 truncate">
                                        {item.label}
                                    </span>
                                </div>
                                <ChevronRight size={13} className="text-slate-400 group-hover:text-synos-primary transition-colors shrink-0" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ROW 3: PAYROLL TEASER, RECENT WORKFORCE ACTIVITY, QUICK ACTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                {/* Pod 1: Payroll & Financial Overview Teaser (5 cols) */}
                <div 
                    onClick={() => navigate('/finance/workforce/process')}
                    className="lg:col-span-5 p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
                >
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-[#BAE6FD] flex items-center justify-center shrink-0 shadow-2xs">
                                <Wallet size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                Payroll & Financial Overview
                            </h3>
                        </div>
                        <button className="text-[11px] font-bold text-synos-primary hover:underline flex items-center gap-0.5">
                            View Details <ArrowUpRight size={12} />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 py-3">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Obligation ({payrollOverview.periodName || 'Current'})
                            </span>
                            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                                {formatInr(payrollOverview.obligation)}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Paid To Date
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    {payrollOverview.paidPct || 0}%
                                </span>
                            </div>
                            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                                {formatInr(payrollOverview.paidToDate)}
                            </div>
                            {/* Pastel Progress bar */}
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden mt-1.5">
                                <div 
                                    className="h-full bg-[#10B981] rounded-full transition-all"
                                    style={{ width: `${Math.min(100, payrollOverview.paidPct || 0)}%` }}
                                />
                            </div>
                        </div>

                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Outstanding
                            </span>
                            <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
                                {formatInr(payrollOverview.outstandingPayable)}
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                            <span className="font-medium">Advance Balance:</span>
                            <span className="font-bold text-slate-800 dark:text-zinc-200">{formatInr(payrollOverview.advanceBalance)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-medium">Next Payroll:</span>
                            <span className="font-bold text-slate-800 dark:text-zinc-200">{payrollOverview.nextPayrollDue || 'Upcoming'}</span>
                        </div>
                    </div>
                </div>

                {/* Pod 2: Recent Workforce Activity (4 cols) */}
                <div className="lg:col-span-4 p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-[#BAE6FD] flex items-center justify-center shrink-0 shadow-2xs">
                                <Clock size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                Recent Workforce Activity
                            </h3>
                        </div>
                        <button 
                            onClick={() => navigate('/finance/workforce/history')}
                            className="text-[11px] font-bold text-synos-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                            View All <ChevronRight size={12} />
                        </button>
                    </div>

                    <div className="space-y-2 py-1">
                        {recentActivity.length === 0 ? (
                            <div className="py-6 text-center text-slate-400 text-xs">
                                No recent workforce activity recorded.
                            </div>
                        ) : (
                            recentActivity.slice(0, 4).map((act, idx) => (
                                <div key={act.id || idx} className="flex items-start gap-2.5 text-xs">
                                    <div className="w-5 h-5 rounded-md bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                        <CheckCircle2 size={12} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-800 dark:text-zinc-200 truncate">
                                            {act.title}
                                        </p>
                                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                                            {act.time}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Pod 3: Quick Actions (3 cols) */}
                <div className="lg:col-span-3 p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-[#BAE6FD] flex items-center justify-center shrink-0 shadow-2xs">
                                <Zap size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                Quick Actions
                            </h3>
                        </div>
                    </div>

                    <div className="space-y-2 py-1">
                        <button 
                            onClick={() => navigate('/finance/workforce/process')}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 text-xs font-bold text-slate-800 dark:text-zinc-200 hover:bg-synos-primary hover:text-white hover:border-synos-primary transition-all cursor-pointer shadow-2xs group"
                        >
                            <Play size={14} className="text-[#0284C7] group-hover:text-white transition-colors" />
                            <span>Process Payroll</span>
                        </button>

                        <button 
                            onClick={() => navigate('/finance/workforce/attendance')}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 text-xs font-bold text-slate-800 dark:text-zinc-200 hover:bg-synos-primary hover:text-white hover:border-synos-primary transition-all cursor-pointer shadow-2xs group"
                        >
                            <CalendarCheck size={14} className="text-[#059669] group-hover:text-white transition-colors" />
                            <span>Approve Leaves</span>
                        </button>

                        <button 
                            onClick={() => navigate('/finance/workforce/attendance')}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 text-xs font-bold text-slate-800 dark:text-zinc-200 hover:bg-synos-primary hover:text-white hover:border-synos-primary transition-all cursor-pointer shadow-2xs group"
                        >
                            <Users size={14} className="text-[#9333EA] group-hover:text-white transition-colors" />
                            <span>Review Attendance</span>
                        </button>

                        <button 
                            onClick={() => navigate('/finance/workforce/history')}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 text-xs font-bold text-slate-800 dark:text-zinc-200 hover:bg-synos-primary hover:text-white hover:border-synos-primary transition-all cursor-pointer shadow-2xs group"
                        >
                            <FileText size={14} className="text-[#D97706] group-hover:text-white transition-colors" />
                            <span>View Payslips</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
