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

// Icon mapping for Pathology Disciplines (Prominent icons with size 15)
const PATHOLOGY_ICONS = {
    'biochemistry': { icon: <FlaskConical size={15} strokeWidth={2.3} />, bg: 'bg-[#EFF6FF] text-[#2563EB] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40' },
    'hematology': { icon: <Droplets size={15} strokeWidth={2.3} />, bg: 'bg-[#FFF1F2] text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100/90 dark:border-rose-800/40' },
    'microbiology': { icon: <Microscope size={15} strokeWidth={2.3} />, bg: 'bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100/90 dark:border-emerald-800/40' },
    'histopathology': { icon: <Layers size={15} strokeWidth={2.3} />, bg: 'bg-[#FAF5FF] text-[#7C3AED] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100/90 dark:border-purple-800/40' }
};

// Icon mapping for Radiology Modalities (Prominent icons with size 15)
const RADIOLOGY_ICONS = {
    'mri': { icon: <Activity size={15} strokeWidth={2.3} />, bg: 'bg-[#FAF5FF] text-[#9333EA] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100/90 dark:border-purple-800/40' },
    'ultrasound': { icon: <Waves size={15} strokeWidth={2.3} />, bg: 'bg-[#F0F9FF] text-[#0284C7] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40' },
    'x-ray': { icon: <Scan size={15} strokeWidth={2.3} />, bg: 'bg-[#FFFBEB] text-[#D97706] dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100/90 dark:border-amber-800/40' },
    'ct scan': { icon: <CircleDot size={15} strokeWidth={2.3} />, bg: 'bg-[#EEF2FF] text-[#4F46E5] dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100/90 dark:border-indigo-800/40' }
};

