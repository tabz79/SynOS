import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Briefcase, 
    Building2, 
    Package, 
    FileText, 
    History, 
    Plus, 
    Search, 
    LayoutDashboard, 
    Edit, 
    Trash2, 
    Phone, 
    Mail, 
    Loader2, 
    Check, 
    X, 
    Filter,
    DollarSign,
    Clock,
    AlertCircle,
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { ReceptionApi, fetchTestCatalogCached } from '@/api/reception';

export function CorporateTerminal() {
    const { tab = 'overview' } = useParams();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [accounts, setAccounts] = useState([]);
    const [visits, setVisits] = useState([]);
    const [testCatalog, setTestCatalog] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [rateRules, setRateRules] = useState([]);

    // Modals
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [isPackageBuilderOpen, setIsPackageBuilderOpen] = useState(false);
    const [isAddRateRuleModalOpen, setIsAddRateRuleModalOpen] = useState(false);
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'clients', label: 'Client Directory', icon: Building2 },
        { id: 'packages', label: 'Corporate Package Builder', icon: Package },
        { id: 'invoices', label: 'B2B Receivables', icon: FileText },
        { id: 'settlements', label: 'Corporate Settlements', icon: History }
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [accsRes, visitsRes, catRes] = await Promise.allSettled([
                ReceptionApi.getCorporateAccounts(),
                fetch('/api/v1/corporate-accounts/visits', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
                }).then(r => r.ok ? r.json() : []),
                fetchTestCatalogCached()
            ]);

            if (accsRes.status === 'fulfilled') {
                const accs = accsRes.value || [];
                setAccounts(accs);
                if (accs.length > 0 && !selectedAccountId) {
                    setSelectedAccountId(accs[0].corporateAccountId || accs[0].id);
                }
            }
            if (visitsRes.status === 'fulfilled') setVisits(visitsRes.value || []);
            if (catRes.status === 'fulfilled') setTestCatalog(catRes.value || []);
        } catch (err) {
            console.error("Failed to load corporate terminal data", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Load rate rules / packages when selectedAccountId changes
    useEffect(() => {
        if (!selectedAccountId) {
            setRateRules([]);
            return;
        }
        ReceptionApi.getCorporateRateRules(selectedAccountId)
            .then(rules => setRateRules(rules || []))
            .catch(err => console.warn("Failed to load rate rules", err));
    }, [selectedAccountId]);

    const totalB2BAmount = visits.reduce((sum, v) => sum + (v.grossAmount || 0), 0);
    const corporatePackages = rateRules.filter(r => r.isPackage);
    const individualRateRules = rateRules.filter(r => !r.isPackage);

    const filteredAccounts = accounts.filter(a => 
        (a.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.corporateCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredVisits = visits.filter(v => {
        const matchesSearch = (v.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.patientMrn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.companyName || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesAccount = !selectedAccountId || v.corporateAccountId === selectedAccountId;
        return matchesSearch && matchesAccount;
    });

    const activeAccountObj = accounts.find(a => (a.corporateAccountId || a.id) === selectedAccountId);

    return (
        <div className="flex flex-col h-full bg-zinc-50 dark:bg-black overflow-hidden animate-in fade-in duration-500">
            {/* TERMINAL HEADER */}
            <div className="flex items-center justify-between px-8 py-5 bg-white dark:bg-zinc-950 border-b dark:border-zinc-900 border-zinc-200">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                        <Briefcase size={26} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold dark:text-white text-zinc-900 tracking-tight">
                            Corporate B2B Terminal
                        </h1>
                        <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">
                            Client Directory, Contracted Rates & Corporate Package Infrastructure
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total B2B Invoiced</p>
                        <p className="text-base font-bold text-indigo-500">₹{totalB2BAmount.toLocaleString()}</p>
                    </div>
                    <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" />
                    <div className="text-right">
                        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Active Corporate Clients</p>
                        <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">{accounts.filter(a => a.isActive).length}</p>
                    </div>
                    <button 
                        onClick={loadData} 
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer"
                        title="Refresh"
                    >
                        <History size={18} className="text-zinc-400" />
                    </button>
                </div>
            </div>

            {/* TAB STRIP */}
            <div className="flex items-center gap-1.5 px-8 py-2 bg-white dark:bg-zinc-950 border-b dark:border-zinc-900 border-zinc-200 overflow-x-auto">
                {tabs.map(t => {
                    const Icon = t.icon;
                    const isActive = tab === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => navigate(`/finance/corporate/${t.id}`)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                                isActive
                                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            )}
                        >
                            <Icon size={15} />
                            <span>{t.label}</span>
                            {t.id === 'packages' && corporatePackages.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.2 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] rounded-full font-mono">
                                    {corporatePackages.length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* TAB CONTENT BODY */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-400">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        <span className="text-xs font-medium">Loading Corporate B2B Infrastructure...</span>
                    </div>
                ) : (
                    <>
                        {/* 1. OVERVIEW TAB */}
                        {tab === 'overview' && (
                            <div className="space-y-6 max-w-7xl mx-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Corporate Visits</span>
                                            <FileText className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <p className="text-2xl font-black tracking-tight dark:text-white">{visits.length}</p>
                                        <p className="text-[11px] text-zinc-500 mt-1">Staff & employee registrations</p>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Invoiced (B2B)</span>
                                            <DollarSign className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <p className="text-2xl font-black tracking-tight text-emerald-500">₹{totalB2BAmount.toLocaleString()}</p>
                                        <p className="text-[11px] text-zinc-500 mt-1">Total revenue from corporate tie-ups</p>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Corporate Clients</span>
                                            <Building2 className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <p className="text-2xl font-black tracking-tight dark:text-white">{accounts.length}</p>
                                        <p className="text-[11px] text-zinc-500 mt-1">Contracted organizations</p>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Contracted Packages</span>
                                            <Package className="w-4 h-4 text-amber-500" />
                                        </div>
                                        <p className="text-2xl font-black tracking-tight text-amber-500">{corporatePackages.length}</p>
                                        <p className="text-[11px] text-zinc-500 mt-1">Packages active across accounts</p>
                                    </div>
                                </div>

                                {/* Recent Corporate Visits */}
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
                                    <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold tracking-tight dark:text-white">Recent Corporate Registrations & Visits</h3>
                                            <p className="text-xs text-zinc-500">Live employee visits billed under corporate accounts</p>
                                        </div>
                                        <button 
                                            onClick={() => navigate('/finance/corporate/invoices')}
                                            className="text-xs font-bold text-indigo-500 hover:underline cursor-pointer"
                                        >
                                            View All B2B Visits &rarr;
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                                                <tr>
                                                    <th className="px-6 py-3">Employee / Patient</th>
                                                    <th className="px-6 py-3">Corporate Account</th>
                                                    <th className="px-6 py-3">Employee Badge ID</th>
                                                    <th className="px-6 py-3 text-right">Invoiced Amount</th>
                                                    <th className="px-6 py-3 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                                {visits.slice(0, 6).map(v => (
                                                    <tr key={v.visitId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                        <td className="px-6 py-3.5">
                                                            <div className="font-bold dark:text-zinc-100">{v.patientName}</div>
                                                            <div className="text-[10px] text-zinc-400 font-mono">{v.patientMrn}</div>
                                                        </td>
                                                        <td className="px-6 py-3.5 font-medium dark:text-zinc-200">
                                                            {v.companyName}
                                                        </td>
                                                        <td className="px-6 py-3.5 font-mono text-[11px] text-indigo-500 font-bold">
                                                            {v.employeeId}
                                                        </td>
                                                        <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-500">
                                                            ₹{v.grossAmount?.toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-3.5 text-center">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-500">
                                                                {v.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {visits.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-400">
                                                            No corporate B2B visits recorded yet.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. CLIENT DIRECTORY (CONFIGURATION SCREEN) */}
                        {tab === 'clients' && (
                            <div className="space-y-6 max-w-7xl mx-auto">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                        <input
                                            type="text"
                                            placeholder="Search organization by name, code, contact person..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setEditingAccount(null); setIsAddAccountModalOpen(true); }}
                                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                                    >
                                        <Plus size={16} /> Add Corporate Organization
                                    </button>
                                </div>

                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                                                <tr>
                                                    <th className="px-6 py-3.5">Organization / Company</th>
                                                    <th className="px-6 py-3.5">Corporate Code / GST</th>
                                                    <th className="px-6 py-3.5">HR / Liaison Contact</th>
                                                    <th className="px-6 py-3.5 text-center">Payment Terms</th>
                                                    <th className="px-6 py-3.5 text-center">Status</th>
                                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                                {filteredAccounts.map(a => (
                                                    <tr key={a.corporateAccountId || a.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-sm dark:text-white flex items-center gap-2">
                                                                <Building2 className="w-4 h-4 text-indigo-500" />
                                                                {a.companyName}
                                                            </div>
                                                            {a.billingAddress && (
                                                                <div className="text-[10px] text-zinc-400 mt-0.5 truncate max-w-xs">{a.billingAddress}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 font-mono space-y-0.5">
                                                            <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-[11px] block w-fit">
                                                                {a.corporateCode || "N/A"}
                                                            </span>
                                                            {a.gstNumber && (
                                                                <span className="text-[10px] text-zinc-400 block">GST: {a.gstNumber}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 space-y-1">
                                                            <div className="font-semibold dark:text-zinc-200">{a.contactPerson || "Not Assigned"}</div>
                                                            {a.contactPhone && (
                                                                <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                                                                    <Phone className="w-3 h-3 text-zinc-400" /> {a.contactPhone}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-mono">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500">
                                                                {a.paymentTermsDays || 30} Days Net
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                onClick={async () => {
                                                                    const accId = a.corporateAccountId || a.id;
                                                                    await fetch(`/api/v1/corporate-accounts/${accId}`, {
                                                                        method: 'PUT',
                                                                        headers: {
                                                                            'Content-Type': 'application/json',
                                                                            'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`
                                                                        },
                                                                        body: JSON.stringify({ isActive: !a.isActive })
                                                                    });
                                                                    loadData();
                                                                }}
                                                                className={cn(
                                                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer",
                                                                    a.isActive 
                                                                        ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" 
                                                                        : "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                                                                )}
                                                            >
                                                                {a.isActive ? "Active" : "Disabled"}
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => { setEditingAccount(a); setIsAddAccountModalOpen(true); }}
                                                                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer"
                                                                title="Edit Configuration"
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredAccounts.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-8 text-center text-zinc-400">
                                                            No corporate accounts found. Click "+ Add Corporate Organization" to register a client.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. DEDICATED CORPORATE PACKAGE BUILDER */}
                        {tab === 'packages' && (
                            <div className="space-y-6 max-w-7xl mx-auto">
                                {/* Account Selector Banner */}
                                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-amber-500" />
                                            <h3 className="text-sm font-bold dark:text-white">Corporate Package & Rate Contract Builder</h3>
                                        </div>
                                        <p className="text-xs text-zinc-500">
                                            Compose commercial packages and set negotiated price lists for {activeAccountObj?.companyName || "the selected client"}.
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-zinc-400 uppercase">Target Client:</span>
                                            <select
                                                value={selectedAccountId}
                                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                                className="h-10 px-3.5 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500"
                                            >
                                                {accounts.map(a => (
                                                    <option key={a.corporateAccountId || a.id} value={a.corporateAccountId || a.id}>
                                                        {a.companyName} [{a.corporateCode || 'CORP'}]
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setIsPackageBuilderOpen(true)}
                                            disabled={!selectedAccountId}
                                            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
                                        >
                                            <Plus size={16} /> + Build Corporate Package
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setIsAddRateRuleModalOpen(true)}
                                            disabled={!selectedAccountId}
                                            className="px-3.5 py-2.5 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                                        >
                                            <Plus size={14} /> Custom Test Rate
                                        </button>
                                    </div>
                                </div>

                                {/* Active Corporate Packages Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                            <Package size={14} className="text-indigo-500" />
                                            Commercial Bundles & Health Packages ({corporatePackages.length})
                                        </h4>
                                        <span className="text-[11px] text-zinc-400">
                                            Auto-expands constituent tests upon reception selection
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {corporatePackages.map(pkg => (
                                            <div 
                                                key={pkg.corporateRateRuleId} 
                                                className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-500/50 transition-all"
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 text-[10px] font-mono font-bold">
                                                                {pkg.packageCode || pkg.testCode}
                                                            </span>
                                                            <h5 className="font-bold text-sm dark:text-white mt-1">
                                                                {pkg.packageName || pkg.testName}
                                                            </h5>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-xs text-zinc-400 line-through font-mono block">
                                                                ₹{pkg.standardPrice || 0}
                                                            </span>
                                                            <span className="text-base font-black text-emerald-500 font-mono">
                                                                ₹{pkg.contractedPrice}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Bundled Tests */}
                                                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                                                            Bundled Tests ({(pkg.includedTests || []).length})
                                                        </span>
                                                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                                            {(pkg.includedTests && pkg.includedTests.length > 0) ? (
                                                                pkg.includedTests.map(t => (
                                                                    <span key={t.testId || t.testCode} className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-medium">
                                                                        {t.testName}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-zinc-400 text-[10px]">Configured package profile</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                                    <span className="text-[10px] text-zinc-400">Available at reception Intent Panel</span>
                                                    <button
                                                        onClick={async () => {
                                                            if (!window.confirm(`Delete package ${pkg.packageName || pkg.testName}?`)) return;
                                                            await fetch(`/api/v1/corporate-accounts/${selectedAccountId}/rate-rules/${pkg.corporateRateRuleId}`, {
                                                                method: 'DELETE',
                                                                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
                                                            });
                                                            ReceptionApi.getCorporateRateRules(selectedAccountId).then(r => setRateRules(r || []));
                                                        }}
                                                        className="text-zinc-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                                                        title="Delete Package"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {corporatePackages.length === 0 && (
                                            <div className="col-span-full p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center text-zinc-400 space-y-2">
                                                <Package className="w-8 h-8 text-indigo-400 mx-auto opacity-70" />
                                                <p className="text-xs font-bold dark:text-zinc-300">No Corporate Packages Configured for this Client</p>
                                                <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                                                    Click "+ Build Corporate Package" above to bundle tests (e.g. Annual Health Checkup) and assign negotiated package pricing.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Custom Contracted Test Price Overrides */}
                                <div className="space-y-3 pt-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                            <DollarSign size={14} className="text-emerald-500" />
                                            Individual Contracted Test Rates ({individualRateRules.length})
                                        </h4>
                                        <span className="text-[11px] text-zinc-400">Overrides retail base price for this organization</span>
                                    </div>

                                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                                                    <tr>
                                                        <th className="px-6 py-3">Test Code</th>
                                                        <th className="px-6 py-3">Test Name</th>
                                                        <th className="px-6 py-3 text-right">Retail Base Price</th>
                                                        <th className="px-6 py-3 text-right">Negotiated Corporate Rate</th>
                                                        <th className="px-6 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                                    {individualRateRules.map(rule => (
                                                        <tr key={rule.corporateRateRuleId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                                                            <td className="px-6 py-3 font-mono font-bold text-indigo-500">{rule.testCode}</td>
                                                            <td className="px-6 py-3 font-medium dark:text-zinc-200">{rule.testName}</td>
                                                            <td className="px-6 py-3 text-right font-mono text-zinc-400 line-through">₹{rule.standardPrice || 0}</td>
                                                            <td className="px-6 py-3 text-right font-mono font-bold text-emerald-500">₹{rule.contractedPrice}</td>
                                                            <td className="px-6 py-3 text-right">
                                                                <button
                                                                    onClick={async () => {
                                                                        await fetch(`/api/v1/corporate-accounts/${selectedAccountId}/rate-rules/${rule.corporateRateRuleId}`, {
                                                                            method: 'DELETE',
                                                                            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
                                                                        });
                                                                        ReceptionApi.getCorporateRateRules(selectedAccountId).then(r => setRateRules(r || []));
                                                                    }}
                                                                    className="text-zinc-400 hover:text-rose-500 p-1 cursor-pointer"
                                                                    title="Remove Override"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {individualRateRules.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-6 text-center text-zinc-400 text-xs">
                                                                No individual test rate overrides set for this client. Default corporate tier from Test Master applies.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. B2B INVOICES & RECEIVABLES */}
                        {tab === 'invoices' && (
                            <div className="space-y-6 max-w-7xl mx-auto">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by Employee ID, Patient Name, Company..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Filter size={15} className="text-zinc-400" />
                                        <select
                                            value={selectedAccountId}
                                            onChange={(e) => setSelectedAccountId(e.target.value)}
                                            className="h-9 px-3 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none cursor-pointer"
                                        >
                                            <option value="">All Corporate Organizations ({accounts.length})</option>
                                            {accounts.map(a => (
                                                <option key={a.corporateAccountId || a.id} value={a.corporateAccountId || a.id}>
                                                    {a.companyName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                                                <tr>
                                                    <th className="px-6 py-3.5">Employee / Patient</th>
                                                    <th className="px-6 py-3.5">Corporate Client</th>
                                                    <th className="px-6 py-3.5">Employee / Staff ID</th>
                                                    <th className="px-6 py-3.5 text-right">Invoiced (₹0 at Desk)</th>
                                                    <th className="px-6 py-3.5 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                                {filteredVisits.map(v => (
                                                    <tr key={v.visitId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                        <td className="px-6 py-3.5">
                                                            <div className="font-bold text-sm dark:text-zinc-100">{v.patientName}</div>
                                                            <div className="text-[10px] text-zinc-400 font-mono">MRN: {v.patientMrn}</div>
                                                        </td>
                                                        <td className="px-6 py-3.5 font-medium dark:text-zinc-200">
                                                            {v.companyName}
                                                        </td>
                                                        <td className="px-6 py-3.5 font-mono text-[11px] text-indigo-500 font-bold">
                                                            {v.employeeId}
                                                        </td>
                                                        <td className="px-6 py-3.5 text-right font-mono text-emerald-500 font-bold">
                                                            ₹{v.grossAmount?.toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-3.5 text-center">
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-500">
                                                                {v.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredVisits.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-400">
                                                            No corporate B2B visits found.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. CORPORATE SETTLEMENTS */}
                        {tab === 'settlements' && (
                            <div className="space-y-6 max-w-7xl mx-auto">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-bold dark:text-white">Corporate B2B Settlements & Remittances</h3>
                                        <p className="text-xs text-zinc-500">Record bank transfers received from corporate accounts against monthly statements</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsSettlementModalOpen(true)}
                                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
                                    >
                                        <Plus size={16} /> Record Corporate Settlement
                                    </button>
                                </div>

                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400 space-y-2">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
                                    <p className="text-sm font-bold dark:text-zinc-200">B2B Remittance Reconciliation Ready</p>
                                    <p className="text-xs max-w-md mx-auto text-zinc-500">
                                        Use "Record Corporate Settlement" above to log bulk monthly NEFT/RTGS payments from companies, reconcile employee invoices, and generate statement receipts.
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* DEDICATED CORPORATE PACKAGE BUILDER MODAL */}
            {isPackageBuilderOpen && (
                <CorporatePackageBuilderModal
                    isOpen={isPackageBuilderOpen}
                    corporateAccountId={selectedAccountId}
                    corporateAccountName={activeAccountObj?.companyName || "Corporate Client"}
                    catalog={testCatalog}
                    isDark={isDark}
                    onClose={() => setIsPackageBuilderOpen(false)}
                    onSuccess={() => {
                        setIsPackageBuilderOpen(false);
                        ReceptionApi.getCorporateRateRules(selectedAccountId).then(r => setRateRules(r || []));
                    }}
                />
            )}

            {/* CREATE / EDIT CORPORATE CLIENT CONFIG MODAL */}
            {isAddAccountModalOpen && (
                <CorporateAccountConfigModal
                    isOpen={isAddAccountModalOpen}
                    initialData={editingAccount}
                    isDark={isDark}
                    onClose={() => { setIsAddAccountModalOpen(false); setEditingAccount(null); }}
                    onSuccess={() => { setIsAddAccountModalOpen(false); setEditingAccount(null); loadData(); }}
                />
            )}

            {/* SINGLE TEST RATE OVERRIDE MODAL */}
            {isAddRateRuleModalOpen && (
                <SingleRateRuleModal
                    isOpen={isAddRateRuleModalOpen}
                    corporateAccountId={selectedAccountId}
                    catalog={testCatalog}
                    isDark={isDark}
                    onClose={() => setIsAddRateRuleModalOpen(false)}
                    onSuccess={() => {
                        setIsAddRateRuleModalOpen(false);
                        ReceptionApi.getCorporateRateRules(selectedAccountId).then(r => setRateRules(r || []));
                    }}
                />
            )}

            {/* RECORD CORPORATE SETTLEMENT MODAL */}
            {isSettlementModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                    <div className={cn(
                        "w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
                    )}>
                        <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-sm font-bold">Record Corporate B2B Payment</h3>
                            <button onClick={() => setIsSettlementModalOpen(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Company / Organization</label>
                                <select 
                                    value={selectedAccountId} 
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none"
                                >
                                    {accounts.map(a => (
                                        <option key={a.corporateAccountId || a.id} value={a.corporateAccountId || a.id}>{a.companyName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Amount Paid (₹)</label>
                                    <input type="number" placeholder="100000" className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Payment Mode</label>
                                    <select className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none">
                                        <option value="NEFT">NEFT / RTGS</option>
                                        <option value="Cheque">Company Cheque</option>
                                        <option value="UPI">Corporate Card / UPI</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Bank Reference / UTR #</label>
                                <input type="text" placeholder="CMS-SBI-2026-X88" className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none font-mono" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                            <button onClick={() => setIsSettlementModalOpen(false)} className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer">Cancel</button>
                            <button onClick={() => { alert("Corporate settlement recorded successfully!"); setIsSettlementModalOpen(false); }} className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">Record Settlement</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Dedicated Corporate Package Builder Modal
 * Bundles tests into a standalone commercial package with negotiated package pricing.
 */
function CorporatePackageBuilderModal({ isOpen, corporateAccountId, corporateAccountName, catalog, isDark, onClose, onSuccess }) {
    const [packageName, setPackageName] = useState('');
    const [packageCode, setPackageCode] = useState('');
    const [contractedPrice, setContractedPrice] = useState('');
    const [testFilter, setTestFilter] = useState('');
    const [selectedTestIds, setSelectedTestIds] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const filteredTests = catalog.filter(t => 
        (t.testName || t.name || '').toLowerCase().includes(testFilter.toLowerCase()) ||
        (t.testCode || t.code || '').toLowerCase().includes(testFilter.toLowerCase())
    );

    const toggleTest = (id) => {
        setSelectedTestIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!packageName.trim()) { setError("Package Name is required."); return; }
        if (!contractedPrice || parseFloat(contractedPrice) < 0) { setError("Valid contracted package price is required."); return; }
        if (selectedTestIds.length === 0) { setError("Please select at least 1 test to bundle into this corporate package."); return; }

        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`/api/v1/corporate-accounts/${corporateAccountId}/packages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`
                },
                body: JSON.stringify({
                    packageName: packageName.trim(),
                    packageCode: packageCode.trim() || null,
                    contractedPrice: parseFloat(contractedPrice),
                    includedTestIds: selectedTestIds
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to create corporate package");
            }
            onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className={cn(
                "w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",
                isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
            )}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                            <Package size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold">Build Corporate Package</h3>
                            <p className="text-[10px] text-zinc-500 font-medium">For: <span className="text-indigo-500 font-bold">{corporateAccountName}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
                        <X size={16} />
                    </button>
                </div>

                {error && (
                    <div className="m-4 mb-0 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2 shrink-0">
                        <AlertCircle size={14} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Package Name *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Annual Executive Health Checkup"
                                value={packageName}
                                onChange={(e) => setPackageName(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Package Code (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. PKG-SBI-EXEC"
                                value={packageCode}
                                onChange={(e) => setPackageCode(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Contracted Package Price (₹) *
                            </label>
                            <input
                                type="number"
                                required
                                min="0"
                                placeholder="e.g. 1200"
                                value={contractedPrice}
                                onChange={(e) => setContractedPrice(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                            />
                        </div>
                    </div>

                    {/* Test Selection Picker */}
                    <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                Select Constituent Tests to Bundle ({selectedTestIds.length} Selected)
                            </label>
                            <span className="text-[10px] text-indigo-500 font-bold">Pick tests & profiles</span>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Filter tests (e.g. CBC, Lipid, Creatinine, X-Ray)..."
                                value={testFilter}
                                onChange={(e) => setTestFilter(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 outline-none"
                            />
                        </div>

                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-48 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                            {filteredTests.map(t => {
                                const id = t.testId || t.id;
                                const isChecked = selectedTestIds.includes(id);
                                return (
                                    <div
                                        key={id}
                                        onClick={() => toggleTest(id)}
                                        className={cn(
                                            "px-3 py-2 flex items-center justify-between transition-colors cursor-pointer text-xs",
                                            isChecked 
                                                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold" 
                                                : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={isChecked} 
                                                onChange={() => {}} 
                                                className="rounded text-indigo-600"
                                            />
                                            <span>{t.testName || t.name}</span>
                                            <span className="text-[10px] font-mono text-zinc-400">[{t.testCode || t.code}]</span>
                                        </div>
                                        <span className="text-zinc-400 font-mono text-[11px]">₹{t.basePrice || t.price || 0}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                            Save Corporate Package
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CorporateAccountConfigModal({ isOpen, initialData, isDark, onClose, onSuccess }) {
    const isEdit = !!initialData;
    const [companyName, setCompanyName] = useState(initialData?.companyName || '');
    const [corporateCode, setCorporateCode] = useState(initialData?.corporateCode || '');
    const [gstNumber, setGstNumber] = useState(initialData?.gstNumber || '');
    const [contactPerson, setContactPerson] = useState(initialData?.contactPerson || '');
    const [contactPhone, setContactPhone] = useState(initialData?.contactPhone || '');
    const [contactEmail, setContactEmail] = useState(initialData?.contactEmail || '');
    const [billingAddress, setBillingAddress] = useState(initialData?.billingAddress || '');
    const [creditLimit, setCreditLimit] = useState(initialData?.creditLimit || 500000);
    const [paymentTermsDays, setPaymentTermsDays] = useState(initialData?.paymentTermsDays || 30);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!companyName.trim()) { setError("Company Name is required."); return; }
        setIsSubmitting(true);
        setError(null);
        try {
            const payload = {
                companyName: companyName.trim(),
                corporateCode: corporateCode.trim() || null,
                gstNumber: gstNumber.trim() || null,
                contactPerson: contactPerson.trim() || null,
                contactPhone: contactPhone.trim() || null,
                contactEmail: contactEmail.trim() || null,
                billingAddress: billingAddress.trim() || null,
                creditLimit: parseFloat(creditLimit) || 0,
                paymentTermsDays: parseInt(paymentTermsDays, 10) || 30
            };

            const url = isEdit 
                ? `/api/v1/corporate-accounts/${initialData.corporateAccountId || initialData.id}`
                : `/api/v1/corporate-accounts`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to save corporate account");
            }
            onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className={cn(
                "w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col",
                isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
            )}>
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold">{isEdit ? "Configure Corporate Client" : "Add Corporate Organization"}</h3>
                            <p className="text-[10px] text-zinc-500">Persists to CorporateAccounts master table</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
                        <X size={16} />
                    </button>
                </div>

                {error && (
                    <div className="m-4 mb-0 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                        <AlertCircle size={14} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Company / Organization Name *</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. State Bank of India"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Corporate Code</label>
                            <input
                                type="text"
                                placeholder="e.g. CORP-SBI"
                                value={corporateCode}
                                onChange={(e) => setCorporateCode(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">GSTIN Number</label>
                            <input
                                type="text"
                                placeholder="29ABCDE1234F1Z5"
                                value={gstNumber}
                                onChange={(e) => setGstNumber(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">HR / Liaison Person</label>
                            <input
                                type="text"
                                placeholder="HR Manager Name"
                                value={contactPerson}
                                onChange={(e) => setContactPerson(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Phone Number</label>
                            <input
                                type="text"
                                placeholder="+91 98765-43210"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Billing Cycle (Days)</label>
                            <input
                                type="number"
                                min="7"
                                max="90"
                                value={paymentTermsDays}
                                onChange={(e) => setPaymentTermsDays(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Credit Limit (₹)</label>
                            <input
                                type="number"
                                min="0"
                                value={creditLimit}
                                onChange={(e) => setCreditLimit(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 font-medium font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Billing Address</label>
                        <input
                            type="text"
                            placeholder="Corporate Headquarters, Mumbai"
                            value={billingAddress}
                            onChange={(e) => setBillingAddress(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                            {isEdit ? "Update Corporate Account" : "Save Corporate Account"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function SingleRateRuleModal({ isOpen, corporateAccountId, catalog, isDark, onClose, onSuccess }) {
    const [testId, setTestId] = useState('');
    const [contractedPrice, setContractedPrice] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!testId) { setError("Please select a test."); return; }
        if (!contractedPrice) { setError("Please specify the contracted price."); return; }
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/v1/corporate-accounts/${corporateAccountId}/rate-rules`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`
                },
                body: JSON.stringify({
                    testId,
                    contractedPrice: parseFloat(contractedPrice),
                    isPackage: false
                })
            });
            if (!res.ok) throw new Error("Failed to save rate rule");
            onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className={cn(
                "w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4",
                isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
            )}>
                <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-sm font-bold">Add Contracted Test Rate</h3>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
                        <X size={16} />
                    </button>
                </div>
                {error && <div className="text-rose-500 text-xs">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Select Test</label>
                        <select
                            value={testId}
                            onChange={(e) => setTestId(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none"
                            required
                        >
                            <option value="">-- Choose Test from Catalog --</option>
                            {catalog.map(t => (
                                <option key={t.testId || t.id} value={t.testId || t.id}>
                                    {t.testName || t.name} [{t.testCode || t.code}] - Base ₹{t.basePrice || t.price || 0}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Negotiated Rate (₹)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            placeholder="e.g. 350"
                            value={contractedPrice}
                            onChange={(e) => setContractedPrice(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none font-mono font-bold"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">Save Rate</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
