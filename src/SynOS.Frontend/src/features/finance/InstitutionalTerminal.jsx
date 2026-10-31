import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ShieldCheck, 
    Briefcase, 
    Building2, 
    FileText, 
    Package, 
    ArrowDownLeft, 
    History, 
    LayoutDashboard,
    ArrowUpRight,
    Search,
    IndianRupee,
    TrendingUp,
    Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { InsuranceTerminal } from './InsuranceTerminal';
import { CorporateTerminal } from './CorporateTerminal';
import { ReceptionApi } from '@/api/reception';

export function InstitutionalTerminal() {
    const { tab = 'overview' } = useParams();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [stats, setStats] = useState({
        insuranceCount: 0,
        corporateCount: 0,
        pendingClaimsCount: 0,
        totalInstitutionalReceivables: 0
    });
    const [loading, setLoading] = useState(true);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'empanelment', label: 'Insurance Empanelment', icon: ShieldCheck },
        { id: 'claims', label: 'Cashless Claims', icon: FileText },
        { id: 'clients', label: 'Corporate Clients', icon: Briefcase },
        { id: 'packages', label: 'Corporate Packages', icon: Package },
        { id: 'receivables', label: 'Receivables & Aging', icon: ArrowDownLeft },
        { id: 'settlements', label: 'Settlements', icon: History }
    ];

    useEffect(() => {
        const loadStats = async () => {
            try {
                setLoading(true);
                const [insurers, corporates] = await Promise.allSettled([
                    ReceptionApi.getInsuranceCompanies(),
                    ReceptionApi.getCorporateAccounts()
                ]);
                const insList = insurers.status === 'fulfilled' && Array.isArray(insurers.value) ? insurers.value : [];
                const corpList = corporates.status === 'fulfilled' && Array.isArray(corporates.value) ? corporates.value : [];

                setStats({
                    insuranceCount: insList.length,
                    corporateCount: corpList.length,
                    pendingClaimsCount: 0,
                    totalInstitutionalReceivables: 0
                });
            } catch (e) {
                console.error("Failed to load institutional overview stats:", e);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    // Render delegated components for child tabs
    if (tab === 'empanelment' || tab === 'claims') {
        return <InsuranceTerminal forcedTab={tab} />;
    }

    if (tab === 'clients' || tab === 'packages') {
        return <CorporateTerminal forcedTab={tab} />;
    }

    if (tab === 'receivables') {
        // Render Insurance or Corporate receivables with toggle
        return <InstitutionalReceivablesCombined />;
    }

    if (tab === 'settlements') {
        return <InstitutionalSettlementsCombined />;
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header / Command Strip */}
            <div className="px-8 py-5 border-b border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                                Corporate & Insurance
                            </h1>
                            <p className="text-xs text-zinc-500 font-medium">
                                Unified Institutional Desk: Cashless Insurance Claims, TPA Empanelment, and Corporate Tie-Ups
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sub-navigation tabs */}
                <div className="flex items-center bg-slate-200/60 dark:bg-zinc-800/80 p-1 rounded-xl overflow-x-auto scrollbar-thin">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => navigate(`/finance/institutional/${t.id}`)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                                tab === t.id
                                    ? "bg-white dark:bg-zinc-700 text-synos-primary shadow-xs"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                        >
                            <t.icon className="w-3.5 h-3.5" />
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar">
                {/* High-Level Institutional KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
                        <div className="text-xs font-black uppercase tracking-wider text-blue-500">Empanelled Insurers</div>
                        <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{stats.insuranceCount}</div>
                        <div className="text-xs text-zinc-500 font-medium mt-0.5">Active TPA & Insurance Networks</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
                        <div className="text-xs font-black uppercase tracking-wider text-indigo-500">Corporate Clients</div>
                        <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{stats.corporateCount}</div>
                        <div className="text-xs text-zinc-500 font-medium mt-0.5">Contracted Companies & Groups</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
                        <div className="text-xs font-black uppercase tracking-wider text-amber-500">Billing Modality</div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">Cashless & B2B</div>
                        <div className="text-xs text-zinc-500 font-medium mt-0.5">Pre-Auth Claims & Monthly Invoices</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
                        <div className="text-xs font-black uppercase tracking-wider text-emerald-500">Counter Desk Mode</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹0 Desk Claim</div>
                        <div className="text-xs text-zinc-500 font-medium mt-0.5">Billed to Institutional Ledger</div>
                    </div>
                </div>

                {/* Split Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Card 1: Insurance & TPA */}
                    <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                        Insurance & Cashless TPA
                                    </h3>
                                    <p className="text-xs text-zinc-500 font-medium">
                                        Empanelled insurers, cashless claim submissions, and pre-auth tracking
                                    </p>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            Configure insurance companies, TPA codes, co-pay policies, and handle reception cashless authorizations. Track claim submission packets and settlement aging.
                        </p>

                        <div className="flex items-center gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => navigate('/finance/institutional/empanelment')}
                                className="flex-1 py-2.5 px-3 rounded-xl border border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                                <Building2 className="w-3.5 h-3.5" /> Empanelment Master
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/finance/institutional/claims')}
                                className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                            >
                                <FileText className="w-3.5 h-3.5" /> Cashless Claims
                            </button>
                        </div>
                    </div>

                    {/* Card 2: Corporate B2B */}
                    <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                        Corporate B2B Contracts
                                    </h3>
                                    <p className="text-xs text-zinc-500 font-medium">
                                        Corporate clients, customized health packages, and contracted tariffs
                                    </p>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            Manage tie-up companies, employee checkup packages, bespoke contracted rate cards, and batch invoicing for periodic corporate receivables settlement.
                        </p>

                        <div className="flex items-center gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => navigate('/finance/institutional/clients')}
                                className="flex-1 py-2.5 px-3 rounded-xl border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                                <Building2 className="w-3.5 h-3.5" /> Client Accounts
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/finance/institutional/packages')}
                                className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                            >
                                <Package className="w-3.5 h-3.5" /> Health Packages
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InstitutionalReceivablesCombined() {
    const [subTab, setSubTab] = useState('insurance'); // 'insurance' | 'corporate'
    return (
        <div className="flex flex-col h-full">
            <div className="px-8 pt-4 pb-2 flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40">
                <span className="text-xs font-bold text-zinc-500 mr-2">Institutional Ledger:</span>
                <button
                    type="button"
                    onClick={() => setSubTab('insurance')}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        subTab === 'insurance'
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                    )}
                >
                    TPA & Insurance Receivables
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab('corporate')}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        subTab === 'corporate'
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                    )}
                >
                    Corporate Client Receivables
                </button>
            </div>
            <div className="flex-1 min-h-0">
                {subTab === 'insurance' ? (
                    <InsuranceTerminal forcedTab="receivables" />
                ) : (
                    <CorporateTerminal forcedTab="invoices" />
                )}
            </div>
        </div>
    );
}

function InstitutionalSettlementsCombined() {
    const [subTab, setSubTab] = useState('insurance'); // 'insurance' | 'corporate'
    return (
        <div className="flex flex-col h-full">
            <div className="px-8 pt-4 pb-2 flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40">
                <span className="text-xs font-bold text-zinc-500 mr-2">Settlement Ledger:</span>
                <button
                    type="button"
                    onClick={() => setSubTab('insurance')}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        subTab === 'insurance'
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                    )}
                >
                    Insurance Remittances
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab('corporate')}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        subTab === 'corporate'
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                    )}
                >
                    Corporate Settlements
                </button>
            </div>
            <div className="flex-1 min-h-0">
                {subTab === 'insurance' ? (
                    <InsuranceTerminal forcedTab="settlements" />
                ) : (
                    <CorporateTerminal forcedTab="settlements" />
                )}
            </div>
        </div>
    );
}
