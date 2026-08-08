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
    Layout,
    IndianRupee, 
    Users, 
    Settings2, 
    BarChart3, 
    Settings,
    ChevronDown,
    Eye,
    Activity,
    Archive,
    FolderArchive,
    MessageSquare
} from 'lucide-react';
import { SystemBar } from '@/components/layout/SystemBar';

export function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const sidebarGroups = [
        {
            title: "Control Tower & Operations",
            items: [
                { name: "Dashboard", icon: LayoutDashboard, path: "/admin", exact: true },
                { name: "Reception", icon: UserPlus, path: "/reception" },
                { name: "Reports Typing", icon: Keyboard, path: "/typist" },
                { name: "Delivery Desk", icon: Truck, path: "/delivery" },
                { name: "Inventory (Ops)", icon: Box, path: "/inventory" },
                { name: "Finance (Ops)", icon: IndianRupee, path: "/finance" }
            ]
        },
        {
            title: "Pathology Division",
            items: [
                { name: "Phlebotomy", icon: Syringe, path: "/phlebotomist" },
                { name: "Lab Workbench", icon: Beaker, path: "/workbench" },
                { name: "Pathologist", icon: UserCheck, path: "/pathologist" }
            ]
        },
        {
            title: "Radiology Division",
            items: [
                { name: "X-Ray Technician", icon: Activity, path: "/xraytech" },
                { name: "Ultrasound Technician", icon: Activity, path: "/ustech" },
                { name: "CT Technician", icon: Activity, path: "/cttech" },
                { name: "MRI Technician", icon: Activity, path: "/mritech" },
                { name: "Radiologist", icon: Eye, path: "/radiologist" }
            ]
        }
    ];

    const standaloneItems = [
        { name: "Patient Directory", icon: Users, path: "/admin/patients" },
        { name: "Report Archive", icon: Archive, path: "/admin/report-archive" },
        { name: "PACS Archive", icon: FolderArchive, path: "/admin/pacs" },
        { name: "Test Master", icon: Settings2, path: "/admin/test-master" },
        { name: "Report Templates", icon: Layout, path: "/admin/report-templates" },
        { name: "Inventory Setup", icon: Box, path: "/admin/inventory/setup" },
        { name: "Staff Master (Identity)", icon: Users, path: "/admin/staff" },
        { name: "Intelligence", icon: BarChart3, path: "/admin/intelligence" },
        { name: "System Settings", icon: Settings, path: "/admin/settings" },
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
                    
                    <nav className="flex-1 overflow-y-auto p-3 pt-6 space-y-6 relative z-10">
                        {sidebarGroups.map((group, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="px-3 flex items-center justify-between group cursor-default">
                                    <span className="type-section-header group-hover:text-synos-primary transition-colors">
                                        {group.title}
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-zinc-400 dark:text-zinc-600" />
                                </div>
                                <div className="space-y-0.5">
                                    {group.items.map((item) => (
                                        <SidebarLink key={item.name} item={item} />
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="space-y-0.5 pt-3 border-t dark:border-zinc-900 border-zinc-200">
                            {standaloneItems.map((item) => (
                                <SidebarLink key={item.name} item={item} />
                            ))}
                        </div>
                    </nav>

                    {/* User Footer */}
                    <div className="p-3 border-t dark:border-zinc-900 border-zinc-200">
                        <div className="flex items-center justify-between dark:bg-zinc-900/50 bg-white p-2.5 rounded-xl border dark:border-zinc-800 border-zinc-200 shadow-sm">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="w-8 h-8 shrink-0 rounded-full dark:bg-zinc-800 bg-zinc-200 flex items-center justify-center text-xs font-bold dark:text-zinc-300 text-zinc-700 border dark:border-zinc-700 border-zinc-300">
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
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-50 select-none">
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium">{item.name}</span>
            </div>
        );
    }

    return (
        <NavLink
            to={item.path}
            end={item.exact}
            className={({ isActive }) => `
                flex items-center gap-2.5 px-3 py-1.5 rounded-md transition-all duration-150 group border
                ${isActive 
                    ? 'bg-synos-primary/10 text-synos-primary dark:text-white dark:border-synos-primary/30 border-synos-primary/30 font-bold shadow-xs' 
                    : 'text-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900/80 hover:bg-zinc-100 hover:text-zinc-900 border-transparent font-semibold'
                }
            `}
        >
            {({ isActive }) => (
                <>
                    <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-synos-primary' : 'text-zinc-700 dark:text-zinc-300 group-hover:text-synos-primary'}`} />
                    <span className={`text-xs leading-tight transition-colors ${isActive ? 'text-synos-primary dark:text-white font-bold' : 'text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white font-semibold'}`}>{item.name}</span>
                </>
            )}
        </NavLink>
    );
}
