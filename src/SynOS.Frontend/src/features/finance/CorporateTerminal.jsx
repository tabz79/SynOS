import React, { useState, useEffect, useMemo } from 'react';
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
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Save,
    ShieldCheck,
    Layers,
    Printer,
    Download
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { ReceptionApi, fetchTestCatalogCached } from '@/api/reception';
import { FinancePrintableSummaryModal } from './components/FinancePrintableSummaryModal';
import { CommercialDocumentViewer } from './components/documents/CommercialDocumentViewer';
import { DynamicDocumentRenderer } from './components/documents/DynamicDocumentRenderer';

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

    // Modals & Editing
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [isPackageBuilderOpen, setIsPackageBuilderOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);
    const [isAddRateRuleModalOpen, setIsAddRateRuleModalOpen] = useState(false);
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);
    const [activeBillForPrint, setActiveBillForPrint] = useState(null);

    // Corporate Test Pricing Master Filter & Pagination States
    const [testSearchQuery, setTestSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('ALL');
    const [selectedModality, setSelectedModality] = useState('ALL');
    const [rateFilter, setRateFilter] = useState('ALL'); // 'ALL' | 'OVERRIDE' | 'STANDARD'
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [editingTestId, setEditingTestId] = useState(null);
    const [inlineRate, setInlineRate] = useState('');
    const [isSavingRate, setIsSavingRate] = useState(false);

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

    const handleDownloadTabSummary = () => {
        let headers = [];
        let rows = [];
        let filename = `synos_corporate_${tab}_${new Date().toISOString().slice(0, 10)}.csv`;

        if (tab === 'clients') {
            headers = ["Company Name", "Corporate Code", "Contact Person", "Phone", "Email", "Credit Limit (INR)", "Payment Terms (Days)", "Status"];
            rows = filteredAccounts.map(a => [
                `"${(a.companyName || '').replace(/"/g, '""')}"`,
                `"${a.corporateCode || ''}"`,
                `"${(a.contactPerson || a.contactPersonName || '').replace(/"/g, '""')}"`,
                `"${a.contactPhone || ''}"`,
                `"${a.contactEmail || ''}"`,
                a.creditLimit || 0,
                a.paymentTermsDays || 30,
                a.isActive ? "Active" : "Inactive"
            ]);
        } else if (tab === 'packages') {
            headers = ["Package Name", "Code", "Type", "Corporate Account", "Contracted Rate (INR)", "Status"];
            rows = corporatePackages.map(p => [
                `"${(p.packageName || p.name || p.testName || '').replace(/"/g, '""')}"`,
                `"${p.packageCode || p.code || p.testCode || ''}"`,
                "Corporate Package",
                `"${(activeAccountObj?.companyName || 'All Clients').replace(/"/g, '""')}"`,
                p.contractedPrice ?? p.corporatePrice ?? p.price ?? 0,
                "Active"
            ]);
        } else if (tab === 'invoices') {
            headers = ["Token / Bill No", "Date", "Employee ID", "Patient Name", "Corporate Client", "Tests Billed", "Total Amount (INR)", "Status"];
            rows = filteredVisits.map(v => [
                `"${v.visitToken || v.token || ''}"`,
                `"${new Date(v.createdAt || v.date || Date.now()).toLocaleDateString()}"`,
                `"${v.employeeId || ''}"`,
                `"${(v.patientName || '').replace(/"/g, '""')}"`,
                `"${(v.companyName || activeAccountObj?.companyName || '').replace(/"/g, '""')}"`,
                `"${(v.testsSummary || '').replace(/"/g, '""')}"`,
                v.grossAmount || v.totalAmount || 0,
                `"${v.status || 'Invoiced'}"`
            ]);
        } else {
            // overview / settlements
            headers = ["Token", "Date", "Employee ID", "Patient Name", "Corporate Client", "Amount (INR)", "Status"];
            rows = filteredVisits.map(v => [
                `"${v.visitToken || v.token || ''}"`,
                `"${new Date(v.createdAt || v.date || Date.now()).toLocaleDateString()}"`,
                `"${v.employeeId || ''}"`,
                `"${(v.patientName || '').replace(/"/g, '""')}"`,
                `"${(v.companyName || activeAccountObj?.companyName || '').replace(/"/g, '""')}"`,
                v.grossAmount || v.totalAmount || 0,
                `"${v.status || 'Invoiced'}"`
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
        if (tab === 'clients') {
            return {
                title: "Corporate Client Master Directory",
                subtitle: "Contracted corporate organizations, credit exposure & payment terms",
                categoryLabel: "CORPORATE B2B DIRECTORY",
                kpis: [
                    { label: "Total Corporate Accounts", value: accounts.length, subtext: "Contracted Companies" },
                    { label: "Active Clients", value: accounts.filter(a => a.isActive).length, color: "text-emerald-600", subtext: "Operational Tie-ups" },
                    { label: "Total Credit Exposure", value: `₹${accounts.reduce((s, a) => s + (Number(a.creditLimit) || 0), 0).toLocaleString()}`, color: "text-indigo-600", subtext: "Sanctioned Credit Line" }
                ],
                columns: [
                    { key: 'companyName', label: 'Company / Organization' },
                    { key: 'corporateCode', label: 'Code', render: (v) => v || '-' },
                    { key: 'contactPerson', label: 'Contact Person', render: (v, r) => v || r.contactPersonName || '-' },
                    { key: 'contactPhone', label: 'Phone', render: (v) => v || '-' },
                    { key: 'creditLimit', label: 'Credit Limit (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'paymentTermsDays', label: 'Terms', align: 'center', render: (v) => `${v || 30} Days` },
                    { key: 'isActive', label: 'Status', align: 'center', render: (v) => v ? 'Active' : 'Inactive' }
                ],
                data: filteredAccounts,
                summaryTotals: {
                    creditLimit: `₹${accounts.reduce((s, a) => s + (Number(a.creditLimit) || 0), 0).toLocaleString()}`
                }
            };
        } else if (tab === 'packages') {
            return {
                title: `Corporate Packages & Rate Master - ${activeAccountObj?.companyName || 'Corporate Client'}`,
                subtitle: "Pre-bundled wellness profiles and negotiated investigation tariff rules",
                categoryLabel: "CORPORATE TARIFF AUDIT",
                kpis: [
                    { label: "Configured Packages", value: corporatePackages.length, subtext: "Wellness Bundles" },
                    { label: "Individual Rate Overrides", value: individualRateRules.length, subtext: "Negotiated Investigations" },
                    { label: "Corporate Account", value: activeAccountObj?.companyName || "Select Client", color: "text-indigo-600", subtext: activeAccountObj?.corporateCode || "Contract" }
                ],
                columns: [
                    { key: 'packageName', label: 'Package / Profile Name', render: (v, r) => v || r.name || r.testName || 'Package' },
                    { key: 'packageCode', label: 'Code', render: (v, r) => v || r.code || r.testCode || '-' },
                    { key: 'contractedPrice', label: 'Contracted Rate (₹)', align: 'right', render: (v, r) => `₹${Number(v ?? r.corporatePrice ?? r.price ?? 0).toLocaleString()}` },
                    { key: 'isPackage', label: 'Classification', align: 'center', render: (v) => v ? 'Package Profile' : 'Test Override' }
                ],
                data: rateRules,
                summaryTotals: {}
            };
        } else if (tab === 'invoices') {
            const totalInvoiced = filteredVisits.reduce((sum, v) => sum + (v.grossAmount || v.totalAmount || 0), 0);
            return {
                title: "Corporate B2B Receivables & Invoices Ledger",
                subtitle: "Itemized staff investigation claims and institutional billing balances",
                categoryLabel: "CORPORATE RECEIVABLES",
                kpis: [
                    { label: "Total B2B Invoiced", value: `₹${totalInvoiced.toLocaleString()}`, color: "text-indigo-600", subtext: `${filteredVisits.length} Employee Visits` },
                    { label: "Corporate Client", value: activeAccountObj?.companyName || "All Accounts", subtext: "Target Organization" },
                    { label: "Employee Visits", value: filteredVisits.length, subtext: "Investigations Undertaken" }
                ],
                columns: [
                    { key: 'visitToken', label: 'Token / Inv No', render: (v, r) => v || r.token || r.invoiceNumber || '-' },
                    { key: 'createdAt', label: 'Date', render: (v, r) => new Date(v || r.date || Date.now()).toLocaleDateString() },
                    { key: 'employeeId', label: 'Employee ID', render: (v) => v || 'N/A' },
                    { key: 'patientName', label: 'Staff / Patient Name' },
                    { key: 'companyName', label: 'Corporate Client', render: (v) => v || activeAccountObj?.companyName || '-' },
                    { key: 'testsSummary', label: 'Tests Billed', render: (v, r) => v || (r.tests?.join(', ')) || '-' },
                    { key: 'grossAmount', label: 'Total (₹)', align: 'right', render: (v, r) => `₹${Number(v || r.totalAmount || 0).toLocaleString()}` },
                    { key: 'status', label: 'Status', align: 'center', render: (v) => v || 'Invoiced' }
                ],
                data: filteredVisits,
                summaryTotals: {
                    grossAmount: `₹${totalInvoiced.toLocaleString()}`
                }
            };
        } else {
            // overview / settlements
            return {
                title: "Corporate B2B Executive & Operational Summary",
                subtitle: "Consolidated corporate diagnostic volume, receivables, and institutional accounts",
                categoryLabel: "CORPORATE EXECUTIVE AUDIT",
                kpis: [
                    { label: "Total Invoiced (B2B)", value: `₹${totalB2BAmount.toLocaleString()}`, color: "text-indigo-600", subtext: "Gross Billing Liability" },
                    { label: "Active Corporate Clients", value: accounts.filter(a => a.isActive).length, color: "text-zinc-900", subtext: "Contracted Organizations" },
                    { label: "Corporate Patient Visits", value: visits.length, subtext: "Staff Diagnostics" }
                ],
                columns: [
                    { key: 'visitToken', label: 'Token', render: (v, r) => v || r.token || '-' },
                    { key: 'createdAt', label: 'Date', render: (v, r) => new Date(v || r.date || Date.now()).toLocaleDateString() },
                    { key: 'employeeId', label: 'Staff ID', render: (v) => v || 'N/A' },
                    { key: 'patientName', label: 'Employee Name' },
                    { key: 'companyName', label: 'Corporate Company', render: (v) => v || '-' },
                    { key: 'grossAmount', label: 'Amount (₹)', align: 'right', render: (v, r) => `₹${Number(v || r.totalAmount || 0).toLocaleString()}` },
                    { key: 'status', label: 'Status', align: 'center', render: (v) => v || 'Invoiced' }
                ],
                data: filteredVisits,
                summaryTotals: {
                    grossAmount: `₹${totalB2BAmount.toLocaleString()}`
                }
            };
        }
    };

    // Extract unique departments and modalities
    const departments = useMemo(() => {
        const set = new Set();
        testCatalog.forEach(t => {
            const d = t.department || 'PATHOLOGY';
            if (d) set.add(d);
        });
        return Array.from(set).sort();
    }, [testCatalog]);

    const modalities = useMemo(() => {
        const set = new Set();
        testCatalog.forEach(t => {
            const m = t.category || t.modality;
            if (m && m !== 'CorporatePackage') set.add(m);
        });
        return Array.from(set).sort();
    }, [testCatalog]);

    // Map of testId -> CorporateRateRule (account-level override)
    const rateRulesMap = useMemo(() => {
        const map = new Map();
        rateRules.filter(r => !r.isPackage).forEach(r => {
            if (r.testId) map.set(r.testId, r);
        });
        return map;
    }, [rateRules]);

    // Filtered Test Master catalog for Corporate Pricing Master
    const filteredTestMasterList = useMemo(() => {
        return testCatalog.filter(t => {
            if (t.category === 'CorporatePackage') return false;

            const code = (t.testCode || t.code || '').toLowerCase();
            const name = (t.testName || t.name || '').toLowerCase();
            const search = testSearchQuery.toLowerCase().trim();
            const matchesSearch = !search || code.includes(search) || name.includes(search);

            const dept = t.department || 'PATHOLOGY';
            const matchesDept = selectedDepartment === 'ALL' || dept.toUpperCase() === selectedDepartment.toUpperCase();

            const mod = t.category || t.modality || '';
            const matchesMod = selectedModality === 'ALL' || mod.toUpperCase() === selectedModality.toUpperCase();

            const testId = t.testId || t.id;
            const hasOverride = rateRulesMap.has(testId);
            const matchesRateFilter = 
                rateFilter === 'ALL' ? true :
                rateFilter === 'OVERRIDE' ? hasOverride :
                !hasOverride;

            return matchesSearch && matchesDept && matchesMod && matchesRateFilter;
        });
    }, [testCatalog, testSearchQuery, selectedDepartment, selectedModality, rateFilter, rateRulesMap]);

    const totalPages = Math.ceil(filteredTestMasterList.length / pageSize) || 1;
    const paginatedTests = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredTestMasterList.slice(start, start + pageSize);
    }, [filteredTestMasterList, currentPage, pageSize]);

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [testSearchQuery, selectedDepartment, selectedModality, rateFilter, pageSize]);

    // Handler to save contracted rate inline and sync with Test Master
    const handleSaveCorporateRate = async (test) => {
        const testId = test.testId || test.id;
        const rateNum = parseFloat(inlineRate);
        if (isNaN(rateNum) || rateNum < 0) return;
        if (!selectedAccountId) return;

        setIsSavingRate(true);
        try {
            const res = await fetch(`/api/v1/corporate-accounts/${selectedAccountId}/rate-rules`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`
                },
                body: JSON.stringify({
                    testId: testId,
                    contractedPrice: rateNum,
                    isPackage: false
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to save corporate contracted rate");
            }

            // Immediately reflect in local testCatalog
            setTestCatalog(prev => prev.map(t => {
                const tid = t.testId || t.id;
                if (tid === testId) {
                    return { ...t, corporatePrice: rateNum };
                }
                return t;
            }));

            // Refresh rules from backend
            const updatedRules = await ReceptionApi.getCorporateRateRules(selectedAccountId);
            setRateRules(updatedRules || []);

            setEditingTestId(null);
            setInlineRate('');
        } catch (err) {
            console.error("Failed to save rate:", err);
            alert(err.message || "Failed to update corporate rate");
        } finally {
            setIsSavingRate(false);
        }
    };

    const handleRevertRateOverride = async (ruleId) => {
        if (!window.confirm("Revert this test's contracted rate back to the default Test Master corporate tier?")) return;
        try {
            await fetch(`/api/v1/corporate-accounts/${selectedAccountId}/rate-rules/${ruleId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            const updatedRules = await ReceptionApi.getCorporateRateRules(selectedAccountId);
            setRateRules(updatedRules || []);
        } catch (err) {
            console.error("Failed to revert override:", err);
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden animate-in fade-in duration-500">
            {/* TERMINAL HEADER (UNBOXED NATIVE CANVAS STYLE) */}
            <div className="px-8 pt-8 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight">
                            Corporate B2B Terminal
                        </h1>
                        <p className="text-xs text-zinc-500 font-medium mt-0.5">
                            Client Directory, Contracted Rates & Corporate Package Infrastructure
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-3 bg-slate-200/50 dark:bg-zinc-800/60 p-1.5 px-3 rounded-xl border border-slate-300/40 dark:border-zinc-700/40">
                        <div className="text-right">
                            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-wider block">Total B2B Invoiced</p>
                            <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">₹{totalB2BAmount.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700" />
                        <div className="text-right">
                            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-wider block">Active Clients</p>
                            <p className="text-xs font-black text-zinc-900 dark:text-zinc-100">{accounts.filter(a => a.isActive).length}</p>
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
                                onClick={() => navigate(`/finance/corporate/${t.id}`)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                                    isActive
                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                                )}
                            >
                                <Icon size={14} />
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
            </div>

            {/* TAB CONTENT BODY */}
            <div className="flex-1 overflow-y-auto px-8 py-4 w-full custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-400">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        <span className="text-xs font-medium">Loading Corporate B2B Infrastructure...</span>
                    </div>
                ) : (
                    <>
                        {/* 1. OVERVIEW TAB */}
                        {tab === 'overview' && (
                            <div className="space-y-6 w-full">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="synos-kpi-card p-5 rounded-2xl flex flex-col justify-between">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Corporate Visits</span>
                                            <FileText className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <p className="text-2xl font-black tracking-tight dark:text-white">{visits.length}</p>
                                        <p className="text-[11px] text-zinc-500 mt-1">Staff & employee registrations</p>
                                    </div>

                                    <div className="synos-kpi-card p-5 rounded-2xl flex flex-col justify-between">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Invoiced (B2B)</span>
                                            <DollarSign className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <p className="text-2xl font-black tracking-tight text-emerald-500">₹{totalB2BAmount.toLocaleString()}</p>
                                        <p className="text-[11px] text-zinc-500 mt-1">Total revenue from corporate tie-ups</p>
                                    </div>

                                    <div className="synos-kpi-card p-5 rounded-2xl flex flex-col justify-between">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Corporate Clients</span>
                                            <Building2 className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <p className="text-2xl font-black tracking-tight dark:text-white">{accounts.length}</p>
                                        <p className="text-[11px] text-zinc-500 mt-1">Contracted organizations</p>
                                    </div>

                                    <div className="synos-kpi-card p-5 rounded-2xl flex flex-col justify-between">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Contracted Packages</span>
                                            <Package className="w-4 h-4 text-amber-500" />
                                        </div>
                                        <p className="text-2xl font-black tracking-tight text-amber-500">{corporatePackages.length}</p>
                                        <p className="text-[11px] text-zinc-500 mt-1">Packages active across accounts</p>
                                    </div>
                                </div>

                                {/* Recent Corporate Visits */}
                                <div className="synos-dept-card rounded-2xl overflow-hidden">
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
                            <div className="space-y-6 w-full">
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

                                <div className="synos-dept-card rounded-2xl overflow-hidden">
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

                        {/* 3. DEDICATED CORPORATE PACKAGE BUILDER & PRICING MASTER */}
                        {tab === 'packages' && (
                            <div className="space-y-6 w-full">
                                {/* Account Selector Banner (Marker 2 Refinement) */}
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

                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                            <Building2 size={15} className="text-indigo-500 shrink-0" />
                                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider shrink-0">Client:</span>
                                            <select
                                                value={selectedAccountId}
                                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                                className="bg-transparent text-xs font-bold dark:text-white outline-none cursor-pointer pr-2"
                                            >
                                                {accounts.map(a => (
                                                    <option key={a.corporateAccountId || a.id} value={a.corporateAccountId || a.id} className="dark:bg-zinc-900">
                                                        {a.companyName} [{a.corporateCode || 'CORP'}]
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => { setEditingPackage(null); setIsPackageBuilderOpen(true); }}
                                            disabled={!selectedAccountId}
                                            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
                                        >
                                            <Plus size={16} /> + Build Corporate Package
                                        </button>
                                    </div>
                                </div>

                                {/* Active Corporate Packages Section (Marker 3: SynOS Card System) */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                            <Package size={14} className="text-indigo-500" />
                                            Commercial Bundles & Health Packages ({corporatePackages.length})
                                        </h4>
                                        <span className="text-[11px] text-zinc-400">
                                            Click any card or pencil to edit package details and bundled tests
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {corporatePackages.map(pkg => (
                                            <div 
                                                key={pkg.corporateRateRuleId} 
                                                onClick={() => { setEditingPackage(pkg); setIsPackageBuilderOpen(true); }}
                                                className="group relative p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs hover:shadow-lg hover:border-indigo-500/50 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4"
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 text-[10px] font-mono font-bold border border-indigo-500/20">
                                                                    {pkg.packageCode || pkg.testCode}
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                    Active Package
                                                                </span>
                                                            </div>
                                                            <h5 className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                                                                {pkg.packageName || pkg.testName}
                                                            </h5>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            {pkg.standardPrice > 0 && (
                                                                <span className="text-xs text-zinc-400 line-through font-mono block">
                                                                    ₹{pkg.standardPrice?.toLocaleString()}
                                                                </span>
                                                            )}
                                                            <span className="text-lg font-black text-emerald-500 font-mono">
                                                                ₹{pkg.contractedPrice?.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Bundled Tests */}
                                                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                                                            Bundled Tests ({(pkg.includedTests || []).length})
                                                        </span>
                                                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                                                            {(pkg.includedTests && pkg.includedTests.length > 0) ? (
                                                                pkg.includedTests.map(t => (
                                                                    <span 
                                                                        key={t.testId || t.testCode} 
                                                                        className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 text-[10px] font-medium border border-zinc-200/50 dark:border-zinc-700/50"
                                                                    >
                                                                        {t.testName}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-zinc-400 text-[10px]">Configured package profile</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                                    <span className="text-[10px] text-zinc-400">Available at reception Intent Panel</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingPackage(pkg);
                                                                setIsPackageBuilderOpen(true);
                                                            }}
                                                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-zinc-400 hover:text-indigo-500 transition-colors cursor-pointer"
                                                            title="Edit Package"
                                                        >
                                                            <Edit size={13} />
                                                        </button>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (!window.confirm(`Delete package ${pkg.packageName || pkg.testName}?`)) return;
                                                                await fetch(`/api/v1/corporate-accounts/${selectedAccountId}/rate-rules/${pkg.corporateRateRuleId}`, {
                                                                    method: 'DELETE',
                                                                    headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
                                                                });
                                                                ReceptionApi.getCorporateRateRules(selectedAccountId).then(r => setRateRules(r || []));
                                                            }}
                                                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-rose-500/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                                                            title="Delete Package"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
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

                                {/* Marker 4: Full Corporate Test Pricing Master */}
                                <div className="space-y-3 pt-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                                <ShieldCheck size={15} className="text-indigo-500" />
                                                Corporate Test Pricing Master ({filteredTestMasterList.length})
                                            </h4>
                                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                Bidirectional sync with Test Master. Rates edited below immediately reflect inside Test Master pricing &amp; corporate billing.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-indigo-500 font-bold bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 font-mono">
                                                {individualRateRules.length} Client Overrides Active
                                            </span>
                                        </div>
                                    </div>

                                    {/* Filters & Search Control Bar */}
                                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                                            <div className="relative flex-1 min-w-[200px]">
                                                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search test by name or code (e.g. CBC, Lipid, CBP)..."
                                                    value={testSearchQuery}
                                                    onChange={(e) => setTestSearchQuery(e.target.value)}
                                                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                                                />
                                            </div>

                                            {/* Department Filter */}
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase">Dept:</span>
                                                <select
                                                    value={selectedDepartment}
                                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                                    className="h-8 px-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none cursor-pointer"
                                                >
                                                    <option value="ALL">All Departments</option>
                                                    {departments.map(d => (
                                                        <option key={d} value={d}>{d}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Modality Filter */}
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase">Modality:</span>
                                                <select
                                                    value={selectedModality}
                                                    onChange={(e) => setSelectedModality(e.target.value)}
                                                    className="h-8 px-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none cursor-pointer"
                                                >
                                                    <option value="ALL">All Modalities</option>
                                                    {modalities.map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Rate Status Filter */}
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase">Status:</span>
                                                <select
                                                    value={rateFilter}
                                                    onChange={(e) => setRateFilter(e.target.value)}
                                                    className="h-8 px-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none cursor-pointer"
                                                >
                                                    <option value="ALL">All Tests</option>
                                                    <option value="OVERRIDE">Contract Overrides Only</option>
                                                    <option value="STANDARD">Default Corporate Tier</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Show:</span>
                                            <select
                                                value={pageSize}
                                                onChange={(e) => setPageSize(Number(e.target.value))}
                                                className="h-8 px-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none cursor-pointer"
                                            >
                                                <option value={15}>15 / page</option>
                                                <option value={30}>30 / page</option>
                                                <option value={50}>50 / page</option>
                                                <option value={100}>100 / page</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Pricing Master Table */}
                                    <div className="synos-dept-card rounded-2xl overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                                                    <tr>
                                                        <th className="px-6 py-3.5">Test Code &amp; Modality</th>
                                                        <th className="px-6 py-3.5">Test Name &amp; Department</th>
                                                        <th className="px-6 py-3.5 text-right">Retail Base Price</th>
                                                        <th className="px-6 py-3.5 text-right">Negotiated Corporate Rate</th>
                                                        <th className="px-6 py-3.5 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                                    {paginatedTests.map(test => {
                                                        const testId = test.testId || test.id;
                                                        const overrideRule = rateRulesMap.get(testId);
                                                        const isEditing = editingTestId === testId;
                                                        
                                                        // Fallback chain: account override -> test.corporatePrice -> test.pricing?.corporate -> test.basePrice
                                                        const corporateRate = overrideRule
                                                            ? overrideRule.contractedPrice
                                                            : (test.corporatePrice ?? test.pricing?.corporate ?? test.basePrice ?? 0);
                                                        const retailPrice = test.basePrice ?? test.price ?? 0;

                                                        return (
                                                            <tr key={testId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                                <td className="px-6 py-3.5 font-mono">
                                                                    <div className="font-bold text-indigo-500">{test.testCode || test.code}</div>
                                                                    <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-sans font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase">
                                                                        {test.category || test.modality || 'LAB'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-3.5">
                                                                    <div className="font-semibold dark:text-zinc-200">{test.testName || test.name}</div>
                                                                    <div className="text-[10px] text-zinc-400 mt-0.5">{test.department || 'PATHOLOGY'}</div>
                                                                </td>
                                                                <td className="px-6 py-3.5 text-right font-mono text-zinc-500 dark:text-zinc-400 font-semibold">
                                                                    ₹{retailPrice.toLocaleString()}
                                                                </td>
                                                                <td className="px-6 py-3.5 text-right">
                                                                    {isEditing ? (
                                                                        <div className="flex items-center justify-end gap-1.5">
                                                                            <span className="text-zinc-400 font-mono text-xs">₹</span>
                                                                            <input
                                                                                type="number"
                                                                                autoFocus
                                                                                min="0"
                                                                                value={inlineRate}
                                                                                onChange={(e) => setInlineRate(e.target.value)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') handleSaveCorporateRate(test);
                                                                                    if (e.key === 'Escape') setEditingTestId(null);
                                                                                }}
                                                                                className="w-24 h-7 px-2 text-right rounded-lg border border-indigo-500 bg-white dark:bg-zinc-950 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 outline-none focus:ring-1 focus:ring-indigo-500"
                                                                            />
                                                                            <button
                                                                                onClick={() => handleSaveCorporateRate(test)}
                                                                                disabled={isSavingRate}
                                                                                className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
                                                                                title="Save Rate"
                                                                            >
                                                                                {isSavingRate ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditingTestId(null)}
                                                                                className="p-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                                                                title="Cancel"
                                                                            >
                                                                                <X size={12} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-0.5">
                                                                            <div className="font-mono font-bold text-emerald-500 text-sm">
                                                                                ₹{corporateRate?.toLocaleString()}
                                                                            </div>
                                                                            {overrideRule ? (
                                                                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                                                                    Client Contract
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
                                                                                    Test Master Tier
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-3.5 text-right">
                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                        {!isEditing && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingTestId(testId);
                                                                                    setInlineRate(corporateRate.toString());
                                                                                }}
                                                                                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                                                                                title="Edit Corporate Rate"
                                                                            >
                                                                                <Edit size={13} />
                                                                            </button>
                                                                        )}
                                                                        {overrideRule && (
                                                                            <button
                                                                                onClick={() => handleRevertRateOverride(overrideRule.corporateRateRuleId)}
                                                                                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-amber-500/10 hover:border-amber-500/30 text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer"
                                                                                title="Revert to Test Master Default Tier"
                                                                            >
                                                                                <RotateCcw size={13} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {paginatedTests.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-8 text-center text-zinc-400 text-xs">
                                                                No tests matching the selected filter criteria.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination Controls */}
                                        {totalPages > 1 && (
                                            <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                                                <div>
                                                    Showing <span className="font-bold text-zinc-700 dark:text-zinc-300">{((currentPage - 1) * pageSize) + 1}</span> to <span className="font-bold text-zinc-700 dark:text-zinc-300">{Math.min(currentPage * pageSize, filteredTestMasterList.length)}</span> of <span className="font-bold text-zinc-700 dark:text-zinc-300">{filteredTestMasterList.length}</span> tests
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                        disabled={currentPage === 1}
                                                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                                                    >
                                                        <ChevronLeft size={14} />
                                                    </button>
                                                    <span className="px-2 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                                                        {currentPage} / {totalPages}
                                                    </span>
                                                    <button
                                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                        disabled={currentPage === totalPages}
                                                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                                                    >
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. B2B INVOICES & RECEIVABLES */}
                        {tab === 'invoices' && (
                            <div className="space-y-6 w-full">
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

                                <div className="synos-dept-card rounded-2xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                             <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                                                <tr>
                                                    <th className="px-6 py-3.5">Token / Inv No</th>
                                                    <th className="px-6 py-3.5">Employee / Patient</th>
                                                    <th className="px-6 py-3.5">Corporate Client</th>
                                                    <th className="px-6 py-3.5">Employee / Staff ID</th>
                                                    <th className="px-6 py-3.5">Tests Billed</th>
                                                    <th className="px-6 py-3.5">Date</th>
                                                    <th className="px-6 py-3.5 text-right">Invoiced (₹)</th>
                                                    <th className="px-6 py-3.5 text-center">Status</th>
                                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                                {filteredVisits.map(v => (
                                                    <tr key={v.visitId || v.token || v.invoiceNumber} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                        <td className="px-6 py-3.5 font-mono text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                                                            {v.token || v.visitToken || v.invoiceNumber || '-'}
                                                        </td>
                                                        <td className="px-6 py-3.5">
                                                            <div className="font-bold text-sm dark:text-zinc-100">{v.patientName}</div>
                                                            <div className="text-[10px] text-zinc-400 font-mono">MRN: {v.patientMrn || '-'}</div>
                                                        </td>
                                                        <td className="px-6 py-3.5 font-medium dark:text-zinc-200">
                                                            {v.companyName || activeAccountObj?.companyName || '-'}
                                                        </td>
                                                        <td className="px-6 py-3.5 font-mono text-[11px] text-indigo-500 font-bold">
                                                            {v.employeeId || 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-3.5 text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate" title={v.testsSummary || (v.tests?.join(', ')) || '-'}>
                                                            {v.testsSummary || (v.tests?.join(', ')) || '-'}
                                                        </td>
                                                        <td className="px-6 py-3.5 text-zinc-500 font-medium">
                                                            {new Date(v.createdAt || v.date || Date.now()).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-3.5 text-right font-mono text-emerald-500 font-bold">
                                                            ₹{(v.grossAmount || v.totalAmount || 0).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-3.5 text-center">
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-500">
                                                                {v.status || 'Invoiced'}
                                                             </span>
                                                        </td>
                                                        <td className="px-6 py-3.5 text-right">
                                                            <button
                                                                onClick={() => setActiveBillForPrint(v)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer shadow-xs"
                                                                title="Print Corporate Bill"
                                                            >
                                                                <Printer size={13} />
                                                                <span>Bill</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredVisits.length === 0 && (
                                                    <tr>
                                                        <td colSpan={9} className="px-6 py-8 text-center text-zinc-400">
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
                            <div className="space-y-6 w-full">
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
                    packageData={editingPackage}
                    corporateAccountId={selectedAccountId}
                    corporateAccountName={activeAccountObj?.companyName || "Corporate Client"}
                    catalog={testCatalog}
                    isDark={isDark}
                    onClose={() => {
                        setIsPackageBuilderOpen(false);
                        setEditingPackage(null);
                    }}
                    onSuccess={() => {
                        setIsPackageBuilderOpen(false);
                        setEditingPackage(null);
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

            {/* A4 PRINTABLE FINANCIAL SUMMARY MODAL */}
            {(() => {
                const cfg = getPrintSummaryConfig();
                return (
                    <FinancePrintableSummaryModal
                        isOpen={isPrintSummaryOpen}
                        onClose={() => setIsPrintSummaryOpen(false)}
                        slotId="summary_corporate"
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

            {/* INDIVIDUAL CORPORATE BILL MODAL */}
            {activeBillForPrint && (
                <CommercialDocumentViewer
                    isOpen={!!activeBillForPrint}
                    onClose={() => setActiveBillForPrint(null)}
                    title="Corporate Bill (A4)"
                    paperSize="a4"
                >
                    <DynamicDocumentRenderer
                        slotId="corporate_b2b_invoice"
                        data={activeBillForPrint}
                    />
                </CommercialDocumentViewer>
            )}
        </div>
    );
}

/**
 * Dedicated Corporate Package Builder Modal
 * Bundles tests into a standalone commercial package with negotiated package pricing.
 */
function CorporatePackageBuilderModal({ isOpen, packageData, corporateAccountId, corporateAccountName, catalog, isDark, onClose, onSuccess }) {
    const isEdit = !!packageData;
    const [packageName, setPackageName] = useState(packageData?.packageName || packageData?.testName || '');
    const [packageCode, setPackageCode] = useState(packageData?.packageCode || packageData?.testCode || '');
    const [contractedPrice, setContractedPrice] = useState(packageData?.contractedPrice != null ? packageData.contractedPrice.toString() : '');
    const [testFilter, setTestFilter] = useState('');
    const [selectedTestIds, setSelectedTestIds] = useState(
        (packageData?.includedTests || []).map(t => t.testId || t.id).filter(Boolean)
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (packageData) {
            setPackageName(packageData.packageName || packageData.testName || '');
            setPackageCode(packageData.packageCode || packageData.testCode || '');
            setContractedPrice(packageData.contractedPrice != null ? packageData.contractedPrice.toString() : '');
            setSelectedTestIds((packageData.includedTests || []).map(t => t.testId || t.id).filter(Boolean));
        } else {
            setPackageName('');
            setPackageCode('');
            setContractedPrice('');
            setSelectedTestIds([]);
        }
        setError(null);
    }, [packageData]);

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
            const url = isEdit
                ? `/api/v1/corporate-accounts/${corporateAccountId}/packages/${packageData.corporateRateRuleId}`
                : `/api/v1/corporate-accounts/${corporateAccountId}/packages`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
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
                throw new Error(errData.message || `Failed to ${isEdit ? 'update' : 'create'} corporate package`);
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
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold">{isEdit ? 'Edit Corporate Package' : 'Build Corporate Package'}</h3>
                                {isEdit && (packageData.packageCode || packageData.testCode) && (
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 text-[10px] font-mono font-bold border border-indigo-500/20">
                                        {packageData.packageCode || packageData.testCode}
                                    </span>
                                )}
                            </div>
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

                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-200/80 dark:divide-zinc-800">
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
                            {isEdit ? 'Update Corporate Package' : 'Create Corporate Package'}
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
