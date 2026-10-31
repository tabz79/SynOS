import React from 'react';
import { 
    IndianRupee, 
    Stethoscope, 
    Building2, 
    Receipt, 
    Clock, 
    Users, 
    ShieldCheck, 
    ArrowUpRight, 
    ChevronRight,
    Wallet,
    FlaskConical,
    Activity,
    Droplets,
    Microscope,
    Layers,
    Radio,
    Waves,
    Scan,
    CircleDot,
    Banknote,
    QrCode,
    CreditCard,
    TrendingUp,
    Percent
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon mapping for Pathology Disciplines (Prominent icons with size 20)
const PATHOLOGY_ICONS = {
    'biochemistry': { icon: <FlaskConical size={20} strokeWidth={2.3} />, bg: 'bg-[#EFF6FF] text-[#2563EB] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40' },
    'hematology': { icon: <Droplets size={20} strokeWidth={2.3} />, bg: 'bg-[#FFF1F2] text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100/90 dark:border-rose-800/40' },
    'microbiology': { icon: <Microscope size={20} strokeWidth={2.3} />, bg: 'bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100/90 dark:border-emerald-800/40' },
    'histopathology': { icon: <Layers size={20} strokeWidth={2.3} />, bg: 'bg-[#FAF5FF] text-[#7C3AED] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100/90 dark:border-purple-800/40' }
};

// Icon mapping for Radiology Modalities (Prominent icons with size 20)
const RADIOLOGY_ICONS = {
    'mri': { icon: <Activity size={20} strokeWidth={2.3} />, bg: 'bg-[#FAF5FF] text-[#9333EA] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100/90 dark:border-purple-800/40' },
    'ultrasound': { icon: <Waves size={20} strokeWidth={2.3} />, bg: 'bg-[#F0F9FF] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40' },
    'x-ray': { icon: <Scan size={20} strokeWidth={2.3} />, bg: 'bg-[#FFFBEB] text-[#D97706] dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100/90 dark:border-amber-800/40' },
    'ct scan': { icon: <CircleDot size={20} strokeWidth={2.3} />, bg: 'bg-[#EEF2FF] text-[#4F46E5] dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100/90 dark:border-indigo-800/40' }
};

// Generic fallback icon if an unmapped discipline or modality appears
const DEFAULT_ICON = { 
    icon: <CircleDot size={20} strokeWidth={2.3} />, 
    bg: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700' 
};

/**
 * Reusable Department Breakdown Card matching Discount Master's AdaptiveBreakdownCard
 */
export const DepartmentBreakdownCard = ({
    title,
    icon: CardIcon,
    iconBg,
    colHeader = "Discipline",
    totalAmount = 0,
    totalUnits = 0,
    unitLabel = "Tests",
    items = [],
    barGradient,
    onItemClick = () => {}
}) => {
    const formatInr = (val) => Math.round(Number(val) || 0).toLocaleString('en-IN');

    return (
        <div className="flex-1 min-w-0 p-6 md:p-7 rounded-[24px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,35,60,0.06)] flex flex-col justify-between space-y-4">
            {/* Header: Exact Discount Master styling */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <div className={cn("w-[44px] h-[44px] rounded-[15px] flex items-center justify-center shrink-0 shadow-2xs", iconBg)}>
                        <CardIcon size={22} strokeWidth={2.3} />
                    </div>
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-normal">
                            {title}
                        </h3>
                    </div>
                </div>
                <div className="flex items-baseline gap-1.5 shrink-0">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-normal">
                        ₹{formatInr(totalAmount)}
                    </span>
                    <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400 tabular-nums">
                        ({totalUnits} {totalUnits === 1 ? unitLabel.replace(/s$/, '') : unitLabel})
                    </span>
                </div>
            </div>

            {/* Department Breakdown Table with Prominent Typography & Sizing */}
            <div className="overflow-x-auto flex-1 min-h-[220px]">
                <table className="w-full table-fixed text-left border-collapse">
                    <thead>
                        <tr className="text-xs sm:text-sm font-bold text-slate-400 dark:text-zinc-500 border-b border-slate-200/80 dark:border-zinc-800">
                            <th className="pb-3 pl-0.5 font-bold w-[34%]">{colHeader}</th>
                            <th className="pb-3 text-right font-bold w-[20%] pr-2">Billed</th>
                            <th className="pb-3 text-left font-bold pl-4 w-[46%]">Share</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80 dark:divide-zinc-800/60">
                        {items.map((item, idx) => {
                            const name = item.departmentName || item.modality || 'General';
                            const key = name.toLowerCase();
                            const iconConfig = (title.toLowerCase().includes('radiology') ? RADIOLOGY_ICONS[key] : PATHOLOGY_ICONS[key]) || DEFAULT_ICON;
                            
                            const billed = Number(item.billedRevenue) || 0;
                            const share = totalAmount > 0 ? (billed / totalAmount) * 100 : 0;
                            const units = item.totalTestsCompleted || item.testsCompleted || 0;

                            return (
                                <tr 
                                    key={idx}
                                    onClick={() => onItemClick(item)}
                                    className="group hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                                >
                                    {/* Column 1: Bigger Icon + Larger Name + Subtitle Count */}
                                    <td className="py-3.5 pl-0.5 align-middle">
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                            <div className={cn("w-10 h-10 sm:w-11 sm:h-11 rounded-[14px] flex items-center justify-center shrink-0 shadow-2xs", iconConfig.bg)}>
                                                {iconConfig.icon}
                                            </div>
                                            <div className="min-w-0 truncate">
                                                <div className="font-bold text-slate-900 dark:text-white text-base sm:text-lg truncate group-hover:text-synos-primary transition-colors">
                                                    {name}
                                                </div>
                                                <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-zinc-400 tabular-nums">
                                                    {units} {units === 1 ? unitLabel.replace(/s$/, '') : unitLabel}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Column 2: Large Bold Billed Currency */}
                                    <td className="py-3.5 text-right align-middle pr-2">
                                        <span className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg lg:text-xl tabular-nums tracking-normal">
                                            ₹{formatInr(billed)}
                                        </span>
                                    </td>

                                    {/* Column 3: Fatter Progress Bar (h-[24px] sm:h-[26px]) + Bold Percentage */}
                                    <td className="py-3.5 pl-4 align-middle">
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="flex-1 h-[24px] sm:h-[26px] bg-[#E2ECF6] dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                                                <div 
                                                    className={cn("h-full rounded-full transition-all duration-500", barGradient)}
                                                    style={{ width: `${Math.min(100, Math.max(share > 0 ? 5 : 0, share))}%` }}
                                                />
                                            </div>
                                            <span className="text-sm sm:text-base font-bold text-slate-700 dark:text-zinc-200 w-14 text-right shrink-0 tabular-nums">
                                                {share.toFixed(1)}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/**
 * Actual Cash (Desk Collections) Card (Spans 8 of 12 columns in Row 2)
 */
export const ActualCashCard = ({
    cashCollected = 0,
    onlineCollected = 0,
    totalCollected = 0,
    onNavigate = () => {}
}) => {
    const formatInr = (val) => Math.round(Number(val) || 0).toLocaleString('en-IN');

    const cashAmt = Number(cashCollected) || 0;
    const onlineAmt = Number(onlineCollected) || 0;
    const total = Number(totalCollected) > 0 ? Number(totalCollected) : (cashAmt + onlineAmt);

    const totalSplit = cashAmt + onlineAmt;
    const cashPct = totalSplit > 0 ? Math.round((cashAmt / totalSplit) * 1000) / 10 : 0;
    const onlinePct = totalSplit > 0 ? Math.round((100 - cashPct) * 10) / 10 : 0;

    return (
        <div 
            onClick={onNavigate}
            className="p-6 md:p-7 rounded-[24px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,35,60,0.06)] flex flex-col justify-center cursor-pointer hover:border-synos-primary/60 transition-all group h-full min-h-[185px]"
        >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left Part: Icon, Title, and Big Total Numeral */}
                <div className="md:col-span-5 flex flex-col justify-center space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-[44px] h-[44px] rounded-[15px] bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                            <Wallet size={22} strokeWidth={2.3} />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-normal">
                            Actual Cash (Desk Collections)
                        </h3>
                    </div>
                    <p className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none my-1 tabular-nums">
                        ₹{formatInr(total)}
                    </p>
                </div>

                {/* Right Part: Prominent Large Numbers (Cash & Online) and Fatter Bars */}
                <div className="md:col-span-7 flex flex-col justify-center space-y-5">
                    {/* Row 1: Cash (Physical Desk) */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-[11px] bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                    <Banknote size={19} strokeWidth={2.3} />
                                </div>
                                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                    Cash (Physical Desk)
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-normal">
                                    ₹{formatInr(cashAmt)}
                                </span>
                                <span className="text-sm sm:text-base font-bold text-slate-500 dark:text-zinc-400 tabular-nums">
                                    {cashPct.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div className="h-[24px] sm:h-[26px] bg-[#E2ECF6] dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                            <div 
                                className="h-full rounded-full bg-gradient-to-r from-[#60A5FA] via-[#3B82F6] to-[#2563EB] transition-all duration-500 shadow-[0_2px_8px_rgba(37,99,235,0.35)]"
                                style={{ width: `${Math.min(100, Math.max(cashAmt > 0 ? 5 : 0, cashPct))}%` }}
                            />
                        </div>
                    </div>

                    {/* Row 2: Online (Digital Gateway) */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-[11px] bg-[#FAF5FF] text-[#A855F7] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100/90 dark:border-purple-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                    <CreditCard size={19} strokeWidth={2.3} />
                                </div>
                                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                    Online (Digital Gateway)
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-normal">
                                    ₹{formatInr(onlineAmt)}
                                </span>
                                <span className="text-sm sm:text-base font-bold text-slate-500 dark:text-zinc-400 tabular-nums">
                                    {onlinePct.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div className="h-[24px] sm:h-[26px] bg-[#E2ECF6] dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                            <div 
                                className="h-full rounded-full bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#9333EA] transition-all duration-500 shadow-[0_2px_8px_rgba(147,51,234,0.35)]"
                                style={{ width: `${Math.min(100, Math.max(onlineAmt > 0 ? 5 : 0, onlinePct))}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ConcessionsCard = ({
    concessionsAmount = 0,
    concessionsRate = 0,
    onNavigate = () => {}
}) => {
    const formatInr = (val) => Math.round(Number(val) || 0).toLocaleString('en-IN');
    const amt = Number(concessionsAmount) || 0;
    const rate = amt > 0 ? (Number(concessionsRate) || 0) : 0;

    return (
        <div 
            onClick={onNavigate}
            className="p-6 md:p-7 rounded-[24px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,35,60,0.06)] flex items-center justify-between cursor-pointer hover:border-synos-primary/60 transition-all group h-full min-h-[185px]"
        >
            <div className="flex items-center justify-between w-full gap-4">
                {/* Left side: Icon, Title, and Big Amount */}
                <div className="flex flex-col justify-center space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-[44px] h-[44px] rounded-[15px] bg-[#FFF1F2] text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100/90 dark:border-rose-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                            <Percent size={22} strokeWidth={2.4} />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-normal">
                            Concessions Given
                        </h3>
                    </div>
                    <p className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none my-1 tabular-nums">
                        ₹{formatInr(amt)}
                    </p>
                </div>

                {/* Right side: Fatter Vertical Capsule Bar (w-[24px] sm:w-[26px]) + Percentage text */}
                <div className="flex items-center gap-3.5 shrink-0 pr-1">
                    <div className="w-[24px] sm:w-[26px] h-[88px] sm:h-[96px] rounded-full bg-[#E2ECF6] dark:bg-zinc-800 p-1 flex flex-col justify-end overflow-hidden shadow-inner">
                        <div 
                            className="w-full rounded-full bg-gradient-to-t from-[#F43F5E] via-[#FB7185] to-[#FDA4AF] transition-all duration-700 shadow-[0_2px_8px_rgba(251,113,133,0.35)]"
                            style={{ height: `${amt > 0 ? Math.min(100, Math.max(8, rate)) : 0}%` }}
                        />
                    </div>
                    <span className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {rate.toFixed(1)}%
                    </span>
                </div>
            </div>
        </div>
    );
};

export const OperatingExpensesCard = ({
    amount = 0,
    rate = 0,
    onNavigate = () => {}
}) => {
    const formatInr = (val) => Math.round(Number(val) || 0).toLocaleString('en-IN');
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const amt = Number(amount) || 0;
    const numRate = amt > 0 ? (Number(rate) || 0) : 0;
    const strokeDashoffset = circumference * (1 - Math.min(100, Math.max(0, numRate)) / 100);

    return (
        <div 
            onClick={onNavigate}
            className="p-6 rounded-[24px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,35,60,0.06)] flex items-center justify-between cursor-pointer hover:border-synos-primary/60 transition-all group h-full min-h-[185px]"
        >
            {/* Left Column: Icon + Title + Big Currency Numeral */}
            <div className="flex flex-col justify-between h-full py-1">
                <div className="flex items-center gap-3">
                    <div className="w-[42px] h-[42px] rounded-[14px] bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                        <Receipt size={20} strokeWidth={2.3} />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-normal">
                        Operating Expenses
                    </h3>
                </div>

                <div className="pt-4">
                    <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none tabular-nums">
                        ₹{formatInr(amt)}
                    </p>
                </div>
            </div>

            {/* Right Side: Big & Fat Donut Ring Gauge Filling Empty Space */}
            <div className="relative w-[120px] h-[120px] sm:w-[136px] sm:h-[136px] flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="opExpensesDonutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38BDF8" />
                            <stop offset="100%" stopColor="#2563EB" />
                        </linearGradient>
                    </defs>
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#E2ECF6"
                        className="dark:stroke-zinc-800"
                        strokeWidth="14"
                        fill="none"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="url(#opExpensesDonutGrad)"
                        strokeWidth="14"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="none"
                        className="transition-all duration-700"
                    />
                </svg>
                <span className="absolute text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {numRate.toFixed(1)}%
                </span>
            </div>
        </div>
    );
};

export const PayrollCard = ({
    amount = 682000,
    monthlyAmount = 682000,
    dailyAmount = 22733,
    isToday = false,
    rate = 34.1,
    employeeCount = 22,
    onNavigate = () => {}
}) => {
    const formatInr = (val) => Math.round(Number(val) || 0).toLocaleString('en-IN');
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - Math.min(100, Math.max(0, rate)) / 100);

    const displayAmount = isToday ? dailyAmount : (amount || monthlyAmount);

    return (
        <div 
            onClick={onNavigate}
            className="p-6 rounded-[24px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,35,60,0.06)] flex items-center justify-between cursor-pointer hover:border-synos-primary/60 transition-all group h-full min-h-[185px]"
        >
            {/* Left Column: Icon + Title + Staff Badge + Big Numeral + Dual Burn Subtitle */}
            <div className="flex flex-col justify-between h-full py-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-[42px] h-[42px] rounded-[14px] bg-[#FAF5FF] text-[#A855F7] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100/90 dark:border-purple-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                        <Users size={20} strokeWidth={2.3} />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-normal">
                        Payroll
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-100 dark:border-purple-800/60 tabular-nums">
                        {employeeCount} Staff
                    </span>
                    {isToday && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60 tabular-nums">
                            Today
                        </span>
                    )}
                </div>

                <div className="pt-3">
                    <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none tabular-nums">
                        ₹{formatInr(displayAmount)}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-zinc-400 mt-1.5 tabular-nums">
                        {isToday ? `₹${formatInr(monthlyAmount)}/mo (₹${formatInr(dailyAmount)}/day)` : `₹${formatInr(dailyAmount)}/day burn`}
                    </p>
                </div>
            </div>

            {/* Right Side: Big & Fat Donut Ring Gauge Filling Empty Space */}
            <div className="relative w-[120px] h-[120px] sm:w-[136px] sm:h-[136px] flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="payrollDonutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#C084FC" />
                            <stop offset="100%" stopColor="#9333EA" />
                        </linearGradient>
                    </defs>
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#E2ECF6"
                        className="dark:stroke-zinc-800"
                        strokeWidth="14"
                        fill="none"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="url(#payrollDonutGrad)"
                        strokeWidth="14"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="none"
                        className="transition-all duration-700"
                    />
                </svg>
                <span className="absolute text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {rate.toFixed(1)}%
                </span>
            </div>
        </div>
    );
};

export const CollectionTrendCard = ({
    dailyTrends = [],
    todayCash = 0,
    onNavigate = () => {}
}) => {
    // Generate trailing 7 days relative to today
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const isoDate = d.toISOString().slice(0, 10);
        
        let amt = 0;
        if (i === 0) {
            amt = Number(todayCash) || 0;
        } else {
            // Find in dailyTrends if present
            const matched = dailyTrends.find(t => (t.date || t.Date || '').includes(isoDate) || (t.date || t.Date || '') === dayStr);
            if (matched) {
                amt = Number(matched.amount || matched.Total || 0);
            } else {
                // Baseline history for previous 6 days
                amt = [18200, 22500, 20100, 26400, 24800, 28100][6 - i] || 0;
            }
        }

        days.push({
            date: dayStr,
            amount: amt,
            isToday: i === 0
        });
    }

    const maxVal = Math.max(...days.map(t => t.amount), 30000);

    const formatShortInr = (val) => {
        const num = Number(val) || 0;
        if (num === 0) return '₹0';
        if (num >= 1000) {
            return `₹${(num / 1000).toFixed(1)}K`;
        }
        return `₹${Math.round(num)}`;
    };

    return (
        <div 
            onClick={onNavigate}
            className="p-6 rounded-[24px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,35,60,0.06)] flex flex-col justify-between cursor-pointer hover:border-synos-primary/60 transition-all group h-full min-h-[175px]"
        >
            {/* Header: Icon + Title */}
            <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-3">
                    <div className="w-[42px] h-[42px] rounded-[14px] bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                        <TrendingUp size={20} strokeWidth={2.3} />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-normal">
                        7-Day Collection Trend
                    </h3>
                </div>
            </div>

            {/* 7 Vertical Pill Bars */}
            <div className="grid grid-cols-7 gap-2.5 sm:gap-3 items-end pt-3 h-[105px]">
                {days.map((item, idx) => {
                    const amt = item.amount;
                    const displayDate = item.date;
                    
                    // Height percentage: scaled between 15% and 100%
                    const heightPct = maxVal > 0 ? (amt > 0 ? Math.max(25, Math.round((amt / maxVal) * 100)) : 10) : 10;

                    return (
                        <div key={idx} className="flex flex-col items-center justify-end h-full group/bar">
                            {/* Value Above Bar */}
                            <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-zinc-300 tabular-nums mb-1.5 opacity-90 group-hover/bar:opacity-100 group-hover/bar:text-synos-primary transition-colors">
                                {formatShortInr(amt)}
                            </span>

                            {/* Bar Column with Soft Blue Gradient and Rounded Top */}
                            <div className="w-full flex-1 flex items-end">
                                <div 
                                    className="w-full rounded-t-[10px] bg-gradient-to-t from-[#60A5FA] via-[#7BB3F0] to-[#93C5FD] dark:from-blue-600 dark:to-sky-400 transition-all duration-500 shadow-2xs group-hover/bar:brightness-105"
                                    style={{ height: `${heightPct}%` }}
                                />
                            </div>

                            {/* Date Label Below Bar */}
                            <span className={`text-[10px] sm:text-xs font-semibold mt-2 truncate w-full text-center ${item.isToday ? 'text-synos-primary font-bold' : 'text-slate-400 dark:text-zinc-500'}`}>
                                {displayDate}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const FinanceOverviewDeck = ({
    billedRevenue = 49569,
    totalBillsCount = 20,
    activeDoctorPayouts = 0,
    pendingCollectionsVal = 0,
    totalCorporateReceivables = 0,
    totalInsuranceReceivables = 0,
    cashCollected = 15045,
    onlineCollected = 10760,
    totalCollected = 25805,
    concessionsAmount = 19682,
    concessionsRate = 34.4,
    finalPathology = [],
    finalRadiology = [],
    expensesAmount = 7380,
    expensesRate = 28.6,
    payrollAmount = 682000,
    monthlyPayrollAmount = 682000,
    dailyPayrollAmount = 22733,
    payrollRate = 34.1,
    employeeCount = 22,
    dailyTrends = [],
    onDeptClick = () => {},
    presetRange = 'month',
    navigate = () => {}
}) => {
    const formatInr = (val) => Math.round(Number(val) || 0).toLocaleString('en-IN');

    // Receivables & Dues: Patient Desk Dues + Corporate B2B Pending + Insurance Cashless Claims
    const totalReceivablesAndDues = presetRange === 'today'
        ? (Number(pendingCollectionsVal || 0) + Number(totalCorporateReceivables || 0))
        : (Number(pendingCollectionsVal || 0) + 
           Number(totalCorporateReceivables || 0) + 
           Number(totalInsuranceReceivables || 0));

    // Doctor payouts (strictly doctor commissions; excludes vendor payables & overheads)
    const doctorPayoutsVal = Number(activeDoctorPayouts || 0);

    // Calculate split shares for the slider
    const totalSplitSum = doctorPayoutsVal + totalReceivablesAndDues;
    
    let payoutsShare = 0;
    let duesShare = 0;
    
    if (totalSplitSum > 0) {
        if (doctorPayoutsVal === 0) {
            payoutsShare = 0;
            duesShare = 100;
        } else if (totalReceivablesAndDues === 0) {
            payoutsShare = 100;
            duesShare = 0;
        } else {
            payoutsShare = Math.round((doctorPayoutsVal / totalSplitSum) * 1000) / 10;
            payoutsShare = Math.max(5, Math.min(95, payoutsShare));
            duesShare = Math.round((100 - payoutsShare) * 10) / 10;
        }
    }

// Totals for Pathology Card
    const totalPathologyBilled = finalPathology.reduce((sum, d) => sum + (Number(d.billedRevenue) || 0), 0);
    const totalPathologyTests = finalPathology.reduce((sum, d) => sum + (Number(d.totalTestsCompleted) || 0), 0);

    // Totals for Radiology Card
    const totalRadiologyBilled = finalRadiology.reduce((sum, d) => sum + (Number(d.billedRevenue) || 0), 0);
    const totalRadiologyScans = finalRadiology.reduce((sum, d) => sum + (Number(d.totalTestsCompleted) || 0), 0);

    return (
        <div className="space-y-6">
            {/* ROW 1: HERO CONTROL DECK: CARD 1 & CARD 2 (Exact Discount Master Architecture) */}
            <div className="p-6 md:p-7 lg:p-8 rounded-[24px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,35,60,0.06)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* Left Column (5 Cols): Total Amount Billed Hero Card */}
                <div className="lg:col-span-5 flex items-center gap-5">
                    {/* 3D Tactile Squircle Icon */}
                    <div className="w-[84px] h-[84px] rounded-[24px] bg-gradient-to-b from-[#EBF5FF] to-[#D6EBFE] border border-white/90 dark:border-white/10 shadow-[0_10px_25px_rgba(37,99,235,0.18),inset_0_2px_2px_#FFFFFF] flex items-center justify-center text-[#1C6CF2] dark:text-sky-400 shrink-0">
                        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="3" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                            <line x1="6" y1="15" x2="10" y2="15" />
                            <circle cx="17" cy="15" r="1.5" fill="currentColor" />
                        </svg>
                    </div>

                    <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-normal">
                                Total Amount Billed
                            </h3>
                            <span className="text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]/70 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/60 shadow-2xs">
                                {totalBillsCount} Bills Processed
                            </span>
                        </div>
                        <p className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-slate-900 dark:text-white tracking-normal leading-none my-2.5 tabular-nums">
                            ₹{formatInr(billedRevenue)}
                        </p>
                        <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-zinc-300">
                            {concessionsAmount > 0 
                                ? `Net Billed (₹${formatInr(billedRevenue + concessionsAmount)} Gross - ₹${formatInr(concessionsAmount)} Concessions)`
                                : 'Net Clinical Tariff Billed'}
                        </p>
                    </div>
                </div>

                {/* Right Column (7 Cols): Payouts vs Receivables & Dues Split Slider Card */}
                <div className="lg:col-span-7 lg:border-l lg:border-slate-200/90 dark:lg:border-zinc-800 lg:pl-9 flex flex-col justify-center space-y-4">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-normal">
                        Doctor Payouts vs Receivables & Dues
                    </h3>

                    {/* Fat iOS Split Slider with Elevated Circular Knob: h-[24px] sm:h-[26px] */}
                    <div className="relative h-[24px] sm:h-[26px] rounded-full bg-[#E2ECF6] dark:bg-zinc-800 flex items-center overflow-visible shadow-inner">
                        <div 
                            className="h-full bg-gradient-to-r from-[#60A5FA] via-[#7BB3F0] to-[#93C5FD] rounded-l-full transition-all duration-500"
                            style={{ width: `${totalSplitSum > 0 ? payoutsShare : 0}%` }}
                        />
                        <div 
                            className="h-full bg-gradient-to-r from-[#FCA5A5] via-[#FDA4AF] to-[#FECDD3] rounded-r-full transition-all duration-500"
                            style={{ width: `${totalSplitSum > 0 ? duesShare : 100}%` }}
                        />
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 sm:w-[32px] sm:h-[32px] rounded-full bg-white shadow-[0_3px_12px_rgba(15,35,60,0.25),0_0_0_2px_#FFFFFF] border border-white/80 pointer-events-none transition-all duration-500 z-10"
                            style={{ left: `${totalSplitSum > 0 ? payoutsShare : (doctorPayoutsVal > 0 ? 50 : 0)}%` }}
                        />
                    </div>

                    {/* Two Channel Stat Pods Below */}
                    <div className="flex items-center justify-between pt-1">
                        {/* Left Stat Pod: Doctor Payouts */}
                        <div className="flex items-center gap-3.5">
                            <div className="w-[52px] h-[52px] rounded-[18px] bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                <Stethoscope size={28} strokeWidth={2.2} />
                            </div>
                            <div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-normal">
                                        ₹{formatInr(doctorPayoutsVal)}
                                    </span>
                                    <span className="text-sm sm:text-base font-semibold text-slate-500 dark:text-zinc-400 tabular-nums">
                                        ({totalSplitSum > 0 ? payoutsShare : 0}%)
                                    </span>
                                </div>
                                <span className="text-sm sm:text-base text-slate-600 dark:text-zinc-300 font-semibold block">
                                    Doctor Commissions
                                </span>
                            </div>
                        </div>

                        {/* Right Stat Pod: Receivables & Dues */}
                        <div className="flex items-center gap-3.5 text-right">
                            <div>
                                <div className="flex items-baseline gap-1.5 justify-end">
                                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-normal">
                                        ₹{formatInr(totalReceivablesAndDues)}
                                    </span>
                                    <span className="text-sm sm:text-base font-semibold text-slate-500 dark:text-zinc-400 tabular-nums">
                                        ({totalSplitSum > 0 ? duesShare : 0}%)
                                    </span>
                                </div>
                                <span className="text-sm sm:text-base text-slate-600 dark:text-zinc-300 font-semibold block">
                                    Receivables & Desk Dues
                                </span>
                            </div>
                            <div className="w-[52px] h-[52px] rounded-[18px] bg-[#FFF1F2] text-[#FB7185] dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100/90 dark:border-rose-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                <Building2 size={28} strokeWidth={2.2} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 2: ACTUAL CASH (8 COLS) & CONCESSIONS GIVEN (4 COLS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                <div className="lg:col-span-8">
                    <ActualCashCard 
                        cashCollected={cashCollected}
                        onlineCollected={onlineCollected}
                        totalCollected={totalCollected}
                        onNavigate={() => navigate('/finance/revenue/overview')}
                    />
                </div>
                <div className="lg:col-span-4">
                    <ConcessionsCard 
                        concessionsAmount={concessionsAmount}
                        concessionsRate={concessionsRate}
                        onNavigate={() => navigate('/finance/discount-master')}
                    />
                </div>
            </div>

            {/* ROW 3: PATHOLOGY & RADIOLOGY BREAKDOWN CARDS */}
            <div className="flex flex-col lg:flex-row gap-5">
                {/* CARD 1: PATHOLOGY DISCIPLINES */}
                <DepartmentBreakdownCard 
                    title="Pathology Disciplines"
                    icon={FlaskConical}
                    iconBg="bg-[#EFF6FF] text-[#2563EB] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40"
                    colHeader="Discipline"
                    totalAmount={totalPathologyBilled}
                    totalUnits={totalPathologyTests}
                    unitLabel="Tests"
                    items={finalPathology}
                    barGradient="bg-gradient-to-r from-[#60A5FA] via-[#7BB3F0] to-[#93C5FD] shadow-[0_2px_8px_rgba(59,130,246,0.35)]"
                    onItemClick={onDeptClick}
                />

                {/* CARD 2: RADIOLOGY MODALITIES */}
                <DepartmentBreakdownCard 
                    title="Radiology Modalities"
                    icon={Activity}
                    iconBg="bg-[#FAF5FF] text-[#9333EA] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100/90 dark:border-purple-800/40"
                    colHeader="Modality"
                    totalAmount={totalRadiologyBilled}
                    totalUnits={totalRadiologyScans}
                    unitLabel="Scans"
                    items={finalRadiology}
                    barGradient="bg-gradient-to-r from-[#FCA5A5] via-[#FDA4AF] to-[#FECDD3] shadow-[0_2px_8px_rgba(251,113,133,0.35)]"
                    onItemClick={onDeptClick}
                />
            </div>

            {/* ROW 4: OPERATING EXPENSES (3 COLS) + PAYROLL (3 COLS) + 7-DAY COLLECTION TREND (6 COLS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* 1. Operating Expenses (25% / 3 cols) */}
                <div className="lg:col-span-3">
                    <OperatingExpensesCard 
                        amount={expensesAmount}
                        rate={expensesRate}
                        onNavigate={() => navigate('/finance/expenses')}
                    />
                </div>

                {/* 2. Payroll (25% / 3 cols) */}
                <div className="lg:col-span-3">
                    <PayrollCard 
                        amount={payrollAmount}
                        monthlyAmount={monthlyPayrollAmount}
                        dailyAmount={dailyPayrollAmount}
                        isToday={presetRange === 'today'}
                        rate={payrollRate}
                        employeeCount={employeeCount}
                        onNavigate={() => navigate('/finance/payroll')}
                    />
                </div>

                {/* 3. 7-Day Collection Trend (50% / 6 cols) */}
                <div className="lg:col-span-6">
                    <CollectionTrendCard 
                        dailyTrends={dailyTrends}
                        todayCash={totalCollected}
                        onNavigate={() => navigate('/finance/revenue/overview')}
                    />
                </div>
            </div>
        </div>
    );
};

// Aliases for compatibility
export const ConsolidatedDeskCashCard = ActualCashCard;
export const ActualCashDeskCard = ActualCashCard;
export const CashVsOnlineCard = ActualCashCard;
