import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    X, 
    SlidersHorizontal, 
    ArrowDownLeft, 
    Receipt, 
    Users, 
    Package, 
    Shield, 
    Clock, 
    CalendarCheck, 
    Inbox, 
    ChevronRight,
    ArrowLeft,
    Send,
    Check,
    AlertCircle,
    Calendar,
    CalendarDays,
    Loader2,
    RotateCcw,
    Wallet,
    Sunset,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    Beaker,
    ShieldCheck,
    ExternalLink,
    ChevronDown,
    Search,
    Zap,
    Layers,
    Briefcase,
    UserCheck,
    FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { usePanelEntry } from '@/hooks/useSynOSMotion';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { AttendanceApi } from '@/api/attendance';
import { AttendanceCalendar } from '@/features/finance/components/workforce/AttendanceCalendar';
import { ReceptionExpenseDrawer } from './ReceptionExpenseDrawer';
import { ReceptionB2BReceivablesDrawer } from './ReceptionB2BReceivablesDrawer';
import { StockRequestPanel } from '@/features/inventory/StockRequestPanel';
import { ReceptionRefundTerminal } from './ReceptionRefundTerminal';
import { ReceptionCashDrawerLedger } from './ReceptionCashDrawerLedger';
import { ReceptionShiftClosingDrawer } from './ReceptionShiftClosingDrawer';

