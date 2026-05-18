import React, { useState } from 'react';
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
    LayoutDashboard
} from 'lucide-react';
import { SystemBar } from '@/components/layout/SystemBar';

export function FinanceLayout() {
    const { user } = useAuth();
    const location = useLocation();

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
                { name: "Bills & Collections", path: "/finance/revenue/bills" },
                { name: "Pending Receivables", path: "/finance/revenue/receivables" },
                { name: "Collection History", path: "/finance/revenue/history" }
            ]
        },
        {
            name: "Expenses",
            path: "/finance/expenses",
            icon: TrendingDown,
            subItems: [
                { name: "Expense Feed", path: "/finance/expenses/feed" },
                { name: "Vendor Payables", path: "/finance/expenses/payables" },
                { name: "Vendor Master", path: "/finance/expenses/vendors" },
                { name: "Daily Expenses", path: "/finance/expenses/daily" },
                { name: "Monthly Overheads", path: "/finance/expenses/overheads" }
            ]
        },
        {
            name: "Referral Partners",
            path: "/finance/referrals",
            icon: Users,
            subItems: [
                { name: "Partner Registry", path: "/finance/referrals/registry" },
                { name: "Payouts", path: "/finance/referrals/payouts" },
                { name: "Settlement History", path: "/finance/referrals/history" },
                { name: "Rules", path: "/finance/referrals/rules" }
            ]
        },
        {
            name: "Outsourced Tests",
            path: "/finance/outsourcing",
            icon: Beaker,
            subItems: [
                { name: "Active Outsourced", path: "/finance/outsourcing/active" },
                { name: "Reference Labs", path: "/finance/outsourcing/labs" },
                { name: "Pending Payments", path: "/finance/outsourcing/pending" },
                { name: "Settlement History", path: "/finance/outsourcing/history" }
            ]
        },
        {
            name: "Workforce & Payroll",
            path: "/finance/workforce",
            icon: Users2,
            subItems: [
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
        <div className="flex flex-col h-screen w-screen overflow-hidden dark:bg-zinc-950 bg-zinc-50 text-zinc-900 dark:text-zinc-300 selection:bg-synos-primary/20">
            {/* Clinical Aesthetic Accents */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden">
                <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />
            </div>

            <SystemBar syncStatus="Synced" />

            <div className="flex flex-1 overflow-hidden">
                <aside className="w-72 border-r dark:border-zinc-900 border-zinc-200 dark:bg-zinc-950 bg-white flex flex-col relative">
                    <div className="flex-1 overflow-y-auto p-4 pt-6 space-y-1">
                        <div className="px-3 pb-4">
                            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">Finance Operations</h2>
                        </div>
                        {departments.map((dept) => (
                            <DepartmentItem key={dept.name} dept={dept} currentPath={location.pathname} />
                        ))}
                    </div>

                    <div className="p-4 border-t dark:border-zinc-900 border-zinc-200">
                        <div className="flex items-center gap-3 p-3 rounded-xl dark:bg-zinc-900/50 bg-zinc-50 border dark:border-zinc-800 border-zinc-200">
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

                <main className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50">
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
