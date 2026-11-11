import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
    IndianRupee, 
    TrendingUp, 
    TrendingDown, 
    Users, 
    Beaker, 
    Users2, 
    Building2, 
    BarChart3,
    ChevronRight,
    LayoutDashboard,
    ShieldCheck,
    Briefcase,
    Tag,
    PanelLeft,
    PanelLeftOpen,
    PanelLeftClose
} from 'lucide-react';
import { SystemBar } from '@/components/layout/SystemBar';

export function FinanceLayout() {
    const { user } = useAuth();
    const location = useLocation();

    const isAdmin = user?.role === 'Admin' || user?.role === 'SystemAdmin' || 
                   (Array.isArray(user?.role) && (user.role.includes('Admin') || user.role.includes('SystemAdmin')));

    // Clean up stale reception source tag whenever navigating without source=reception
    React.useEffect(() => {
        if (location.search.includes('source=reception')) {
            sessionStorage.setItem('synos_finance_source', 'reception');
        } else {
            sessionStorage.removeItem('synos_finance_source');
        }
    }, [location.search]);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('synos_finance_sidebar_collapsed');
        if (saved !== null) return saved === 'true';
        return user?.role === 'Receptionist';
    });

    useEffect(() => {
        localStorage.setItem('synos_finance_sidebar_collapsed', isSidebarCollapsed);
    }, [isSidebarCollapsed]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                setIsSidebarCollapsed(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const departments = [
        {
            name: "Overview",
            path: "/finance",
            icon: LayoutDashboard,
            exact: true
        },
        {
            name: "Revenue",
            path: "/finance/revenue",
            icon: TrendingUp,
            subItems: [
                { name: "Overview", path: "/finance/revenue/overview" },
                { name: "Bills & Collections", path: "/finance/revenue/bills" },
                { name: "Due Bills", path: "/finance/revenue/dues" },
                { name: "Pending Receivables", path: "/finance/receivables" },
                { name: "Visit Corrections", path: "/finance/revenue/corrections" },
                { name: "Cancellations & Refunds", path: "/finance/revenue/cancellations" },
                { name: "Change Due & Patient Refunds", path: "/finance/revenue/refunds" },
                { name: "Collection History", path: "/finance/revenue/history" },
                { name: "Cash Drawer Ledgers", path: "/finance/revenue/drawers" }
            ]
        },
        {
            name: "B2B Receivables",
            path: "/finance/receivables",
            icon: Building2,
            subItems: [
                { name: "Accounts Overview", path: "/finance/receivables/overview" },
                { name: "Account Ledger", path: "/finance/receivables/ledger" },
                { name: "Outstanding Bills", path: "/finance/receivables/bills" },
                { name: "Recoveries & Settlement", path: "/finance/receivables/recoveries" },
                { name: "Account Statements", path: "/finance/receivables/statements" }
            ]
        },
        {
            name: "Expenses",
            path: "/finance/expenses",
            icon: TrendingDown,
            subItems: [
                { name: "Overview", path: "/finance/expenses/overview" },
                { name: "Expense Feed", path: "/finance/expenses/feed" },
                { name: "Vendor Payables", path: "/finance/expenses/payables" },
                { name: "Vendor Master", path: "/finance/expenses/vendors" },
                { name: "Daily Expenses", path: "/finance/expenses/daily" },
                { name: "Monthly Overheads", path: "/finance/expenses/overheads" },
                { name: "Corrected Expenses", path: "/finance/expenses/corrections" },
                { name: "Deleted Expenses", path: "/finance/expenses/deletions" }
            ]
        },
        {
            name: "Referral Partners",
            path: "/finance/referrals",
            icon: Users,
            subItems: [
                { name: "Partner Performance", path: "/finance/referrals/performance" },
                { name: "Commission Payouts", path: "/finance/referrals/payouts" },
                { name: "Rate Cards & Rules", path: "/finance/referrals/rules" },
                { name: "Referral Visits", path: "/finance/referrals/visits" },
                { name: "Settlement History", path: "/finance/referrals/history" },
                { name: "Doctor Registry", path: "/finance/referrals/registry" },
                { name: "Partner Receivables", path: "/finance/receivables" }
            ]
        },
        {
            name: "Outsourced Tests",
            path: "/finance/outsourcing",
            icon: Beaker,
            subItems: [
                { name: "Overview", path: "/finance/outsourcing/overview" },
                { name: "Active Outsourced", path: "/finance/outsourcing/active" },
                { name: "Pending Pricing", path: "/finance/outsourcing/pricing" },
                { name: "Reference Labs", path: "/finance/outsourcing/labs" },
                { name: "Settlement History", path: "/finance/outsourcing/history" }
            ]
        },
        {
            name: "Insurance",
            path: "/finance/insurance",
            icon: ShieldCheck,
            subItems: [
                { name: "Overview", path: "/finance/insurance/overview" },
                { name: "Insurance Companies", path: "/finance/insurance/empanelment" },
                { name: "Packages & Pricing", path: "/finance/insurance/packages" },
                { name: "Claims", path: "/finance/insurance/claims" },
                { name: "Pending Dues", path: "/finance/insurance/receivables" },
                { name: "Settlements", path: "/finance/insurance/settlements" }
            ]
        },
        {
            name: "Discount Master",
            path: "/finance/discounts",
            icon: Tag,
            subItems: [
                { name: "Discount Codes", path: "/finance/discounts/codes" },
                { name: "Preset Reasons", path: "/finance/discounts/reasons" },
                { name: "Discount History", path: "/finance/discounts/history" },
                { name: "Staff Summary", path: "/finance/discounts/staff" }
            ]
        },
        {
            name: "Workforce & Payroll",
            path: "/finance/workforce",
            icon: Users2,
            subItems: [
                { name: "Overview", path: "/finance/workforce/overview" },
                { name: "Staff Registry", path: "/finance/workforce/staff" },
                { name: "Identity & Access", path: "/finance/workforce/identity" },
                { name: "Attendance & Leaves", path: "/finance/workforce/attendance" },
                { name: "Salary Processing", path: "/finance/workforce/process" },
                { name: "Payroll History", path: "/finance/workforce/history" },
                { name: "Advances & Deductions", path: "/finance/workforce/adjustments" }
            ]
        },
        {
            name: "Economics Intelligence",
            path: "/finance/intelligence",
            icon: BarChart3
        }
    ];

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden dark:bg-zinc-950 bg-transparent text-zinc-900 dark:text-zinc-300 selection:bg-synos-primary/20">
            {/* High-Complexity Atmospheric Accents (PERFORMANCE OPTIMIZED) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden">
                {/* 1. Grain/Noise Base */}
                <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />

                {/* Static Blooms */}
                <div
                    className="absolute top-[-15%] left-[-5%] w-[50%] h-[55%]"
                    style={{ background: 'radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.05) 0%, rgba(6, 182, 212, 0) 70%)' }}
                />

                <div
                    className="absolute top-[-10%] right-[10%] w-[45%] h-[50%]"
                    style={{ background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.03) 0%, rgba(37, 99, 235, 0) 80%)' }}
                />

                <div
                    className="absolute top-[-25%] right-[-10%] w-[60%] h-[65%]"
                    style={{ background: 'radial-gradient(circle at 60% 30%, rgba(52, 211, 153, 0.04) 0%, rgba(52, 211, 153, 0) 70%)' }}
                />
            </div>

            <SystemBar syncStatus="Synced" />

            <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">
                {/* Sidebar - Frosted Light Mode Model */}
                {!isSidebarCollapsed && (
                    <aside 
                        style={{
                            backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")`,
                            backgroundBlendMode: 'overlay',
                            backgroundRepeat: 'repeat'
                        }}
                        className="w-72 border-r dark:border-zinc-900 border-zinc-200 dark:bg-zinc-950 bg-gradient-to-b from-white/98 to-zinc-50/95 flex flex-col relative shrink-0 animate-in slide-in-from-left duration-200"
                    >
                        {/* Interior Highlighting (Edge Refraction) */}
                        <div className="absolute inset-0 border-r border-white/40 pointer-events-none" />

                        {/* Sidebar Header with Minimize Button */}
                        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b dark:border-zinc-900 border-zinc-200 shrink-0">
                            <span className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Finance Operations</span>
                            <button
                                type="button"
                                onClick={() => setIsSidebarCollapsed(true)}
                                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Minimize Navigation Panel (⌘B / Ctrl+B)"
                            >
                                <PanelLeftClose className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3.5 space-y-1 relative z-10">
                            {departments.map((dept) => (
                                <DepartmentItem key={dept.name} dept={dept} currentPath={location.pathname} />
                            ))}
                        </div>

                        <div className="p-4 border-t dark:border-zinc-900 border-zinc-200">
                            <div className="flex items-center gap-3 p-3 rounded-xl dark:bg-zinc-900/50 bg-white border dark:border-zinc-800 border-zinc-200 shadow-sm">
                                <div className="w-8 h-8 rounded-full dark:bg-zinc-800 bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-500 uppercase">
                                    {user?.name?.substring(0, 2) || "FC"}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-xs font-semibold truncate leading-tight dark:text-zinc-200">{user?.name || "Finance Controller"}</p>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Finance Hub</p>
                                </div>
                            </div>
                        </div>
                    </aside>
                )}

                <main className="flex-1 min-h-0 overflow-y-auto bg-[#CBD5E1] dark:bg-zinc-950 flex flex-col relative">
                    {/* Floating Expand Toggle when Navigation is Minimized */}
                    {isSidebarCollapsed && (
                        <button
                            type="button"
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="absolute top-2.5 left-2.5 z-40 p-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-md text-zinc-500 hover:text-synos-primary hover:bg-white dark:hover:bg-zinc-900 transition-all cursor-pointer group"
                            title="Expand Navigation Panel (⌘B / Ctrl+B)"
                        >
                            <PanelLeftOpen className="w-4 h-4 text-zinc-600 dark:text-zinc-400 group-hover:text-synos-primary transition-colors" />
                        </button>
                    )}
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

function DepartmentItem({ dept, currentPath }) {
    const isActive = dept.exact ? currentPath === dept.path : currentPath.startsWith(dept.path);
    const [isExpanded, setIsExpanded] = useState(isActive);

    return (
        <div className="space-y-1">
            <NavLink
                to={dept.path}
                onClick={() => setIsExpanded(!isExpanded)}
                className={({ isActive: linkActive }) => `
                    flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group
                    ${linkActive 
                        ? 'bg-synos-primary/10 text-synos-primary dark:text-white border border-synos-primary/20 shadow-sm' 
                        : 'text-zinc-500 dark:hover:bg-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 border border-transparent'
                    }
                `}
            >
                <div className="flex items-center gap-3">
                    <dept.icon className={`w-4 h-4 ${isActive ? 'text-synos-primary' : 'group-hover:text-synos-primary'}`} />
                    <span className="text-sm font-medium">{dept.name}</span>
                </div>
                {dept.subItems && (
                    <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                )}
            </NavLink>

            {dept.subItems && isExpanded && (
                <div className="ml-9 space-y-1 border-l dark:border-zinc-900 border-zinc-200">
                    {dept.subItems.map((sub) => (
                        <NavLink
                            key={sub.name}
                            to={sub.path}
                            className={({ isActive }) => `
                                block py-1.5 px-4 text-xs transition-all relative
                                ${isActive 
                                    ? 'text-synos-primary font-bold dark:text-white bg-synos-primary/5' 
                                    : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30'
                                }
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-synos-primary" />
                                    )}
                                    {sub.name}
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            )}
        </div>
    );
}