export function ReceptionOptionsPanel({
    isOpen,
    onClose,
    onOpenPatientDirectory,
    onOpenMyHr,
    pendingB2BCount = 0,
    onDataUpdated = null
}) {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const panelRef = useRef(null);

    // Active View inside the single sliding panel canvas:
    // 'menu' | 'expense' | 'b2b' | 'stock' | 'leave' | 'attendance' | 'requests'
    const [activeView, setActiveView] = useState('menu');
    const [expandedFinanceDept, setExpandedFinanceDept] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef(null);

    // Keyboard shortcut for Cmd+K / Ctrl+K search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Reset view and search when panel is closed
    useEffect(() => {
        if (!isOpen) {
            setActiveView('menu');
            setExpandedFinanceDept(null);
            setSearchQuery('');
        }
    }, [isOpen]);

    // Synchronize motion & Iron Dome focus trap
    usePanelEntry(panelRef, isOpen);
    useFocusTrap(panelRef, isOpen, onClose);

    if (!isOpen) return null;

    // Atmospheric palette matching IntentPanel facelift design
    const ui = isDark ? {
        panel: "bg-zinc-950 border border-zinc-800 shadow-2xl z-30",
        header: "bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800",
        footer: "bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.5)]",
        title: "text-white",
        subtitle: "text-zinc-400",
        sectionHeader: "text-zinc-400 font-bold",
        card: "bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700 shadow-xs",
        cardTitle: "text-zinc-100",
        cardDesc: "text-zinc-400",
        recessedPod: "rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]",
        input: "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-synos-primary focus:ring-2 focus:ring-synos-primary/20",
        primaryBtn: "bg-synos-primary text-white hover:brightness-105 shadow-md shadow-synos-primary/25 active:scale-[0.99] transition-all"
    } : {
        panel: cn(
            "bg-[radial-gradient(ellipse_at_top,_#EAF2F9_0%,_#DCE7F2_50%,_#CEDCE8_100%)]",
            "border-l border-white/80 shadow-[-20px_0_60px_rgba(15,35,60,0.18)]",
            "z-30"
        ),
        header: "bg-transparent border-b border-slate-200/60 backdrop-blur-md",
        footer: "bg-white/60 backdrop-blur-md border-t border-slate-200/60 shadow-[0_-4px_20px_-10px_rgba(15,35,60,0.05)]",
        title: "text-slate-900",
        subtitle: "text-slate-500",
        sectionHeader: "text-slate-600 font-bold",
        card: "bg-white/80 hover:bg-white border-white/90 hover:border-slate-300/80 shadow-xs",
        cardTitle: "text-slate-900",
        cardDesc: "text-slate-500",
        recessedPod: "rounded-xl border border-[#DCE7F2] bg-[#F2F7FA] shadow-[inset_0_1px_3px_rgba(15,35,60,0.06)]",
        input: "bg-white border-[#D5E2EC] text-slate-900 placeholder:text-slate-400 focus:border-synos-primary focus:ring-2 focus:ring-synos-primary/10",
        primaryBtn: "bg-synos-primary text-white hover:brightness-105 shadow-md shadow-synos-primary/25 active:scale-[0.99] transition-all"
    };

    // Smooth width morphing based on active view on the SAME sliding surface
    // Matches the balanced 2-column layout in ChatGPT mockup (Image 3)
    let viewWidthClasses = "w-[96vw] sm:w-[92vw] md:w-[620px] lg:w-[660px] xl:w-[700px] max-w-[740px]";
    if (activeView === 'expense') {
        viewWidthClasses = "w-[96vw] sm:w-[94vw] md:w-[90vw] lg:w-[86vw] xl:w-[85vw] 2xl:w-[85vw] max-w-[1780px]";
    } else if (activeView === 'b2b') {
        viewWidthClasses = "w-[96vw] sm:w-[94vw] md:w-[90vw] lg:w-[86vw] xl:w-[85vw] 2xl:w-[85vw] max-w-[1780px]";
    } else if (activeView === 'end-shift') {
        viewWidthClasses = "w-[96vw] sm:w-[94vw] md:w-[90vw] lg:w-[86vw] xl:w-[85vw] 2xl:w-[85vw] max-w-[1780px]";
    } else if (activeView === 'ledger') {
        viewWidthClasses = "w-[96vw] sm:w-[94vw] md:w-[88vw] lg:w-[85vw] xl:w-[80vw] 2xl:w-[75vw] max-w-[1450px]";
    } else if (activeView === 'refunds') {
        viewWidthClasses = "w-[96vw] sm:w-[94vw] md:w-[88vw] lg:w-[85vw] xl:w-[80vw] 2xl:w-[75vw] max-w-[1450px]";
    } else if (activeView === 'stock') {
        viewWidthClasses = "w-[96vw] sm:w-[92vw] md:w-[460px] lg:w-[500px] max-w-[540px]";
    } else if (activeView === 'leave') {
        viewWidthClasses = "w-[96vw] sm:w-[92vw] md:w-[540px] lg:w-[580px] max-w-[640px]";
    } else if (activeView === 'attendance') {
        viewWidthClasses = "w-[96vw] sm:w-[94vw] md:w-[90vw] lg:w-[85vw] max-w-[1400px]";
    } else if (activeView === 'requests') {
        viewWidthClasses = "w-[96vw] sm:w-[92vw] md:w-[680px] lg:w-[720px] max-w-[800px]";
    }

    // 1. Group 1: Desk Operations & Counter Settlements
    const operationsActions = [
        {
            id: 'b2b-receivables',
            title: 'Record B2B Receivables',
            icon: FileText,
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            badge: pendingB2BCount > 0 ? `${pendingB2BCount} Pending` : null,
            badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60',
            onClick: () => setActiveView('b2b')
        },
        {
            id: 'record-expense',
            title: 'Record Daily Expense',
            icon: Receipt,
            iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
            onClick: () => setActiveView('expense')
        }
    ];

    // 2. Group 2: Cashier POS & Settlements
    const posActions = [
        {
            id: 'cash-drawer-ledger',
            title: 'My Cash Drawer Ledger',
            icon: Wallet,
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            onClick: () => setActiveView('ledger')
        },
        {
            id: 'refunds-terminal',
            title: 'Change Due & Patient Refunds',
            icon: RotateCcw,
            iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            onClick: () => setActiveView('refunds')
        }
    ];

    // 3. Group 3: Finance Operations (5 Departments)
    const financeActions = [
        {
            id: 'revenue',
            title: "Revenue",
            path: "/finance/revenue/bills?source=reception",
            icon: TrendingUp,
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        },
        {
            id: 'expenses',
            title: "Expenses",
            path: "/finance/expenses/feed?source=reception",
            icon: TrendingDown,
            iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        },
        {
            id: 'referrals',
            title: "Referral Partners",
            path: "/finance/referrals/rate-queue?source=reception",
            icon: Users,
            iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
        },
        {
            id: 'outsourced',
            title: "Outsourced Tests",
            path: "/finance/outsourcing/active?source=reception",
            icon: Beaker,
            iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        },
        {
            id: 'insurance',
            title: "Insurance",
            path: "/finance/insurance/empanelment?source=reception",
            icon: ShieldCheck,
            iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
        }
    ];

    // 4. Group 4: Desk Utilities & Directory
    const utilitiesActions = [
        {
            id: 'patient-directory',
            title: 'Patient Directory',
            icon: Users,
            iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
            onClick: onOpenPatientDirectory
        },
        {
            id: 'stock-request',
            title: 'Request Stock & Consumables',
            icon: Package,
            iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
            onClick: () => setActiveView('stock')
        }
    ];

    // 5. Group 5: Staff & HR Portal
    const workforceActions = [
        {
            id: 'my-hr',
            title: 'My HR Dashboard',
            icon: Shield,
            iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
            onClick: onOpenMyHr
        },
        {
            id: 'my-attendance',
            title: 'My Attendance',
            icon: Clock,
            iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
            onClick: () => setActiveView('attendance')
        },
        {
            id: 'apply-leave',
            title: 'Apply Leave',
            icon: CalendarCheck,
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            onClick: () => setActiveView('leave')
        },
        {
            id: 'my-requests',
            title: 'My HR Requests',
            icon: Inbox,
            iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
            onClick: () => setActiveView('requests')
        }
    ];

    const sections = [
        {
            id: 'desk-ops',
            title: 'Desk Operations',
            icon: Zap,
            iconColor: 'text-blue-500 dark:text-blue-400',
            items: operationsActions
        },
        {
            id: 'pos',
            title: 'Cashier POS & Settlements',
            icon: Wallet,
            iconColor: 'text-teal-500 dark:text-teal-400',
            items: posActions
        },
        {
            id: 'finance',
            title: 'Finance Operations',
            icon: TrendingUp,
            iconColor: 'text-blue-500 dark:text-blue-400',
            isFinance: true,
            items: financeActions
        },
        {
            id: 'utilities',
            title: 'Desk Utilities & Directory',
            icon: Layers,
            iconColor: 'text-indigo-500 dark:text-indigo-400',
            items: utilitiesActions
        },
        {
            id: 'hr',
            title: 'Staff & HR Portal',
            icon: Briefcase,
            iconColor: 'text-blue-500 dark:text-blue-400',
            items: workforceActions
        }
    ];

    const filteredSections = useMemo(() => {
        if (!searchQuery.trim()) return sections;
        const q = searchQuery.toLowerCase().trim();
        return sections
            .map(section => ({
                ...section,
                items: section.items.filter(item => item.title.toLowerCase().includes(q))
            }))
            .filter(section => section.items.length > 0);
    }, [searchQuery, pendingB2BCount]);

    return (
        <div
            ref={panelRef}
            className={cn(
                "absolute right-0 top-0 bottom-0 flex flex-col h-full overflow-hidden rounded-[24px]",
                "transition-[width,transform,opacity] duration-300 ease-out shadow-2xl",
                viewWidthClasses,
                ui.panel
            )}
        >
            {/* VIEW 1: RECORD EXPENSE EMBEDDED */}
            {activeView === 'expense' && (
                <ReceptionExpenseDrawer
                    isOpen={true}
                    embedded={true}
                    onClose={onClose}
                    onBack={() => {
                        setActiveView('menu');
                        onDataUpdated?.();
                    }}
                />
            )}

            {/* VIEW 2: B2B RECEIVABLES EMBEDDED */}
            {activeView === 'b2b' && (
                <ReceptionB2BReceivablesDrawer
                    isOpen={true}
                    embedded={true}
                    onClose={onClose}
                    onBack={() => {
                        setActiveView('menu');
                        onDataUpdated?.();
                    }}
                />
            )}

            {/* VIEW 2B: CASH DRAWER LEDGER EMBEDDED */}
            {activeView === 'ledger' && (
                <ReceptionCashDrawerLedger
                    isOpen={true}
                    embedded={true}
                    onClose={onClose}
                    onBack={() => {
                        setActiveView('menu');
                        onDataUpdated?.();
                    }}
                    onDataUpdated={onDataUpdated}
                />
            )}

            {/* VIEW 2C: REFUNDS & CLAIMS TERMINAL EMBEDDED */}
            {activeView === 'refunds' && (
                <ReceptionRefundTerminal
                    isOpen={true}
                    embedded={true}
                    onClose={onClose}
                    onBack={() => {
                        setActiveView('menu');
                        onDataUpdated?.();
                    }}
                    onDataUpdated={onDataUpdated}
                />
            )}

            {/* VIEW 2D: END SHIFT CLOSING DRAWER EMBEDDED */}
            {activeView === 'end-shift' && (
                <ReceptionShiftClosingDrawer
                    isOpen={true}
                    embedded={true}
                    onClose={onClose}
                    onBack={() => {
                        setActiveView('menu');
                        onDataUpdated?.();
                    }}
                    onDataUpdated={onDataUpdated}
                />
            )}

            {/* VIEW 3: STOCK REQUEST EMBEDDED */}
            {activeView === 'stock' && (
                <StockRequestPanel
                    isOpen={true}
                    onClose={onClose}
                    onBack={() => setActiveView('menu')}
                    screenName="Reception Desk"
                />
            )}

            {/* VIEW 4: IN-DRAWER APPLY LEAVE */}
            {activeView === 'leave' && (
                <InDrawerApplyLeave
                    ui={ui}
                    onBack={() => setActiveView('menu')}
                    onClose={onClose}
                    onViewRequests={() => setActiveView('requests')}
                />
            )}

            {/* VIEW 5: IN-DRAWER ATTENDANCE */}
            {activeView === 'attendance' && (
                <InDrawerAttendance
                    ui={ui}
                    onBack={() => setActiveView('menu')}
                    onClose={onClose}
                />
            )}

            {/* VIEW 6: IN-DRAWER REQUESTS */}
            {activeView === 'requests' && (
                <InDrawerRequests
                    ui={ui}
                    onBack={() => setActiveView('menu')}
                    onClose={onClose}
                    onApplyNew={() => setActiveView('leave')}
                />
            )}

            {/* VIEW 0: MAIN OPTIONS MENU (ChatGPT Redesign Mockup) */}
            {activeView === 'menu' && (
                <>
                    {/* Header */}
                    <div className={cn("h-14 sm:h-16 flex items-center justify-between px-5 sm:px-6 shrink-0 border-b", ui.header)}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-2xs">
                                <SlidersHorizontal className="w-4 h-4" />
                            </div>
                            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                                Desk Options & Actions
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Close Options (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
                        {/* Quick Search Bar */}
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search options, workflows or tools..."
                                className="w-full pl-9 pr-12 py-2.5 text-xs rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-synos-primary/20 shadow-2xs transition-all"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 mr-1 cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <kbd className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-1.5 py-0.5 rounded-md">
                                    ⌘ K
                                </kbd>
                            </div>
                        </div>

                        {/* Filtered Sections */}
                        {filteredSections.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 dark:text-zinc-500">
                                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-xs font-semibold">No options found matching "{searchQuery}"</p>
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="mt-2 text-xs text-synos-primary hover:underline font-bold cursor-pointer"
                                >
                                    Clear search
                                </button>
                            </div>
                        ) : (
                            filteredSections.map(section => {
                                const SectionIcon = section.icon;
                                return (
                                    <div key={section.id} className="space-y-2">
                                        {/* Section Header */}
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <SectionIcon className={cn("w-4 h-4", section.iconColor)} />
                                                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                                                    {section.title}
                                                </span>
                                            </div>
                                            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/80 px-2.5 py-0.5 rounded-full border border-slate-200/60 dark:border-zinc-700/60">
                                                {section.items.length} {section.items.length === 1 ? 'Action' : 'Actions'}
                                            </span>
                                        </div>

                                        {/* 2-Column Grid */}
                                        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                                            {section.items.map(item => {
                                                const IconComponent = item.icon;
                                                if (section.isFinance) {
                                                    return (
                                                        <a
                                                            key={item.id}
                                                            href={item.path}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-left p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-800/90 shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-2 group cursor-pointer active:scale-[0.99]"
                                                            title={`Open ${item.title} in new window`}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", item.iconBg)}>
                                                                    <IconComponent className="w-4 h-4" />
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate group-hover:text-synos-primary transition-colors">
                                                                    {item.title}
                                                                </span>
                                                            </div>
                                                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                                                        </a>
                                                    );
                                                }

                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={item.onClick}
                                                        className="text-left p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-800/90 shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-2 group cursor-pointer active:scale-[0.99]"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", item.iconBg)}>
                                                                <IconComponent className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate block group-hover:text-synos-primary transition-colors">
                                                                    {item.title}
                                                                </span>
                                                                {item.badge && (
                                                                    <span className={cn("mt-0.5 inline-block px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono tracking-tight", item.badgeClass)}>
                                                                        {item.badge}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* End Shift & Handover Cash Card (Mockup Style) */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setActiveView('end-shift')}
                                className="w-full p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-400/50 dark:border-amber-500/40 text-amber-950 dark:text-amber-100 transition-all flex items-center justify-between group cursor-pointer active:scale-[0.99] shadow-xs"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                                        <UserCheck className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold tracking-tight text-amber-950 dark:text-amber-100">
                                        End Shift & Handover Cash
                                    </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-amber-700 dark:text-amber-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// =========================================================================
// SUB-VIEW 1: IN-DRAWER APPLY LEAVE (Intent Panel Facelift Design)
// =========================================================================
function InDrawerApplyLeave({ ui, onBack, onClose, onViewRequests }) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        leaveType: 'Casual',
        startDate: '',
        endDate: '',
        reason: ''
    });
    const [status, setStatus] = useState({ type: 'idle', message: '' });

    const leaveTypes = [
        'Casual', 'Sick', 'Earned', 'LossOfPay', 
        'Emergency', 'InfectionExposure', 'Quarantine', 'OnCallCompensatoryOff'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: 'loading', message: 'Submitting application...' });

        try {
            await AttendanceApi.submitLeave({
                ...formData,
                employeeId: user?.employeeId,
                startDate: new Date(formData.startDate).toISOString(),
                endDate: new Date(formData.endDate).toISOString(),
            });
            setStatus({ type: 'success', message: 'Leave application submitted successfully!' });
            setFormData({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
        } catch (err) {
            console.error("Failed to submit leave:", err);
            setStatus({ type: 'error', message: err?.message || 'Failed to submit application. Please try again.' });
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
            {/* Header */}
            <div className={cn("h-13 sm:h-14 flex items-center justify-between px-5 sm:px-6 shrink-0 border-b", ui.header)}>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onBack}
                        className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 border border-slate-300/60 dark:border-zinc-700/60 bg-white/70 dark:bg-zinc-900/70 mr-1"
                        title="Back to Options Menu"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-synos-primary" />
                        <span>Options</span>
                    </button>
                    <div>
                        <h2 className={cn("text-sm sm:text-base font-bold tracking-normal flex items-center gap-2", ui.title)}>
                            Apply for Leave
                            <span className="text-[10px] font-mono font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                                #HR-LEAVE
                            </span>
                        </h2>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Scrollable Form */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                {status.type === 'success' ? (
                    <div className="p-8 text-center space-y-4 flex flex-col items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center border-2 border-emerald-500/30">
                            <Check className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <h3 className={cn("text-lg font-bold", ui.title)}>Leave Request Sent</h3>
                            <p className={cn("text-xs max-w-sm", ui.subtitle)}>
                                Your leave application has been submitted to your supervisor for review.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setStatus({ type: 'idle', message: '' })}
                                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                            >
                                Apply Another
                            </button>
                            <button
                                type="button"
                                onClick={onViewRequests}
                                className={cn("px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer", ui.primaryBtn)}
                            >
                                View My Requests
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {status.type === 'error' && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{status.message}</span>
                            </div>
                        )}

                        <div className={cn("p-4 space-y-3.5", ui.recessedPod)}>
                            <div className="space-y-1">
                                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                    Leave Category *
                                </label>
                                <select
                                    required
                                    value={formData.leaveType}
                                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                                    className={cn("w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border transition-all cursor-pointer", ui.input)}
                                >
                                    {leaveTypes.map(t => (
                                        <option key={t} value={t}>{t.replace(/([A-Z])/g, ' $1').trim()}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                        Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className={cn("w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border transition-all", ui.input)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                        End Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className={cn("w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border transition-all", ui.input)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                    Reason & Operational Notes *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Explain the reason for leave and any desk handover instructions..."
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className={cn("w-full px-3 py-2 rounded-xl text-xs font-medium outline-none border transition-all resize-none", ui.input)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <button
                                type="button"
                                onClick={onBack}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={status.type === 'loading'}
                                className={cn("px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50", ui.primaryBtn)}
                            >
                                {status.type === 'loading' ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit Leave Request
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

// =========================================================================
// SUB-VIEW 2: IN-DRAWER ATTENDANCE SUMMARY (Intent Panel Facelift Design)
// =========================================================================
function InDrawerAttendance({ ui, onBack, onClose }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });

    const loadAttendance = async () => {
        try {
            setLoading(true);
            const res = await AttendanceApi.getMySummary(selectedMonth);
            setData(res);
        } catch (err) {
            console.error("Failed to load attendance summary:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAttendance();
    }, [selectedMonth]);

    const summary = data?.summary || {};
    const dailyStatuses = summary?.dailyStatuses || [];

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
            {/* Header */}
            <div className={cn("h-13 sm:h-14 flex items-center justify-between px-5 sm:px-6 shrink-0 border-b", ui.header)}>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onBack}
                        className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 border border-slate-300/60 dark:border-zinc-700/60 bg-white/70 dark:bg-zinc-900/70 mr-1"
                        title="Back to Options Menu"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-synos-primary" />
                        <span>Options</span>
                    </button>
                    <div>
                        <h2 className={cn("text-sm sm:text-base font-bold tracking-normal flex items-center gap-2", ui.title)}>
                            Attendance & Roster
                            <span className="text-[10px] font-mono font-bold text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800">
                                #HR-ATT
                            </span>
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <input 
                        type="month"
                        value={selectedMonth.substring(0, 7)}
                        onChange={(e) => setSelectedMonth(`${e.target.value}-01`)}
                        className={cn("px-2.5 py-1 rounded-xl text-xs font-bold outline-none border transition-all cursor-pointer", ui.input)}
                    />
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                {/* 4 KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Present Days</span>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{summary.totalPresentDays || 0}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Approved Leaves</span>
                        <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{summary.totalLeaveDays || 0}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Planned Leaves</span>
                        <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{summary.totalPlannedLeaves || 0}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Absences / LOP</span>
                        <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{summary.totalAbsentDays || 0}</div>
                    </div>
                </div>

                {/* Main Calendar View */}
                <div className={cn("p-4 rounded-2xl border min-h-[360px]", ui.recessedPod)}>
                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-7 h-7 text-synos-primary animate-spin" />
                            <span className={cn("text-xs font-medium", ui.subtitle)}>Loading monthly attendance roster...</span>
                        </div>
                    ) : (
                        <AttendanceCalendar statuses={dailyStatuses} isLocked={false} />
                    )}
                </div>
            </div>
        </div>
    );
}

// =========================================================================
// SUB-VIEW 3: IN-DRAWER MY REQUESTS (Intent Panel Facelift Design)
// =========================================================================
function InDrawerRequests({ ui, onBack, onClose, onApplyNew }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const list = await AttendanceApi.getMyRequests();
            setRequests(list || []);
        } catch (err) {
            console.error("Failed to load leave requests:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
            {/* Header */}
            <div className={cn("h-13 sm:h-14 flex items-center justify-between px-5 sm:px-6 shrink-0 border-b", ui.header)}>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onBack}
                        className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 border border-slate-300/60 dark:border-zinc-700/60 bg-white/70 dark:bg-zinc-900/70 mr-1"
                        title="Back to Options Menu"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-synos-primary" />
                        <span>Options</span>
                    </button>
                    <div>
                        <h2 className={cn("text-sm sm:text-base font-bold tracking-normal flex items-center gap-2", ui.title)}>
                            My Leave Requests
                            <span className="text-[10px] font-mono font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                #HR-REQ
                            </span>
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onApplyNew}
                        className={cn("px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer", ui.primaryBtn)}
                    >
                        + Apply Leave
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Scrollable Requests List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3">
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-7 h-7 text-synos-primary animate-spin" />
                        <span className={cn("text-xs font-medium", ui.subtitle)}>Loading your leave requests...</span>
                    </div>
                ) : requests.length === 0 ? (
                    <div className={cn("p-10 text-center rounded-2xl border space-y-2", ui.recessedPod)}>
                        <CalendarDays className="w-10 h-10 text-slate-400 mx-auto" />
                        <h4 className={cn("text-sm font-bold", ui.title)}>No Leave Applications</h4>
                        <p className={cn("text-xs", ui.subtitle)}>You have not submitted any leave requests yet.</p>
                        <button
                            type="button"
                            onClick={onApplyNew}
                            className={cn("mt-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5", ui.primaryBtn)}
                        >
                            Apply for Leave
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {requests.map(req => {
                            const isApproved = req.status === 'Approved';
                            const isRejected = req.status === 'Rejected';

                            let statusBadge = (
                                <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold rounded-full flex items-center gap-1 font-mono">
                                    <Clock className="w-3 h-3" /> Pending Review
                                </span>
                            );

                            if (isApproved) {
                                statusBadge = (
                                    <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold rounded-full flex items-center gap-1 font-mono">
                                        <Check className="w-3 h-3" /> Approved
                                    </span>
                                );
                            } else if (isRejected) {
                                statusBadge = (
                                    <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-[11px] font-bold rounded-full flex items-center gap-1 font-mono">
                                        <X className="w-3 h-3" /> Rejected
                                    </span>
                                );
                            }

                            return (
                                <div key={req.leaveRequestId} className={cn("p-4 rounded-2xl border space-y-2.5", ui.card)}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                                {req.leaveType} Leave
                                            </span>
                                            <p className="text-[10.5px] font-mono text-slate-400 dark:text-zinc-500 mt-0.5">
                                                Applied on {new Date(req.appliedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {statusBadge}
                                    </div>

                                    <div className={cn("p-3 rounded-xl space-y-1.5 text-xs", ui.recessedPod)}>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-zinc-400">Duration:</span>
                                            <span className="font-bold text-slate-800 dark:text-zinc-200">
                                                {new Date(req.startDate).toLocaleDateString()} &mdash; {new Date(req.endDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {req.reason && (
                                            <div className="pt-1 border-t border-slate-200/60 dark:border-zinc-800">
                                                <p className="italic text-slate-600 dark:text-zinc-300 text-[11px]">
                                                    "{req.reason}"
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {req.managerNotes && (
                                        <div className="text-xs bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-xl text-amber-700 dark:text-amber-300">
                                            <span className="font-bold">Manager Note:</span> {req.managerNotes}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
