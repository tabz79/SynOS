import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    UserPlus,
    Syringe, 
    Beaker, 
    Keyboard, 
    UserCheck, 
    Truck, 
    ArrowRight,
    AlertCircle,
    TrendingUp,
    IndianRupee,
    Wallet,
    Banknote,
    Activity,
    CheckCircle2,
    Loader2,
    Eye
} from 'lucide-react';
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { ReceptionApi } from "@/api/reception";
import { useAuth } from '@/context/AuthContext';
import { AdminApi } from '@/api/admin';

export function ControlTowerDashboard() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { user, activeOversightBranchId } = useAuth();
    const isAdmin = user?.role === 'Admin' || user?.role === 'SystemAdmin';

    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    // Strategy A Switcher State
    const [isConsolidated, setIsConsolidated] = useState(true);
    const [branches, setBranches] = useState([]);

    useEffect(() => {
        if (isAdmin) {
            loadBranches();
        }
    }, [isAdmin]);

    const loadBranches = async () => {
        try {
            const data = await AdminApi.getBranches();
            setBranches(data || []);
        } catch (e) {
            console.error("Failed to load branches for Control Tower", e);
        }
    };

    useEffect(() => {
        fetchSummary();
        const interval = setInterval(fetchSummary, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [isConsolidated, activeOversightBranchId]);

    const fetchSummary = async () => {
        try {
            const token = localStorage.getItem('synos_jwt');
            
            const q = [];
            if (isConsolidated && isAdmin) {
                q.push('isConsolidated=true');
            } else if (activeOversightBranchId) {
                q.push(`branchId=${activeOversightBranchId}`);
            } else if (user?.branchId) {
                q.push(`branchId=${user.branchId}`);
            }
            const qs = q.length ? '?' + q.join('&') : '';
            const url = `/api/v1/dashboard/control-tower/summary${qs}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSummary(data);
            } else {
                console.error("Dashboard fetch failed:", response.status);
            }
        } catch (error) {
            console.error("Failed to fetch summary:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-synos-primary animate-spin" />
            </div>
        );
    }

    const cardStyle = {
        background: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ=="), linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%)`
    };

    const cardClasses = "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,1)] border border-black/[0.1]";

    const operationsCards = [
        { title: "Reception", subtitle: "Registration & Billing", icon: UserPlus, data: summary?.reception, path: "/reception", btnText: "Open Reception" },
        { title: "Reports Typing", subtitle: "Data Entry & Review", icon: Keyboard, data: summary?.reportsTyping, path: "/typist", btnText: "Open Typing" },
        { title: "Delivery Desk", subtitle: "Report Dispatch", icon: Truck, data: summary?.delivery, path: "/delivery", btnText: "Open Delivery" },
    ];

    const pathologyCards = [
        { title: "Phlebotomy", subtitle: "Sample Collection", icon: Syringe, data: summary?.phlebotomy, path: "/phlebotomist", btnText: "Open Phlebotomy" },
        { title: "Lab Workbench", subtitle: "Processing & Testing", icon: Beaker, data: summary?.labWorkbench, path: "/workbench", btnText: "Open Workbench" },
        { title: "Pathologist", subtitle: "Final Validation", icon: UserCheck, data: summary?.pathologist, path: "/pathologist", btnText: "Open Pathologist" },
    ];

    const radiologyCards = [
        { title: "X-Ray Technician", subtitle: "Image Acquisition", icon: Activity, data: summary?.xRayTech, path: "/xraytech", btnText: "Open X-Ray" },
        { title: "Ultrasound Technician", subtitle: "Ultrasonic Scan", icon: Activity, data: summary?.usTech, path: "/ustech", btnText: "Open Ultrasound" },
        { title: "CT Technician", subtitle: "CT Scan Acquisition", icon: Activity, data: summary?.ctTech, path: "/cttech", btnText: "Open CT Scan" },
        { title: "MRI Technician", subtitle: "Magnetic Resonance", icon: Activity, data: summary?.mriTech, path: "/mritech", btnText: "Open MRI" },
        { title: "Radiologist", subtitle: "Clinical Reporting", icon: Eye, data: summary?.radiologist, path: "/radiologist", btnText: "Open Radiologist" },
    ];

    const activeBranchName = isConsolidated 
        ? "All Branches" 
        : (branches.find(b => (b.branchId || b.id) === activeOversightBranchId)?.name || user?.branchName || "Selected Branch");

    return (
        <div className="p-8 space-y-8 pb-16 relative z-10">
            {/* HEADER WITH SWITCHER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight">Control Tower</h1>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Real-time oversight of operations, phlebotomy collections, test flows, and financials.</p>
                </div>

                {isAdmin && (
                    <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-black/5 dark:border-white/5 w-fit">
                        <button
                            onClick={() => setIsConsolidated(true)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                isConsolidated 
                                    ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                            )}
                        >
                            Consolidated View
                        </button>
                        <button
                            onClick={() => setIsConsolidated(false)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                !isConsolidated 
                                    ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                            )}
                        >
                            Branch View
                        </button>
                    </div>
                )}
            </div>

            {/* Operations Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-black/[0.05] dark:border-white/[0.05] pb-2">
                    <span className="w-1 h-4 bg-synos-primary rounded-full" />
                    <h2 className="text-xs font-black dark:text-zinc-400 text-zinc-650 tracking-wider uppercase">Operations</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {operationsCards.map((card) => (
                        <DepartmentCard key={card.title} {...card} onAction={() => navigate(card.path)} cardStyle={cardStyle} cardClasses={cardClasses} />
                    ))}
                </div>
            </div>

            {/* Pathology Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-black/[0.05] dark:border-white/[0.05] pb-2">
                    <span className="w-1 h-4 bg-synos-primary rounded-full" />
                    <h2 className="text-xs font-black dark:text-zinc-400 text-zinc-650 tracking-wider uppercase">Pathology</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pathologyCards.map((card) => (
                        <DepartmentCard key={card.title} {...card} onAction={() => navigate(card.path)} cardStyle={cardStyle} cardClasses={cardClasses} />
                    ))}
                </div>
            </div>

            {/* Radiology Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-black/[0.05] dark:border-white/[0.05] pb-2">
                    <span className="w-1 h-4 bg-synos-primary rounded-full" />
                    <h2 className="text-xs font-black dark:text-zinc-400 text-zinc-650 tracking-wider uppercase">Radiology</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {radiologyCards.map((card) => (
                        <DepartmentCard key={card.title} {...card} onAction={() => navigate(card.path)} cardStyle={cardStyle} cardClasses={cardClasses} />
                    ))}
                </div>
            </div>

            {/* Financial Strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <MetricBox label="Total Tests" value={summary?.financials?.totalTestsDone} icon={Activity} cardStyle={cardStyle} cardClasses={cardClasses} />
                <MetricBox label="Collection" value={`₹ ${summary?.financials?.totalCollectionSales?.toLocaleString()}`} icon={TrendingUp} isCurrency cardStyle={cardStyle} cardClasses={cardClasses} />
                <MetricBox label="Referrals" value={`₹ ${summary?.financials?.referralPayouts?.toLocaleString()}`} icon={Wallet} isCurrency cardStyle={cardStyle} cardClasses={cardClasses} />
                <MetricBox label="Cash Flow" value={`₹ ${summary?.financials?.totalCashReceived?.toLocaleString()}`} icon={Banknote} isCurrency cardStyle={cardStyle} cardClasses={cardClasses} />
                <MetricBox label="Online Total" value={`₹ ${summary?.financials?.onlineReceived?.toLocaleString()}`} icon={TrendingUp} isCurrency cardStyle={cardStyle} cardClasses={cardClasses} />
                <MetricBox label="Net In-Hand" value={`₹ ${summary?.financials?.netCashInHand?.toLocaleString()}`} icon={IndianRupee} isCurrency highlight cardStyle={cardStyle} cardClasses={cardClasses} />
            </div>
        </div>
    );
}

function DepartmentCard({ title, subtitle, icon: Icon, data, btnText, onAction, cardStyle, cardClasses }) {
    return (
        <div 
            style={cardStyle}
            className={cn(
                "rounded-xl flex flex-col transition-[transform,opacity,box-shadow] duration-200 group overflow-hidden", 
                cardClasses, 
                "hover:scale-[1.01] hover:shadow-xl will-change-transform"
            )}
        >
            <div className="p-5 flex-1 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                        <Icon className="w-6 h-6 text-zinc-500 group-hover:text-synos-primary transition-colors" />
                        <div>
                            <h3 className="type-value !text-sm leading-none mb-1">{title}</h3>
                            <p className="type-meta">{data?.secondaryText || subtitle}</p>
                        </div>
                    </div>
                    {data?.status && (
                        <div className="flex items-center gap-1.5">
                            <div className={cn("w-1.5 h-1.5 rounded-full", data.status === 'On Track' ? 'bg-cyan-500' : 'bg-rose-500')} />
                            <span className="type-meta">{data.status}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-baseline gap-2 pt-2">
                    <span className="type-display !text-4xl leading-none">{data?.count || 0}</span>
                    <span className="type-label">{data?.primaryText || 'items pending'}</span>
                </div>
                <div className="space-y-2.5 min-h-[100px] border-t dark:border-white/5 border-black/5 pt-4">
                    {data?.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] group/item">
                            <span className="type-code">{item.name}</span>
                            <div className="flex items-center gap-3">
                                <span className="type-meta italic opacity-70">{item.detail}</span>
                                <div className="flex items-center gap-1.5">
                                    <div className={cn("w-1 h-1 rounded-full", item.statusBadge === 'Critical' ? 'bg-rose-500' : 'bg-zinc-400')} />
                                    <span className="type-meta">{item.statusBadge}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!data?.items || data.items.length === 0) && (
                        <div className="h-full flex items-center justify-center py-6">
                            <span className="type-section-header opacity-50">Standby</span>
                        </div>
                    )}
                </div>
            </div>
            <button onClick={onAction} className="w-full py-3 border-t dark:border-white/5 border-black/5 type-section-header hover:text-white hover:bg-synos-primary transition-[background-color,color] flex items-center justify-center gap-2">
                {btnText}
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
}

function MetricBox({ label, value, icon: Icon, isCurrency, highlight, cardStyle, cardClasses }) {
    return (
        <div 
            style={highlight ? undefined : cardStyle} 
            className={cn(
                "p-4 rounded-xl transition-[transform,opacity] duration-200 will-change-transform", 
                highlight ? 'bg-synos-primary/10 border border-synos-primary/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : cardClasses, 
                "hover:scale-[1.02]"
            )}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="type-label">{label}</span>
                <Icon className={cn("w-4 h-4", highlight ? 'text-synos-primary' : 'text-zinc-500')} />
            </div>
            <div className={cn("type-display !text-2xl", highlight && "text-synos-primary")}>
                {value ?? (isCurrency ? '₹ 0' : '0')}
            </div>
            <div className="type-meta mt-1 opacity-50">Reality Check</div>
        </div>
    );
}
