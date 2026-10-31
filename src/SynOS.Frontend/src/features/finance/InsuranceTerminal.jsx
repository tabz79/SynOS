import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ShieldCheck, 
    Building2, 
    FileText, 
    ArrowDownLeft, 
    History, 
    Plus, 
    Search, 
    LayoutDashboard, 
    Edit, 
    CheckCircle2, 
    XCircle, 
    Phone, 
    Mail, 
    Loader2, 
    Check, 
    X, 
    Filter,
    DollarSign,
    Clock,
    AlertCircle,
    Printer,
    Download,
    Package
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { ReceptionApi } from '@/api/reception';
import { FinancePrintableSummaryModal } from './components/FinancePrintableSummaryModal';
import { CommercialDocumentViewer } from './components/documents/CommercialDocumentViewer';
import { DynamicDocumentRenderer } from './components/documents/DynamicDocumentRenderer';
import { CorporateTerminal } from './CorporateTerminal';

export function InsuranceTerminal({ forcedTab }) {
    const { tab: paramTab = 'overview' } = useParams();
    const tab = forcedTab || paramTab;
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [companies, setCompanies] = useState([]);
    const [claims, setClaims] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('ALL');

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'empanelment', label: 'Insurance Companies', icon: Building2 },
        { id: 'packages', label: 'Packages & Pricing', icon: Package },
        { id: 'claims', label: 'Claims', icon: FileText },
        { id: 'receivables', label: 'Pending Dues', icon: ArrowDownLeft },
        { id: 'settlements', label: 'Settlements', icon: History }
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [compsRes, claimsRes] = await Promise.allSettled([
                ReceptionApi.getInsuranceCompanies(),
                fetch('/api/v1/insurance-companies/claims', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
                }).then(r => r.ok ? r.json() : [])
            ]);

            if (compsRes.status === 'fulfilled') setCompanies(compsRes.value || []);
            if (claimsRes.status === 'fulfilled') setClaims(claimsRes.value || []);
        } catch (err) {
            console.error("Failed to load insurance terminal data", err);
        } finally {
            setIsLoading(false);
        }
    };

    const totalClaimsAmount = claims.reduce((sum, c) => sum + (c.claimAmount || 0), 0);
    const totalCoPayCollected = claims.reduce((sum, c) => sum + (c.coPayAmount || 0), 0);
    const pendingClaimsCount = claims.filter(c => c.status !== 'Paid' && c.status !== 'Settled').length;

    const filteredCompanies = companies.filter(c => 
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.tpaName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredClaims = claims.filter(c => {
        const matchesSearch = (c.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.patientMrn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.policyNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.preAuthApprovalNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.insuranceCompanyName || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesComp = selectedCompanyFilter === 'ALL' || c.insuranceCompanyId === selectedCompanyFilter;
        return matchesSearch && matchesComp;
    });

    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);
    const [activeClaimForPrint, setActiveClaimForPrint] = useState(null);

    const handleDownloadTabSummary = () => {
        let headers = [];
        let rows = [];
        let filename = `synos_insurance_${tab}_${new Date().toISOString().slice(0, 10)}.csv`;

        if (tab === 'empanelment') {
            headers = ["Company Name", "Code", "TPA / Network", "Contact Person", "Phone", "Email", "Pre-Auth Required", "Status"];
            rows = filteredCompanies.map(c => [
                `"${(c.name || '').replace(/"/g, '""')}"`,
                `"${c.code || ''}"`,
                `"${(c.tpaName || '').replace(/"/g, '""')}"`,
                `"${(c.contactPerson || '').replace(/"/g, '""')}"`,
                `"${c.phone || ''}"`,
                `"${c.email || ''}"`,
                c.preAuthRequired ? "Yes" : "No",
                c.isActive ? "Active" : "Inactive"
            ]);
        } else if (tab === 'claims' || tab === 'receivables') {
            headers = ["Visit / Claim Ref", "Date", "Patient Name", "UHID", "Insurance Company", "TPA", "Policy No", "Pre-Auth No", "Claim Amount (INR)", "Desk Co-Pay (INR)", "Status"];
            rows = filteredClaims.map(c => [
                `"${c.visitToken || c.token || ''}"`,
                `"${new Date(c.occurredAt || c.date || Date.now()).toLocaleDateString()}"`,
                `"${(c.patientName || '').replace(/"/g, '""')}"`,
                `"${c.patientMrn || ''}"`,
                `"${(c.insuranceCompanyName || '').replace(/"/g, '""')}"`,
                `"${(c.tpaName || '').replace(/"/g, '""')}"`,
                `"${c.policyNumber || ''}"`,
                `"${c.preAuthApprovalNumber || ''}"`,
                c.claimAmount || 0,
                c.coPayAmount || 0,
                `"${c.status || 'Pending'}"`
            ]);
        } else {
            headers = ["Visit / Claim Ref", "Date", "Patient Name", "Insurance Company", "Claim Amount (INR)", "Desk Co-Pay (INR)", "Status"];
            rows = filteredClaims.map(c => [
                `"${c.visitToken || c.token || ''}"`,
                `"${new Date(c.occurredAt || c.date || Date.now()).toLocaleDateString()}"`,
                `"${(c.patientName || '').replace(/"/g, '""')}"`,
                `"${(c.insuranceCompanyName || '').replace(/"/g, '""')}"`,
                c.claimAmount || 0,
                c.coPayAmount || 0,
                `"${c.status || 'Pending'}"`
            ]);
        }

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getPrintSummaryConfig = () => {
        if (tab === 'empanelment') {
            return {
                title: "Insurance & TPA Empanelment Master Directory",
                subtitle: "Cashless insurance providers, TPA intermediaries & pre-authorization protocols",
                categoryLabel: "INSURANCE EMPANELMENT DIRECTORY",
                kpis: [
                    { label: "Empanelled Insurers", value: companies.length, subtext: "Master Directory" },
                    { label: "Active Network TPAs", value: companies.filter(c => c.isActive).length, color: "text-emerald-600", subtext: "Operational Cashless" },
                    { label: "Pre-Auth Mandatory", value: companies.filter(c => c.preAuthRequired).length, color: "text-blue-600", subtext: "Strict Desk Validation" }
                ],
                columns: [
                    { key: 'name', label: 'Insurance Provider' },
                    { key: 'code', label: 'Code', render: (v) => v || '-' },
                    { key: 'tpaName', label: 'TPA Network', render: (v) => v || 'Direct Cashless' },
                    { key: 'contactPerson', label: 'Desk Officer', render: (v) => v || '-' },
                    { key: 'phone', label: 'Helpline Phone', render: (v) => v || '-' },
                    { key: 'preAuthRequired', label: 'Pre-Auth Rule', align: 'center', render: (v) => v ? 'Mandatory' : 'Optional' },
                    { key: 'isActive', label: 'Status', align: 'center', render: (v) => v ? 'Active' : 'Inactive' }
                ],
                data: filteredCompanies,
                summaryTotals: {}
            };
        } else if (tab === 'claims' || tab === 'receivables') {
            const sumClaim = filteredClaims.reduce((s, c) => s + (Number(c.claimAmount) || 0), 0);
            const sumCopay = filteredClaims.reduce((s, c) => s + (Number(c.coPayAmount) || 0), 0);
            return {
                title: tab === 'receivables' ? "TPA Cashless Receivables Ledger" : "Insurance Cashless Claims & Pre-Auths Ledger",
                subtitle: "Cashless diagnostic claims, patient desk co-pay & insurance settlement balances",
                categoryLabel: "CASHLESS CLAIMS AUDIT",
                kpis: [
                    { label: "Total Claims Value", value: `₹${sumClaim.toLocaleString()}`, color: "text-blue-600", subtext: `${filteredClaims.length} Cashless Claims` },
                    { label: "Desk Co-Pay Collected", value: `₹${sumCopay.toLocaleString()}`, color: "text-emerald-600", subtext: "Patient Counter Share" },
                    { label: "Pending Claims", value: filteredClaims.filter(c => c.status !== 'Paid' && c.status !== 'Settled').length, color: "text-amber-600", subtext: "Under TPA Review" }
                ],
                columns: [
                    { key: 'visitToken', label: 'Token / Claim Ref', render: (v, r) => v || r.token || '-' },
                    { key: 'occurredAt', label: 'Date', render: (v, r) => new Date(v || r.date || Date.now()).toLocaleDateString() },
                    { key: 'patientName', label: 'Patient Name' },
                    { key: 'insuranceCompanyName', label: 'Insurer / TPA', render: (v, r) => r.tpaName ? `${v} (${r.tpaName})` : v },
                    { key: 'policyNumber', label: 'Policy / Card No', render: (v) => v || '-' },
                    { key: 'preAuthApprovalNumber', label: 'Pre-Auth Approval', render: (v) => v || 'Counter' },
                    { key: 'claimAmount', label: 'Claim (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'coPayAmount', label: 'Co-Pay (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'status', label: 'Status', align: 'center', render: (v) => v || 'Pending' }
                ],
                data: filteredClaims,
                summaryTotals: {
                    claimAmount: `₹${sumClaim.toLocaleString()}`,
                    coPayAmount: `₹${sumCopay.toLocaleString()}`
                }
            };
        } else {
            return {
                title: "Insurance & TPA Operations Executive Summary",
                subtitle: "Consolidated cashless claim throughput, desk co-pay, and empanelled networks",
                categoryLabel: "INSURANCE EXECUTIVE AUDIT",
                kpis: [
                    { label: "Total Claims Value", value: `₹${totalClaimsAmount.toLocaleString()}`, color: "text-blue-600", subtext: `${claims.length} Total Claims` },
                    { label: "Desk Co-Pay Collected", value: `₹${totalCoPayCollected.toLocaleString()}`, color: "text-emerald-600", subtext: "Physical Desk Intake" },
                    { label: "Active Empanelled TPAs", value: companies.filter(c => c.isActive).length, color: "text-zinc-900", subtext: "Approved Intermediaries" }
                ],
                columns: [
                    { key: 'visitToken', label: 'Token', render: (v, r) => v || r.token || '-' },
                    { key: 'occurredAt', label: 'Date', render: (v, r) => new Date(v || r.date || Date.now()).toLocaleDateString() },
                    { key: 'patientName', label: 'Patient Name' },
                    { key: 'insuranceCompanyName', label: 'Insurance Provider' },
                    { key: 'claimAmount', label: 'Claim (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'coPayAmount', label: 'Co-Pay (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'status', label: 'Status', align: 'center', render: (v) => v || 'Pending' }
                ],
                data: filteredClaims,
                summaryTotals: {
                    claimAmount: `₹${totalClaimsAmount.toLocaleString()}`,
                    coPayAmount: `₹${totalCoPayCollected.toLocaleString()}`
                }
            };
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden animate-in fade-in duration-500">
            {/* TERMINAL HEADER (UNBOXED NATIVE CANVAS STYLE) */}
            <div className="px-8 pt-8 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight">
                            Insurance
                        </h1>
                        <p className="text-xs text-zinc-500 font-medium mt-0.5">
                            Insurance companies, packages, claims, and settlements
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-3 bg-slate-200/50 dark:bg-zinc-800/60 p-1.5 px-3 rounded-xl border border-slate-300/40 dark:border-zinc-700/40">
                        <div className="text-right">
                            <p className="text-xs text-zinc-500 uppercase font-black tracking-wider block">Total Claims</p>
                            <p className="text-xs font-black text-blue-600 dark:text-blue-400">₹{totalClaimsAmount.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700" />
                        <div className="text-right">
                            <p className="text-xs text-zinc-500 uppercase font-black tracking-wider block">Co-Pay</p>
                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">₹{totalCoPayCollected.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700" />
                        <div className="text-right">
                            <p className="text-xs text-zinc-500 uppercase font-black tracking-wider block">Active TPAs</p>
                            <p className="text-xs font-black text-zinc-900 dark:text-zinc-100">{companies.filter(c => c.isActive).length}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadTabSummary}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-zinc-700 shadow-sm cursor-pointer"
                            title="Download CSV for current tab"
                        >
                            <Download size={14} className="text-zinc-500" />
                            <span>Download Summary</span>
                        </button>

                        <button
                            onClick={() => setIsPrintSummaryOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-synos-primary text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:brightness-105 cursor-pointer"
                            title="Print official A4 summary for current tab"
                        >
                            <Printer size={14} />
                            <span>Print Summary</span>
                        </button>

                        <button 
                            onClick={loadData} 
                            className="p-2 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 rounded-xl transition-all cursor-pointer"
                            title="Refresh"
                        >
                            <History size={16} className="text-zinc-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* TAB NAVIGATION (SEGMENTED PILL ON NATIVE CANVAS) */}
            <div className="px-8 pb-2 flex items-center gap-1 overflow-x-auto scrollbar-thin">
                <div className="flex items-center bg-slate-200/60 dark:bg-zinc-800/80 p-1 rounded-xl">
                    {tabs.map(t => {
                        const Icon = t.icon;
                        const isActive = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => navigate(`/finance/insurance/${t.id}`)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                                    isActive
                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                                )}
                            >
                                <Icon size={14} />
                                <span>{t.label}</span>
                                {t.id === 'claims' && pendingClaimsCount > 0 && (
                                    <span className="ml-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded-full font-mono">
                                        {pendingClaimsCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TAB CONTENT BODY */}
            <div className="flex-1 overflow-y-auto px-8 py-4 w-full custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-400">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        <span className="text-xs font-medium">Loading Insurance & Claims Intelligence...</span>
                    </div>
                ) : (
                    <>
                        {/* 1. OVERVIEW TAB */}
                        {tab === 'overview' && (
                            <div className="space-y-6 w-full">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <span className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Claims Submissions</span>
                                                <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{claims.length}</p>
                                            </div>
                                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                <FileText size={17} />
                                            </div>
                                        </div>
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                            Cashless diagnostic claims submitted
                                        </p>
                                    </div>

                                    <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <span className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Pending Claims Value</span>
                                                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">₹{totalClaimsAmount.toLocaleString()}</p>
                                            </div>
                                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                                <Clock size={17} />
                                            </div>
                                        </div>
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                            {pendingClaimsCount} claims awaiting reimbursement
                                        </p>
                                    </div>

                                    <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <span className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Desk Co-Pay Collected</span>
                                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">₹{totalCoPayCollected.toLocaleString()}</p>
                                            </div>
                                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                <DollarSign size={17} />
                                            </div>
                                        </div>
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                            Directly collected from patients
                                        </p>
                                    </div>

                                    <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <span className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Empanelled TPAs</span>
                                                <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{companies.length}</p>
                                            </div>
                                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                                <Building2 size={17} />
                                            </div>
                                        </div>
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                            Insurers with active pre-auth desk
                                        </p>
                                    </div>
                                </div>

                                {/* Recent Claims Snapshot */}
                                <div className="synos-dept-card rounded-2xl overflow-hidden">
                                    <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold tracking-tight dark:text-white">Recent Cashless Claims & Pre-Auths</h3>
                                            <p className="text-xs text-zinc-500">Live submissions recorded from the Reception Intent Panel</p>
                                        </div>
                                        <button 
                                            onClick={() => navigate('/finance/insurance/claims')}
                                            className="text-xs font-bold text-blue-500 hover:underline cursor-pointer"
                                        >
                                            View All Claims &rarr;
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-xs border-b border-zinc-200 dark:border-zinc-800">
                                                <tr>
                                                    <th className="px-6 py-3">Patient</th>
                                                    <th className="px-6 py-3">Insurer / TPA</th>
                                                    <th className="px-6 py-3">Pre-Auth / Policy</th>
                                                    <th className="px-6 py-3 text-right">Gross</th>
                                                    <th className="px-6 py-3 text-right">Co-Pay</th>
                                                    <th className="px-6 py-3 text-right">Claim Due</th>
                                                    <th className="px-6 py-3 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                                {claims.slice(0, 6).map(c => (
                                                    <tr key={c.visitId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                        <td className="px-6 py-3.5">
                                                            <div className="font-bold dark:text-zinc-100">{c.patientName}</div>
                                                            <div className="text-xs text-zinc-400 font-mono">{c.patientMrn}</div>
                                                        </td>
                                                        <td className="px-6 py-3.5 font-medium dark:text-zinc-300">
                                                            {c.insuranceCompanyName}
                                                        </td>
                                                        <td className="px-6 py-3.5 font-mono text-xs">
                                                            <div className="text-blue-500 font-bold">{c.preAuthApprovalNumber}</div>
                                                            <div className="text-zinc-400 text-xs">Pol: {c.policyNumber}</div>
                                                        </td>
                                                        <td className="px-6 py-3.5 text-right font-mono text-zinc-500">₹{c.grossAmount?.toLocaleString()}</td>
                                                        <td className="px-6 py-3.5 text-right font-mono text-emerald-500 font-bold">₹{c.coPayAmount?.toLocaleString()}</td>
                                                        <td className="px-6 py-3.5 text-right font-mono text-blue-500 font-bold">₹{c.claimAmount?.toLocaleString()}</td>
                                                        <td className="px-6 py-3.5 text-center">
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-500/10 text-blue-500">
                                                                {c.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {claims.length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="px-6 py-8 text-center text-zinc-400">
                                                            No insurance cashless claims recorded yet.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. EMPANELMENT MASTER (CONFIGURATION SCREEN) */}
                        {tab === 'empanelment' && (
                            <div className="space-y-6 w-full">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                        <input
                                            type="text"
                                            placeholder="Search insurer by name, TPA code, payer ID..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setEditingCompany(null); setIsAddModalOpen(true); }}
                                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                                    >
                                        <Plus size={16} /> + Add Insurance Company
                                    </button>
                                </div>

                                <div className="synos-dept-card rounded-2xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-xs border-b border-zinc-200 dark:border-zinc-800">
                                                <tr>
                                                    <th className="px-6 py-3.5">Insurance Company / Payer</th>
                                                    <th className="px-6 py-3.5">TPA Code / Payer ID</th>
                                                    <th className="px-6 py-3.5">Pre-Auth Contact</th>
                                                    <th className="px-6 py-3.5 text-center">Pre-Auth Required</th>
                                                    <th className="px-6 py-3.5 text-center">Status</th>
                                                    <th className="px-6 py-3.5 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                                {filteredCompanies.map(c => (
                                                    <tr key={c.insuranceCompanyId || c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-sm dark:text-white flex items-center gap-2">
                                                                <ShieldCheck className="w-4 h-4 text-blue-500" />
                                                                {c.name}
                                                            </div>
                                                            {c.tpaName && (
                                                                <div className="text-xs text-zinc-500 mt-0.5">TPA: {c.tpaName}</div>
                                                            )}
                                                            {c.address && (
                                                                <div className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">{c.address}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 font-mono">
                                                            <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs">
                                                                {c.code || c.payerId || "N/A"}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 space-y-1">
                                                            {c.contactPhone && (
                                                                <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 text-xs">
                                                                    <Phone className="w-3 h-3 text-zinc-400" /> {c.contactPhone}
                                                                </div>
                                                            )}
                                                            {c.contactEmail && (
                                                                <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                                                                    <Mail className="w-3 h-3 text-zinc-400" /> {c.contactEmail}
                                                                </div>
                                                            )}
                                                            {!c.contactPhone && !c.contactEmail && (
                                                                <span className="text-zinc-400 text-xs">No contacts configured</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {c.preAuthRequired !== false ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                                    Mandatory Pre-Auth
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                                                    Direct Claim
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                onClick={async () => {
                                                                    const compId = c.insuranceCompanyId || c.id;
                                                                    await fetch(`/api/v1/insurance-companies/${compId}`, {
                                                                        method: 'PUT',
                                                                        headers: {
                                                                            'Content-Type': 'application/json',
                                                                            'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`
                                                                        },
                                                                        body: JSON.stringify({ isActive: !c.isActive })
                                                                    });
                                                                    loadData();
                                                                }}
                                                                className={cn(
                                                                    "px-2.5 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                                                                    c.isActive 
                                                                        ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" 
                                                                        : "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                                                                )}
                                                            >
                                                                {c.isActive ? "Active" : "Disabled"}
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => { setEditingCompany(c); setIsAddModalOpen(true); }}
                                                                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer"
                                                                title="Edit Details"
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredCompanies.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-8 text-center text-zinc-400">
                                                            No insurance companies matched your filter. Click "+ Add Empanelled Insurer" to register one.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2.5. PACKAGES & CONTRACTED RATE MASTER */}
                        {tab === 'packages' && (
                            <div className="w-full">
                                <CorporateTerminal forcedTab="packages" hideHeader={true} />
                            </div>
                        )}

                        {/* 3. CLAIMS & PRE-AUTHS QUEUE */}
                        {tab === 'claims' && (
                            <div className="space-y-6 w-full">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by Patient, MRN, Policy #, Pre-Auth #..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Filter size={15} className="text-zinc-400" />
                                        <select
                                            value={selectedCompanyFilter}
                                            onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                                            className="h-9 px-3 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none cursor-pointer"
                                        >
                                            <option value="ALL">All Empanelled Insurers ({companies.length})</option>
                                            {companies.map(c => (
                                                <option key={c.insuranceCompanyId || c.id} value={c.insuranceCompanyId || c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="synos-dept-card rounded-2xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-xs border-b border-zinc-200 dark:border-zinc-800">
                                                <tr>
                                                    <th className="px-6 py-3.5">Patient Details</th>
                                                    <th className="px-6 py-3.5">Insurer & TPA</th>
                                                    <th className="px-6 py-3.5">Policy / Approval Details</th>
                                                    <th className="px-6 py-3.5 text-right">Gross Total</th>
                                                    <th className="px-6 py-3.5 text-right">Desk Co-Pay</th>
                                                    <th className="px-6 py-3.5 text-right">TPA Due</th>
                                                    <th className="px-6 py-3.5 text-center">Status</th>
                                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                                {filteredClaims.map(c => (
                                                    <tr key={c.visitId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                        <td className="px-6 py-3.5">
                                                            <div className="font-bold text-sm dark:text-zinc-100">{c.patientName}</div>
                                                            <div className="text-xs text-zinc-400 font-mono">MRN: {c.patientMrn}</div>
                                                        </td>
                                                        <td className="px-6 py-3.5 font-medium dark:text-zinc-200">
                                                            {c.insuranceCompanyName}
                                                        </td>
                                                        <td className="px-6 py-3.5 font-mono text-xs space-y-0.5">
                                                            <div className="font-bold text-blue-500">Auth: {c.preAuthApprovalNumber}</div>
                                                            <div className="text-zinc-400 text-xs">Pol: {c.policyNumber}</div>
                                                        </td>
                                                        <td className="px-6 py-3.5 text-right font-mono text-zinc-500">₹{c.grossAmount?.toLocaleString()}</td>
                                                        <td className="px-6 py-3.5 text-right font-mono text-emerald-500 font-bold">₹{c.coPayAmount?.toLocaleString()}</td>
                                                        <td className="px-6 py-3.5 text-right font-mono text-blue-500 font-bold">₹{c.claimAmount?.toLocaleString()}</td>
                                                        <td className="px-6 py-3.5 text-center">
                                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-500/10 text-blue-500">
                                                                {c.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3.5 text-right">
                                                            <button
                                                                onClick={() => setActiveClaimForPrint(c)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 transition-all cursor-pointer shadow-xs"
                                                                title="Print TPA Insurance Claim"
                                                            >
                                                                <Printer size={13} />
                                                                <span>Claim</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredClaims.length === 0 && (
                                                    <tr>
                                                        <td colSpan={8} className="px-6 py-8 text-center text-zinc-400">
                                                            No claims found matching search criteria.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. TPA RECEIVABLES & AGING */}
                        {tab === 'receivables' && (
                            <div className="space-y-6 w-full">
                                <div className="synos-dept-card rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-base font-bold dark:text-white">Insurance / TPA Receivables Balance Sheet</h3>
                                            <p className="text-xs text-zinc-500">Total cashless claims outstanding across empanelled insurers</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-zinc-400 font-bold uppercase">Total TPA Outstanding</span>
                                            <p className="text-2xl font-black text-blue-500">₹{totalClaimsAmount.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-xs border-b border-zinc-200 dark:border-zinc-800">
                                                <tr>
                                                    <th className="px-6 py-3">Empanelled Provider</th>
                                                    <th className="px-6 py-3 text-center">Claims Count</th>
                                                    <th className="px-6 py-3 text-right">0 - 30 Days</th>
                                                    <th className="px-6 py-3 text-right">31 - 60 Days</th>
                                                    <th className="px-6 py-3 text-right">Total Outstanding</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                                {companies.map(c => {
                                                    const compClaims = claims.filter(cl => cl.insuranceCompanyId === (c.insuranceCompanyId || c.id));
                                                    const due = compClaims.reduce((s, cl) => s + (cl.claimAmount || 0), 0);
                                                    return (
                                                        <tr key={c.insuranceCompanyId || c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                                                            <td className="px-6 py-3.5 font-bold dark:text-zinc-100 flex items-center gap-2">
                                                                <ShieldCheck className="w-4 h-4 text-blue-500" />
                                                                {c.name}
                                                            </td>
                                                            <td className="px-6 py-3.5 text-center font-mono font-bold">{compClaims.length}</td>
                                                            <td className="px-6 py-3.5 text-right font-mono text-zinc-600 dark:text-zinc-300">₹{due.toLocaleString()}</td>
                                                            <td className="px-6 py-3.5 text-right font-mono text-zinc-400">₹0</td>
                                                            <td className="px-6 py-3.5 text-right font-mono font-bold text-blue-500">₹{due.toLocaleString()}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. REMITTANCE & SETTLEMENTS */}
                        {tab === 'settlements' && (
                            <div className="space-y-6 w-full">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-bold dark:text-white">TPA Remittances & Settlement Reconciliation</h3>
                                        <p className="text-xs text-zinc-500">Record NEFT bank transfers received from TPAs with deduction reconciliation</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsSettlementModalOpen(true)}
                                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
                                    >
                                        <Plus size={16} /> Record TPA Remittance Advice
                                    </button>
                                </div>

                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400 space-y-2">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
                                    <p className="text-sm font-bold dark:text-zinc-200">Reconciliation System Ready</p>
                                    <p className="text-xs max-w-md mx-auto text-zinc-500">
                                        Use "Record TPA Remittance Advice" above to upload bank advice slips, match UTR numbers to pre-auth claims, and clear receivables.
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* CREATE / EDIT INSURER CONFIG MODAL */}
            {isAddModalOpen && (
                <InsurerConfigModal
                    isOpen={isAddModalOpen}
                    initialData={editingCompany}
                    isDark={isDark}
                    onClose={() => { setIsAddModalOpen(false); setEditingCompany(null); }}
                    onSuccess={() => { setIsAddModalOpen(false); setEditingCompany(null); loadData(); }}
                />
            )}

            {/* RECORD REMITTANCE MODAL */}
            {isSettlementModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                    <div className={cn(
                        "w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
                    )}>
                        <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-sm font-bold">Record TPA Remittance</h3>
                            <button onClick={() => setIsSettlementModalOpen(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Select Insurer / TPA</label>
                                <select className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none">
                                    {companies.map(c => (
                                        <option key={c.insuranceCompanyId || c.id} value={c.insuranceCompanyId || c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Amount Received (₹)</label>
                                    <input type="number" placeholder="50000" className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">UTR / Bank Ref #</label>
                                    <input type="text" placeholder="NEFT-BARB2026..." className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none font-mono" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Notes / Disallowances</label>
                                <textarea placeholder="Notes on TDS or disallowed line items..." className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none resize-none h-16" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                            <button onClick={() => setIsSettlementModalOpen(false)} className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* A4 PRINTABLE FINANCIAL SUMMARY MODAL */}
            {(() => {
                const cfg = getPrintSummaryConfig();
                return (
                    <FinancePrintableSummaryModal
                        isOpen={isPrintSummaryOpen}
                        onClose={() => setIsPrintSummaryOpen(false)}
                        slotId="summary_insurance"
                        title={cfg.title}
                        subtitle={cfg.subtitle}
                        categoryLabel={cfg.categoryLabel}
                        dateRangeText={new Date().toLocaleDateString()}
                        kpis={cfg.kpis}
                        columns={cfg.columns}
                        data={cfg.data}
                        summaryTotals={cfg.summaryTotals}
                        onDownloadCsv={handleDownloadTabSummary}
                    />
                );
            })()}

            {/* INDIVIDUAL INSURANCE CLAIM MODAL */}
            {activeClaimForPrint && (
                <CommercialDocumentViewer
                    isOpen={!!activeClaimForPrint}
                    onClose={() => setActiveClaimForPrint(null)}
                    title="Insurance TPA Claim (A4)"
                    paperSize="a4"
                >
                    <DynamicDocumentRenderer
                        slotId="insurance_tpa_claim"
                        data={activeClaimForPrint}
                    />
                </CommercialDocumentViewer>
            )}
        </div>
    );
}

function InsurerConfigModal({ isOpen, initialData, isDark, onClose, onSuccess }) {
    const isEdit = !!initialData;
    const [name, setName] = useState(initialData?.name || '');
    const [code, setCode] = useState(initialData?.code || '');
    const [tpaName, setTpaName] = useState(initialData?.tpaName || '');
    const [payerId, setPayerId] = useState(initialData?.payerId || '');
    const [contactPhone, setContactPhone] = useState(initialData?.contactPhone || '');
    const [contactEmail, setContactEmail] = useState(initialData?.contactEmail || '');
    const [address, setAddress] = useState(initialData?.address || '');
    const [preAuthRequired, setPreAuthRequired] = useState(initialData?.preAuthRequired !== false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) { setError("Insurer Name is required."); return; }
        setIsSubmitting(true);
        setError(null);
        try {
            const payload = {
                name: name.trim(),
                code: code.trim() || null,
                tpaName: tpaName.trim() || null,
                payerId: payerId.trim() || null,
                contactPhone: contactPhone.trim() || null,
                contactEmail: contactEmail.trim() || null,
                address: address.trim() || null,
                preAuthRequired
            };

            const url = isEdit 
                ? `/api/v1/insurance-companies/${initialData.insuranceCompanyId || initialData.id}`
                : `/api/v1/insurance-companies`;
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
                throw new Error(errData.message || "Failed to save insurer configuration");
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
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold">{isEdit ? "Edit Insurance Company" : "Add Insurance Company"}</h3>
                            <p className="text-xs text-zinc-500">Register insurance company or TPA network</p>
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
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Company / Insurer Name *</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Star Health & Allied Insurance Co."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">TPA Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Medi Assist TPA"
                                value={tpaName}
                                onChange={(e) => setTpaName(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">TPA Code / Payer ID</label>
                            <input
                                type="text"
                                placeholder="e.g. STAR_TPA"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-blue-500 font-mono uppercase"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Pre-Auth Desk Phone</label>
                            <input
                                type="text"
                                placeholder="1800-XXX-XXXX"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Claims Email</label>
                            <input
                                type="email"
                                placeholder="cashless@starhealth.in"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Claims Submission Address</label>
                        <input
                            type="text"
                            placeholder="Floor 4, TPA Claims Processing Center, Bengaluru"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                        />
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={preAuthRequired}
                                onChange={(e) => setPreAuthRequired(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs font-semibold dark:text-zinc-300">Mandatory Cashless Pre-Authorization Number at Desk</span>
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                            {isEdit ? "Update Insurance Company" : "Save Insurance Company"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
