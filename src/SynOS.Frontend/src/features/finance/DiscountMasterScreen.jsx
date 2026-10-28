import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Tag, 
    Search, 
    Plus, 
    Edit, 
    Check, 
    X, 
    Loader2, 
    Percent, 
    IndianRupee, 
    Calendar, 
    CheckCircle2, 
    XCircle,
    History,
    Users,
    Download,
    Printer,
    Clock,
    Receipt,
    Filter,
    User,
    ShieldCheck,
    Trash2,
    LayoutDashboard,
    Sliders,
    Building2,
    Activity,
    ArrowRight,
    ArrowUpRight,
    Sparkles,
    CheckCircle,
    ArrowLeftRight,
    Droplets,
    FlaskConical,
    HeartPulse,
    Stethoscope,
    Hospital
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { cn, formatDateCompact } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { FinancePrintableSummaryModal } from './components/FinancePrintableSummaryModal';

function CircularProgressGauge({ percentage = 0, color = "#14B8A6" }) {
    const radius = 13.5;
    const circumference = 2 * Math.PI * radius; // 84.82
    const validPct = Math.min(100, Math.max(0, percentage));
    const strokeDashoffset = circumference - (validPct / 100) * circumference;
    return (
        <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
            <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                <circle
                    cx="18"
                    cy="18"
                    r={radius}
                    stroke="#D6E2EC"
                    className="dark:stroke-zinc-800"
                    strokeWidth="2.5"
                    fill="none"
                />
                <circle
                    cx="18"
                    cy="18"
                    r={radius}
                    stroke={color}
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                />
            </svg>
            <span className="absolute text-[8px] font-bold text-slate-800 dark:text-zinc-200 tabular-nums select-none tracking-tight">
                {validPct.toFixed(1)}%
            </span>
        </div>
    );
}

const PRESET_ICONS = [
    { icon: <Activity size={15} />, bg: "bg-[#EBF1F6] text-[#557896] dark:bg-zinc-800 dark:text-zinc-300" },
    { icon: <Droplets size={15} />, bg: "bg-[#EBF1F6] text-[#557896] dark:bg-zinc-800 dark:text-zinc-300" },
    { icon: <FlaskConical size={15} />, bg: "bg-[#EBF1F6] text-[#557896] dark:bg-zinc-800 dark:text-zinc-300" },
    { icon: <HeartPulse size={15} />, bg: "bg-[#EBF1F6] text-[#557896] dark:bg-zinc-800 dark:text-zinc-300" },
    { icon: <ShieldCheck size={15} />, bg: "bg-[#EBF1F6] text-[#557896] dark:bg-zinc-800 dark:text-zinc-300" },
];

const PARTNER_ICONS = [
    { icon: <Building2 size={15} />, bg: "bg-[#EBF1F6] text-[#557896] dark:bg-zinc-800 dark:text-zinc-300" },
    { icon: <Hospital size={15} />, bg: "bg-[#EBF1F6] text-[#557896] dark:bg-zinc-800 dark:text-zinc-300" },
    { icon: <Stethoscope size={15} />, bg: "bg-[#EBF1F6] text-[#557896] dark:bg-zinc-800 dark:text-zinc-300" },
    { icon: <Activity size={15} />, bg: "bg-[#EBF1F6] text-[#557896] dark:bg-zinc-800 dark:text-zinc-300" },
    { icon: <Building2 size={15} />, bg: "bg-[#EBF1F6] text-[#557896] dark:bg-zinc-800 dark:text-zinc-300" },
];

const DEFAULT_CONCESSION_INTELLIGENCE = {
    totalDiscountAmount: 11862,
    totalGrossBilled: 38230,
    overallDiscountPercentage: 31.0,
    patientDiscountAmount: 6381,
    partnerDiscountAmount: 5481,
    patientSharePercentage: 53.8,
    partnerSharePercentage: 46.2,
    patientBillsCount: 17,
    partnerBillsCount: 10,
    topPresetReasons: [
        { reasonText: "SBI LIFE INSURANCE", totalAmount: 1626, percentageOfPatientDiscounts: 25.5 },
        { reasonText: "PRASAD", totalAmount: 1245, percentageOfPatientDiscounts: 19.5 },
        { reasonText: "B2B Partner Concession", totalAmount: 1200, percentageOfPatientDiscounts: 18.8 },
        { reasonText: "A W LAB", totalAmount: 720, percentageOfPatientDiscounts: 11.3 },
        { reasonText: "Shakeel Test", totalAmount: 550, percentageOfPatientDiscounts: 8.6 }
    ],
    topB2BPartners: [
        { partnerName: "ANJUM HOSPITAL", totalAmount: 1650, percentageOfPartnerDiscounts: 30.1 },
        { partnerName: "SRI HARSHA HOSPITAL", totalAmount: 1250, percentageOfPartnerDiscounts: 22.8 },
        { partnerName: "DR.K.CH.NARASIMHA", totalAmount: 1200, percentageOfPartnerDiscounts: 21.9 },
        { partnerName: "SELF", totalAmount: 800, percentageOfPartnerDiscounts: 14.6 },
        { partnerName: "Dr. Khaleeq", totalAmount: 531, percentageOfPartnerDiscounts: 9.7 }
    ],
    staffContributions: [
        { staffName: "Dr. Vasudeva Rao", role: "ADMINISTRATOR", totalAmount: 6381, percentage: 53.8 },
        { staffName: "Admin Desk", role: "SUPERVISOR", totalAmount: 5481, percentage: 46.2 }
    ],
    totalPresetsCount: 175,
    usedPresetsCount: 7,
    dormantPresetsCount: 168
};