// Generic fallback icon if an unmapped discipline or modality appears
const DEFAULT_ICON = { 
    icon: <CircleDot size={15} strokeWidth={2.3} />, 
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
        <div className="flex-1 min-w-0 p-4 sm:p-4.5 rounded-[22px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,35,60,0.06)] flex flex-col justify-between overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-[9px] flex items-center justify-center shrink-0 shadow-2xs", iconBg)}>
                        <CardIcon size={16} strokeWidth={2.4} />
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-normal">
                            {title}
                        </h3>
                    </div>
                </div>
                <div className="flex items-baseline gap-1.5 shrink-0">
                    <span className="text-xl sm:text-2xl lg:text-[26px] font-black text-slate-900 dark:text-white tabular-nums tracking-tight leading-none inline-block transform scale-y-[1.1] origin-right">
                        ₹{formatInr(totalAmount)}
                    </span>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-zinc-400 tabular-nums">
                        ({totalUnits} {totalUnits === 1 ? unitLabel.replace(/s$/, '') : unitLabel})
                    </span>
                </div>
            </div>

            {/* Department Breakdown with ZERO SCROLL and Fluid Width Progress Tracks (CLOSES MARKERS 8 & 9) */}
            <div className="flex-1 min-h-0 flex flex-col justify-between pt-1">
                {/* Column Headers */}
                <div className="flex items-center text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-500 pb-1 border-b border-slate-100 dark:border-zinc-800 shrink-0">
                    <div className="w-[180px] sm:w-[210px] lg:w-[230px] pl-0.5 shrink-0">{colHeader}</div>
                    <div className="flex-1 px-4 text-left">Volume Share & Workload</div>
                    <div className="w-[90px] sm:w-[110px] text-right pr-1 shrink-0">Billed</div>
                </div>

                {/* 4 Rows: Each is flex-1 with min-h-0 so all 4 fit mathematically */}
                <div className="flex-1 min-h-0 flex flex-col justify-between divide-y divide-slate-100/70 dark:divide-zinc-800/50">
                    {items.map((item, idx) => {
                        const name = item.departmentName || item.modality || 'General';
                        const key = name.toLowerCase();
                        const iconConfig = (title.toLowerCase().includes('radiology') ? RADIOLOGY_ICONS[key] : PATHOLOGY_ICONS[key]) || DEFAULT_ICON;
                        
                        const billed = Number(item.billedRevenue) || 0;
                        const share = totalAmount > 0 ? (billed / totalAmount) * 100 : 0;
                        const units = item.totalTestsCompleted || item.testsCompleted || 0;

                        return (
                            <div 
                                key={idx}
                                onClick={() => onItemClick(item)}
                                className="flex-1 min-h-0 flex items-center py-1 pl-0.5 group hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer rounded-lg"
                            >
                                {/* Column 1: Icon + Name + Count (Fixed compact width, NO DEAD SPACE!) */}
                                <div className="w-[180px] sm:w-[210px] lg:w-[230px] flex items-center gap-2.5 min-w-0 pr-3 shrink-0">
                                    <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-[8px] flex items-center justify-center shrink-0 shadow-2xs", iconConfig.bg)}>
                                        {iconConfig.icon}
                                    </div>
                                    <div className="min-w-0 truncate">
                                        <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate group-hover:text-synos-primary transition-colors leading-tight">
                                            {name}
                                        </div>
                                        <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-zinc-400 tabular-nums leading-none mt-0.5">
                                            {units} {units === 1 ? unitLabel.replace(/s$/, '') : unitLabel}
                                        </div>
                                    </div>
                                </div>

                                {/* Column 2: Fluid Fatter Progress Bar + Percentage (STRETCHES TO FILL ENTIRE MIDDLE VOID!) */}
                                <div className="flex-1 px-4 flex items-center gap-3 min-w-0">
                                    <div className="flex-1 h-[18px] sm:h-[20px] bg-[#E2ECF6] dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                                        <div 
                                            className={cn("h-full rounded-full transition-all duration-500", barGradient)}
                                            style={{ width: `${Math.min(100, Math.max(share > 0 ? 5 : 0, share))}%` }}
                                        />
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-200 w-12 text-right shrink-0 tabular-nums">
                                        {share.toFixed(1)}%
                                    </span>
                                </div>

                                {/* Column 3: Billed Currency (Anchored cleanly on Right) */}
                                <div className="w-[90px] sm:w-[110px] text-right pr-1 shrink-0 min-w-0 truncate">
                                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm lg:text-base tabular-nums tracking-normal">
                                        ₹{formatInr(billed)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
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
            className="p-4 sm:p-4.5 rounded-[22px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,35,60,0.06)] flex items-center cursor-pointer hover:border-synos-primary/60 transition-all group h-full"
        >
            <div className="flex flex-col md:flex-row md:items-center w-full gap-4 sm:gap-6">
                {/* Left Part: Icon, Title, and Big Total Numeral */}
                <div className="w-[230px] sm:w-[260px] lg:w-[280px] shrink-0 flex flex-col justify-center space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                            <Wallet size={18} strokeWidth={2.4} />
                        </div>
                        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                            Actual Cash (Desk Collections)
                        </h3>
                    </div>
                    <p className="text-3xl sm:text-4xl lg:text-[40px] xl:text-[44px] font-black text-slate-900 dark:text-white tracking-tight leading-none my-1 tabular-nums inline-block transform scale-y-[1.12] origin-left">
                        ₹{formatInr(total)}
                    </p>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        Physical drawer & online gateway
                    </span>
                </div>

                {/* Right Part: Fluid Cash & Online Channels (STRETCHES ACROSS ENTIRE WIDTH - CLOSES MARKER 5) */}
                <div className="flex-1 md:border-l md:border-slate-100 dark:md:border-zinc-800 md:pl-5 lg:pl-7 flex flex-col justify-center space-y-2.5 min-w-0">
                    {/* Row 1: Cash (Physical Desk) */}
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-[145px] sm:w-[165px] shrink-0 flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-[7px] bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                <Banknote size={14} strokeWidth={2.3} />
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 truncate">
                                Cash (Physical Desk)
                            </span>
                        </div>
                        <div className="flex-1 h-[18px] sm:h-[20px] bg-[#E2ECF6] dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner min-w-0">
                            <div 
                                className="h-full rounded-full bg-gradient-to-r from-[#60A5FA] via-[#7BB3F0] to-[#93C5FD] transition-all duration-500 shadow-[0_2px_8px_rgba(59,130,246,0.25)]"
                                style={{ width: `${Math.min(100, Math.max(cashAmt > 0 ? 5 : 0, cashPct))}%` }}
                            />
                        </div>
                        <div className="w-[110px] sm:w-[130px] shrink-0 text-right flex items-baseline justify-end gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tabular-nums tracking-normal">
                                ₹{formatInr(cashAmt)}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 tabular-nums">
                                ({cashPct.toFixed(1)}%)
                            </span>
                        </div>
                    </div>

                    {/* Row 2: Online (Digital Gateway) */}
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-[145px] sm:w-[165px] shrink-0 flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-[7px] bg-[#FAF5FF] text-[#A855F7] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100/90 dark:border-purple-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                <CreditCard size={14} strokeWidth={2.3} />
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 truncate">
                                Online (Digital Gateway)
                            </span>
                        </div>
                        <div className="flex-1 h-[18px] sm:h-[20px] bg-[#E2ECF6] dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner min-w-0">
                            <div 
                                className="h-full rounded-full bg-gradient-to-r from-[#C084FC] via-[#D8B4FE] to-[#E9D5FF] transition-all duration-500 shadow-[0_2px_8px_rgba(168,85,247,0.25)]"
                                style={{ width: `${Math.min(100, Math.max(onlineAmt > 0 ? 5 : 0, onlinePct))}%` }}
                            />
                        </div>
                        <div className="w-[110px] sm:w-[130px] shrink-0 text-right flex items-baseline justify-end gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tabular-nums tracking-normal">
                                ₹{formatInr(onlineAmt)}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 tabular-nums">
                                ({onlinePct.toFixed(1)}%)
                            </span>
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

    const statusConfig = rate <= 15 
        ? { label: "Standard (<15%)", bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60" }
        : rate <= 25 
            ? { label: "Moderate (15-25%)", bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800/60" }
            : { label: "Elevated (>25%)", bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800/60" };

    return (
        <div 
            onClick={onNavigate}
            className="p-4 sm:p-4.5 rounded-[22px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,35,60,0.06)] flex items-center cursor-pointer hover:border-synos-primary/60 transition-all group h-full"
        >
            <div className="flex items-center w-full gap-4">
                {/* Left side: Icon, Title, and Big Amount */}
                <div className="w-[160px] sm:w-[180px] shrink-0 flex flex-col justify-center space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] bg-[#FFF1F2] text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100/90 dark:border-rose-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                            <Percent size={18} strokeWidth={2.4} />
                        </div>
                        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                            Concessions Given
                        </h3>
                    </div>
                    <p className="text-3xl sm:text-4xl lg:text-[40px] xl:text-[44px] font-black text-slate-900 dark:text-white tracking-tight leading-none my-1 tabular-nums inline-block transform scale-y-[1.12] origin-left">
                        ₹{formatInr(amt)}
                    </p>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        Total tariff concessions given
                    </span>
                </div>

                {/* Right side: Fluid Concession Impact Meter (STRETCHES ACROSS ENTIRE WIDTH - CLOSES MARKER 6) */}
                <div className="flex-1 border-l border-slate-100 dark:border-zinc-800 pl-4 sm:pl-5 flex flex-col justify-center space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                            Concession Burden
                        </span>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", statusConfig.bg)}>
                            {statusConfig.label}
                        </span>
                    </div>

                    <div className="h-[18px] sm:h-[20px] bg-[#E2ECF6] dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner w-full">
                        <div 
                            className="h-full rounded-full bg-gradient-to-r from-[#FCA5A5] via-[#FDA4AF] to-[#FECDD3] transition-all duration-500 shadow-[0_2px_8px_rgba(251,113,133,0.25)]"
                            style={{ width: `${Math.min(100, Math.max(5, rate))}%` }}
                        />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        <span>Tariff Impact</span>
                        <span className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">
                            {rate.toFixed(1)}% Discounted
                        </span>
                    </div>
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
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const amt = Number(amount) || 0;
    const numRate = amt > 0 ? (Number(rate) || 0) : 0;
    const strokeDashoffset = circumference * (1 - Math.min(100, Math.max(0, numRate)) / 100);

    return (
        <div 
            onClick={onNavigate}
            className="p-4 sm:p-4.5 rounded-[22px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,35,60,0.06)] flex items-center justify-between cursor-pointer hover:border-synos-primary/60 transition-all group h-full"
        >
            {/* Left Column: Icon + Title + Numeral + Burn Context (COHESIVE STACK - CLOSES MARKER 10) */}
            <div className="flex flex-col justify-center space-y-1.5 flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                        <Receipt size={18} strokeWidth={2.3} />
                    </div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                        Operating Expenses
                    </h3>
                </div>

                <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none tabular-nums">
                        ₹{formatInr(amt)}
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-1">
                        Overheads, payables & facility burn
                    </p>
                </div>
            </div>

            {/* Right Side: Scaled Proportional Donut Ring Gauge (CLOSES MARKER 11) */}
            <div className="relative w-[92px] h-[92px] sm:w-[102px] sm:h-[102px] flex items-center justify-center shrink-0">
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
                        strokeWidth="11"
                        fill="none"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="url(#opExpensesDonutGrad)"
                        strokeWidth="11"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="none"
                        className="transition-all duration-700"
                    />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-none">
                        {numRate.toFixed(1)}%
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-tighter mt-0.5">
                        Burn
                    </span>
                </div>
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
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - Math.min(100, Math.max(0, rate)) / 100);

    const displayAmount = isToday ? dailyAmount : (amount || monthlyAmount);

    return (
        <div 
            onClick={onNavigate}
            className="p-4 sm:p-4.5 rounded-[22px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,35,60,0.06)] flex items-center justify-between cursor-pointer hover:border-synos-primary/60 transition-all group h-full"
        >
            {/* Left Column: Icon + Title + Staff Badge + Numeral + Burn Subtitle (COHESIVE STACK - CLOSES MARKER 12) */}
            <div className="flex flex-col justify-center space-y-1.5 flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] bg-[#FAF5FF] text-[#A855F7] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100/90 dark:border-purple-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                        <Users size={18} strokeWidth={2.3} />
                    </div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                        Payroll
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-100 dark:border-purple-800/60 tabular-nums">
                        {employeeCount} Staff
                    </span>
                    {isToday && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60 tabular-nums">
                            Today
                        </span>
                    )}
                </div>

                <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none tabular-nums">
                        ₹{formatInr(displayAmount)}
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-1 tabular-nums">
                        {isToday ? `₹${formatInr(monthlyAmount)}/mo (₹${formatInr(dailyAmount)}/day)` : `₹${formatInr(dailyAmount)}/day burn`}
                    </p>
                </div>
            </div>

            {/* Right Side: Scaled Proportional Donut Ring Gauge (CLOSES MARKER 13) */}
            <div className="relative w-[92px] h-[92px] sm:w-[102px] sm:h-[102px] flex items-center justify-center shrink-0">
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
                        strokeWidth="11"
                        fill="none"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="url(#payrollDonutGrad)"
                        strokeWidth="11"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="none"
                        className="transition-all duration-700"
                    />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-none">
                        {Number(rate || 0).toFixed(1)}%
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-tighter mt-0.5">
                        Share
                    </span>
                </div>
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
            className="p-3.5 sm:p-4 rounded-[22px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,35,60,0.06)] flex flex-col justify-between cursor-pointer hover:border-synos-primary/60 transition-all group h-full"
        >
            {/* Header: Icon + Title */}
            <div className="flex items-center justify-between pb-0.5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                        <TrendingUp size={18} strokeWidth={2.3} />
                    </div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-normal">
                        7-Day Collection Trend
                    </h3>
                </div>
            </div>

            {/* 7 Vertical Pill Bars - Balanced Proportions */}
            <div className="grid grid-cols-7 gap-2 sm:gap-2.5 items-end pt-1 flex-1 min-h-[60px] max-h-[105px]">
                {days.map((item, idx) => {
                    const amt = item.amount;
                    const displayDate = item.date;
                    
                    const heightPct = maxVal > 0 ? (amt > 0 ? Math.max(25, Math.round((amt / maxVal) * 100)) : 10) : 10;

                    return (
                        <div key={idx} className="flex flex-col items-center justify-end h-full group/bar">
                            {/* Value Above Bar */}
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-zinc-300 tabular-nums mb-0.5 opacity-90 group-hover/bar:opacity-100 group-hover/bar:text-synos-primary transition-colors">
                                {formatShortInr(amt)}
                            </span>

                            {/* Bar Column with Soft Blue Gradient and Rounded Top */}
                            <div className="w-full flex-1 flex items-end">
                                <div 
                                    className="w-full rounded-t-[8px] bg-gradient-to-t from-[#60A5FA] via-[#7BB3F0] to-[#93C5FD] dark:from-blue-600 dark:to-sky-400 transition-all duration-500 shadow-2xs group-hover/bar:brightness-105"
                                    style={{ height: `${heightPct}%` }}
                                />
                            </div>

                            {/* Date Label Below Bar */}
                            <span className={`text-[10px] sm:text-[11px] font-semibold mt-1 truncate w-full text-center ${item.isToday ? 'text-synos-primary font-bold' : 'text-slate-400 dark:text-zinc-500'}`}>
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
        <div className="flex-1 min-h-0 flex flex-col justify-start gap-3 sm:gap-3.5 lg:gap-4">
            {/* ROW 1: HERO CONTROL DECK: 2 BALANCED PODS (IOS INSPIRED SPLIT SLIDER & SEPARATED TALL NUMERAL) */}
            <div className="flex-1 min-h-[105px] p-4 sm:p-5 rounded-[22px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,35,60,0.06)] grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center">
                
                {/* Section 1 (5 Cols): The Herd on Left + Separated TALL Numeral Occupying Vertical & Horizontal Space */}
                <div className="lg:col-span-5 flex items-center justify-between gap-4 min-w-0 pr-0 lg:pr-4">
                    {/* The Herd: 3D Squircle Icon + Title + Bills Processed + Net formula */}
                    <div className="flex items-center gap-3.5 sm:gap-4 shrink-0 min-w-0">
                        <div className="w-[56px] h-[56px] sm:w-[62px] sm:h-[62px] rounded-[18px] bg-gradient-to-b from-[#EBF5FF] to-[#D6EBFE] border border-white/90 dark:border-white/10 shadow-[0_6px_16px_rgba(37,99,235,0.14),inset_0_2px_2px_#FFFFFF] flex items-center justify-center text-[#1C6CF2] dark:text-sky-400 shrink-0">
                            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="4" width="20" height="16" rx="3" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                                <line x1="6" y1="15" x2="10" y2="15" />
                                <circle cx="17" cy="15" r="1.5" fill="currentColor" />
                            </svg>
                        </div>

                        <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-normal">
                                    Total Amount Billed
                                </h3>
                                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]/70 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/60 shadow-2xs">
                                    {totalBillsCount} Bills Processed
                                </span>
                            </div>
                            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-zinc-400 truncate">
                                {concessionsAmount > 0 
                                    ? `Net Billed (₹${formatInr(billedRevenue + concessionsAmount)} - ₹${formatInr(concessionsAmount)})`
                                    : 'Net Clinical Tariff Billed'}
                            </p>
                        </div>
                    </div>

                    {/* Separated 29452 Numeral: TALL, NOT Extra Bold, Occupying Vertical & Horizontal Space */}
                    <div className="flex-1 flex flex-col items-end justify-center min-w-0 pl-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-0.5">
                            Total Billed
                        </span>
                        <div className="text-4xl sm:text-5xl lg:text-[56px] xl:text-[64px] font-normal sm:font-medium tracking-tight text-slate-900 dark:text-white tabular-nums leading-none inline-block transform scale-y-[1.25] origin-right">
                            ₹{formatInr(billedRevenue)}
                        </div>
                    </div>
                </div>

                {/* Section 2 (7 Cols): Doctor Payouts vs Receivables & Dues (Reclaims Full Space, Fatter Scaled Slider, Clear Hierarchy) */}
                <div className="lg:col-span-7 lg:border-l lg:border-slate-100 dark:lg:border-zinc-800 lg:pl-6 xl:pl-8 flex flex-col justify-center space-y-3 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-normal">
                            Doctor Payouts vs Receivables & Dues
                        </h3>
                        <div className="hidden sm:flex items-center gap-2 text-xs font-bold">
                            <span className="text-slate-500 dark:text-zinc-400">Total Obligations:</span>
                            <span className="text-slate-900 dark:text-white tabular-nums font-extrabold">
                                ₹{formatInr(totalSplitSum)}
                            </span>
                        </div>
                    </div>

                    {/* Fatter, Scaled iOS Split Slider with Elevated Circular Knob & Pastel Gradients */}
                    <div className="relative h-[26px] sm:h-[30px] lg:h-[32px] rounded-full bg-[#E2ECF6] dark:bg-zinc-800 flex items-center overflow-visible shadow-inner">
                        <div 
                            className="h-full bg-gradient-to-r from-[#60A5FA] via-[#7BB3F0] to-[#93C5FD] rounded-l-full transition-all duration-500 flex items-center pl-3 overflow-hidden shadow-[0_2px_8px_rgba(96,165,250,0.25)]"
                            style={{ width: `${totalSplitSum > 0 ? payoutsShare : 0}%` }}
                        >
                            {payoutsShare > 15 && (
                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-900 drop-shadow-xs truncate select-none">
                                    Commissions ({payoutsShare}%)
                                </span>
                            )}
                        </div>
                        <div 
                            className="h-full bg-gradient-to-r from-[#FCA5A5] via-[#FDA4AF] to-[#FECDD3] rounded-r-full transition-all duration-500 flex items-center justify-end pr-3 overflow-hidden shadow-[0_2px_8px_rgba(253,164,175,0.25)]"
                            style={{ width: `${totalSplitSum > 0 ? duesShare : 100}%` }}
                        >
                            {duesShare > 15 && (
                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-900 drop-shadow-xs truncate select-none">
                                    Receivables & Dues ({duesShare}%)
                                </span>
                            )}
                        </div>
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white dark:bg-zinc-100 shadow-[0_3px_12px_rgba(15,35,60,0.2),0_0_0_2.5px_#FFFFFF] border border-slate-100 pointer-events-none transition-all duration-500 z-10 flex items-center justify-center"
                            style={{ left: `${totalSplitSum > 0 ? payoutsShare : (doctorPayoutsVal > 0 ? 50 : 0)}%` }}
                        >
                            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                        </div>
                    </div>

                    {/* Two Channel Stat Pods Below: Vertically Scaled Tall Numerals (Taller, Not Extra Bold) Aligned Under Each Side */}
                    <div className="flex items-center justify-between pt-0.5">
                        {/* Left Stat Pod: Doctor Payouts */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[14px] bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                <Stethoscope size={22} strokeWidth={2.3} />
                            </div>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl sm:text-3xl lg:text-[32px] xl:text-[36px] font-normal sm:font-medium text-slate-900 dark:text-white tabular-nums tracking-tight leading-none inline-block transform scale-y-[1.2] origin-left">
                                        ₹{formatInr(doctorPayoutsVal)}
                                    </span>
                                    <span className="text-xs sm:text-sm font-bold text-[#1C6CF2] dark:text-sky-400 bg-[#EBF5FF] dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-100 dark:border-sky-800/40 tabular-nums">
                                        {totalSplitSum > 0 ? payoutsShare : 0}%
                                    </span>
                                </div>
                                <span className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 font-bold block mt-0.5">
                                    Doctor Commissions (Referral Payouts)
                                </span>
                            </div>
                        </div>

                        {/* Right Stat Pod: Receivables & Dues */}
                        <div className="flex items-center gap-3 text-right">
                            <div>
                                <div className="flex items-baseline gap-2 justify-end">
                                    <span className="text-xs sm:text-sm font-bold text-[#E11D48] dark:text-rose-400 bg-[#FFF1F2] dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-800/40 tabular-nums">
                                        {totalSplitSum > 0 ? duesShare : 0}%
                                    </span>
                                    <span className="text-2xl sm:text-3xl lg:text-[32px] xl:text-[36px] font-normal sm:font-medium text-slate-900 dark:text-white tabular-nums tracking-tight leading-none inline-block transform scale-y-[1.2] origin-right">
                                        ₹{formatInr(totalReceivablesAndDues)}
                                    </span>
                                </div>
                                <span className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 font-bold block mt-0.5">
                                    Receivables & Desk Dues (Outstanding)
                                </span>
                            </div>
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[14px] bg-[#FFF1F2] text-[#FB7185] dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100/90 dark:border-rose-800/40 flex items-center justify-center shrink-0 shadow-2xs">
                                <Building2 size={22} strokeWidth={2.3} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 2: ACTUAL CASH (8 COLS) & CONCESSIONS GIVEN (4 COLS) */}
            <div className="flex-1 min-h-[105px] grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 lg:gap-4 items-stretch">
                <div className="lg:col-span-8 h-full">
                    <ActualCashCard 
                        cashCollected={cashCollected}
                        onlineCollected={onlineCollected}
                        totalCollected={totalCollected}
                        onNavigate={() => navigate('/finance/revenue/overview')}
                    />
                </div>
                <div className="lg:col-span-4 h-full">
                    <ConcessionsCard 
                        concessionsAmount={concessionsAmount}
                        concessionsRate={concessionsRate}
                        onNavigate={() => navigate('/finance/discount-master')}
                    />
                </div>
            </div>

            {/* ROW 3: PATHOLOGY & RADIOLOGY BREAKDOWN CARDS */}
            <div className="flex-[1.45] min-h-[195px] flex flex-col lg:flex-row gap-3 sm:gap-3.5 lg:gap-4">
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
            <div className="flex-1 min-h-[105px] grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 lg:gap-4 items-stretch">
                {/* 1. Operating Expenses (25% / 3 cols) */}
                <div className="lg:col-span-3 h-full">
                    <OperatingExpensesCard 
                        amount={expensesAmount}
                        rate={expensesRate}
                        onNavigate={() => navigate('/finance/expenses')}
                    />
                </div>

                {/* 2. Payroll (25% / 3 cols) */}
                <div className="lg:col-span-3 h-full">
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
                <div className="lg:col-span-6 h-full">
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
