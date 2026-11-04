import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Users, 
    Search, 
    UserPlus, 
    Building2, 
    ShieldCheck, 
    AlertCircle, 
    X, 
    ChevronRight, 
    ChevronLeft, 
    Phone, 
    IndianRupee, 
    Stethoscope, 
    Sparkles, 
    Zap, 
    TrendingUp, 
    RefreshCw, 
    Edit3, 
    Save, 
    Check,
    ExternalLink, 
    Award, 
    CreditCard, 
    Trash2, 
    Loader2, 
    ArrowRight, 
    Activity,
    LayoutGrid,
    List,
    ArrowUpDown,
    Filter
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { cn } from '@/lib/utils';

export const PartnerRegistryTab = ({ defaultPartnerType = null, isRmpOnly = false }) => {
    // Directory state
    const [directoryData, setDirectoryData] = useState({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 24,
        totalPages: 0,
        totalDoctorsCount: 0,
        activeReferrersThisMonthCount: 0,
        doctorsWithUnmappedTestsCount: 0,
        totalLifetimeReferralRevenue: 0
    });
    const [loading, setLoading] = useState(true);

    // View Mode: 'grid' (Thumbnails / Cards) vs 'details' (Enterprise High-Density Table)
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem('synos_doctor_view_mode') || 'grid';
    });

    // Filters & Pagination
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'has_unmapped' | 'active'
    const [specialityFilter, setSpecialityFilter] = useState('all');
    const [sortBy, setSortBy] = useState('revenue');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(24);

    // Modals & Drawers
    const [selectedDoctorId, setSelectedDoctorId] = useState(null);
    const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        localStorage.setItem('synos_doctor_view_mode', mode);
    };

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const loadDirectory = useCallback(async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getDoctorDirectory({
                query: debouncedSearch,
                status: statusFilter,
                speciality: specialityFilter,
                partnerType: isRmpOnly ? 'RMP' : (defaultPartnerType || undefined),
                sortBy: sortBy,
                page: page,
                pageSize: pageSize
            });
            setDirectoryData(data || {
                items: [],
                totalCount: 0,
                page: 1,
                pageSize: pageSize,
                totalPages: 0,
                totalDoctorsCount: 0,
                activeReferrersThisMonthCount: 0,
                doctorsWithUnmappedTestsCount: 0,
                totalLifetimeReferralRevenue: 0
            });
        } catch (err) {
            console.error("Failed to load doctor directory", err);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, statusFilter, specialityFilter, sortBy, page, pageSize, isRmpOnly, defaultPartnerType]);

    useEffect(() => {
        loadDirectory();
    }, [loadDirectory]);

    return (
        <div className="p-8 space-y-6 pb-16 bg-transparent relative z-10 animate-in fade-in duration-300">
            {/* SECTION 1: KEY PERFORMANCE METRICS (NATIVE FLOATING METRICBOX CARDS) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-black/[0.05] dark:border-white/[0.05] pb-2">
                    <span className="w-1 h-4 bg-synos-primary rounded-full" />
                    <h2 className="text-xs font-black dark:text-zinc-400 text-zinc-650 tracking-wider uppercase">
                        Doctor Network Overview
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="synos-kpi-card p-4 rounded-xl flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="type-label">Total Registered Doctors</span>
                            <Users className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div className="type-display !text-2xl text-zinc-900 dark:text-white">
                            {directoryData.totalDoctorsCount?.toLocaleString() || 0}
                        </div>
                        <div className="type-meta mt-1 opacity-70">Empanelled Referral Network</div>
                    </div>

                    <div className="synos-kpi-card p-4 rounded-xl flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="type-label">Active Referrers (This Month)</span>
                            <TrendingUp className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div className="type-display !text-2xl text-zinc-900 dark:text-white">
                            {directoryData.activeReferrersThisMonthCount?.toLocaleString() || 0}
                        </div>
                        <div className="type-meta mt-1 opacity-70">Referred Patients This Cycle</div>
                    </div>

                    <div 
                        onClick={() => { setStatusFilter('has_unmapped'); setPage(1); }}
                        className={cn(
                            "synos-kpi-card p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all",
                            directoryData.doctorsWithUnmappedTestsCount > 0 && "border-amber-300 dark:border-amber-900/50"
                        )}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="type-label">Awaiting Rates</span>
                                {directoryData.doctorsWithUnmappedTestsCount > 0 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                )}
                            </div>
                            <Zap className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div className={cn(
                            "type-display !text-2xl",
                            directoryData.doctorsWithUnmappedTestsCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-white"
                        )}>
                            {directoryData.doctorsWithUnmappedTestsCount || 0}
                        </div>
                        <div className="type-meta mt-1 opacity-70">
                            {directoryData.doctorsWithUnmappedTestsCount > 0 ? "Click to view doctors requiring rate setting" : "All prescribed tests mapped"}
                        </div>
                    </div>

                    <div className="synos-kpi-card p-4 rounded-xl flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="type-label">Lifetime Referral Revenue</span>
                            <IndianRupee className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div className="type-display !text-2xl text-zinc-900 dark:text-white">
                            ₹ {Number(directoryData.totalLifetimeReferralRevenue || 0).toLocaleString()}
                        </div>
                        <div className="type-meta mt-1 opacity-70">Total Prescribed Diagnostics</div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: TOOLBAR & CONTROLS (NATIVE FLOATING BAR WITH DUAL VIEW SWITCHER) */}
            <div className="synos-dept-card p-3 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[240px] max-w-sm group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-synos-primary transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search doctor, clinic, speciality, phone..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-7 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Filter Segmented Control */}
                    <div className="flex items-center bg-slate-200/60 dark:bg-zinc-800/80 p-0.5 rounded-lg">
                        {[
                            { id: 'all', label: 'All Doctors' },
                            { 
                                id: 'has_unmapped', 
                                label: 'Awaiting Rate', 
                                count: directoryData.doctorsWithUnmappedTestsCount 
                            },
                            { id: 'active', label: 'Active' },
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => { setStatusFilter(btn.id); setPage(1); }}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
                                    statusFilter === btn.id 
                                        ? "bg-white dark:bg-zinc-700 text-synos-primary shadow-sm" 
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                                )}
                            >
                                <span>{btn.label}</span>
                                {btn.count > 0 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Sort Dropdown */}
                    <select
                        value={sortBy}
                        onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                    >
                        <option value="revenue">Sort: Highest Revenue</option>
                        <option value="patients">Sort: Most Patients</option>
                        <option value="unmapped">Sort: Awaiting Rates First</option>
                        <option value="recent">Sort: Recently Active</option>
                        <option value="name">Sort: Name (A-Z)</option>
                    </select>

                    {/* Page Size Selector for Large Scales */}
                    <div className="flex items-center gap-1 text-xs type-meta">
                        <span className="text-zinc-400">Show:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                            className="px-2 py-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                        >
                            <option value={24}>24</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher: Grid View vs Details View (File Explorer Style) */}
                    <div className="flex items-center bg-slate-200/60 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-slate-300/40 dark:border-zinc-700/50">
                        <button
                            onClick={() => handleViewModeChange('grid')}
                            className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all",
                                viewMode === 'grid' 
                                    ? "bg-white dark:bg-zinc-700 text-synos-primary shadow-sm" 
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                            title="Grid View (Cards)"
                        >
                            <LayoutGrid size={14} />
                            <span className="hidden sm:inline">Grid</span>
                        </button>
                        <button
                            onClick={() => handleViewModeChange('details')}
                            className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all",
                                viewMode === 'details' 
                                    ? "bg-white dark:bg-zinc-700 text-synos-primary shadow-sm" 
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                            title="Details View (Enterprise Data Table)"
                        >
                            <List size={14} />
                            <span className="hidden sm:inline">Details</span>
                        </button>
                    </div>

                    <button 
                        onClick={loadDirectory}
                        className="p-1.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-zinc-500 rounded-lg transition-all"
                        title="Refresh Directory"
                    >
                        <RefreshCw size={14} className={cn(loading && "animate-spin text-synos-primary")} />
                    </button>
                    <button 
                        onClick={() => setIsAddDoctorModalOpen(true)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-synos-primary text-white rounded-lg text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-sm"
                    >
                        <UserPlus size={14} /> Add Doctor
                    </button>
                </div>
            </div>

            {/* SECTION 3: DOCTOR DIRECTORY CONTENT (GRID VIEW OR DETAILS VIEW) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.05] pb-2">
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-4 bg-synos-primary rounded-full" />
                        <h2 className="text-xs font-black dark:text-zinc-400 text-zinc-650 tracking-wider uppercase">
                            Doctor Registry Directory ({viewMode === 'grid' ? 'Grid View' : 'Details View'})
                        </h2>
                    </div>

                    <div className="text-xs type-meta flex items-center gap-3">
                        <span>
                            Showing {directoryData.items.length > 0 ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, directoryData.totalCount)} of {directoryData.totalCount} Doctors
                        </span>
                        {directoryData.totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button 
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="p-1 rounded-lg border border-slate-200 dark:border-zinc-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-zinc-900"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <span>{page} / {directoryData.totalPages}</span>
                                <button 
                                    disabled={page >= directoryData.totalPages}
                                    onClick={() => setPage(p => Math.min(directoryData.totalPages, p + 1))}
                                    className="p-1 rounded-lg border border-slate-200 dark:border-zinc-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-zinc-900"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1,2,3,4,5,6].map(i => (
                                <div key={i} className="h-64 synos-dept-card rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="synos-dept-card rounded-xl p-8 space-y-3">
                            {[1,2,3,4,5,6,7,8].map(i => (
                                <div key={i} className="h-8 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse" />
                            ))}
                        </div>
                    )
                ) : directoryData.items.length === 0 ? (
                    <div className="synos-dept-card rounded-xl text-center py-16 space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <Stethoscope size={24} />
                        </div>
                        <h4 className="type-value">No Doctors Found</h4>
                        <p className="type-meta max-w-sm mx-auto">
                            {search || statusFilter !== 'all' 
                                ? "No doctors match the selected filters. Try clearing your search." 
                                : "As walk-in patients are registered with referring doctors at reception, they will appear here automatically."}
                        </p>
                        {(search || statusFilter !== 'all') && (
                            <button 
                                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                                className="type-section-header text-synos-primary hover:underline"
                            >
                                Reset Search Filters
                            </button>
                        )}
                    </div>
                ) : viewMode === 'details' ? (
                    /* ENTERPRISE DETAILS VIEW (HIGH DENSITY TABLE FOR 1,000+ DOCTORS) */
                    <div className="synos-dept-card rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-black/[0.05] dark:border-white/[0.05] bg-slate-50 dark:bg-zinc-900 text-[10px] type-meta font-bold uppercase tracking-wider">
                                        <th 
                                            onClick={() => setSortBy('name')} 
                                            className="py-3 px-4 cursor-pointer hover:text-synos-primary transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>Doctor / Clinician</span>
                                                <ArrowUpDown size={11} className="opacity-50" />
                                            </div>
                                        </th>
                                        <th className="py-3 px-3">Speciality & Clinic</th>
                                        <th className="py-3 px-3">Contact</th>
                                        <th 
                                            onClick={() => setSortBy('unmapped')} 
                                            className="py-3 px-3 cursor-pointer hover:text-synos-primary transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>Rate Governance</span>
                                                <ArrowUpDown size={11} className="opacity-50" />
                                            </div>
                                        </th>
                                        <th 
                                            onClick={() => setSortBy('patients')} 
                                            className="py-3 px-3 text-right cursor-pointer hover:text-synos-primary transition-colors"
                                        >
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span>Patients</span>
                                                <ArrowUpDown size={11} className="opacity-50" />
                                            </div>
                                        </th>
                                        <th 
                                            onClick={() => setSortBy('revenue')} 
                                            className="py-3 px-3 text-right cursor-pointer hover:text-synos-primary transition-colors"
                                        >
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span>Revenue</span>
                                                <ArrowUpDown size={11} className="opacity-50" />
                                            </div>
                                        </th>
                                        <th className="py-3 px-3 text-right">Commission Due</th>
                                        <th className="py-3 px-3 text-center">Status</th>
                                        <th className="py-3 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                    {directoryData.items.map(doctor => {
                                        const phone = doctor.demographics?.phone || doctor.contactInfo;
                                        const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;
                                        const hasUnmapped = doctor.hasUnmappedWaiting || (doctor.unmappedTestsCount > 0);

                                        return (
                                            <tr 
                                                key={doctor.referralPartnerId}
                                                className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/60 transition-colors group/row"
                                            >
                                                {/* Doctor Name & MCI Tag */}
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold text-xs shrink-0 group-hover/row:text-synos-primary transition-colors">
                                                            {doctor.name
                                                                ?.replace(/^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?)\s+/i, '')
                                                                ?.split(' ')
                                                                ?.map(n => n[0])
                                                                ?.slice(0, 2)
                                                                ?.join('')
                                                                ?.toUpperCase() || 'DR'}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span 
                                                                    onClick={() => setSelectedDoctorId(doctor.referralPartnerId)}
                                                                    className="type-value !text-xs text-zinc-900 dark:text-white hover:text-synos-primary cursor-pointer font-bold transition-colors"
                                                                >
                                                                    {doctor.name}
                                                                </span>
                                                                {doctor.demographics?.registrationNumber && (
                                                                    <span className="type-code text-[9px] px-1 py-0.2 bg-slate-100 dark:bg-zinc-800 text-zinc-500 rounded border border-slate-200 dark:border-zinc-700">
                                                                        {doctor.demographics.registrationNumber}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="type-meta text-[10px] text-zinc-400 block">
                                                                {doctor.partnerType || 'Doctor'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Speciality & Clinic */}
                                                <td className="py-3 px-3">
                                                    <span className="type-value !text-xs block">
                                                        {doctor.demographics?.speciality || 'General Medicine'}
                                                    </span>
                                                    <span className="type-meta text-[11px] text-zinc-400 block line-clamp-1">
                                                        {doctor.clinicName || doctor.location || 'Walk-in Partner'}
                                                    </span>
                                                </td>

                                                {/* Contact */}
                                                <td className="py-3 px-3">
                                                    {cleanPhone ? (
                                                        <div className="flex items-center gap-2">
                                                            <a 
                                                                href={`tel:${cleanPhone}`} 
                                                                className="type-code text-xs text-zinc-600 dark:text-zinc-300 hover:text-synos-primary"
                                                                title="Call"
                                                            >
                                                                {cleanPhone}
                                                            </a>
                                                            <a 
                                                                href={`https://wa.me/91${cleanPhone}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-emerald-600 hover:opacity-80"
                                                                title="WhatsApp"
                                                            >
                                                                <ExternalLink size={11} />
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <span className="type-meta text-zinc-400">-</span>
                                                    )}
                                                </td>

                                                {/* Rate Governance Status */}
                                                <td className="py-3 px-3">
                                                    {hasUnmapped ? (
                                                        <span 
                                                            onClick={() => setSelectedDoctorId(doctor.referralPartnerId)}
                                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 text-[10px] font-bold cursor-pointer hover:bg-amber-100 transition-colors"
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                            <span>{doctor.unmappedTestsCount} Tests Awaiting Rate</span>
                                                        </span>
                                                    ) : doctor.learnedRulesCount > 0 ? (
                                                        <span className="type-code text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                                                            {doctor.learnedRulesCount} Learned Rules
                                                        </span>
                                                    ) : (
                                                        <span className="type-meta text-[11px] text-zinc-500">
                                                            Default: {doctor.defaultCommissionPercentage ?? 10}%
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Patients */}
                                                <td className="py-3 px-3 text-right">
                                                    <span className="type-value !text-xs block">
                                                        {doctor.totalPatientsReferred || 0}
                                                    </span>
                                                    {doctor.thisMonthPatientsReferred > 0 && (
                                                        <span className="type-meta text-[10px] text-cyan-600 dark:text-cyan-400 block">
                                                            +{doctor.thisMonthPatientsReferred} this mo
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Revenue */}
                                                <td className="py-3 px-3 text-right">
                                                    <span className="type-value !text-xs font-bold block">
                                                        ₹ {Number(doctor.totalRevenueGenerated || 0).toLocaleString()}
                                                    </span>
                                                </td>

                                                {/* Commission Due */}
                                                <td className="py-3 px-3 text-right">
                                                    <span className={cn(
                                                        "type-value !text-xs font-bold block",
                                                        doctor.pendingPayoutDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"
                                                    )}>
                                                        ₹ {Number(doctor.pendingPayoutDue || 0).toLocaleString()}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="py-3 px-3 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                                        <span className="type-meta text-[11px]">Active</span>
                                                    </div>
                                                </td>

                                                {/* Action */}
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={() => setSelectedDoctorId(doctor.referralPartnerId)}
                                                        className="px-2.5 py-1 text-xs font-bold text-synos-primary hover:bg-synos-primary/10 rounded-lg transition-colors inline-flex items-center gap-1"
                                                    >
                                                        <span>Profile</span>
                                                        <ArrowRight size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* GRID VIEW (STANDARDIZED WITH SYNOS DEPARTMENT CARD PATTERN) */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {directoryData.items.map(doctor => (
                            <DoctorDepartmentCard 
                                key={doctor.referralPartnerId}
                                doctor={doctor}
                                onOpenProfile={(docId) => setSelectedDoctorId(docId)}
                                onEdit={() => setEditTarget(doctor)}
                            />
                        ))}
                    </div>
                )}

                {/* PAGINATION BAR */}
                {directoryData.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                        <button 
                            disabled={page <= 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all"
                        >
                            Previous
                        </button>
                        <span className="text-xs type-meta px-2">Page {page} of {directoryData.totalPages}</span>
                        <button 
                            disabled={page >= directoryData.totalPages}
                            onClick={() => setPage(p => Math.min(directoryData.totalPages, p + 1))}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* SLIDE-OUT DOCTOR PROFILE DRAWER */}
            {selectedDoctorId && (
                <DoctorProfileDrawer 
                    doctorId={selectedDoctorId}
                    onClose={() => setSelectedDoctorId(null)}
                    onRateLearned={loadDirectory}
                />
            )}

            {/* ONBOARD NEW DOCTOR MODAL */}
            {isAddDoctorModalOpen && (
                <PartnerFormModal 
                    defaultPartnerType={isRmpOnly ? 'RMP' : 'Doctor'}
                    onClose={() => setIsAddDoctorModalOpen(false)} 
                    onSave={loadDirectory} 
                />
            )}

            {/* EDIT BASIC MODAL */}
            {editTarget && (
                <PartnerFormModal 
                    partner={editTarget} 
                    onClose={() => setEditTarget(null)} 
                    onSave={loadDirectory} 
                />
            )}
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* DOCTOR DEPARTMENT CARD (GRID VIEW)                                         */
/* -------------------------------------------------------------------------- */
const DoctorDepartmentCard = ({ doctor, onOpenProfile, onEdit }) => {
    const hasUnmapped = doctor.hasUnmappedWaiting || (doctor.unmappedTestsCount > 0);
    const phone = doctor.demographics?.phone || doctor.contactInfo;
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;

    return (
        <div className="synos-dept-card rounded-xl flex flex-col justify-between transition-all duration-200 group overflow-hidden hover:-translate-y-0.5 hover:shadow-xl">
            <div className="p-5 flex-1 space-y-4">
                {/* Header: Icon, Doctor Name, Speciality, Status Dot */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold text-xs shrink-0 group-hover:text-synos-primary transition-colors">
                            {doctor.partnerType === 'Hospital' || doctor.partnerType === 'Clinic' ? (
                                <Building2 size={18} />
                            ) : (
                                <Stethoscope size={18} />
                            )}
                        </div>
                        <div>
                            <h3 
                                onClick={() => onOpenProfile(doctor.referralPartnerId)}
                                className="type-value !text-sm leading-tight text-zinc-900 dark:text-white cursor-pointer group-hover:text-synos-primary transition-colors line-clamp-1"
                            >
                                {doctor.name}
                            </h3>
                            <p className="type-meta text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5 line-clamp-1">
                                <span>{doctor.demographics?.speciality || doctor.partnerType || 'Doctor'}</span>
                                {doctor.clinicName && <span>• {doctor.clinicName}</span>}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        <span className="type-meta text-zinc-600 dark:text-zinc-400">Active</span>
                    </div>
                </div>

                {/* Awaiting Rate Banner */}
                {hasUnmapped && (
                    <div 
                        onClick={() => onOpenProfile(doctor.referralPartnerId)}
                        className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center justify-between cursor-pointer hover:bg-amber-100/50 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>{doctor.unmappedTestsCount} test{doctor.unmappedTestsCount > 1 ? 's' : ''} awaiting commission rate</span>
                        </div>
                        <span className="type-section-header !text-[11px] text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                            Set Rate &rarr;
                        </span>
                    </div>
                )}

                {/* Commercial Metrics Strip */}
                <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-black/[0.05] dark:border-white/[0.05]">
                    <div>
                        <span className="type-meta uppercase !text-[9px] block">Patients</span>
                        <span className="type-value !text-sm block mt-0.5">
                            {doctor.totalPatientsReferred || 0}
                            {doctor.thisMonthPatientsReferred > 0 && (
                                <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 ml-1">
                                    (+{doctor.thisMonthPatientsReferred})
                                </span>
                            )}
                        </span>
                    </div>
                    <div>
                        <span className="type-meta uppercase !text-[9px] block">Revenue</span>
                        <span className="type-value !text-sm block mt-0.5">
                            ₹ {Number(doctor.totalRevenueGenerated || 0).toLocaleString()}
                        </span>
                    </div>
                    <div>
                        <span className="type-meta uppercase !text-[9px] block">Commission Due</span>
                        <span className="type-value !text-sm block mt-0.5">
                            ₹ {Number(doctor.pendingPayoutDue || 0).toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Meta Row: Rate Rules & Collection */}
                <div className="flex items-center justify-between text-xs type-meta">
                    <span className="flex items-center gap-1.5">
                        <Sparkles size={12} className="text-synos-primary" />
                        {doctor.learnedRulesCount > 0 ? (
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{doctor.learnedRulesCount} Learned Rates</span>
                        ) : (
                            <span>Default: <b>{doctor.defaultCommissionPercentage ?? 10}%</b></span>
                        )}
                    </span>
                    <div className="flex items-center gap-2">
                        {cleanPhone && (
                            <a 
                                href={`tel:${cleanPhone}`} 
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                title="Call Doctor"
                            >
                                <Phone size={12} />
                            </a>
                        )}
                        <span className="capitalize">{doctor.paymentCollectionModel || 'Lab Collects'}</span>
                    </div>
                </div>
            </div>

            {/* Standard System Card Footer */}
            <div className="border-t border-black/[0.05] dark:border-white/[0.05] flex items-center">
                <button 
                    onClick={() => onOpenProfile(doctor.referralPartnerId)} 
                    className="flex-1 py-3 type-section-header hover:text-white hover:bg-synos-primary transition-[background-color,color] flex items-center justify-center gap-2"
                >
                    <span>Open Profile & Rates</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                    onClick={onEdit}
                    className="px-3 py-3 border-l border-black/[0.05] dark:border-white/[0.05] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                    title="Edit Details"
                >
                    <Edit3 size={14} />
                </button>
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* SLIDE-OUT DOCTOR PROFILE DRAWER (360° PROFILE & RATE CARD)                  */
/* -------------------------------------------------------------------------- */
const DoctorProfileDrawer = ({ doctorId, onClose, onRateLearned }) => {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('rates');
    
    const [quickLearnInputs, setQuickLearnInputs] = useState({});
    const [savingTestId, setSavingTestId] = useState(null);

    // Inline Editing for Active Learned Rate Card
    const [editingRuleId, setEditingRuleId] = useState(null);
    const [editRuleInput, setEditRuleInput] = useState({ type: 'Percentage', value: 10 });
    const [savingEditRule, setSavingEditRule] = useState(false);

    const [demographicsForm, setDemographicsForm] = useState(null);
    const [savingDemographics, setSavingDemographics] = useState(false);
    const [demoSuccess, setDemoSuccess] = useState(false);

    useEffect(() => {
        loadProfile();
    }, [doctorId]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getDoctorProfile(doctorId);
            setProfileData(data);
            
            // Normalize backend payload: can be under .profile or .partner
            const doc = data?.profile || data?.partner || {};
            setDemographicsForm(doc.demographics || {});

            const unmapped = data?.unmappedTests || data?.unmappedPrescribedTests || [];
            const initialInputs = {};
            unmapped.forEach(t => {
                initialInputs[t.testId] = {
                    type: 'Percentage',
                    value: doc.defaultCommissionPercentage ?? 10
                };
            });
            setQuickLearnInputs(initialInputs);
        } catch (err) {
            console.error("Failed to load doctor profile", err);
        } finally {
            setLoading(false);
        }
    };

    const doc = profileData?.profile || profileData?.partner || {};
    const rateCardList = profileData?.rateCard || profileData?.learnedRules || [];
    const unmappedList = profileData?.unmappedTests || profileData?.unmappedPrescribedTests || [];
    const recentVisitsList = profileData?.recentVisits || [];
    const topTestsList = profileData?.topPrescribedTests || [];

    // Search and filter state for doctor's active rate cards
    const [rateCardSearch, setRateCardSearch] = useState('');
    const [rateCardDept, setRateCardDept] = useState('ALL');
    const [rateCardType, setRateCardType] = useState('ALL');

    const rateCardDeptStats = useMemo(() => {
        const counts = {};
        (rateCardList || []).forEach(r => {
            const dept = r.departmentName || 'General Diagnostics';
            counts[dept] = (counts[dept] || 0) + 1;
        });
        return Object.keys(counts).sort().map(name => ({
            name,
            count: counts[name]
        }));
    }, [rateCardList]);

    const rateCardTypeStats = useMemo(() => {
        let pct = 0;
        let flat = 0;
        (rateCardList || []).forEach(r => {
            const isPct = r.commissionType === 0 || r.commissionType === 'Percentage';
            if (isPct) pct++;
            else flat++;
        });
        return { pct, flat };
    }, [rateCardList]);

    const isRateFilterActive = Boolean(rateCardSearch.trim()) || rateCardDept !== 'ALL' || rateCardType !== 'ALL';

    const resetRateFilters = () => {
        setRateCardSearch('');
        setRateCardDept('ALL');
        setRateCardType('ALL');
    };

    const filteredRateCardList = useMemo(() => {
        return (rateCardList || []).filter(rule => {
            if (rateCardSearch.trim()) {
                const q = rateCardSearch.toLowerCase().trim();
                const matchName = rule.testName?.toLowerCase().includes(q);
                const matchCode = rule.testCode?.toLowerCase().includes(q);
                if (!matchName && !matchCode) return false;
            }
            if (rateCardDept !== 'ALL') {
                const dept = rule.departmentName || 'General Diagnostics';
                if (dept !== rateCardDept) return false;
            }
            if (rateCardType !== 'ALL') {
                const isPct = rule.commissionType === 0 || rule.commissionType === 'Percentage';
                if (rateCardType === 'Percentage' && !isPct) return false;
                if (rateCardType === 'Flat' && isPct) return false;
            }
            return true;
        });
    }, [rateCardList, rateCardSearch, rateCardDept, rateCardType]);

    const handleQuickLearnRate = async (testId) => {
        const input = quickLearnInputs[testId];
        if (!input || input.value === '' || isNaN(input.value) || Number(input.value) < 0) {
            alert("Please enter a valid non-negative commission amount or percentage.");
            return;
        }

        try {
            setSavingTestId(testId);
            await FinanceApi.quickLearnRate(doctorId, {
                testId: testId,
                commissionType: input.type === 'Flat' ? 1 : 0,
                commissionValue: parseFloat(input.value)
            });

            await loadProfile();
            if (onRateLearned) onRateLearned();
        } catch (err) {
            alert(err.message || "Failed to lock commission rate.");
        } finally {
            setSavingTestId(null);
        }
    };

    const handleStartEditRule = (rule) => {
        const isFlat = rule.commissionType === 1 || rule.commissionType === 'Flat';
        setEditingRuleId(rule.ruleId);
        setEditRuleInput({
            type: isFlat ? 'Flat' : 'Percentage',
            value: rule.commissionValue ?? 10
        });
    };

    const handleCancelEditRule = () => {
        setEditingRuleId(null);
        setEditRuleInput({ type: 'Percentage', value: 10 });
    };

    const handleSaveEditRule = async (rule) => {
        if (editRuleInput.value === '' || isNaN(editRuleInput.value) || Number(editRuleInput.value) < 0) {
            alert("Please enter a valid non-negative commission rate.");
            return;
        }

        try {
            setSavingEditRule(true);
            await FinanceApi.quickLearnRate(doctorId, {
                testId: rule.testId,
                commissionType: editRuleInput.type === 'Flat' ? 1 : 0,
                commissionValue: parseFloat(editRuleInput.value)
            });

            setEditingRuleId(null);
            await loadProfile();
            if (onRateLearned) onRateLearned();
        } catch (err) {
            alert(err.message || "Failed to update commission rate.");
        } finally {
            setSavingEditRule(false);
        }
    };

    const handleSaveDemographics = async (e) => {
        e.preventDefault();
        try {
            setSavingDemographics(true);
            await FinanceApi.updateDoctorDemographics(doctorId, {
                name: doc.name || '',
                clinicName: demographicsForm.clinicName || doc.clinicName || '',
                location: demographicsForm.location || doc.location || '',
                demographics: demographicsForm
            });
            setDemoSuccess(true);
            setTimeout(() => setDemoSuccess(false), 3000);
            await loadProfile();
            if (onRateLearned) onRateLearned();
        } catch (err) {
            alert(err.message || "Failed to update demographics.");
        } finally {
            setSavingDemographics(false);
        }
    };

    const handleDeleteRule = async (ruleId) => {
        if (!confirm("Are you sure you want to delete this commission rule? The doctor will fall back to their default cut.")) return;
        try {
            await FinanceApi.deleteLearnedRule(ruleId);
            await loadProfile();
            if (onRateLearned) onRateLearned();
        } catch (err) {
            alert(err.message || "Failed to delete rule.");
        }
    };

    if (!doctorId) return null;

    return (
        <div className="fixed inset-0 z-[120] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div 
                className="w-full bg-white dark:bg-zinc-950 h-full shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden"
                style={{ width: '55vw', minWidth: 'min(850px, 100vw)', maxWidth: '1400px' }}
            >
                {/* DRAWER TOP BAR */}
                <div className="px-6 py-4 border-b border-black/[0.05] dark:border-white/[0.05] bg-slate-50/70 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
                    {loading || !profileData ? (
                        <div className="flex items-center gap-3 animate-pulse">
                            <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-zinc-800" />
                            <div className="space-y-1.5">
                                <div className="h-4.5 w-44 bg-slate-200 dark:bg-zinc-800 rounded" />
                                <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-800 rounded" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-synos-primary border border-blue-100 dark:border-blue-900/50 flex items-center justify-center font-bold shadow-xs shrink-0">
                                <Stethoscope size={22} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white truncate">
                                        {doc.name}
                                    </h2>
                                    {doc.demographics?.registrationNumber && (
                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md border border-slate-200 dark:border-zinc-700">
                                            {doc.demographics.registrationNumber}
                                        </span>
                                    )}
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                                        Active Partner
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 font-medium mt-0.5 flex items-center gap-1.5 truncate">
                                    <span>{doc.demographics?.speciality || doc.partnerType || 'Doctor'}</span>
                                    {doc.clinicName && <span>• {doc.clinicName}</span>}
                                    {doc.location && <span>({doc.location})</span>}
                                </p>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all ml-3 shrink-0"
                        title="Close File"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* COMMERCIAL SUMMARY METRIC PODS */}
                {profileData && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 bg-slate-50/50 dark:bg-zinc-900/30 border-b border-black/[0.05] dark:border-white/[0.05] shrink-0">
                        {/* Pod 1: Patients */}
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
                            <div className="flex items-center justify-between text-zinc-400 mb-1">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider">Patients</span>
                                <Users size={14} className="text-blue-500" />
                            </div>
                            <span className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white tabular-nums block">
                                {doc.totalPatientsReferred || 0}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium">Referred intake</span>
                        </div>

                        {/* Pod 2: Gross Revenue */}
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
                            <div className="flex items-center justify-between text-zinc-400 mb-1">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider">Revenue</span>
                                <IndianRupee size={14} className="text-indigo-500" />
                            </div>
                            <span className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white tabular-nums block">
                                ₹{Number(doc.totalRevenueGenerated || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium">Billed tariff</span>
                        </div>

                        {/* Pod 3: Earned Commission */}
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
                            <div className="flex items-center justify-between text-zinc-400 mb-1">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider">Earned</span>
                                <Award size={14} className="text-emerald-500" />
                            </div>
                            <span className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums block">
                                ₹{Number(doc.totalCommissionEarned || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium">Total accrued</span>
                        </div>

                        {/* Pod 4: Due Payout */}
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
                            <div className="flex items-center justify-between text-zinc-400 mb-1">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider">Due Payout</span>
                                <CreditCard size={14} className="text-amber-500" />
                            </div>
                            <span className="text-lg sm:text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums block">
                                ₹{Number(doc.pendingPayoutDue || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium">Payable balance</span>
                        </div>
                    </div>
                )}

                {/* DRAWER TABS */}
                <div className="flex items-center gap-2 px-6 pt-2 border-b border-black/[0.05] dark:border-white/[0.05] shrink-0">
                    {[
                        { 
                            id: 'rates', 
                            label: 'Rate Card & Learning', 
                            badge: unmappedList.length 
                        },
                        { id: 'demographics', label: 'Doctor Demographics' },
                        { id: 'visits', label: 'Referred Visits', count: recentVisitsList.length },
                        { id: 'mix', label: 'Top Tests Mix' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 text-xs font-bold transition-all whitespace-nowrap",
                                activeTab === tab.id 
                                    ? "border-synos-primary text-synos-primary" 
                                    : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            )}
                        >
                            <span>{tab.label}</span>
                            {Boolean(tab.badge && tab.badge > 0) && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                                    {tab.badge}
                                </span>
                            )}
                            {tab.count !== undefined && (
                                <span className="text-[11px] text-zinc-400 font-semibold">
                                    ({tab.count})
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* DRAWER BODY */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {loading || !profileData ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-zinc-400">
                            <Loader2 size={24} className="animate-spin text-synos-primary" />
                            <span className="type-meta">Loading Profile...</span>
                        </div>
                    ) : (
                        <>
                            {/* TAB 1: RATES & LEARNING */}
                            {activeTab === 'rates' && (
                                <div className="space-y-6">
                                    {/* Unmapped Prescribed Tests */}
                                    {unmappedList.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                                        Unmapped Tests Prescribed at Reception ({unmappedList.length})
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-zinc-500">
                                                These tests were prescribed during billing. Set the rate below to lock it forever and recalculate pending visits atomically.
                                            </p>

                                            <div className="space-y-2.5">
                                                {unmappedList.map(test => {
                                                    const input = quickLearnInputs[test.testId] || { type: 'Percentage', value: doc.defaultCommissionPercentage ?? 10 };
                                                    const isSaving = savingTestId === test.testId;
                                                    const numVal = parseFloat(input.value) || 0;
                                                    const previewPayout = input.type === 'Percentage'
                                                        ? (test.basePrice * numVal) / 100
                                                        : numVal;

                                                    return (
                                                        <div 
                                                            key={test.testId}
                                                            className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                                                        >
                                                            <div className="space-y-1 min-w-0 flex-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-mono text-[10px] font-bold bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                                                                        {test.testCode}
                                                                    </span>
                                                                    <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                                                                        {test.testName}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap">
                                                                    <span className="font-medium">{test.departmentName}</span>
                                                                    <span>•</span>
                                                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">MRP: ₹{Number(test.basePrice || 0).toLocaleString('en-IN')}</span>
                                                                    <span>•</span>
                                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                                        Yields ₹{previewPayout.toFixed(2)} / test
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <div className="flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden p-0.5 shadow-2xs">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setQuickLearnInputs({
                                                                            ...quickLearnInputs,
                                                                            [test.testId]: { ...input, type: 'Percentage' }
                                                                        })}
                                                                        className={cn(
                                                                            "px-2.5 py-1 text-xs font-bold rounded transition-all",
                                                                            input.type === 'Percentage' ? "bg-synos-primary text-white shadow-2xs" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                                                        )}
                                                                    >
                                                                        %
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setQuickLearnInputs({
                                                                            ...quickLearnInputs,
                                                                            [test.testId]: { ...input, type: 'Flat' }
                                                                        })}
                                                                        className={cn(
                                                                            "px-2.5 py-1 text-xs font-bold rounded transition-all",
                                                                            input.type === 'Flat' ? "bg-synos-primary text-white shadow-2xs" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                                                        )}
                                                                    >
                                                                        ₹ Flat
                                                                    </button>
                                                                </div>

                                                                <input 
                                                                    type="number"
                                                                    step="any"
                                                                    value={input.value}
                                                                    onChange={(e) => setQuickLearnInputs({
                                                                        ...quickLearnInputs,
                                                                        [test.testId]: { ...input, value: e.target.value }
                                                                    })}
                                                                    className="w-20 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-center outline-none focus:ring-1 focus:ring-synos-primary"
                                                                />

                                                                <button
                                                                    onClick={() => handleQuickLearnRate(test.testId)}
                                                                    disabled={isSaving}
                                                                    className="px-3.5 py-1.5 bg-synos-primary hover:brightness-105 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                                                                >
                                                                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                                                    <span>{isSaving ? "Locking..." : "Lock Rate"}</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Active Learned Commission Rules */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white">
                                                    Active Learned Rate Card ({rateCardList.length})
                                                </span>
                                            </div>
                                            <span className="text-xs text-zinc-500 font-medium">
                                                Default Partner Cut: <b className="text-zinc-900 dark:text-zinc-100">{doc.defaultCommissionPercentage ?? 10}%</b>
                                            </span>
                                        </div>

                                        {rateCardList.length === 0 ? (
                                            <div className="p-8 text-center synos-dept-card rounded-2xl space-y-1.5 border border-dashed border-slate-300 dark:border-zinc-800">
                                                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No Custom Test Rates Configured</p>
                                                <p className="text-xs text-zinc-400">
                                                    This doctor currently receives the standard default {doc.defaultCommissionPercentage ?? 10}% commission across all tests.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="synos-dept-card rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-2xs">
                                                {/* INLINE SEARCH & FILTER TOOLBAR */}
                                                <div className="px-4 py-3 bg-slate-50/90 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
                                                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                                                        {/* Search */}
                                                        <div className="relative flex-1 min-w-[180px] max-w-xs group">
                                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-synos-primary transition-colors" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search test name or code..."
                                                                value={rateCardSearch}
                                                                onChange={(e) => setRateCardSearch(e.target.value)}
                                                                className="w-full pl-10 pr-7 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-synos-primary text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-2xs"
                                                            />
                                                            {rateCardSearch && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setRateCardSearch('')}
                                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Department */}
                                                        <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 shadow-2xs">
                                                            <Filter size={13} className="text-zinc-400 shrink-0" />
                                                            <select
                                                                value={rateCardDept}
                                                                onChange={(e) => setRateCardDept(e.target.value)}
                                                                className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer pr-1"
                                                            >
                                                                <option value="ALL">All Departments ({rateCardList.length})</option>
                                                                {rateCardDeptStats.map(d => (
                                                                    <option key={d.name} value={d.name}>
                                                                        {d.name} ({d.count})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {/* Rate Type Filter */}
                                                        <div className="inline-flex items-center bg-slate-200/70 dark:bg-zinc-800 p-0.5 rounded-xl border border-slate-300/60 dark:border-zinc-700 text-xs font-bold">
                                                            <button
                                                                type="button"
                                                                onClick={() => setRateCardType('ALL')}
                                                                className={cn(
                                                                    "px-2 py-0.5 rounded-lg transition-all text-xs cursor-pointer",
                                                                    rateCardType === 'ALL'
                                                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-2xs font-extrabold"
                                                                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                                                )}
                                                            >
                                                                All ({rateCardList.length})
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setRateCardType('Percentage')}
                                                                className={cn(
                                                                    "px-2 py-0.5 rounded-lg transition-all text-xs cursor-pointer",
                                                                    rateCardType === 'Percentage'
                                                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-2xs font-extrabold"
                                                                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                                                )}
                                                            >
                                                                % ({rateCardTypeStats.pct})
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setRateCardType('Flat')}
                                                                className={cn(
                                                                    "px-2 py-0.5 rounded-lg transition-all text-xs cursor-pointer",
                                                                    rateCardType === 'Flat'
                                                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-2xs font-extrabold"
                                                                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                                                )}
                                                            >
                                                                ₹ Flat ({rateCardTypeStats.flat})
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-xs shrink-0">
                                                        <span className="text-zinc-400 font-medium text-[11px]">
                                                            Showing <b className="text-zinc-800 dark:text-zinc-200 font-bold">{filteredRateCardList.length}</b> of {rateCardList.length}
                                                        </span>
                                                        {isRateFilterActive && (
                                                            <button
                                                                type="button"
                                                                onClick={resetRateFilters}
                                                                className="text-[11px] font-bold text-synos-primary hover:underline ml-1 cursor-pointer"
                                                            >
                                                                Reset Filters
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="overflow-x-auto">
                                                    {filteredRateCardList.length === 0 ? (
                                                        <div className="py-12 text-center text-zinc-400 space-y-2">
                                                            <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                                                                No learned rates match your search / filter criteria
                                                            </p>
                                                            <p className="text-[11px] text-zinc-400">
                                                                Try modifying the test name, selecting a different department, or resetting filters.
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={resetRateFilters}
                                                                className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold mt-1 cursor-pointer"
                                                            >
                                                                <X size={12} /> Clear Filters
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <table className="w-full text-left border-collapse text-xs">
                                                            <thead>
                                                                <tr className="border-b border-black/[0.05] dark:border-white/[0.05] bg-slate-50 dark:bg-zinc-900/60 text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">
                                                                    <th className="py-3 px-4">Test / Investigation</th>
                                                                    <th className="py-3 px-3">Department</th>
                                                                    <th className="py-3 px-3 text-right">Lab Tariff (₹)</th>
                                                                    <th className="py-3 px-4 text-center">Commission Cut</th>
                                                                    <th className="py-3 px-3 text-right">Doctor Payout</th>
                                                                    <th className="py-3 px-3 text-center">Status</th>
                                                                    <th className="py-3 px-4 text-right">Action</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                                                {filteredRateCardList.map(rule => {
                                                                const isEditing = editingRuleId === rule.ruleId;
                                                                const isPercentage = isEditing 
                                                                    ? editRuleInput.type === 'Percentage'
                                                                    : (rule.commissionType === 0 || rule.commissionType === 'Percentage');
                                                                
                                                                const numVal = isEditing 
                                                                    ? (parseFloat(editRuleInput.value) || 0)
                                                                    : Number(rule.commissionValue || 0);

                                                                const payout = isPercentage
                                                                    ? (rule.testPrice * numVal) / 100
                                                                    : numVal;

                                                                return (
                                                                    <tr 
                                                                        key={rule.ruleId} 
                                                                        className={cn(
                                                                            "transition-colors",
                                                                            isEditing 
                                                                            ? "bg-amber-50/60 dark:bg-amber-950/20 ring-1 ring-amber-300 dark:ring-amber-700/60" 
                                                                            : "hover:bg-slate-50/70 dark:hover:bg-zinc-900/50"
                                                                        )}
                                                                    >
                                                                        {/* Col 1: Test & Code */}
                                                                        <td className="py-3 px-4">
                                                                            <p className="font-bold text-zinc-900 dark:text-white text-xs">{rule.testName}</p>
                                                                            <p className="font-mono text-[10px] text-zinc-400 mt-0.5">{rule.testCode}</p>
                                                                        </td>

                                                                        {/* Col 2: Department */}
                                                                        <td className="py-3 px-3 text-zinc-500 font-medium text-[11px]">
                                                                            {rule.departmentName}
                                                                        </td>

                                                                        {/* Col 3: Base Price */}
                                                                        <td className="py-3 px-3 text-right font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                                                                            ₹{Number(rule.testPrice || 0).toLocaleString('en-IN')}
                                                                        </td>

                                                                        {/* Col 4: Commission Cut */}
                                                                        <td className="py-3 px-4 text-center">
                                                                            {isEditing ? (
                                                                                <div className="inline-flex items-center gap-1.5">
                                                                                    <div className="flex items-center bg-slate-200/90 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl p-0.5 shadow-inner">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setEditRuleInput({ ...editRuleInput, type: 'Percentage' })}
                                                                                            className={cn(
                                                                                                "px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                                                                                                editRuleInput.type === 'Percentage' ? "bg-white dark:bg-zinc-950 text-synos-primary shadow-xs font-extrabold" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                                                                            )}
                                                                                        >
                                                                                            %
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setEditRuleInput({ ...editRuleInput, type: 'Flat' })}
                                                                                            className={cn(
                                                                                                "px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                                                                                                editRuleInput.type === 'Flat' ? "bg-white dark:bg-zinc-950 text-synos-primary shadow-xs font-extrabold" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                                                                            )}
                                                                                        >
                                                                                            ₹ Flat
                                                                                        </button>
                                                                                    </div>
                                                                                    <input
                                                                                        type="number"
                                                                                        step="any"
                                                                                        value={editRuleInput.value}
                                                                                        onChange={(e) => setEditRuleInput({ ...editRuleInput, value: e.target.value })}
                                                                                        className="w-16 px-2 py-1 bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold text-center outline-none focus:ring-1 focus:ring-synos-primary"
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                <span className={cn(
                                                                                    "px-2.5 py-0.5 rounded-full text-xs font-extrabold tabular-nums",
                                                                                    rule.commissionType === 'Flat' || rule.commissionType === 1
                                                                                        ? "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40"
                                                                                        : "bg-blue-50 dark:bg-blue-950/40 text-synos-primary dark:text-sky-400 border border-blue-200 dark:border-blue-800/40"
                                                                                )}>
                                                                                    {rule.commissionType === 'Flat' || rule.commissionType === 1 
                                                                                        ? `₹${rule.commissionValue} Flat` 
                                                                                        : `${rule.commissionValue}%`}
                                                                                </span>
                                                                            )}
                                                                        </td>

                                                                        {/* Col 5: Estimated Doctor Payout */}
                                                                        <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                                            ₹{payout.toFixed(2)}
                                                                        </td>

                                                                        {/* Col 6: Status */}
                                                                        <td className="py-3 px-3 text-center">
                                                                            {isEditing ? (
                                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                                                                    Editing
                                                                                </span>
                                                                            ) : (
                                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                                                    Locked
                                                                                </span>
                                                                            )}
                                                                        </td>

                                                                        {/* Col 7: Actions */}
                                                                        <td className="py-3 px-4 text-right">
                                                                            {isEditing ? (
                                                                                <div className="flex items-center justify-end gap-1.5">
                                                                                    <button
                                                                                        onClick={() => handleSaveEditRule(rule)}
                                                                                        disabled={savingEditRule}
                                                                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-2xs"
                                                                                        title="Save Rate"
                                                                                    >
                                                                                        {savingEditRule ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
                                                                                        <span>Save</span>
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={handleCancelEditRule}
                                                                                        disabled={savingEditRule}
                                                                                        className="p-1.5 bg-slate-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-slate-300 rounded-xl transition-all"
                                                                                        title="Cancel"
                                                                                    >
                                                                                        <X size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center justify-end gap-1.5">
                                                                                    <button
                                                                                        onClick={() => handleStartEditRule(rule)}
                                                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-synos-primary bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-sky-400 dark:hover:bg-blue-900/60 rounded-xl border border-blue-200/80 dark:border-blue-800/40 transition-all shadow-2xs"
                                                                                        title="Edit Commission Rate"
                                                                                    >
                                                                                        <Edit3 size={12} />
                                                                                        <span>Edit</span>
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDeleteRule(rule.ruleId)}
                                                                                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                                                                                        title="Delete Rule"
                                                                                    >
                                                                                        <Trash2 size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: DEMOGRAPHICS */}
                            {activeTab === 'demographics' && demographicsForm && (
                                <form onSubmit={handleSaveDemographics} className="space-y-5">
                                    <div className="flex items-center justify-between pb-2 border-b border-black/[0.05] dark:border-white/[0.05]">
                                        <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white">Profile & Commercial Attribution</span>
                                        {demoSuccess && (
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <Check size={14} /> Saved Successfully
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-zinc-500">Speciality</label>
                                            <input 
                                                type="text"
                                                value={demographicsForm.speciality || ''}
                                                onChange={(e) => setDemographicsForm({...demographicsForm, speciality: e.target.value})}
                                                placeholder="e.g. Cardiologist"
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-synos-primary"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-zinc-500">Medical Registration No (MCI / SMC)</label>
                                            <input 
                                                type="text"
                                                value={demographicsForm.registrationNumber || ''}
                                                onChange={(e) => setDemographicsForm({...demographicsForm, registrationNumber: e.target.value})}
                                                placeholder="e.g. MCI-58291"
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-synos-primary"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-zinc-500">Phone</label>
                                            <input 
                                                type="text"
                                                value={demographicsForm.phone || ''}
                                                onChange={(e) => setDemographicsForm({...demographicsForm, phone: e.target.value})}
                                                placeholder="9876543210"
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-synos-primary"
                                            />
                                        </div>

                                        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                                            <label className="text-[11px] font-bold text-zinc-500">Clinic / Hospital Address</label>
                                            <input 
                                                type="text"
                                                value={demographicsForm.clinicAddress || doc.location || ''}
                                                onChange={(e) => setDemographicsForm({...demographicsForm, clinicAddress: e.target.value, location: e.target.value})}
                                                placeholder="Location / Area"
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-synos-primary"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-zinc-500">UPI ID (VPA)</label>
                                            <input 
                                                type="text"
                                                value={demographicsForm.upiId || ''}
                                                onChange={(e) => setDemographicsForm({...demographicsForm, upiId: e.target.value})}
                                                placeholder="doctor@okhdfcbank"
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-synos-primary"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-zinc-500">Bank Account / IFSC</label>
                                            <input 
                                                type="text"
                                                value={demographicsForm.accountNumber ? `${demographicsForm.accountNumber} (${demographicsForm.ifscCode || ''})` : ''}
                                                onChange={(e) => setDemographicsForm({...demographicsForm, accountNumber: e.target.value})}
                                                placeholder="A/C Number & IFSC"
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-synos-primary"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-3 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={savingDemographics}
                                            className="px-5 py-2.5 bg-synos-primary text-white rounded-xl text-xs font-bold hover:brightness-105 transition-all disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                                        >
                                            {savingDemographics ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                            <span>{savingDemographics ? "Saving..." : "Save Demographics"}</span>
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* TAB 3: VISITS */}
                            {activeTab === 'visits' && (
                                <div className="space-y-3">
                                    <span className="type-section-header uppercase">Recent Referred Visits</span>
                                    {recentVisitsList.length === 0 ? (
                                        <div className="p-6 text-center synos-dept-card rounded-xl">
                                            <span className="type-meta text-xs">No visits recorded yet.</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {recentVisitsList.map(visit => (
                                                <div 
                                                    key={visit.visitId}
                                                    className="synos-dept-card p-3 rounded-xl flex items-center justify-between"
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="type-code text-xs text-synos-primary">{visit.token}</span>
                                                            <span className="type-value !text-xs">{visit.patientName}</span>
                                                            <span className="type-meta text-[11px]">({visit.age}y / {visit.gender || 'N/A'})</span>
                                                        </div>
                                                        <p className="type-meta text-[11px] mt-0.5 line-clamp-1">
                                                            {visit.testsSummary?.join(', ') || 'Diagnostics'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="type-value !text-xs block">₹{visit.totalBill}</span>
                                                        <span className="type-meta text-[10px] text-zinc-500">
                                                            {visit.commissionStatus} {visit.commissionAmount > 0 && `(₹${visit.commissionAmount})`}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 4: MIX */}
                            {activeTab === 'mix' && (
                                <div className="space-y-3">
                                    <span className="type-section-header uppercase">Top Prescribed Tests</span>
                                    {topTestsList.length === 0 ? (
                                        <div className="p-6 text-center synos-dept-card rounded-xl">
                                            <span className="type-meta text-xs">No prescription history recorded yet.</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {topTestsList.map(t => (
                                                <div 
                                                    key={t.testId}
                                                    className="synos-dept-card p-3 rounded-xl flex items-center justify-between"
                                                >
                                                    <div>
                                                        <p className="type-value !text-xs">{t.testName}</p>
                                                        <p className="type-meta text-[11px]">{t.departmentName} • {t.prescribedCount || t.prescriptionCount || 0} Prescriptions</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="type-value !text-xs block">₹{Number(t.totalRevenue || t.totalRevenueGenerated || 0).toLocaleString()}</span>
                                                        <span className="type-meta text-[10px]">Total Revenue</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* ADD / EDIT DOCTOR MODAL                                                    */
/* -------------------------------------------------------------------------- */
const PartnerFormModal = ({ partner, onClose, onSave, defaultPartnerType = 'Doctor' }) => {
    const isEdit = !!partner;
    const [formData, setFormData] = useState({
        name: partner?.name || '',
        partnerType: partner?.partnerType || defaultPartnerType || 'Doctor',
        clinicName: partner?.clinicName || '',
        location: partner?.location || '',
        defaultCommissionPercentage: partner?.defaultCommissionPercentage ?? 10,
        calculationBase: partner?.calculationBase ?? 1,
        paymentCollectionModel: partner?.paymentCollectionModel || 'LabCollects',
        contactInfo: partner?.contactInfo || '',
        isActive: partner?.isActive ?? true
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const payload = {
                ...formData,
                defaultCommissionPercentage: parseFloat(formData.defaultCommissionPercentage) || 0
            };
            
            if (isEdit) {
                await FinanceApi.updateReferralPartner(partner.referralPartnerId, payload);
            } else {
                await FinanceApi.createDraftPartner(payload);
            }
            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to save doctor: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            <div className="synos-dept-card w-full max-w-lg rounded-2xl p-6 space-y-5 bg-white dark:bg-zinc-950">
                <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.05] pb-3">
                    <div className="flex items-center gap-3">
                        <UserPlus className="w-5 h-5 text-synos-primary" />
                        <div>
                            <h3 className="type-value !text-base">{isEdit ? 'Update Doctor' : 'Onboard Doctor'}</h3>
                            <p className="type-meta text-xs">{isEdit ? `Editing ${partner?.name}` : 'Empanel a referring doctor or center'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1">
                            <label className="type-label text-xs">Doctor Name</label>
                            <input 
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none"
                                placeholder="e.g. Dr. Ramesh Kumar"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="type-label text-xs">Partner Type</label>
                            <select
                                value={formData.partnerType}
                                onChange={(e) => setFormData({...formData, partnerType: e.target.value})}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none"
                            >
                                <option value="Doctor">Doctor / Physician</option>
                                <option value="RMP">RMP (Rural Medical Practitioner)</option>
                                <option value="Clinic">Clinic / Diagnostic Center</option>
                                <option value="Hospital">Hospital / Nursing Home</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="type-label text-xs">Clinic Name</label>
                            <input 
                                type="text"
                                value={formData.clinicName}
                                onChange={(e) => setFormData({...formData, clinicName: e.target.value})}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none"
                                placeholder="e.g. Apollo Clinic"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="type-label text-xs">Location / Area</label>
                            <input 
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({...formData, location: e.target.value})}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none"
                                placeholder="e.g. Bangalore"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="type-label text-xs">Default Cut (%)</label>
                            <input 
                                type="number"
                                value={formData.defaultCommissionPercentage}
                                onChange={(e) => setFormData({...formData, defaultCommissionPercentage: e.target.value})}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="type-label text-xs">Collection Model</label>
                            <select 
                                value={formData.paymentCollectionModel}
                                onChange={(e) => setFormData({...formData, paymentCollectionModel: e.target.value})}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none"
                            >
                                <option value="LabCollects">Lab Collects</option>
                                <option value="PartnerCollects">Partner Collects</option>
                                <option value="Both">Both (Hybrid)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-900"
                        >
                            Cancel
                        </button>
                        <button 
                            disabled={submitting}
                            className="flex-1 py-2.5 bg-synos-primary text-white rounded-xl text-xs font-bold hover:brightness-105 disabled:opacity-50"
                        >
                            {submitting ? "Saving..." : (isEdit ? "Update Doctor" : "Empanel Doctor")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PartnerRegistryTab;