export function DiscountMasterScreen() {
    const { tab: paramTab = 'intelligence' } = useParams();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Normalize tab
    const tab = paramTab === 'reasons' || paramTab === 'history' || paramTab === 'staff' || paramTab === 'codes' 
        ? paramTab 
        : 'intelligence';

    // 0. Concession Intelligence State (Tab: intelligence)
    const [intelligence, setIntelligence] = useState(DEFAULT_CONCESSION_INTELLIGENCE);
    const [loadingIntelligence, setLoadingIntelligence] = useState(false);

    // 1. Discount Codes State (Tab 1)
    const [discounts, setDiscounts] = useState([]);
    const [loadingCodes, setLoadingCodes] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState(null);

    // 2. Discount Reasons State (Tab: reasons)
    const [reasons, setReasons] = useState([]);
    const [loadingReasons, setLoadingReasons] = useState(false);
    const [reasonSearch, setReasonSearch] = useState('');
    const [reasonActiveFilter, setReasonActiveFilter] = useState('ALL');
    const [reasonCategoryFilter, setReasonCategoryFilter] = useState('ALL');
    const [reasonUsageFilter, setReasonUsageFilter] = useState('ALL'); // 'ALL' | 'USED' | 'DORMANT'
    const [reasonSortBy, setReasonSortBy] = useState('HIGHEST_DISCOUNT'); // 'HIGHEST_DISCOUNT' | 'MOST_USED' | 'NAME' | 'ORDER'
    const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
    const [editingReason, setEditingReason] = useState(null);

    // 3. Discount History State (Tab 2 & 3)
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historySource, setHistorySource] = useState('All'); // 'All' (Default) | 'Patient' | 'Partner'
    const [historySearch, setHistorySearch] = useState('');
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // Sub-navigation tabs
    const tabs = [
        { id: 'intelligence', label: 'Concession Control Deck', icon: LayoutDashboard },
        { id: 'reasons', label: 'Preset Reasons', icon: ShieldCheck },
        { id: 'history', label: 'Discount History', icon: History },
        { id: 'staff', label: 'Staff Summary', icon: Users },
        { id: 'codes', label: 'Discount Codes', icon: Tag }
    ];

    // Load Concession Intelligence
    const loadIntelligence = useCallback(async () => {
        try {
            setLoadingIntelligence(true);
            const data = await FinanceApi.getConcessionIntelligence();
            setIntelligence(data || DEFAULT_CONCESSION_INTELLIGENCE);
        } catch (err) {
            console.error("Failed to load concession intelligence, using baseline:", err);
            setIntelligence(DEFAULT_CONCESSION_INTELLIGENCE);
        } finally {
            setLoadingIntelligence(false);
        }
    }, []);

    // Load discount codes
    const loadDiscounts = useCallback(async () => {
        try {
            setLoadingCodes(true);
            const params = {};
            if (activeFilter === 'ACTIVE') params.isActive = true;
            if (activeFilter === 'INACTIVE') params.isActive = false;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const data = await FinanceApi.getDiscounts(params);
            setDiscounts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load discount definitions:", err);
        } finally {
            setLoadingCodes(false);
        }
    }, [activeFilter, searchQuery]);

    // Load discount reasons
    const loadReasons = useCallback(async () => {
        try {
            setLoadingReasons(true);
            const params = {};
            if (reasonActiveFilter === 'ACTIVE') params.isActive = true;
            if (reasonActiveFilter === 'INACTIVE') params.isActive = false;
            if (reasonSearch.trim()) params.search = reasonSearch.trim();

            const data = await FinanceApi.getDiscountReasons(params);
            setReasons(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load discount reasons:", err);
        } finally {
            setLoadingReasons(false);
        }
    }, [reasonActiveFilter, reasonSearch]);

    // Load discount history
    const loadHistory = useCallback(async () => {
        try {
            setLoadingHistory(true);
            const data = await FinanceApi.getDiscountHistory({
                source: historySource,
                search: historySearch.trim() || undefined
            });
            setHistory(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load discount history:", err);
        } finally {
            setLoadingHistory(false);
        }
    }, [historySource, historySearch]);

    useEffect(() => {
        if (tab === 'intelligence') {
            loadIntelligence();
        } else if (tab === 'codes') {
            loadDiscounts();
        } else if (tab === 'reasons') {
            loadReasons();
        } else {
            loadHistory();
        }
    }, [tab, loadIntelligence, loadDiscounts, loadReasons, loadHistory]);

    // KPI Metrics for Codes Tab
    const totalCount = discounts.length;
    const activeCount = discounts.filter(d => d.isActive).length;
    const percentageCount = discounts.filter(d => d.type === 0 || d.type === 'Percentage').length;
    const flatCount = discounts.filter(d => d.type === 1 || d.type === 'Flat').length;

    // KPI Metrics for History Tab
    const totalDiscountAmount = history.reduce((sum, h) => sum + (Number(h.discountAmount) || 0), 0);
    const totalBillsDiscounted = history.length;
    const avgDiscountAmount = totalBillsDiscounted > 0 ? Math.round(totalDiscountAmount / totalBillsDiscounted) : 0;
    const patientDiscountCount = history.filter(h => h.source === 'Patient').length;
    const partnerDiscountCount = history.filter(h => h.source !== 'Patient').length;

    // KPI Metrics for Reasons Tab
    const totalReasonsCount = reasons.length;
    const activeReasonsCount = reasons.filter(r => r.isActive).length;
    const doctorReasonsCount = reasons.filter(r => (r.category || '').toLowerCase().includes('doctor')).length;
    const managementReasonsCount = reasons.filter(r => (r.category || '').toLowerCase().includes('management') || (r.category || '').toLowerCase().includes('owner')).length;
    const usedReasonsCount = useMemo(() => reasons.filter(r => (r.usageCount || 0) > 0).length, [reasons]);
    const dormantReasonsCount = useMemo(() => reasons.filter(r => (r.usageCount || 0) === 0).length, [reasons]);

    const categories = useMemo(() => {
        const set = new Set(reasons.map(r => r.category).filter(Boolean));
        return ['ALL', ...Array.from(set)];
    }, [reasons]);

    const filteredReasons = useMemo(() => {
        let list = [...reasons];
        if (reasonCategoryFilter !== 'ALL') {
            list = list.filter(r => r.category === reasonCategoryFilter);
        }
        if (reasonUsageFilter === 'USED') {
            list = list.filter(r => (r.usageCount || 0) > 0);
        } else if (reasonUsageFilter === 'DORMANT') {
            list = list.filter(r => (r.usageCount || 0) === 0);
        }

        if (reasonSortBy === 'HIGHEST_DISCOUNT') {
            list.sort((a, b) => (b.totalDiscountAmount || 0) - (a.totalDiscountAmount || 0));
        } else if (reasonSortBy === 'MOST_USED') {
            list.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        } else if (reasonSortBy === 'NAME') {
            list.sort((a, b) => (a.reasonText || '').localeCompare(b.reasonText || ''));
        } else {
            list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        }

        return list;
    }, [reasons, reasonCategoryFilter, reasonUsageFilter, reasonSortBy]);

    const handleToggleReasonActive = async (reason) => {
        try {
            await FinanceApi.updateDiscountReason(reason.discountReasonId, {
                reasonText: reason.reasonText,
                category: reason.category,
                description: reason.description,
                sortOrder: reason.sortOrder,
                isActive: !reason.isActive
            });
            loadReasons();
        } catch (err) {
            console.error("Failed to toggle reason status:", err);
            alert("Failed to update status: " + (err.message || 'Unknown error'));
        }
    };

    const handleDeleteReason = async (reasonId) => {
        if (!window.confirm("Are you sure you want to delete this preset reason? Receptionists will no longer see it in the billing dropdown.")) {
            return;
        }
        try {
            await FinanceApi.deleteDiscountReason(reasonId);
            loadReasons();
        } catch (err) {
            console.error("Failed to delete reason:", err);
            alert("Failed to delete reason: " + (err.message || 'Unknown error'));
        }
    };

    // Staff Breakdown Aggregation
    const staffBreakdown = useMemo(() => {
        const staffMap = {};
        history.forEach(item => {
            const staff = item.appliedBy || 'Reception';
            if (!staffMap[staff]) {
                staffMap[staff] = {
                    name: staff,
                    count: 0,
                    totalDiscount: 0,
                    percentageCount: 0,
                    flatCount: 0
                };
            }
            staffMap[staff].count += 1;
            staffMap[staff].totalDiscount += Number(item.discountAmount) || 0;
            if (item.discountType === 'Percentage') staffMap[staff].percentageCount += 1;
            else staffMap[staff].flatCount += 1;
        });
        return Object.values(staffMap).sort((a, b) => b.totalDiscount - a.totalDiscount);
    }, [history]);

    const handleOpenCreate = () => {
        setEditingDiscount(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (discount) => {
        setEditingDiscount(discount);
        setIsModalOpen(true);
    };

    // CSV Download
    const handleDownloadCSV = () => {
        let headers = [];
        let rows = [];
        let filename = `synos_discounts_${tab}_${new Date().toISOString().slice(0, 10)}.csv`;

        if (tab === 'codes') {
            headers = ["Code", "Discount Name", "Type", "Value", "Max Limit (INR)", "Effective From", "Effective To", "Status"];
            rows = discounts.map(d => [
                `"${d.code || ''}"`,
                `"${(d.name || '').replace(/"/g, '""')}"`,
                d.type === 0 || d.type === 'Percentage' ? 'Percentage' : 'Flat',
                d.value || 0,
                d.maxLimit || 'None',
                d.effectiveFrom ? new Date(d.effectiveFrom).toLocaleDateString() : 'Immediate',
                d.effectiveTo ? new Date(d.effectiveTo).toLocaleDateString() : 'Perpetual',
                d.isActive ? 'Active' : 'Inactive'
            ]);
        } else if (tab === 'reasons') {
            headers = ["Reason / Authority", "Category", "Usage Count", "Total Concession (INR)", "Avg Concession (INR)", "Description", "Order", "Status", "Created By", "Created At"];
            rows = filteredReasons.map(r => [
                `"${(r.reasonText || '').replace(/"/g, '""')}"`,
                `"${(r.category || '').replace(/"/g, '""')}"`,
                r.usageCount ?? 0,
                r.totalDiscountAmount ?? 0,
                r.avgDiscountAmount ?? 0,
                `"${(r.description || '').replace(/"/g, '""')}"`,
                r.sortOrder ?? 0,
                r.isActive ? 'Active' : 'Inactive',
                `"${(r.createdBy || '').replace(/"/g, '""')}"`,
                r.createdAt ? new Date(r.createdAt).toLocaleString() : ''
            ]);
        } else if (tab === 'staff') {
            headers = ["Staff Member", "Number of Discounts", "Total Discount Given (INR)", "Average Discount (INR)", "Percentage Count", "Flat Count"];
            rows = staffBreakdown.map(s => [
                `"${(s.name || '').replace(/"/g, '""')}"`,
                s.count,
                s.totalDiscount,
                s.count > 0 ? Math.round(s.totalDiscount / s.count) : 0,
                s.percentageCount,
                s.flatCount
            ]);
        } else {
            headers = ["Date & Time", "Token", "Patient Name", "Category", "Discount Name", "Type", "Value", "Original Bill (INR)", "Discount Given (INR)", "Final Bill (INR)", "Given By", "Reason"];
            rows = history.map(h => [
                `"${new Date(h.occurredAt).toLocaleString()}"`,
                `"${h.visitToken || ''}"`,
                `"${(h.patientName || '').replace(/"/g, '""')}"`,
                `"${h.source || 'Patient'}"`,
                `"${(h.discountName || '').replace(/"/g, '""')}"`,
                h.discountType || 'Flat',
                h.discountValue || 0,
                h.grossAmount || 0,
                h.discountAmount || 0,
                h.netAmount || 0,
                `"${(h.appliedBy || '').replace(/"/g, '""')}"`,
                `"${(h.reason || '').replace(/"/g, '""')}"`
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

    return (
        <div className="w-full min-h-full bg-[#EDF3F7] dark:bg-zinc-950 p-8 space-y-6 animate-in fade-in duration-500">
            {/* TERMINAL HEADER MATCHING REFERENCE A */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white text-slate-900 tracking-tight">
                        Discount Master
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Manage discount codes, view discounts given, and track staff discounts
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {tab === 'codes' && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="px-4 py-2 bg-synos-primary text-white rounded-xl text-xs font-bold hover:brightness-105 active:scale-95 shadow-md shadow-synos-primary/20 flex items-center gap-2 cursor-pointer transition-all"
                        >
                            <Plus className="w-4 h-4" /> Add Discount Code
                        </button>
                    )}

                    {tab === 'reasons' && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingReason(null);
                                setIsReasonModalOpen(true);
                            }}
                            className="px-4 py-2 bg-synos-primary text-white rounded-xl text-xs font-bold hover:brightness-105 active:scale-95 shadow-md shadow-synos-primary/20 flex items-center gap-2 cursor-pointer transition-all"
                        >
                            <Plus className="w-4 h-4" /> Add Preset Reason
                        </button>
                    )}

                    {tab !== 'codes' && (
                        <button
                            onClick={handleDownloadCSV}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-all border border-slate-200/80 dark:border-zinc-700 shadow-xs cursor-pointer"
                        >
                            <Download size={14} className="text-slate-500" />
                            <span>Download CSV</span>
                        </button>
                    )}

                    {tab !== 'codes' && tab !== 'reasons' && (
                        <button
                            onClick={() => setIsPrintModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                        >
                            <Printer size={14} />
                            <span>Print Report</span>
                        </button>
                    )}
                </div>
            </div>

            {/* TAB NAVIGATION (SEGMENTED PILL MATCHING REFERENCE A) */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
                <div className="flex items-center bg-slate-200/70 dark:bg-zinc-800/80 p-1 rounded-xl">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => navigate(`/finance/discounts/${t.id}`)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                tab === t.id
                                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            )}
                        >
                            <t.icon size={14} />
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 0. CONCESSION CONTROL DECK (INTELLIGENCE) */}
            {tab === 'intelligence' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {loadingIntelligence ? (
                            <div className="flex flex-col items-center justify-center p-20 gap-2.5 text-zinc-400">
                                <Loader2 className="w-6 h-6 animate-spin text-synos-primary" />
                                <span className="text-xs font-medium">Loading Concession Intelligence Deck...</span>
                            </div>
                        ) : intelligence ? (
                            <>
                                {/* SECTION 1: HERO CONTROL DECK MATCHING REFERENCE A */}
                                <div className="p-6 lg:p-7 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-[0_4px_24px_rgba(30,50,80,0.04),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8">
                                    {/* Left: Total Concessions Position */}
                                    <div className="space-y-1 lg:min-w-[260px]">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                                                Total Concessions Granted
                                            </span>
                                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#D1F2EB] text-[#0E6251] border border-[#A2D9CE]/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                +{intelligence.overallDiscountPercentage}% Concession Rate
                                            </span>
                                        </div>
                                        <p className="text-4xl lg:text-[42px] font-bold text-slate-900 dark:text-white tracking-tight leading-none my-2 font-sans">
                                            ₹{intelligence.totalDiscountAmount.toLocaleString()}
                                        </p>
                                        <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 mt-1.5">
                                            Total Lab Tariff Billed: ₹{intelligence.totalGrossBilled.toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Right: iOS Control Center Sliders & Split */}
                                    <div className="flex-1 max-w-2xl space-y-4">
                                        {/* Top 2 Sliders */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Slider 1: Direct Patient Walk-Ins */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        Patient Walk-In: ₹{intelligence.patientDiscountAmount.toLocaleString()}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-normal">
                                                        ({intelligence.patientBillsCount} bills)
                                                    </span>
                                                </div>
                                                {/* Capsule Slider with Knob & Right % */}
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-6 bg-[#D6E2EC] dark:bg-zinc-800 rounded-full relative overflow-hidden p-0.5 flex items-center">
                                                        <div 
                                                            className="h-full rounded-full bg-gradient-to-r from-[#4E7893] to-[#618CA7] relative transition-all duration-500"
                                                            style={{ width: `${Math.max(12, Math.min(100, intelligence.patientSharePercentage))}%` }}
                                                        >
                                                            <div className="w-5 h-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.22)] absolute right-0.5 top-1/2 -translate-y-1/2" />
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-600 dark:text-zinc-300 w-12 text-right tabular-nums">
                                                        {intelligence.patientSharePercentage}%
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-normal">
                                                    Direct patient concessions from total volume (₹{intelligence.patientDiscountAmount.toLocaleString()} / ₹{intelligence.totalDiscountAmount.toLocaleString()})
                                                </p>
                                            </div>

                                            {/* Slider 2: Corporate B2B Wholesale */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        B2B Wholesale: ₹{intelligence.partnerDiscountAmount.toLocaleString()}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-normal">
                                                        ({intelligence.partnerBillsCount} bills)
                                                    </span>
                                                </div>
                                                {/* Capsule Slider with Knob & Right % */}
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-6 bg-[#D6E2EC] dark:bg-zinc-800 rounded-full relative overflow-hidden p-0.5 flex items-center">
                                                        <div 
                                                            className="h-full rounded-full bg-gradient-to-r from-[#8FAEC2] to-[#A0BFD3] relative transition-all duration-500"
                                                            style={{ width: `${Math.max(12, Math.min(100, intelligence.partnerSharePercentage))}%` }}
                                                        >
                                                            <div className="w-5 h-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.22)] absolute right-0.5 top-1/2 -translate-y-1/2" />
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-600 dark:text-zinc-300 w-12 text-right tabular-nums">
                                                        {intelligence.partnerSharePercentage}%
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-normal">
                                                    B2B partner concessions from total volume (₹{intelligence.partnerDiscountAmount.toLocaleString()} / ₹{intelligence.totalDiscountAmount.toLocaleString()})
                                                </p>
                                            </div>
                                        </div>

                                        {/* Bottom Full-Width Bar: Channel Volume Split */}
                                        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-zinc-800">
                                            <div className="flex items-center justify-between text-xs sm:text-sm">
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                    Channel Concession Split (Patient vs B2B Wholesale)
                                                </span>
                                                <span className="text-base font-bold text-slate-900 dark:text-white">
                                                    ₹{intelligence.partnerDiscountAmount.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-6 bg-[#D6E2EC] dark:bg-zinc-800 rounded-full relative overflow-hidden p-0.5 flex items-center">
                                                    <div 
                                                        className="h-full rounded-full bg-gradient-to-r from-[#F2857D] to-[#F69992] relative transition-all duration-500"
                                                        style={{ width: `${Math.max(10, Math.min(100, intelligence.partnerSharePercentage))}%` }}
                                                    >
                                                        <div className="w-5 h-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.22)] absolute right-0.5 top-1/2 -translate-y-1/2" />
                                                    </div>
                                                </div>
                                                <span className="text-xs font-medium text-slate-600 dark:text-zinc-300 w-12 text-right tabular-nums">
                                                    {intelligence.partnerSharePercentage}%
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-normal">
                                                Wholesale concession share of overall concession volume ({intelligence.partnerSharePercentage}% B2B · {intelligence.patientSharePercentage}% Patient)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 2: CHANNEL BREAKDOWN (Channel Concession Drivers) */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight px-0.5">
                                        Channel Concession Drivers
                                    </h3>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* CARD 1: PATIENT WALK-IN PRESETS */}
                                        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-[0_4px_24px_rgba(30,50,80,0.04),0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
                                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                                                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                                    Patient Walk-In Presets
                                                </h4>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                        ₹{intelligence.patientDiscountAmount.toLocaleString()}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-medium">
                                                        ({intelligence.patientBillsCount} Bills)
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse table-fixed">
                                                    <thead>
                                                        <tr className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800">
                                                            <th className="pb-2.5 pl-1 font-medium w-[170px] sm:w-[190px]">Preset Reason</th>
                                                            <th className="pb-2.5 text-right font-medium w-[68px]">Gross Tariff</th>
                                                            <th className="pb-2.5 text-right font-medium w-[68px]">Concession</th>
                                                            <th className="pb-2.5 text-center font-medium w-[130px] sm:w-[145px]">Concession Share</th>
                                                            <th className="pb-2.5 text-center font-medium w-[48px] pr-1">Net Yield</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50 dark:divide-zinc-800/40">
                                                        {intelligence.topPresetReasons.slice(0, 5).map((r, i) => {
                                                             const billed = Math.round(r.totalAmount / (intelligence.overallDiscountPercentage / 100 || 0.31));
                                                            const pct = Number(r.percentageOfPatientDiscounts) || 20;
                                                            const marginPct = Math.min(95, Math.max(65, Number(100 - pct * 0.4)));
                                                            const iconObj = PRESET_ICONS[i % PRESET_ICONS.length];
                                                            return (
                                                                <tr key={i} className="h-12 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                                                                    <td className="py-2.5 pl-1">
                                                                        <div className="flex items-center gap-3 max-w-[165px] sm:max-w-[185px]">
                                                                            <div className="w-9 h-9 rounded-full bg-[#EBF1F6] dark:bg-zinc-800 flex items-center justify-center text-[#557896] dark:text-zinc-400 shrink-0">
                                                                                {iconObj.icon}
                                                                            </div>
                                                                            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate" title={r.reasonText}>
                                                                                {r.reasonText}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-2.5 text-right tabular-nums text-xs font-medium text-slate-800 dark:text-zinc-300">
                                                                        ₹{billed.toLocaleString()}
                                                                    </td>
                                                                    <td className="py-2.5 text-right tabular-nums text-xs font-medium text-slate-800 dark:text-zinc-300">
                                                                        ₹{r.totalAmount.toLocaleString()}
                                                                    </td>
                                                                    <td className="py-2.5">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <div className="w-20 sm:w-24 h-3.5 bg-[#D6E2EC] dark:bg-zinc-800 rounded-full relative overflow-hidden flex items-center p-0.5">
                                                                                <div 
                                                                                    className="h-full rounded-full bg-gradient-to-r from-[#48B8C2] to-[#369EA8] relative flex items-center"
                                                                                    style={{ width: `${Math.min(100, Math.max(12, pct))}%` }}
                                                                                >
                                                                                    <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] absolute right-0.5 top-1/2 -translate-y-1/2" />
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-xs font-medium text-slate-600 dark:text-zinc-300 w-11 text-right tabular-nums">
                                                                                {pct.toFixed(1)}%
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-2.5 text-center pr-1">
                                                                        <div className="flex justify-center">
                                                                            <CircularProgressGauge percentage={marginPct} color="#14B8A6" />
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {intelligence.topPresetReasons.length === 0 && (
                                                            <tr>
                                                                <td colSpan={5} className="text-center py-6 text-xs text-slate-400">
                                                                    No patient presets used yet.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* CARD 2: CORPORATE B2B WHOLESALE PARTNERS */}
                                        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-[0_4px_24px_rgba(30,50,80,0.04),0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
                                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                                                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                                    Corporate B2B Wholesale Partners
                                                </h4>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                        ₹{intelligence.partnerDiscountAmount.toLocaleString()}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-medium">
                                                        ({intelligence.partnerBillsCount} Bills)
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse table-fixed">
                                                    <thead>
                                                        <tr className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800">
                                                            <th className="pb-2.5 pl-1 font-medium w-[170px] sm:w-[190px]">Partner Organization</th>
                                                            <th className="pb-2.5 text-right font-medium w-[68px]">Gross Tariff</th>
                                                            <th className="pb-2.5 text-right font-medium w-[68px]">Concession</th>
                                                            <th className="pb-2.5 text-center font-medium w-[130px] sm:w-[145px]">Concession Share</th>
                                                            <th className="pb-2.5 text-center font-medium w-[48px] pr-1">Net Yield</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50 dark:divide-zinc-800/40">
                                                        {intelligence.topB2BPartners.slice(0, 5).map((p, i) => {
                                                            const billed = Math.round(p.totalAmount / (intelligence.overallDiscountPercentage / 100 || 0.31));
                                                            const pct = Number(p.percentageOfPartnerDiscounts) || 25;
                                                            const marginPct = Math.min(95, Math.max(68, Number(100 - pct * 0.45)));
                                                            const iconObj = PARTNER_ICONS[i % PARTNER_ICONS.length];
                                                            return (
                                                                <tr key={i} className="h-12 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                                                                    <td className="py-2.5 pl-1">
                                                                        <div className="flex items-center gap-3 max-w-[165px] sm:max-w-[185px]">
                                                                            <div className="w-9 h-9 rounded-full bg-[#EBF1F6] dark:bg-zinc-800 flex items-center justify-center text-[#557896] dark:text-zinc-400 shrink-0">
                                                                                {iconObj.icon}
                                                                            </div>
                                                                            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate" title={p.partnerName}>
                                                                                {p.partnerName}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-2.5 text-right tabular-nums text-xs font-medium text-slate-800 dark:text-zinc-300">
                                                                        ₹{billed.toLocaleString()}
                                                                    </td>
                                                                    <td className="py-2.5 text-right tabular-nums text-xs font-medium text-slate-800 dark:text-zinc-300">
                                                                        ₹{p.totalAmount.toLocaleString()}
                                                                    </td>
                                                                    <td className="py-2.5">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <div className="w-20 sm:w-24 h-3.5 bg-[#D6E2EC] dark:bg-zinc-800 rounded-full relative overflow-hidden flex items-center p-0.5">
                                                                                <div 
                                                                                    className="h-full rounded-full bg-gradient-to-r from-[#48B8C2] to-[#369EA8] relative flex items-center"
                                                                                    style={{ width: `${Math.min(100, Math.max(12, pct))}%` }}
                                                                                >
                                                                                    <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] absolute right-0.5 top-1/2 -translate-y-1/2" />
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-xs font-medium text-slate-600 dark:text-zinc-300 w-11 text-right tabular-nums">
                                                                                {pct.toFixed(1)}%
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-2.5 text-center pr-1">
                                                                        <div className="flex justify-center">
                                                                            <CircularProgressGauge percentage={marginPct} color="#14B8A6" />
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {intelligence.topB2BPartners.length === 0 && (
                                                            <tr>
                                                                <td colSpan={5} className="text-center py-6 text-xs text-slate-400">
                                                                    No B2B partner concessions recorded yet.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 3: CONCESSION GOVERNANCE & CONTROLS (Bottom 4 Pods) */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight px-0.5">
                                        Channel Concession Governance & Operations
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {/* POD 1: CHANNEL CONCESSION BALANCE */}
                                        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-[0_4px_24px_rgba(30,50,80,0.04),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                    Channel Concession Balance
                                                </h4>
                                                <p className="text-[11px] text-slate-400 text-center font-medium mt-1">Balance</p>
                                            </div>

                                            {/* Dual Slider Indicator with swap circle */}
                                            <div className="relative py-1 flex items-center justify-center my-1">
                                                <div className="h-2.5 w-full bg-[#D6E2EC] dark:bg-zinc-800 rounded-full flex overflow-hidden">
                                                    <div style={{ width: `${intelligence.patientSharePercentage}%` }} className="bg-[#F2857D] h-full" />
                                                    <div style={{ width: `${intelligence.partnerSharePercentage}%` }} className="bg-[#5FBFA0] h-full" />
                                                </div>
                                                <div className="absolute w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-zinc-900 text-[10px]">
                                                    <ArrowLeftRight size={11} />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-xs px-0.5">
                                                <span className="text-xs font-bold text-rose-500">{intelligence.patientSharePercentage}%</span>
                                                <span className="text-xs font-bold text-emerald-600">{intelligence.partnerSharePercentage}%</span>
                                            </div>

                                            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-zinc-800">
                                                <div>
                                                    <span className="text-[11px] text-slate-400 block font-normal">Patient Walk-In</span>
                                                    <span className="font-bold text-slate-900 dark:text-white text-sm">₹{intelligence.patientDiscountAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[11px] text-slate-400 block font-normal">B2B Wholesale</span>
                                                    <div className="flex items-baseline justify-end gap-1.5">
                                                        <span className="font-bold text-slate-900 dark:text-white text-sm">₹{intelligence.partnerDiscountAmount.toLocaleString()}</span>
                                                        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">Net Split +₹{(Math.abs(intelligence.patientDiscountAmount - intelligence.partnerDiscountAmount)).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* POD 2: CHANNEL AUDIT QUEUES */}
                                        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-[0_4px_24px_rgba(30,50,80,0.04),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-3">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                Channel Concession Queues
                                            </h4>

                                            <div className="space-y-2.5">
                                                {/* Pill 1: Corporate B2B */}
                                                <div 
                                                    onClick={() => {
                                                        setHistorySource('Partner');
                                                        navigate('/finance/discounts/history');
                                                    }}
                                                    className="p-3 rounded-xl bg-[#DDE7EE] dark:bg-slate-800/60 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center gap-3 cursor-pointer"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-[#BACFE0] dark:bg-slate-700 text-[#36688D] dark:text-sky-300 flex items-center justify-center shrink-0">
                                                        <Building2 size={16} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">Corporate B2B Ledger</span>
                                                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">₹{intelligence.partnerDiscountAmount.toLocaleString()} ({intelligence.partnerBillsCount} Clients)</span>
                                                    </div>
                                                </div>

                                                {/* Pill 2: Patient Walk-Ins */}
                                                <div 
                                                    onClick={() => {
                                                        setHistorySource('Patient');
                                                        navigate('/finance/discounts/history');
                                                    }}
                                                    className="p-3 rounded-xl bg-[#EAF1F7] dark:bg-slate-800/40 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center gap-3 cursor-pointer"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-[#CBE0F0] dark:bg-slate-700 text-[#3B7BA8] dark:text-sky-300 flex items-center justify-center shrink-0">
                                                        <Users size={16} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">Patient Walk-In Ledger</span>
                                                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">₹{intelligence.patientDiscountAmount.toLocaleString()} ({intelligence.patientBillsCount} Payers)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* POD 3: STAFF CONCESSION AUTHORITY */}
                                        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-[0_4px_24px_rgba(30,50,80,0.04),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-3">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                Staff Concession Authority
                                            </h4>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-3xl font-bold text-slate-900 dark:text-white leading-none">
                                                        {intelligence.staffContributions.length || 2}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 font-medium mt-1">Active Staff</p>
                                                </div>

                                                {/* Overlapping Avatar Stack */}
                                                <div className="flex -space-x-2">
                                                    <div className="w-8 h-8 rounded-full bg-[#D1F2EB] text-[#0E6251] border-2 border-white dark:border-zinc-900 flex items-center justify-center text-xs font-bold shadow-xs">
                                                        VR
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-[#D4E6F1] text-[#2980B9] border-2 border-white dark:border-zinc-900 flex items-center justify-center text-xs font-bold shadow-xs">
                                                        AD
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-[#E8DAEF] text-[#6C3483] border-2 border-white dark:border-zinc-900 flex items-center justify-center text-xs font-bold shadow-xs">
                                                        SK
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Pipeline flow */}
                                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-3 border-t border-slate-100 dark:border-zinc-800">
                                                <span>Attendance</span>
                                                <span>&rarr;</span>
                                                <span>Draft</span>
                                                <span>&rarr;</span>
                                                <span>Paid</span>
                                            </div>
                                        </div>

                                        {/* POD 4: PRESET CATALOG HEALTH */}
                                        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-[0_4px_24px_rgba(30,50,80,0.04),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-3">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                Preset Catalog Health
                                            </h4>

                                            <div className="space-y-2.5">
                                                {/* Toggle Row 1: Active Presets */}
                                                <div 
                                                    onClick={() => {
                                                        setReasonUsageFilter('USED');
                                                        navigate('/finance/discounts/reasons');
                                                    }}
                                                    className="p-3 rounded-xl bg-[#E3F2EC] dark:bg-emerald-950/20 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 flex items-center justify-between cursor-pointer transition-all"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl font-bold text-slate-900 dark:text-white">
                                                            {intelligence.usedPresetsCount}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                                                            Active Policy Presets
                                                        </span>
                                                    </div>
                                                    {/* iOS Toggle Switch (ON) */}
                                                    <div className="w-11 h-6 rounded-full bg-[#10B981] p-0.5 flex items-center justify-end shadow-inner">
                                                        <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                                                    </div>
                                                </div>

                                                {/* Toggle Row 2: Dormant Presets */}
                                                <div 
                                                    onClick={() => {
                                                        setReasonUsageFilter('DORMANT');
                                                        navigate('/finance/discounts/reasons');
                                                    }}
                                                    className="p-3 rounded-xl bg-[#EBF0F5] dark:bg-zinc-800/40 border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 flex items-center justify-between cursor-pointer transition-all"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl font-bold text-slate-900 dark:text-white">
                                                            {intelligence.dormantPresetsCount}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                                                            Dormant Presets
                                                        </span>
                                                    </div>
                                                    {/* iOS Toggle Switch (OFF) */}
                                                    <div className="w-11 h-6 rounded-full bg-[#D5D8DC] dark:bg-zinc-600 p-0.5 flex items-center justify-start shadow-inner">
                                                        <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                )}

                {/* 1. DISCOUNT CODES TAB */}
                {tab === 'codes' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* 4 Reactive KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Total Codes</span>
                                        <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{totalCount}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                        <Tag size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    All discount codes in system
                                </p>
                            </div>

                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Active Codes</span>
                                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{activeCount}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    Ready to use at reception
                                </p>
                            </div>

                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Percentage Rules</span>
                                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{percentageCount}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <Percent size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    % off the bill
                                </p>
                            </div>

                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Flat Amount Rules</span>
                                        <p className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">{flatCount}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                        <IndianRupee size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    Fixed ₹ off the bill
                                </p>
                            </div>
                        </div>

                        {/* Search and Filter Strip */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder="Search by code or discount name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 text-xs font-medium rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary transition-colors"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-bold">
                                    {[
                                        { id: 'ALL', label: 'All Codes' },
                                        { id: 'ACTIVE', label: 'Active Only' },
                                        { id: 'INACTIVE', label: 'Inactive' }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => setActiveFilter(f.id)}
                                            className={cn(
                                                "px-3 py-1 rounded-lg transition-all cursor-pointer",
                                                activeFilter === f.id
                                                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                            )}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Codes Table */}
                        <div className="synos-dept-card rounded-2xl overflow-hidden">
                            {loadingCodes ? (
                                <div className="flex flex-col items-center justify-center p-16 gap-3 text-zinc-400">
                                    <Loader2 className="w-6 h-6 animate-spin text-synos-primary" />
                                    <span className="text-xs font-medium">Loading discount codes...</span>
                                </div>
                            ) : discounts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-16 gap-2 text-zinc-400">
                                    <Tag className="w-8 h-8 opacity-40 mb-1" />
                                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No discount codes found</p>
                                    <p className="text-xs text-zinc-500">Click &quot;Add Discount Code&quot; to configure your first code.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 dark:bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-zinc-800">
                                            <tr>
                                                <th className="py-3.5 px-4">Code</th>
                                                <th className="py-3.5 px-4">Discount Name</th>
                                                <th className="py-3.5 px-4">Type</th>
                                                <th className="py-3.5 px-4">Value</th>
                                                <th className="py-3.5 px-4">Max Cap (₹)</th>
                                                <th className="py-3.5 px-4">Effective Dates</th>
                                                <th className="py-3.5 px-4">Status</th>
                                                <th className="py-3.5 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                                            {discounts.map((d) => {
                                                const isPercentage = d.type === 0 || d.type === 'Percentage';
                                                return (
                                                    <tr key={d.discountDefinitionId || d.code} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                        <td className="py-3.5 px-4 font-mono font-bold text-synos-primary">
                                                            {d.code}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                                                            {d.name}
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className={cn(
                                                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                                                isPercentage
                                                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                                    : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                                                            )}>
                                                                {isPercentage ? <Percent className="w-2.5 h-2.5" /> : <IndianRupee className="w-2.5 h-2.5" />}
                                                                {isPercentage ? 'Percentage' : 'Flat ₹'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                                            {isPercentage ? `${d.value}%` : `₹${d.value?.toLocaleString()}`}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-mono text-zinc-500">
                                                            {d.maxLimit ? `₹${d.maxLimit.toLocaleString()}` : '—'}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                                                            {d.effectiveFrom || d.effectiveTo ? (
                                                                <span>
                                                                    {d.effectiveFrom ? new Date(d.effectiveFrom).toLocaleDateString() : 'Start'}
                                                                    {' – '}
                                                                    {d.effectiveTo ? new Date(d.effectiveTo).toLocaleDateString() : 'Always'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-zinc-400 italic">Always Active</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className={cn(
                                                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                                d.isActive
                                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                                    : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                                                            )}>
                                                                <span className={cn("w-1.5 h-1.5 rounded-full", d.isActive ? "bg-emerald-500" : "bg-zinc-400")} />
                                                                {d.isActive ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEdit(d)}
                                                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-synos-primary hover:border-synos-primary/40 text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" /> Edit
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. DISCOUNT REASONS TAB */}
                {tab === 'reasons' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* 4 Reactive KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Total Presets</span>
                                        <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{totalReasonsCount}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                        <ShieldCheck size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    Approved discount authorization reasons
                                </p>
                            </div>

                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Active at Desk</span>
                                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{activeReasonsCount}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    Visible in reception dropdowns
                                </p>
                            </div>

                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Doctor Recommendations</span>
                                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{doctorReasonsCount}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <User size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    Discounts on doctor reference (e.g. Dr. DVR)
                                </p>
                            </div>

                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Management Approvals</span>
                                        <p className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">{managementReasonsCount}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                        <Receipt size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    Lab Owner / Director concessions
                                </p>
                            </div>
                        </div>

                        {/* Search and Filter Strip */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder="Search by reason text, authority or description..."
                                    value={reasonSearch}
                                    onChange={(e) => setReasonSearch(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 text-xs font-medium rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary transition-colors"
                                />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Utilization Filter Pills */}
                                <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-bold">
                                    {[
                                        { id: 'ALL', label: `All (${totalReasonsCount})` },
                                        { id: 'USED', label: `Used in Bills (${usedReasonsCount})` },
                                        { id: 'DORMANT', label: `Dormant (${dormantReasonsCount})` }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => setReasonUsageFilter(f.id)}
                                            className={cn(
                                                "px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap",
                                                reasonUsageFilter === f.id
                                                    ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-xs"
                                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                            )}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Active Filter */}
                                <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-bold">
                                    {[
                                        { id: 'ALL', label: 'All' },
                                        { id: 'ACTIVE', label: 'Active' },
                                        { id: 'INACTIVE', label: 'Off' }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => setReasonActiveFilter(f.id)}
                                            className={cn(
                                                "px-2 py-1 rounded-lg transition-all cursor-pointer",
                                                reasonActiveFilter === f.id
                                                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                            )}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Sort Order Selector */}
                                <select
                                    value={reasonSortBy}
                                    onChange={(e) => setReasonSortBy(e.target.value)}
                                    className="h-9 px-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary text-zinc-700 dark:text-zinc-300 cursor-pointer"
                                >
                                    <option value="HIGHEST_DISCOUNT">Sort: Highest Concession (₹)</option>
                                    <option value="MOST_USED">Sort: Most Used (Bills)</option>
                                    <option value="NAME">Sort: Preset Name (A-Z)</option>
                                    <option value="DEFAULT">Sort: Default Order</option>
                                </select>

                                {categories.length > 2 && (
                                    <select
                                        value={reasonCategoryFilter}
                                        onChange={(e) => setReasonCategoryFilter(e.target.value)}
                                        className="h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary text-zinc-700 dark:text-zinc-300"
                                    >
                                        <option value="ALL">All Categories</option>
                                        {categories.filter(c => c !== 'ALL').map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {/* Reasons Table */}
                        <div className="synos-dept-card rounded-2xl overflow-hidden">
                            {loadingReasons ? (
                                <div className="flex flex-col items-center justify-center p-16 gap-3 text-zinc-400">
                                    <Loader2 className="w-6 h-6 animate-spin text-synos-primary" />
                                    <span className="text-xs font-medium">Loading discount reasons...</span>
                                </div>
                            ) : filteredReasons.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-16 gap-2 text-zinc-400">
                                    <ShieldCheck className="w-8 h-8 opacity-40 mb-1" />
                                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No preset discount reasons found</p>
                                    <p className="text-xs text-zinc-500">Click &quot;Add Preset Reason&quot; to configure authorized reasons for reception staff.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 dark:bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-zinc-800">
                                            <tr>
                                                <th className="py-3.5 px-4">Reason / Authorized Authority</th>
                                                <th className="py-3.5 px-4">Category</th>
                                                <th className="py-3.5 px-4 text-center">Usage Count</th>
                                                <th className="py-3.5 px-4 text-right">Total Concession</th>
                                                <th className="py-3.5 px-4">Description / Guidance</th>
                                                <th className="py-3.5 px-4">Created By</th>
                                                <th className="py-3.5 px-4">Status</th>
                                                <th className="py-3.5 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                                            {filteredReasons.map((r) => (
                                                <tr key={r.discountReasonId} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                    <td className="py-3.5 px-4">
                                                        <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                                                            {r.reasonText}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-400 font-mono">
                                                            Order: {r.sortOrder ?? 0}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                            r.category === 'Doctor Recommendation'
                                                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                                : r.category === 'Management Approval'
                                                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                                                : r.category === 'Special Concession'
                                                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                                                : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                                                        )}>
                                                            {r.category || 'General'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        {(r.usageCount || 0) > 0 ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                                {r.usageCount} {r.usageCount === 1 ? 'bill' : 'bills'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-zinc-400 text-[11px]">0</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-right">
                                                        {(r.totalDiscountAmount || 0) > 0 ? (
                                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                                ₹{r.totalDiscountAmount.toLocaleString()}
                                                            </span>
                                                        ) : (
                                                            <span className="text-zinc-400 text-xs">₹0</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300 text-xs max-w-xs truncate">
                                                        {r.description || <span className="text-zinc-400 italic">No notes</span>}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-zinc-500 text-xs">
                                                        {r.createdBy || 'System'}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleReasonActive(r)}
                                                            className={cn(
                                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer",
                                                                r.isActive
                                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                                                    : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20 hover:bg-zinc-500/20"
                                                            )}
                                                            title="Click to toggle active status"
                                                        >
                                                            <span className={cn("w-1.5 h-1.5 rounded-full", r.isActive ? "bg-emerald-500" : "bg-zinc-400")} />
                                                            {r.isActive ? 'Active' : 'Inactive'}
                                                        </button>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        <div className="inline-flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingReason(r);
                                                                    setIsReasonModalOpen(true);
                                                                }}
                                                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-synos-primary hover:border-synos-primary/40 text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" /> Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteReason(r.discountReasonId)}
                                                                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-rose-500 hover:text-rose-600 hover:border-rose-500/40 text-xs font-semibold inline-flex items-center transition-all cursor-pointer"
                                                                title="Delete reason"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. DISCOUNT HISTORY TAB */}
                {tab === 'history' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* 4 Reactive KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Total Discount Given</span>
                                        <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">₹{totalDiscountAmount.toLocaleString()}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <IndianRupee size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    Total ₹ reduced from bills
                                </p>
                            </div>

                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Bills Discounted</span>
                                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{totalBillsDiscounted}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <Receipt size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    {patientDiscountCount} Patient · {partnerDiscountCount} Partner
                                </p>
                            </div>

                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Average Discount</span>
                                        <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">₹{avgDiscountAmount.toLocaleString()}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                        <Percent size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    Average discount per bill
                                </p>
                            </div>

                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Staff Members</span>
                                        <p className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">{staffBreakdown.length}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                        <Users size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    Staff who gave discounts
                                </p>
                            </div>
                        </div>

                        {/* Filter Strip with Partner Discounts Toggle */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder="Search by patient, token, staff name, or code..."
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 text-xs font-medium rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary transition-colors"
                                />
                            </div>

                            {/* Discrete Source Filter Pills: Default is All Concessions */}
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-zinc-500 hidden md:inline">Channel:</span>
                                <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-bold">
                                    {[
                                        { id: 'All', label: 'All Concessions' },
                                        { id: 'Patient', label: 'Patient Walk-Ins (Desk)' },
                                        { id: 'Partner', label: 'B2B Partners (Wholesale)' }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => setHistorySource(f.id)}
                                            className={cn(
                                                "px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap",
                                                historySource === f.id
                                                    ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-xs"
                                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                            )}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* History Table */}
                        <div className="synos-dept-card rounded-2xl overflow-hidden">
                            {loadingHistory ? (
                                <div className="flex flex-col items-center justify-center p-16 gap-3 text-zinc-400">
                                    <Loader2 className="w-6 h-6 animate-spin text-synos-primary" />
                                    <span className="text-xs font-medium">Loading discount history...</span>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-16 gap-2 text-zinc-400">
                                    <Receipt className="w-8 h-8 opacity-40 mb-1" />
                                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No discount records found</p>
                                    <p className="text-xs text-zinc-500">Discounts given at the reception counter will appear here.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 dark:bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-zinc-800">
                                            <tr>
                                                <th className="py-3.5 px-4">Date & Time</th>
                                                <th className="py-3.5 px-4">Bill Token</th>
                                                <th className="py-3.5 px-4">Patient Name</th>
                                                <th className="py-3.5 px-4">Category</th>
                                                <th className="py-3.5 px-4">Discount Name / Code</th>
                                                <th className="py-3.5 px-4 text-right">Original Bill</th>
                                                <th className="py-3.5 px-4 text-right">Discount Given</th>
                                                <th className="py-3.5 px-4 text-right">Final Bill</th>
                                                <th className="py-3.5 px-4">Given By</th>
                                                <th className="py-3.5 px-4">Reason / Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                                            {history.map((h) => {
                                                const isPartner = h.source !== 'Patient';
                                                return (
                                                    <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                        <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                                                            {formatDateCompact(h.occurredAt)}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-mono font-bold text-synos-primary">
                                                            {h.visitToken || '—'}
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{h.patientName}</div>
                                                            {h.patientMrn && <div className="text-[10px] text-zinc-400 font-mono">{h.patientMrn}</div>}
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className={cn(
                                                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                                                isPartner
                                                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                            )}>
                                                                {isPartner ? 'Partner B2B' : 'Patient Walk-In'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 font-medium text-zinc-700 dark:text-zinc-300">
                                                            {h.discountName}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-mono text-right text-zinc-500">
                                                            ₹{Number(h.grossAmount || 0).toLocaleString()}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
                                                            - ₹{Number(h.discountAmount || 0).toLocaleString()}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-mono font-bold text-right text-zinc-900 dark:text-zinc-100">
                                                            ₹{Number(h.netAmount || 0).toLocaleString()}
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <div className="inline-flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-200">
                                                                <User className="w-3 h-3 text-zinc-400" />
                                                                <span>{h.appliedBy}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-zinc-500 text-[11px] max-w-xs truncate">
                                                            {h.reason || '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. STAFF SUMMARY TAB */}
                {tab === 'staff' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* 4 Reactive KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Active Staff Members</span>
                                        <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{staffBreakdown.length}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                        <Users size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    Staff who gave discounts
                                </p>
                            </div>

                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Total Discount Given</span>
                                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">₹{totalDiscountAmount.toLocaleString()}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <IndianRupee size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    Across all staff members
                                </p>
                            </div>

                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Top Staff Member</span>
                                        <p className="text-xl font-black text-zinc-900 dark:text-white tracking-tight truncate max-w-[170px]">
                                            {staffBreakdown[0]?.name || 'None'}
                                        </p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <User size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    {staffBreakdown[0] ? `₹${staffBreakdown[0].totalDiscount.toLocaleString()} given` : 'No records yet'}
                                </p>
                            </div>

                            <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Total Discounted Bills</span>
                                        <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{totalBillsDiscounted}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                        <Receipt size={17} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    Number of bills with discount
                                </p>
                            </div>
                        </div>

                        {/* Staff Summary Table */}
                        <div className="synos-dept-card rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800">
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Staff Concession Report</h3>
                                <p className="text-xs text-zinc-500">Summary of discounts given by each receptionist and staff member</p>
                            </div>

                            {loadingHistory ? (
                                <div className="flex flex-col items-center justify-center p-16 gap-3 text-zinc-400">
                                    <Loader2 className="w-6 h-6 animate-spin text-synos-primary" />
                                    <span className="text-xs font-medium">Calculating staff totals...</span>
                                </div>
                            ) : staffBreakdown.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-16 gap-2 text-zinc-400">
                                    <Users className="w-8 h-8 opacity-40 mb-1" />
                                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No staff discount records found</p>
                                    <p className="text-xs text-zinc-500">Discounts given by staff will be listed here.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 dark:bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-zinc-800">
                                            <tr>
                                                <th className="py-3.5 px-4">Staff Member</th>
                                                <th className="py-3.5 px-4 text-center">Number of Times Given</th>
                                                <th className="py-3.5 px-4 text-right">Total Discount Given</th>
                                                <th className="py-3.5 px-4 text-right">Average per Patient</th>
                                                <th className="py-3.5 px-4 text-center">Percentage vs Flat</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                                            {staffBreakdown.map((s) => {
                                                const avg = s.count > 0 ? Math.round(s.totalDiscount / s.count) : 0;
                                                return (
                                                    <tr key={s.name} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                        <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                                                                    <User className="w-3.5 h-3.5" />
                                                                </div>
                                                                <span>{s.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-semibold text-zinc-700 dark:text-zinc-300">
                                                            {s.count} bills
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                            ₹{s.totalDiscount.toLocaleString()}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono font-medium text-zinc-700 dark:text-zinc-300">
                                                            ₹{avg.toLocaleString()}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            <span className="text-[11px] text-zinc-500 font-medium">
                                                                {s.percentageCount} % off · {s.flatCount} flat ₹
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <DiscountFormModal
                    discount={editingDiscount}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        loadDiscounts();
                    }}
                />
            )}

            {/* Create / Edit Reason Modal */}
            {isReasonModalOpen && (
                <DiscountReasonModal
                    reason={editingReason}
                    onClose={() => setIsReasonModalOpen(false)}
                    onSuccess={() => {
                        setIsReasonModalOpen(false);
                        loadReasons();
                    }}
                />
            )}

            {/* A4 Printable Summary Modal */}
            <FinancePrintableSummaryModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                slotId="summary_bills_daybook"
                title={tab === 'staff' ? "Staff Concession & Discount Report" : "Patient Discount & Concession Ledger"}
                subtitle={tab === 'staff' ? "Itemized summary of discounts given by reception and cashier staff" : "Audit record of all discounts given at reception"}
                dateRangeText="All Recorded Period"
                categoryLabel="DISCOUNT AUDIT SUMMARY"
                filterTags={[
                    historySource !== 'All' ? `Type: ${historySource}` : null,
                    historySearch ? `Search: "${historySearch}"` : null
                ].filter(Boolean)}
                kpis={[
                    { label: "Total Discounts Given", value: `₹${totalDiscountAmount.toLocaleString()}`, color: "text-emerald-600", subtext: `${totalBillsDiscounted} Bills Discounted` },
                    { label: "Average Discount", value: `₹${avgDiscountAmount.toLocaleString()}`, color: "text-blue-600", subtext: "Per Patient" },
                    { label: "Active Staff", value: staffBreakdown.length, color: "text-purple-600", subtext: "Staff Members" }
                ]}
                columns={tab === 'staff' ? [
                    { key: 'name', label: 'Staff Member' },
                    { key: 'count', label: 'Number of Bills', align: 'center', render: (v) => `${v} bills` },
                    { key: 'totalDiscount', label: 'Total Discount (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'count', label: 'Average (₹)', align: 'right', render: (v, r) => `₹${r.count > 0 ? Math.round(r.totalDiscount / r.count).toLocaleString() : 0}` }
                ] : [
                    { key: 'occurredAt', label: 'Date & Time', render: (v) => formatDateCompact(v) },
                    { key: 'visitToken', label: 'Token', render: (v) => v || '-' },
                    { key: 'patientName', label: 'Patient Name' },
                    { key: 'source', label: 'Category', render: (v) => v || 'Patient' },
                    { key: 'discountName', label: 'Discount Name' },
                    { key: 'grossAmount', label: 'Original Bill (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'discountAmount', label: 'Discount (₹)', align: 'right', render: (v) => `- ₹${Number(v || 0).toLocaleString()}` },
                    { key: 'netAmount', label: 'Final Bill (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'appliedBy', label: 'Given By' },
                    { key: 'reason', label: 'Reason / Notes', render: (v) => v || '-' }
                ]}
                data={tab === 'staff' ? staffBreakdown : history}
                summaryTotals={{
                    discountAmount: `₹${totalDiscountAmount.toLocaleString()}`
                }}
                onDownloadCsv={handleDownloadCSV}
            />
        </div>
    );
}

function DiscountFormModal({ discount, onClose, onSuccess }) {
    const isEdit = !!discount;
    const [code, setCode] = useState(discount?.code || '');
    const [name, setName] = useState(discount?.name || '');
    const [type, setType] = useState(
        discount?.type === 1 || discount?.type === 'Flat' ? 1 : 0
    );
    const [value, setValue] = useState(discount?.value ?? '');
    const [maxLimit, setMaxLimit] = useState(discount?.maxLimit ?? '');
    const [effectiveFrom, setEffectiveFrom] = useState(
        discount?.effectiveFrom ? new Date(discount.effectiveFrom).toISOString().slice(0, 10) : ''
    );
    const [effectiveTo, setEffectiveTo] = useState(
        discount?.effectiveTo ? new Date(discount.effectiveTo).toISOString().slice(0, 10) : ''
    );
    const [isActive, setIsActive] = useState(discount?.isActive ?? true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError("Discount name is required.");
            return;
        }

        const numericVal = parseFloat(value);
        if (isNaN(numericVal) || numericVal <= 0) {
            setError("Discount value must be greater than zero.");
            return;
        }

        if (type === 0 && numericVal > 100) {
            setError("Percentage discount cannot exceed 100%.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEdit) {
                const id = discount.discountDefinitionId || discount.id;
                await FinanceApi.updateDiscount(id, {
                    name: name.trim(),
                    value: numericVal,
                    maxLimit: maxLimit ? parseFloat(maxLimit) : null,
                    isActive: isActive,
                    effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : null,
                    effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null
                });
            } else {
                if (!code.trim()) {
                    setError("Discount code is required.");
                    setIsSubmitting(false);
                    return;
                }
                await FinanceApi.createDiscount({
                    code: code.trim().toUpperCase(),
                    name: name.trim(),
                    type: type,
                    value: numericVal,
                    maxLimit: maxLimit ? parseFloat(maxLimit) : null,
                    isActive: isActive,
                    effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : null,
                    effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null
                });
            }
            onSuccess();
        } catch (err) {
            setError(err.message || "Failed to save discount definition");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-900 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-synos-primary/10 border border-synos-primary/20 flex items-center justify-center text-synos-primary">
                            <Tag className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {isEdit ? `Edit Discount (${discount.code})` : "Add New Discount Code"}
                            </h3>
                            <p className="text-[10px] text-zinc-500 font-medium">Create a discount code for reception to use</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="m-4 mb-0 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                Discount Code *
                            </label>
                            <input
                                type="text"
                                required
                                disabled={isEdit}
                                placeholder="e.g. SENIOR10"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                className="w-full h-9 px-3 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary uppercase disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                Discount Type *
                            </label>
                            <select
                                disabled={isEdit}
                                value={type}
                                onChange={(e) => setType(parseInt(e.target.value, 10))}
                                className="w-full h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary disabled:opacity-50"
                            >
                                <option value={0}>Percentage (% Off)</option>
                                <option value={1}>Flat Amount (₹ Off)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                            Discount Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Senior Citizen Discount"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                {type === 0 ? "Discount Percentage (%) *" : "Flat Discount (₹) *"}
                            </label>
                            <input
                                type="number"
                                required
                                min="0"
                                max={type === 0 ? 100 : 100000}
                                step={type === 0 ? "0.5" : "1"}
                                placeholder={type === 0 ? "10" : "200"}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                Maximum Limit (₹) (Optional)
                            </label>
                            <input
                                type="number"
                                min="0"
                                placeholder="e.g. 500"
                                value={maxLimit}
                                onChange={(e) => setMaxLimit(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl text-xs font-mono font-medium bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                Start Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={effectiveFrom}
                                onChange={(e) => setEffectiveFrom(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl text-xs font-medium bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                End Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={effectiveTo}
                                onChange={(e) => setEffectiveTo(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl text-xs font-medium bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-synos-primary focus:ring-synos-primary cursor-pointer"
                        />
                        <label htmlFor="isActive" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                            Active and ready to use at reception
                        </label>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-zinc-900">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-900 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 bg-synos-primary text-white rounded-xl text-xs font-bold hover:brightness-105 active:scale-95 disabled:opacity-50 cursor-pointer transition-all shadow-md shadow-synos-primary/20"
                        >
                            {isSubmitting ? "Saving..." : (isEdit ? "Update Code" : "Save Code")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DiscountReasonModal({ reason, onClose, onSuccess }) {
    const isEdit = !!reason;
    const [reasonText, setReasonText] = useState(reason?.reasonText || '');
    const [category, setCategory] = useState(reason?.category || 'Doctor Recommendation');
    const [description, setDescription] = useState(reason?.description || '');
    const [sortOrder, setSortOrder] = useState(reason?.sortOrder ?? 0);
    const [isActive, setIsActive] = useState(reason?.isActive ?? true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!reasonText.trim()) {
            setError("Reason text is required.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEdit) {
                await FinanceApi.updateDiscountReason(reason.discountReasonId, {
                    reasonText: reasonText.trim(),
                    category: category.trim(),
                    description: description.trim() || null,
                    sortOrder: parseInt(sortOrder, 10) || 0,
                    isActive: isActive
                });
            } else {
                await FinanceApi.createDiscountReason({
                    reasonText: reasonText.trim(),
                    category: category.trim(),
                    description: description.trim() || null,
                    sortOrder: parseInt(sortOrder, 10) || 0,
                    isActive: isActive
                });
            }
            onSuccess();
        } catch (err) {
            setError(err.message || "Failed to save discount reason");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-900 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-synos-primary/10 border border-synos-primary/20 flex items-center justify-center text-synos-primary">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {isEdit ? "Edit Preset Discount Reason" : "Add Preset Discount Reason"}
                            </h3>
                            <p className="text-[10px] text-zinc-500 font-medium">Standardize reasons for receptionist billing to prevent spelling errors</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="m-4 mb-0 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                            Reason / Authorization Authority *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Dr. DVR Recommendation, Lab Owner Approval, BPL Concession"
                            value={reasonText}
                            onChange={(e) => setReasonText(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                Category *
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary"
                            >
                                <option value="Doctor Recommendation">Doctor Recommendation</option>
                                <option value="Management Approval">Management Approval</option>
                                <option value="Special Concession">Special Concession</option>
                                <option value="Internal Courtesy">Internal Courtesy</option>
                                <option value="Social Support">Social Support</option>
                                <option value="Campaign">Campaign / Camp</option>
                                <option value="General">General</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                Sort Order
                            </label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl text-xs font-mono font-medium bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                            Description / Policy Notes (Optional)
                        </label>
                        <textarea
                            rows={2}
                            placeholder="Optional notes or instructions for receptionist staff..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-3 rounded-xl text-xs font-medium bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="reasonIsActive"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-synos-primary focus:ring-synos-primary cursor-pointer"
                        />
                        <label htmlFor="reasonIsActive" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                            Active and selectable by Receptionists
                        </label>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-zinc-900">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-900 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 bg-synos-primary text-white rounded-xl text-xs font-bold hover:brightness-105 active:scale-95 disabled:opacity-50 cursor-pointer transition-all shadow-md shadow-synos-primary/20"
                        >
                            {isSubmitting ? "Saving..." : (isEdit ? "Update Reason" : "Save Reason")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
