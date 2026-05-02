import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
    LayoutDashboard, 
    UserPlus, 
    Syringe, 
    Beaker, 
    Keyboard, 
    UserCheck, 
    Truck, 
    Box, 
    IndianRupee, 
    Users, 
    Settings2, 
    BarChart3, 
    Settings,
    ChevronDown
} from 'lucide-react';
import { SystemBar } from '@/components/layout/SystemBar';

export function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const sidebarGroups = [
        {
            title: "Control Tower",
            items: [
                { name: "Dashboard", icon: LayoutDashboard, path: "/admin", exact: true },
                { name: "Reception", icon: UserPlus, path: "/reception" },
                { name: "Phlebotomy", icon: Syringe, path: "/phlebotomist" },
                { name: "Lab Workbench", icon: Beaker, path: "/workbench" },
                { name: "Reports Typing", icon: Keyboard, path: "/typist" },
                { name: "Pathologist", icon: UserCheck, path: "/pathologist" },
                { name: "Delivery Desk", icon: Truck, path: "/delivery" },
                { name: "Inventory (Ops)", icon: Box, path: "/inventory", disabled: true },
                { name: "Finance (Ops)", icon: IndianRupee, path: "/finance", disabled: true },
            ]
        }
    ];

    const standaloneItems = [
        { name: "Lab Setup", icon: Settings2, path: "/admin/setup", disabled: true },
        { name: "Staff Master", icon: Users, path: "/admin/staff", disabled: true },
        { name: "Intelligence", icon: BarChart3, path: "/admin/intelligence", disabled: true },
        { name: "System Settings", icon: Settings, path: "/admin/settings", disabled: true },
    ];

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden dark:bg-zinc-950 bg-transparent text-zinc-900 dark:text-zinc-300 selection:bg-synos-primary/20">
            {/* High-Complexity Atmospheric Accents (PERFORMANCE OPTIMIZED) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden">
                {/* 1. Grain/Noise Base (No mix-blend-overlay for performance) */}
                <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />

                {/* Static Blooms (Removed pulse to stop CPU/GPU stutter) */}
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

            {/* Global System Bar */}
            <SystemBar syncStatus="Synced" />

            <div className="flex flex-1 overflow-hidden relative z-10">
                {/* Sidebar - STATIC FROST MODEL (No real blur) */}
                <aside 
                    style={{
                        backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")`,
                        backgroundBlendMode: 'overlay',
                        backgroundRepeat: 'repeat'
                    }}
                    className="w-64 border-r dark:border-zinc-900 border-zinc-200 dark:bg-zinc-950 bg-gradient-to-b from-white/98 to-zinc-50/95 flex flex-col relative"
                >
                    {/* Interior Highlighting (Edge Refraction) */}
                    <div className="absolute inset-0 border-r border-white/40 pointer-events-none" />
                    
                    <div className="p-6 border-b dark:border-zinc-900 border-zinc-200 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-synos-primary rounded-lg flex items-center justify-center shadow-lg shadow-synos-primary/20">
                                <span className="text-black font-black text-xs italic">S</span>
                            </div>
                            <div>
                                <h1 className="type-page-title !text-sm leading-none mb-1">SynOS</h1>
                                <p className="type-meta uppercase tracking-widest leading-none">Admin Panel</p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 overflow-y-auto p-4 space-y-8">
                        {sidebarGroups.map((group, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="px-3 flex items-center justify-between group cursor-default">
                                    <span className="type-section-header group-hover:text-synos-primary transition-colors">
                                        {group.title}
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />
                                </div>
                                <div className="space-y-1">
                                    {group.items.map((item) => (
                                        <SidebarLink key={item.name} item={item} />
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="space-y-1 pt-4 border-t dark:border-zinc-900 border-zinc-200">
                            {standaloneItems.map((item) => (
                                <SidebarLink key={item.name} item={item} />
                            ))}
                        </div>
                    </nav>

                    {/* User Footer */}
                    <div className="p-4 border-t dark:border-zinc-900 border-zinc-200">
                        <div className="flex items-center justify-between dark:bg-zinc-900/50 bg-white p-3 rounded-xl border dark:border-zinc-800 border-zinc-200 shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 shrink-0 rounded-full dark:bg-zinc-800 bg-zinc-200 flex items-center justify-center text-[10px] font-bold dark:text-zinc-400 text-zinc-600 border dark:border-zinc-700 border-zinc-300">
                                    {user?.name?.substring(0, 2).toUpperCase() || "AD"}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="type-value truncate leading-tight">{user?.name || "Admin"}</p>
                                    <p className="type-meta uppercase tracking-tighter">Administrator</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                    <div className="flex-1 overflow-y-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}

function SidebarLink({ item }) {
    if (item.disabled) {
        return (
            <div className="flex items-center gap-3 px-3 py-2 rounded-md text-zinc-700 cursor-not-allowed opacity-50 select-none">
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="type-label">{item.name}</span>
            </div>
        );
    }

    return (
        <NavLink
            to={item.path}
            end={item.exact}
            className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group border
                ${isActive 
                    ? 'bg-synos-primary/10 dark:text-white text-synos-primary dark:border-synos-primary/20 border-synos-primary/30' 
                    : 'text-zinc-500 dark:hover:bg-zinc-900 hover:bg-zinc-200/50 hover:text-zinc-900 border-transparent'
                }
            `}
        >
            <item.icon className={`w-4 h-4 shrink-0 transition-colors ${item.isActive ? 'text-synos-primary' : 'group-hover:text-synos-primary'}`} />
            <span className="type-label !text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-300 transition-colors">{item.name}</span>
        </NavLink>
    );
}
