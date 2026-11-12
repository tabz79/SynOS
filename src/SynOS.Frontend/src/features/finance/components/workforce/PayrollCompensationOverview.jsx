import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Wallet, 
    CheckCircle2, 
    Hourglass, 
    Receipt, 
    HandCoins, 
    TrendingUp, 
    PieChart, 
    Building2, 
    Calendar, 
    Search, 
    Download, 
    ChevronRight, 
    ChevronDown, 
    Clock, 
    ShieldCheck, 
    CreditCard, 
    ArrowRight,
    Filter,
    UserCheck
} from 'lucide-react';
import { cn } from '../../../../lib/utils';

export const PayrollCompensationOverview = ({ data, loading, onRefresh, lastUpdated }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
    const [isTableExpanded, setIsTableExpanded] = useState(false);
    const [hoveredTrendIdx, setHoveredTrendIdx] = useState(null);

    const financial = data?.financial || {};
    const kpis = financial.kpis || {};
    const payrollCostTrend = financial.payrollCostTrend || [];
    const payrollByDept = financial.payrollByDepartment || [];
    const componentMix = financial.salaryComponentMix || {};
    const currentRun = financial.currentRun || {};
    const employeeSummary = financial.employeeSummary || [];
    const statutoryCompliance = financial.statutoryCompliance || {};
    const advancesSummary = financial.advancesSummary || {};
    const recentActivity = financial.recentActivity || [];

    const formatInr = (val) => {
        const num = Number(val || 0);
        return `₹${num.toLocaleString('en-IN')}`;
    };

    // Filter employees by department and search
    const filteredEmployees = useMemo(() => {
        return employeeSummary.filter(emp => {
            const matchesSearch = !searchQuery || 
                (emp.name && emp.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (emp.department && emp.department.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesDept = selectedDeptFilter === 'All' || 
                (selectedDeptFilter === 'Lab' && emp.department?.toLowerCase().includes('lab')) ||
                (selectedDeptFilter === 'Radiology' && emp.department?.toLowerCase().includes('radio')) ||
                (selectedDeptFilter === 'Reception' && emp.department?.toLowerCase().includes('recept')) ||
                (selectedDeptFilter === 'Admin' && emp.department?.toLowerCase().includes('admin')) ||
                (selectedDeptFilter === 'Support' && emp.department?.toLowerCase().includes('support'));

            return matchesSearch && matchesDept;
        });
    }, [employeeSummary, searchQuery, selectedDeptFilter]);

    // Top 6 rows at a glance initially, expandable with Load More
    const visibleEmployees = useMemo(() => {
        return isTableExpanded ? filteredEmployees : filteredEmployees.slice(0, 6);
    }, [filteredEmployees, isTableExpanded]);

    // Export CSV of the employee payroll table
    const handleExportCsv = () => {
        if (!filteredEmployees || filteredEmployees.length === 0) return;
        const headers = [
            "Employee ID", "Name", "Department", "Gross (Earned)", "LOP Deduction",
            "PF", "ESI", "TDS", "Advance Recovery", "Net Payable", "Status"
        ];
        const rows = filteredEmployees.map(e => [
            `"${e.employeeId || ''}"`,
            `"${(e.name || '').replace(/"/g, '""')}"`,
            `"${(e.department || '').replace(/"/g, '""')}"`,
            e.gross || 0,
            e.lopDeduction || 0,
            e.pf || 0,
            e.esi || 0,
            e.tds || 0,
            e.advanceRecovery || 0,
            e.netPayable || 0,
            `"${e.status || ''}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `SynOS_Payroll_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calculate Trend Chart Dimensions (6 Months)
    const chartWidth = 540;
    const chartHeight = 180;
    const paddingX = 38;
    const paddingY = 25;
    const trendMax = 1500000; // 15L max scale

    const getTrendX = (index) => {
        const count = Math.max(1, payrollCostTrend.length - 1);
        return paddingX + (index / count) * (chartWidth - paddingX * 2);
    };
    const getTrendY = (amount) => {
        const clamped = Math.max(0, Math.min(trendMax, amount));
        return chartHeight - paddingY - (clamped / trendMax) * (chartHeight - paddingY * 2);
    };

    // Generate paths for Gross and Net lines
    let grossPathD = '';
    let netPathD = '';
    let grossAreaD = '';
    let netAreaD = '';

    if (payrollCostTrend.length > 0) {
        grossPathD = payrollCostTrend.reduce((acc, curr, idx) => {
            const x = getTrendX(idx);
            const y = getTrendY(curr.gross);
            return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
        }, '');

        netPathD = payrollCostTrend.reduce((acc, curr, idx) => {
            const x = getTrendX(idx);
            const y = getTrendY(curr.net);
            return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
        }, '');

        const firstX = getTrendX(0);
        const lastX = getTrendX(payrollCostTrend.length - 1);
        const bottomY = chartHeight - paddingY;

        grossAreaD = `${grossPathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
        netAreaD = `${netPathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }

    // Donut chart calculations for Salary Component Mix
    const compTotal = (componentMix.basicSalary || 0) + (componentMix.hra || 0) + (componentMix.otherAllowances || 0) || 1;
    const compSlices = [
        { label: "Basic Salary", amount: componentMix.basicSalary || 0, pct: componentMix.basicPct || 50, color: "#38BDF8" },
        { label: "HRA", amount: componentMix.hra || 0, pct: componentMix.hraPct || 30, color: "#C084FC" },
        { label: "Other Allowances", amount: componentMix.otherAllowances || 0, pct: componentMix.otherPct || 20, color: "#34D399" }
    ];

    let cumPct = 0;
    const compDonutData = compSlices.map(slice => {
        const slicePct = slice.amount / compTotal;
        const startAngle = cumPct * 360;
        cumPct += slicePct;
        const endAngle = cumPct * 360;
        return { ...slice, startAngle, endAngle };
    });

    const getCoordinatesForPercent = (percent) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    const deptGradients = [
        'from-[#38BDF8] to-[#0284C7]',
        'from-[#C084FC] to-[#9333EA]',
        'from-[#34D399] to-[#059669]',
        'from-[#60A5FA] to-[#2563EB]',
        'from-[#FBBF24] to-[#D97706]'
    ];

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* ROW 1: 5 KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* 1. Payroll Obligation */}
                <div 
                    onClick={() => navigate('/finance/workforce/process')}
                    className="p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-[#BAE6FD] dark:border-sky-800/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                            <Wallet size={18} strokeWidth={2.4} />
                        </div>
                        {kpis.employeeCount > 0 && (
                            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                                {kpis.periodLabel} ({kpis.employeeCount})
                            </span>
                        )}
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wide">
                            Payroll Obligation
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {formatInr(kpis.payrollObligation)}
                        </div>
                    </div>
                </div>

                {/* 2. Amount Disbursed */}
                <div 
                    onClick={() => navigate('/finance/workforce/history')}
                    className="p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400 border border-[#A7F3D0] dark:border-emerald-800/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                            <CheckCircle2 size={18} strokeWidth={2.4} />
                        </div>
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400 border border-[#A7F3D0] dark:border-emerald-800/50">
                            {kpis.disbursedPct || 0}%
                        </span>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wide">
                            Amount Disbursed
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {formatInr(kpis.amountDisbursed)}
                        </div>
                    </div>
                </div>

                {/* 3. Outstanding Payable */}
                <div 
                    onClick={() => navigate('/finance/workforce/process')}
                    className="p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FFF1F2] text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400 border border-[#FECDD3] dark:border-rose-800/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                            <Hourglass size={18} strokeWidth={2.4} />
                        </div>
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF1F2] text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400 border border-[#FECDD3] dark:border-rose-800/50">
                            {kpis.outstandingPct || 0}%
                        </span>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wide">
                            Outstanding Payable
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {formatInr(kpis.outstandingPayable)}
                        </div>
                    </div>
                </div>

                {/* 4. Statutory Deductions */}
                <div 
                    onClick={() => navigate('/finance/workforce/adjustments')}
                    className="p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FAF5FF] text-[#9333EA] dark:bg-purple-950/40 dark:text-purple-400 border border-[#F3E8FF] dark:border-purple-800/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                            <Receipt size={18} strokeWidth={2.4} />
                        </div>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wide">
                            Statutory Deductions
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {formatInr(kpis.statutoryDeductions)}
                        </div>
                    </div>
                </div>

                {/* 5. Advance Balance */}
                <div 
                    onClick={() => navigate('/finance/workforce/adjustments')}
                    className="p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-[#BAE6FD] dark:border-sky-800/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                            <HandCoins size={18} strokeWidth={2.4} />
                        </div>
                        {kpis.advanceEmployeesCount > 0 && (
                            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                                {kpis.advanceEmployeesCount} staff
                            </span>
                        )}
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wide">
                            Advance Balance
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {formatInr(kpis.advanceBalance)}
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 2: PAYROLL COST TREND, PAYROLL BY DEPT, SALARY COMPONENT MIX */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                {/* Pod 1: Payroll Cost Trend (5 cols) */}
                <div className="lg:col-span-5 p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-[#BAE6FD] flex items-center justify-center shrink-0 shadow-2xs">
                                <TrendingUp size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                Payroll Cost Trend (Last 6 Months)
                            </h3>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-3 text-xs font-semibold">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                                <span className="text-[11px] text-slate-600 dark:text-zinc-300 font-bold">Gross</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#C084FC]" />
                                <span className="text-[11px] text-slate-600 dark:text-zinc-300 font-bold">Net</span>
                            </div>
                        </div>
                    </div>

                    {/* SVG Dual-Line Trend Chart (Zero Black Bars, Safe Pastel Styling) */}
                    <div className="relative w-full h-[160px] mt-2 select-none">
                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                            <defs>
                                <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.22" />
                                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                                </linearGradient>
                                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#C084FC" stopOpacity="0.20" />
                                    <stop offset="100%" stopColor="#C084FC" stopOpacity="0.0" />
                                </linearGradient>
                            </defs>

                            {/* Horizontal Grid lines */}
                            {[0, 300000, 600000, 900000, 1200000, 1500000].map((val) => {
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
                                            ₹{val === 0 ? '0' : `${val / 100000}L`}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Safe Pastel Background Pillars (Never black!) */}
                            {payrollCostTrend.map((t, idx) => {
                                const x = getTrendX(idx);
                                const isHovered = hoveredTrendIdx === idx;
                                const isLast = idx === payrollCostTrend.length - 1;
                                return (
                                    <rect 
                                        key={`pillar-${idx}`}
                                        x={x - 14} 
                                        y={paddingY - 8} 
                                        width={28} 
                                        height={chartHeight - paddingY * 2 + 16} 
                                        rx={8} 
                                        fill={isHovered ? "#E0F2FE" : (isLast ? "#E0F2FE" : "#F1F5F9")}
                                        fillOpacity={isHovered ? 0.75 : (isLast ? 0.55 : 0.35)}
                                        className="transition-all"
                                    />
                                );
                            })}

                            {/* Area fills */}
                            {grossAreaD && <path d={grossAreaD} fill="url(#grossGrad)" />}
                            {netAreaD && <path d={netAreaD} fill="url(#netGrad)" />}

                            {/* Gross Line */}
                            {grossPathD && (
                                <path 
                                    d={grossPathD} 
                                    fill="none" 
                                    stroke="#38BDF8" 
                                    strokeWidth="2.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                />
                            )}

                            {/* Net Line */}
                            {netPathD && (
                                <path 
                                    d={netPathD} 
                                    fill="none" 
                                    stroke="#C084FC" 
                                    strokeWidth="2.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                />
                            )}

                            {/* Points and Hover */}
                            {payrollCostTrend.map((t, idx) => {
                                const x = getTrendX(idx);
                                const grossY = getTrendY(t.gross);
                                const netY = getTrendY(t.net);
                                const isHovered = hoveredTrendIdx === idx;

                                return (
                                    <g key={`pts-${idx}`}>
                                        <circle 
                                            cx={x} 
                                            cy={grossY} 
                                            r={isHovered ? 4.5 : 3} 
                                            fill="#FFFFFF" 
                                            stroke="#0284C7" 
                                            strokeWidth={2}
                                            className="cursor-pointer transition-all"
                                            onMouseEnter={() => setHoveredTrendIdx(idx)}
                                            onMouseLeave={() => setHoveredTrendIdx(null)}
                                        />
                                        <circle 
                                            cx={x} 
                                            cy={netY} 
                                            r={isHovered ? 4.5 : 3} 
                                            fill="#FFFFFF" 
                                            stroke="#9333EA" 
                                            strokeWidth={2}
                                            className="cursor-pointer transition-all"
                                            onMouseEnter={() => setHoveredTrendIdx(idx)}
                                            onMouseLeave={() => setHoveredTrendIdx(null)}
                                        />
                                    </g>
                                );
                            })}

                            {/* End Badges for Latest Month */}
                            {payrollCostTrend.length > 0 && (() => {
                                const last = payrollCostTrend[payrollCostTrend.length - 1];
                                const x = getTrendX(payrollCostTrend.length - 1);
                                const grossY = getTrendY(last.gross);
                                const netY = getTrendY(last.net);

                                return (
                                    <>
                                        <g transform={`translate(${Math.min(chartWidth - 60, x + 6)}, ${grossY - 10})`}>
                                            <rect x="0" y="0" width="52" height="18" rx="5" fill="#38BDF8" />
                                            <text x="26" y="12" textAnchor="middle" fill="#FFFFFF" className="text-[9px] font-bold font-mono">
                                                ₹{(last.gross / 100000).toFixed(2)}L
                                            </text>
                                        </g>
                                        <g transform={`translate(${Math.min(chartWidth - 60, x + 6)}, ${netY + 2})`}>
                                            <rect x="0" y="0" width="52" height="18" rx="5" fill="#C084FC" />
                                            <text x="26" y="12" textAnchor="middle" fill="#FFFFFF" className="text-[9px] font-bold font-mono">
                                                ₹{(last.net / 100000).toFixed(2)}L
                                            </text>
                                        </g>
                                    </>
                                );
                            })()}

                            {/* X-axis Month Labels */}
                            {payrollCostTrend.map((t, idx) => {
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

                {/* Pod 2: Payroll by Department (4 cols) */}
                <div className="lg:col-span-4 p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-[#BAE6FD] flex items-center justify-center shrink-0 shadow-2xs">
                                <Building2 size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                Payroll by Department (This Month)
                            </h3>
                        </div>
                    </div>

                    <div className="space-y-2.5 py-1">
                        {payrollByDept.slice(0, 5).map((dept, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-700 dark:text-zinc-300 truncate">
                                        {dept.department}
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            {formatInr(dept.amount)}
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
                                            {dept.percentage}%
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                        className={cn("h-full rounded-full bg-gradient-to-r transition-all", deptGradients[idx % deptGradients.length])}
                                        style={{ width: `${Math.min(100, dept.percentage || 0)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pod 3: Salary Component Mix (3 cols) */}
                <div className="lg:col-span-3 p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#FAF5FF] text-[#9333EA] dark:bg-purple-950/40 dark:text-purple-400 border border-[#F3E8FF] flex items-center justify-center shrink-0 shadow-2xs">
                                <PieChart size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                Salary Component Mix
                            </h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 py-2">
                        {/* Donut Chart */}
                        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                            <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full -rotate-90">
                                {compDonutData.map((slice, i) => {
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
                                <circle cx="0" cy="0" r="0.65" fill="#F8FAFC" className="dark:fill-zinc-900" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                                    ₹{((componentMix.grossTotal || compTotal) / 100000).toFixed(2)}L
                                </span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase">
                                    Gross
                                </span>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex-1 space-y-2">
                            {compSlices.map((item, idx) => (
                                <div key={idx} className="text-xs">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="font-medium text-slate-600 dark:text-zinc-300">
                                                {item.label}
                                            </span>
                                        </div>
                                        <span className="font-bold text-slate-800 dark:text-zinc-200">
                                            {item.pct}%
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 pl-3.5 font-medium">
                                        {formatInr(item.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 3: CURRENT PAYROLL RUN & EMPLOYEE PAYROLL SUMMARY TABLE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                {/* Current Payroll Run Card (3 cols) */}
                <div className="lg:col-span-3 p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-[#BAE6FD] flex items-center justify-center shrink-0 shadow-2xs">
                                <Calendar size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                Current Payroll Run
                            </h3>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60 text-xs py-1">
                        <div className="py-1.5 flex justify-between items-center">
                            <span className="text-slate-500 dark:text-zinc-400">Period</span>
                            <span className="font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[130px]">
                                {currentRun.periodName || 'Oct 2026'}
                            </span>
                        </div>
                        <div className="py-1.5 flex justify-between items-center">
                            <span className="text-slate-500 dark:text-zinc-400">Status</span>
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                currentRun.status === 'Finalized'
                                    ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                                    : "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                            )}>
                                {currentRun.status || 'Active'}
                            </span>
                        </div>
                        <div className="py-1.5 flex justify-between items-center">
                            <span className="text-slate-500 dark:text-zinc-400">Employees</span>
                            <span className="font-bold text-slate-800 dark:text-zinc-200">
                                {currentRun.employeeCount || 0}
                            </span>
                        </div>
                        <div className="py-1.5 flex justify-between items-center">
                            <span className="text-slate-500 dark:text-zinc-400">Gross Salary</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                                {formatInr(currentRun.grossSalary)}
                            </span>
                        </div>
                        <div className="py-1.5 flex justify-between items-center">
                            <span className="text-slate-500 dark:text-zinc-400">Net Payable</span>
                            <span className="font-black text-slate-900 dark:text-white">
                                {formatInr(currentRun.netPayable)}
                            </span>
                        </div>
                        <div className="py-1.5 flex justify-between items-center text-[11px]">
                            <span className="text-slate-500 dark:text-zinc-400">Created On</span>
                            <span className="text-slate-600 dark:text-zinc-400">
                                {currentRun.createdAt || '—'}
                            </span>
                        </div>
                        <div className="py-1.5 flex justify-between items-center text-[11px]">
                            <span className="text-slate-500 dark:text-zinc-400">Finalized On</span>
                            <span className="text-slate-600 dark:text-zinc-400">
                                {currentRun.finalizedAt || '—'}
                            </span>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-800 space-y-1.5">
                        <button 
                            onClick={() => navigate('/finance/workforce/history')}
                            className="w-full py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 transition-all cursor-pointer"
                        >
                            View Run Details
                        </button>
                        <button 
                            onClick={() => navigate('/finance/workforce/process')}
                            className="w-full py-1.5 rounded-xl bg-synos-primary text-white text-xs font-bold hover:brightness-105 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                        >
                            <span>Process Settlement</span>
                            <ArrowRight size={13} />
                        </button>
                    </div>
                </div>

                {/* Employee Payroll Summary Table (9 cols) */}
                <div className="lg:col-span-9 p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                    {/* Header with Title, Dept Filter Pills, Search, Export */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#FAF5FF] text-[#9333EA] dark:bg-purple-950/40 dark:text-purple-400 border border-[#F3E8FF] flex items-center justify-center shrink-0 shadow-2xs">
                                <Users size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                Employee Payroll Summary — {currentRun.periodName || 'October 2026'}
                            </h3>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                            {/* Department Filter Pills */}
                            <div className="flex items-center bg-slate-200/60 dark:bg-zinc-800/80 p-0.5 rounded-xl text-[11px] font-bold">
                                {['All', 'Lab', 'Radiology', 'Reception', 'Admin', 'Support'].map(dept => (
                                    <button
                                        key={dept}
                                        onClick={() => setSelectedDeptFilter(dept)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                                            selectedDeptFilter === dept 
                                                ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-2xs" 
                                                : "text-slate-500 hover:text-slate-900 dark:hover:text-zinc-200"
                                        )}
                                    >
                                        {dept === 'All' ? 'All Departments' : dept}
                                    </button>
                                ))}
                            </div>

                            {/* Search Input */}
                            <div className="relative min-w-[150px]">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search employee..."
                                    className="w-full pl-8 pr-3 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-synos-primary"
                                />
                            </div>

                            {/* Export Button */}
                            <button
                                onClick={handleExportCsv}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold hover:bg-slate-50 cursor-pointer shadow-2xs"
                            >
                                <Download size={13} className="text-slate-400" />
                                <span>Export</span>
                            </button>
                        </div>
                    </div>

                    {/* Table View (6 Rows at a glance initially) */}
                    <div className="overflow-x-auto my-2">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/80 dark:border-zinc-800 text-[10px] uppercase font-bold text-slate-400">
                                    <th className="py-2.5 px-3">Employee</th>
                                    <th className="py-2.5 px-2">Department</th>
                                    <th className="py-2.5 px-2 text-right">Gross (Earned)</th>
                                    <th className="py-2.5 px-2 text-right">LOP</th>
                                    <th className="py-2.5 px-2 text-right">PF (≤ ₹1,800)</th>
                                    <th className="py-2.5 px-2 text-right">ESI (≤ ₹21K)</th>
                                    <th className="py-2.5 px-2 text-right">TDS</th>
                                    <th className="py-2.5 px-2 text-right">Adv. Recovery</th>
                                    <th className="py-2.5 px-2 text-right font-black">Net Payable</th>
                                    <th className="py-2.5 px-2 text-center">Status</th>
                                    <th className="py-2.5 px-1 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50 font-medium">
                                {visibleEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                                            No employee payroll records match the criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    visibleEmployees.map((emp, idx) => (
                                        <tr 
                                            key={emp.employeeId || idx}
                                            onClick={() => navigate('/finance/workforce/process')}
                                            className="hover:bg-white/80 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                                        >
                                            <td className="py-2 px-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                        {(emp.name || 'E').slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                                                        {emp.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-2">
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF5FF] text-[#9333EA] dark:bg-purple-950/40 dark:text-purple-400 border border-[#F3E8FF] dark:border-purple-800/40 truncate max-w-[120px] inline-block">
                                                    {emp.department}
                                                </span>
                                            </td>
                                            <td className="py-2 px-2 text-right font-semibold text-slate-800 dark:text-zinc-200">
                                                {formatInr(emp.gross)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-rose-600 dark:text-rose-400 font-semibold">
                                                {emp.lopDeduction > 0 ? `-${formatInr(emp.lopDeduction)}` : '₹0'}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-600 dark:text-zinc-300">
                                                {formatInr(emp.pf)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-600 dark:text-zinc-300">
                                                {formatInr(emp.esi)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-600 dark:text-zinc-300">
                                                {formatInr(emp.tds)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-400 font-semibold">
                                                {emp.advanceRecovery > 0 ? `-${formatInr(emp.advanceRecovery)}` : '₹0'}
                                            </td>
                                            <td className="py-2 px-2 text-right font-black text-slate-900 dark:text-white">
                                                {formatInr(emp.netPayable)}
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                                    emp.status === 'Paid'
                                                        ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                                                        : "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                                                )}>
                                                    {emp.status}
                                                </span>
                                            </td>
                                            <td className="py-2 px-1 text-center">
                                                <ChevronRight size={13} className="text-slate-400" />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Floating / Centered Load More Button (Top 6 rows at a glance initially) */}
                    {filteredEmployees.length > 6 && (
                        <div className="pt-2 flex justify-center border-t border-slate-200/60 dark:border-zinc-800/60">
                            <button
                                onClick={() => setIsTableExpanded(!isTableExpanded)}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/90 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-2xs hover:shadow-xs hover:bg-slate-50 dark:hover:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200 transition-all cursor-pointer group"
                            >
                                <span>{isTableExpanded ? 'Show Less' : `Load More (${filteredEmployees.length - 6} more)`}</span>
                                <ChevronDown size={14} className={cn("text-slate-400 group-hover:text-synos-primary transition-transform duration-200", isTableExpanded && "rotate-180")} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ROW 4: 3 BOTTOM PODS (STATUTORY COMPLIANCE, ADVANCES & RECOVERIES, RECENT PAYROLL ACTIVITY) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-stretch">
                {/* Pod 1: Statutory Compliance (This Month) */}
                <div 
                    onClick={() => navigate('/finance/workforce/adjustments')}
                    className="p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
                >
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#FAF5FF] text-[#9333EA] dark:bg-purple-950/40 dark:text-purple-400 border border-[#F3E8FF] flex items-center justify-center shrink-0 shadow-2xs">
                                <ShieldCheck size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                Statutory Compliance (This Month)
                            </h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-3">
                        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-slate-200/70 dark:border-zinc-700/70">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">PF</span>
                            <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                                {formatInr(statutoryCompliance.pfTotal)}
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">
                                12% (≤ ₹1,800 cap)
                            </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-slate-200/70 dark:border-zinc-700/70">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">ESI</span>
                            <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                                {formatInr(statutoryCompliance.esiTotal)}
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">
                                ≤ ₹21,000 eligible
                            </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-slate-200/70 dark:border-zinc-700/70">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">TDS</span>
                            <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                                {formatInr(statutoryCompliance.tdsTotal)}
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">
                                Config slab
                            </span>
                        </div>
                    </div>
                </div>

                {/* Pod 2: Advances & Recoveries */}
                <div 
                    onClick={() => navigate('/finance/workforce/adjustments')}
                    className="p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
                >
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-[#BAE6FD] flex items-center justify-center shrink-0 shadow-2xs">
                                <CreditCard size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                Advances & Recoveries
                            </h3>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60 text-xs py-1">
                        <div className="py-2 flex justify-between items-center">
                            <span className="text-slate-500 dark:text-zinc-400 font-medium">Total Advances (Active)</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                                {formatInr(advancesSummary.totalActive)}
                            </span>
                        </div>
                        <div className="py-2 flex justify-between items-center">
                            <span className="text-slate-500 dark:text-zinc-400 font-medium">Recovered This Month</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {formatInr(advancesSummary.recoveredThisMonth)}
                            </span>
                        </div>
                        <div className="py-2 flex justify-between items-center">
                            <span className="text-slate-500 dark:text-zinc-400 font-medium">Outstanding Balance</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                                {formatInr(advancesSummary.outstandingBalance)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Pod 3: Recent Payroll Activity */}
                <div 
                    onClick={() => navigate('/finance/workforce/history')}
                    className="p-4 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
                >
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-[#BAE6FD] flex items-center justify-center shrink-0 shadow-2xs">
                                <Clock size={13} strokeWidth={2.3} />
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                Recent Payroll Activity
                            </h3>
                        </div>
                        <button className="text-[11px] font-bold text-synos-primary hover:underline flex items-center gap-0.5">
                            View All <ChevronRight size={12} />
                        </button>
                    </div>

                    <div className="space-y-2 py-1">
                        {recentActivity.length === 0 ? (
                            <div className="py-6 text-center text-slate-400 text-xs">
                                No recent payroll activity recorded.
                            </div>
                        ) : (
                            recentActivity.slice(0, 3).map((act, idx) => (
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
            </div>
        </div>
    );
};
