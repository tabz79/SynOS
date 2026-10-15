import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Users, 
    Plus, 
    Search, 
    MoreHorizontal, 
    UserPlus,
    Building2,
    Layers,
    ShieldCheck,
    AlertCircle,
    X,
    ChevronRight,
    ChevronLeft,
    Phone,
    Mail,
    MapPin,
    IndianRupee,
    FileText,
    CheckCircle2,
    Stethoscope,
    Sparkles,
    Zap,
    ArrowUpRight,
    TrendingUp,
    Filter,
    RefreshCw,
    Edit3,
    Save,
    ExternalLink,
    Calendar,
    Award,
    CreditCard,
    Building,
    Check,
    Trash2,
    Loader2
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { cn } from '@/lib/utils';

export const PartnerRegistryTab = () => {
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

    // Filters & Pagination
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'has_unmapped' | 'active' | 'draft'
    const [specialityFilter, setSpecialityFilter] = useState('all');
    const [sortBy, setSortBy] = useState('revenue'); // 'revenue' | 'patients' | 'unmapped' | 'name' | 'recent'
    const [page, setPage] = useState(1);

    // Modals & Drawers
    const [selectedDoctorId, setSelectedDoctorId] = useState(null);
    const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
    const [approvalTarget, setApprovalTarget] = useState(null);
    const [editTarget, setEditTarget] = useState(null);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // reset to page 1 on new search
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch directory on filter/page changes
    const loadDirectory = useCallback(async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getDoctorDirectory({
                query: debouncedSearch,
                status: statusFilter,
                speciality: specialityFilter,
                sortBy: sortBy,
                page: page,
                pageSize: 24
            });
            setDirectoryData(data || {
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
        } catch (err) {
            console.error("Failed to load doctor directory", err);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, statusFilter, specialityFilter, sortBy, page]);

    useEffect(() => {
        loadDirectory();
    }, [loadDirectory]);

    const handleApprove = async (id, commission) => {
        try {
            await FinanceApi.approvePartner(id, commission);
            loadDirectory();
            setApprovalTarget(null);
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* TOP KPI SCORECARD BAR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 rounded-3xl shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Registered Doctors</p>
                        <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-1">
                            {directoryData.totalDoctorsCount?.toLocaleString() || 0}
                        </h3>
                        <p className="text-[11px] text-zinc-500 font-medium mt-0.5">Empanelled Referral Network</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-synos-primary/10 text-synos-primary flex items-center justify-center font-bold">
                        <Users size={22} />
                    </div>
                </div>

                <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 rounded-3xl shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Active Referrers (This Month)</p>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            {directoryData.activeReferrersThisMonthCount?.toLocaleString() || 0}
                        </h3>
                        <p className="text-[11px] text-zinc-500 font-medium mt-0.5">Referred Patients This Cycle</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <TrendingUp size={22} />
                    </div>
                </div>

                <div 
                    onClick={() => { setStatusFilter('has_unmapped'); setPage(1); }}
                    className={cn(
                        "p-5 bg-white dark:bg-zinc-950 border rounded-3xl shadow-sm flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01]",
                        directoryData.doctorsWithUnmappedTestsCount > 0 
                            ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500" 
                            : "border-zinc-100 dark:border-zinc-900"
                    )}
                >
                    <div>
                        <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Awaiting Rates</p>
                            {directoryData.doctorsWithUnmappedTestsCount > 0 && (
                                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                            )}
                        </div>
                        <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                            {directoryData.doctorsWithUnmappedTestsCount || 0}
                        </h3>
                        <p className="text-[11px] text-zinc-500 font-medium mt-0.5">Doctors with Unmapped Prescriptions</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                        <Zap size={22} />
                    </div>
                </div>

                <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 rounded-3xl shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Lifetime Referral Revenue</p>
                        <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-1">
                            ₹{Number(directoryData.totalLifetimeReferralRevenue || 0).toLocaleString()}
                        </h3>
                        <p className="text-[11px] text-zinc-500 font-medium mt-0.5">Total Prescribed Diagnostics</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                        <IndianRupee size={22} />
                    </div>
                </div>
            </div>

            {/* ACTION & FILTER TOOLBAR */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-zinc-950 p-4 border border-zinc-100 dark:border-zinc-900 rounded-3xl shadow-sm">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Search Bar */}
                    <div className="relative flex-1 min-w-[260px] max-w-md group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-synos-primary transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search by Doctor Name, Clinic, Speciality, Phone..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all placeholder:text-zinc-400"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-x-auto scrollbar-none">
                        {[
                            { id: 'all', label: 'All Doctors' },
                            { 
                                id: 'has_unmapped', 
                                label: 'Awaiting Rate', 
                                count: directoryData.doctorsWithUnmappedTestsCount,
                                highlight: true 
                            },
                            { id: 'active', label: 'Active' },
                            { id: 'draft', label: 'Draft / Walk-in' },
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => { setStatusFilter(btn.id); setPage(1); }}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                                    statusFilter === btn.id 
                                        ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-sm" 
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                )}
                            >
                                <span>{btn.label}</span>
                                {btn.count > 0 && (
                                    <span className={cn(
                                        "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                                        btn.highlight 
                                            ? "bg-amber-500/20 text-amber-600 border border-amber-500/30" 
                                            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                                    )}>
                                        {btn.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-1.5">
                        <select
                            value={sortBy}
                            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                        >
                            <option value="revenue">Sort: Highest Revenue</option>
                            <option value="patients">Sort: Most Patients</option>
                            <option value="unmapped">Sort: Awaiting Rates First</option>
                            <option value="recent">Sort: Recently Active</option>
                            <option value="name">Sort: Name (A-Z)</option>
                        </select>
                    </div>
                </div>

                {/* Right Action: Add Doctor */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={loadDirectory}
                        className="p-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 rounded-2xl transition-all"
                        title="Refresh Directory"
                    >
                        <RefreshCw size={16} className={cn(loading && "animate-spin text-synos-primary")} />
                    </button>
                    <button 
                        onClick={() => setIsAddDoctorModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-synos-primary text-white rounded-2xl text-xs font-black hover:shadow-lg hover:shadow-synos-primary/20 active:scale-95 transition-all uppercase tracking-wider"
                    >
                        <UserPlus size={16} /> ADD DOCTOR
                    </button>
                </div>
            </div>

            {/* DOCTOR DIRECTORY CARDS GRID */}
            <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-2">
                    <span>
                        Showing {directoryData.items.length > 0 ? (page - 1) * 24 + 1 : 0} - {Math.min(page * 24, directoryData.totalCount)} of {directoryData.totalCount} Doctors
                    </span>
                    {directoryData.totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <span>Page {page} of {directoryData.totalPages}</span>
                            <div className="flex items-center gap-1">
                                <button 
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button 
                                    disabled={page >= directoryData.totalPages}
                                    onClick={() => setPage(p => Math.min(directoryData.totalPages, p + 1))}
                                    className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[1,2,3,4,5,6].map(i => (
                            <div key={i} className="h-64 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : directoryData.items.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 rounded-3xl space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                            <Stethoscope size={32} />
                        </div>
                        <h4 className="text-base font-bold text-zinc-700 dark:text-zinc-200">No Doctors Found</h4>
                        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                            {search || statusFilter !== 'all' 
                                ? "No doctors matched your filter criteria. Try resetting search filters." 
                                : "As walk-in patients are billed with referring doctors, or as you empanel doctors, they will automatically appear here."}
                        </p>
                        {(search || statusFilter !== 'all') && (
                            <button 
                                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                                className="px-4 py-2 bg-synos-primary/10 text-synos-primary rounded-xl text-xs font-bold hover:bg-synos-primary/20"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {directoryData.items.map(doctor => (
                            <DoctorCrmCard 
                                key={doctor.referralPartnerId}
                                doctor={doctor}
                                onOpenProfile={(docId) => setSelectedDoctorId(docId)}
                                onApprove={() => setApprovalTarget(doctor)}
                                onEdit={() => setEditTarget(doctor)}
                            />
                        ))}
                    </div>
                )}

                {/* BOTTOM PAGINATION BAR */}
                {directoryData.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-6">
                        <button 
                            disabled={page <= 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-4 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all"
                        >
                            Previous
                        </button>
                        {Array.from({ length: Math.min(5, directoryData.totalPages) }, (_, i) => {
                            let pageNum = page <= 3 ? i + 1 : page + i - 2;
                            if (pageNum > directoryData.totalPages) pageNum = directoryData.totalPages - (4 - i);
                            if (pageNum < 1) pageNum = 1;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setPage(pageNum)}
                                    className={cn(
                                        "w-8 h-8 rounded-xl text-xs font-bold transition-all",
                                        page === pageNum 
                                            ? "bg-synos-primary text-white shadow-md shadow-synos-primary/20" 
                                            : "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                    )}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button 
                            disabled={page >= directoryData.totalPages}
                            onClick={() => setPage(p => Math.min(directoryData.totalPages, p + 1))}
                            className="px-4 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all"
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

            {/* APPROVE WALK-IN DRAFT MODAL */}
            {approvalTarget && (
                <ApprovalModal 
                    partner={approvalTarget} 
                    onClose={() => setApprovalTarget(null)} 
                    onConfirm={(commission) => handleApprove(approvalTarget.referralPartnerId, commission)} 
                />
            )}
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* DOCTOR CRM CARD                                                            */
/* -------------------------------------------------------------------------- */
const DoctorCrmCard = ({ doctor, onOpenProfile, onApprove, onEdit }) => {
    const status = doctor.status;
    const isDraft = status === 'Draft' || status === 0;
    const isActive = status === 'Active' || status === 1;
    const isSuspended = status === 'Suspended' || status === 3;
    const hasUnmapped = doctor.hasUnmappedWaiting || doctor.unmappedTestsCount > 0;

    const phone = doctor.demographics?.phone || doctor.contactInfo;
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;
    const initials = doctor.name
        .replace(/^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?)\s+/i, '')
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'DR';

    return (
        <div className={cn(
            "p-6 bg-white dark:bg-zinc-950 border rounded-3xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between",
            hasUnmapped 
                ? "border-amber-500/30 dark:border-amber-500/20 hover:border-amber-500/60" 
                : "border-zinc-100 dark:border-zinc-900 hover:border-zinc-200 dark:hover:border-zinc-800"
        )}>
            {/* Top Bar with Avatar, Name, Speciality, Status */}
            <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm tracking-tight transition-transform group-hover:scale-105",
                            hasUnmapped 
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                                : isDraft
                                ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
                                : "bg-synos-primary/10 text-synos-primary"
                        )}>
                            {initials}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 
                                    onClick={() => onOpenProfile(doctor.referralPartnerId)}
                                    className="text-sm font-bold text-zinc-900 dark:text-white hover:text-synos-primary cursor-pointer line-clamp-1 transition-colors"
                                >
                                    {doctor.name}
                                </h3>
                            </div>
                            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                                <span>{doctor.demographics?.speciality || doctor.partnerType || 'Doctor'}</span>
                                {doctor.clinicName && (
                                    <>
                                        <span>•</span>
                                        <span className="line-clamp-1 text-zinc-500">{doctor.clinicName}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {isActive && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                Active
                            </span>
                        )}
                        {isDraft && (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                                Walk-in / Draft
                            </span>
                        )}
                        {isSuspended && (
                            <span className="px-2 py-0.5 bg-zinc-500/10 text-zinc-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-zinc-500/20">
                                Suspended
                            </span>
                        )}
                    </div>
                </div>

                {/* Unmapped Alert Strip (If Applicable) */}
                {hasUnmapped && (
                    <div 
                        onClick={() => onOpenProfile(doctor.referralPartnerId)}
                        className="mb-4 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-amber-500/15 transition-colors group/alert"
                    >
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold">
                            <Zap size={14} className="shrink-0" />
                            <span>{doctor.unmappedTestsCount} Test{doctor.unmappedTestsCount > 1 ? 's' : ''} Awaiting Rate Setting</span>
                        </div>
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest group-hover/alert:translate-x-0.5 transition-transform">
                            Set Rate &rarr;
                        </span>
                    </div>
                )}

                {/* Contact & Location snippet */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 mb-4">
                    {doctor.location && (
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                            <MapPin size={12} className="text-zinc-400 shrink-0" /> {doctor.location}
                        </span>
                    )}
                    {cleanPhone && (
                        <div className="flex items-center gap-2 ml-auto">
                            <a 
                                href={`tel:${cleanPhone}`} 
                                className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                                title="Call Doctor"
                            >
                                <Phone size={12} />
                            </a>
                            <a 
                                href={`https://wa.me/91${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-colors"
                                title="WhatsApp"
                            >
                                <ExternalLink size={12} />
                            </a>
                        </div>
                    )}
                </div>

                {/* Commercial Scorecard Grid */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-100 dark:border-zinc-900/50 mb-4">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-tight text-zinc-400">Patients</p>
                        <p className="text-xs font-black text-zinc-900 dark:text-white mt-0.5">
                            {doctor.totalPatientsReferred || 0}
                            {doctor.thisMonthPatientsReferred > 0 && (
                                <span className="text-[9px] font-bold text-emerald-500 ml-1">
                                    (+{doctor.thisMonthPatientsReferred})
                                </span>
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-tight text-zinc-400">Revenue</p>
                        <p className="text-xs font-black text-zinc-900 dark:text-white mt-0.5">
                            ₹{Number(doctor.totalRevenueGenerated || 0).toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-tight text-zinc-400">Payout Due</p>
                        <p className={cn(
                            "text-xs font-black mt-0.5",
                            doctor.pendingPayoutDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                        )}>
                            ₹{Number(doctor.pendingPayoutDue || 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Rate Status Tag */}
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold mb-2">
                    <span className="flex items-center gap-1">
                        <Sparkles size={11} className="text-synos-primary" />
                        {doctor.learnedRulesCount > 0 ? (
                            <span className="text-zinc-700 dark:text-zinc-300 font-extrabold">{doctor.learnedRulesCount} Learned Rates</span>
                        ) : (
                            <span>Default Cut: <b className="text-synos-primary">{doctor.defaultCommissionPercentage}%</b></span>
                        )}
                    </span>
                    <span className="capitalize text-zinc-400">{doctor.paymentCollectionModel || 'Lab Collects'}</span>
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-900">
                <button
                    onClick={() => onOpenProfile(doctor.referralPartnerId)}
                    className="flex-1 py-2 px-3 bg-zinc-100 hover:bg-synos-primary hover:text-white dark:bg-zinc-900 dark:hover:bg-synos-primary text-zinc-700 dark:text-zinc-300 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
                >
                    <FileText size={13} />
                    <span>View Profile & Rates</span>
                </button>

                {isDraft ? (
                    <button
                        onClick={onApprove}
                        className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all shadow-sm shadow-amber-500/20"
                    >
                        Approve
                    </button>
                ) : (
                    <button
                        onClick={onEdit}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl transition-all"
                        title="Edit Doctor"
                    >
                        <Edit3 size={15} />
                    </button>
                )}
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* SLIDE-OUT DOCTOR PROFILE DRAWER (360° PROFILE & RATE CARD)                  */
/* -------------------------------------------------------------------------- */
const DoctorProfileDrawer = ({ doctorId, onClose, onRateLearned }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('rates'); // 'rates' | 'demographics' | 'visits' | 'mix'
    
    // Quick-learn form state: map of testId -> { type: 'Percentage' | 'Flat', value: number }
    const [quickLearnInputs, setQuickLearnInputs] = useState({});
    const [savingTestId, setSavingTestId] = useState(null);

    // Demographics edit state
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
            setProfile(data);
            setDemographicsForm(data.demographics || {});

            // Initialize quick learn inputs for unmapped tests
            const initialInputs = {};
            (data.unmappedPrescribedTests || []).forEach(t => {
                initialInputs[t.testId] = {
                    type: 'Percentage',
                    value: data.partner?.defaultCommissionPercentage || 10
                };
            });
            setQuickLearnInputs(initialInputs);
        } catch (err) {
            console.error("Failed to load doctor profile", err);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLearnRate = async (testId) => {
        const input = quickLearnInputs[testId];
        if (!input || input.value === '' || isNaN(input.value)) {
            alert("Please enter a valid commission amount or percentage.");
            return;
        }

        try {
            setSavingTestId(testId);
            await FinanceApi.quickLearnRate(doctorId, {
                testId: testId,
                commissionType: input.type === 'Flat' ? 1 : 0, // 0 = Percentage, 1 = Flat
                commissionValue: parseFloat(input.value)
            });

            // Reload profile and notify parent to refresh counters
            await loadProfile();
            if (onRateLearned) onRateLearned();
        } catch (err) {
            alert(err.message || "Failed to lock commission rate.");
        } finally {
            setSavingTestId(null);
        }
    };

    const handleSaveDemographics = async (e) => {
        e.preventDefault();
        try {
            setSavingDemographics(true);
            await FinanceApi.updateDoctorDemographics(doctorId, {
                name: profile.partner.name,
                clinicName: demographicsForm.clinicName || profile.partner.clinicName,
                location: demographicsForm.location || profile.partner.location,
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
            <div className="w-full max-w-2xl bg-white dark:bg-zinc-950 h-full shadow-2xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
                {/* DRAWER TOP BAR */}
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-start justify-between">
                    {loading || !profile ? (
                        <div className="flex items-center gap-3 animate-pulse">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                            <div className="space-y-2">
                                <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-synos-primary/10 text-synos-primary flex items-center justify-center font-black text-lg">
                                {profile.partner?.name
                                    ?.replace(/^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?)\s+/i, '')
                                    ?.split(' ')
                                    ?.map(n => n[0])
                                    ?.slice(0, 2)
                                    ?.join('')
                                    ?.toUpperCase() || 'DR'}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-black text-zinc-900 dark:text-white">
                                        {profile.partner?.name}
                                    </h2>
                                    {profile.demographics?.registrationNumber && (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase tracking-widest border border-zinc-200 dark:border-zinc-700">
                                            {profile.demographics.registrationNumber}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-zinc-400 font-semibold mt-0.5 flex items-center gap-2">
                                    <span>{profile.demographics?.speciality || profile.partner?.partnerType || 'Doctor'}</span>
                                    {profile.demographics?.qualifications && <span>• {profile.demographics.qualifications}</span>}
                                    {profile.partner?.clinicName && <span>• {profile.partner.clinicName}</span>}
                                </p>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-600 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* KPI COMMERCIAL HEADER BAR */}
                {profile && (
                    <div className="grid grid-cols-4 gap-2 px-6 py-4 bg-zinc-100/50 dark:bg-zinc-900/20 border-b border-zinc-100 dark:border-zinc-900 text-center">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Total Patients</p>
                            <p className="text-sm font-black text-zinc-900 dark:text-white mt-0.5">
                                {profile.partner?.totalPatientsReferred || 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Total Revenue</p>
                            <p className="text-sm font-black text-zinc-900 dark:text-white mt-0.5">
                                ₹{Number(profile.partner?.totalRevenueGenerated || 0).toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Total Earned</p>
                            <p className="text-sm font-black text-zinc-900 dark:text-white mt-0.5">
                                ₹{Number(profile.partner?.totalCommissionEarned || 0).toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Pending Due</p>
                            <p className={cn(
                                "text-sm font-black mt-0.5",
                                profile.partner?.pendingPayoutDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"
                            )}>
                                ₹{Number(profile.partner?.pendingPayoutDue || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                )}

                {/* DRAWER TAB NAVIGATION */}
                <div className="flex items-center gap-2 px-6 pt-3 border-b border-zinc-100 dark:border-zinc-900 overflow-x-auto scrollbar-none">
                    {[
                        { 
                            id: 'rates', 
                            label: 'Rate Card & Learning', 
                            icon: Zap,
                            badge: profile?.unmappedPrescribedTests?.length || 0 
                        },
                        { id: 'demographics', label: 'Demographics & Bio', icon: Award },
                        { id: 'visits', label: 'Referred Visits', icon: Users, count: profile?.recentVisits?.length || 0 },
                        { id: 'mix', label: 'Top Tests Mix', icon: Stethoscope },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap",
                                activeTab === tab.id 
                                    ? "border-synos-primary text-synos-primary" 
                                    : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            )}
                        >
                            <tab.icon size={14} />
                            <span>{tab.label}</span>
                            {Boolean(tab.badge && tab.badge > 0) && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-600 border border-amber-500/30">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* DRAWER CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {loading || !profile ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-400">
                            <Loader2 size={28} className="animate-spin text-synos-primary" />
                            <p className="text-xs font-bold">Loading Doctor Demographics & Rate Engine...</p>
                        </div>
                    ) : (
                        <>
                            {/* TAB 1: RATES & SELF-LEARNING ENGINE */}
                            {activeTab === 'rates' && (
                                <div className="space-y-6">
                                    {/* Unmapped Prescribed Tests Notification */}
                                    {profile.unmappedPrescribedTests?.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Zap size={16} className="text-amber-500" />
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white">
                                                        Unmapped Tests Prescribed at Reception ({profile.unmappedPrescribedTests.length})
                                                    </h4>
                                                </div>
                                                <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                                    Action Required
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-zinc-500 leading-relaxed">
                                                These tests were prescribed by {profile.partner.name} during walk-in patient billing but lack a learned commission cut. Set the rate below to lock it forever and immediately recalculate pending visits atomically.
                                            </p>

                                            <div className="space-y-3">
                                                {profile.unmappedPrescribedTests.map(test => {
                                                    const input = quickLearnInputs[test.testId] || { type: 'Percentage', value: 10 };
                                                    const isSaving = savingTestId === test.testId;

                                                    return (
                                                        <div 
                                                            key={test.testId}
                                                            className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                                        >
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono text-[10px] font-black bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">
                                                                        {test.testCode}
                                                                    </span>
                                                                    <span className="text-xs font-black text-zinc-900 dark:text-white">
                                                                        {test.testName}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] text-zinc-400 font-semibold">
                                                                    {test.departmentName} • Base Price: ₹{test.basePrice}
                                                                </p>
                                                            </div>

                                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                                <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden p-0.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setQuickLearnInputs({
                                                                            ...quickLearnInputs,
                                                                            [test.testId]: { ...input, type: 'Percentage' }
                                                                        })}
                                                                        className={cn(
                                                                            "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all",
                                                                            input.type === 'Percentage' 
                                                                                ? "bg-synos-primary text-white" 
                                                                                : "text-zinc-400 hover:text-zinc-600"
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
                                                                            "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all",
                                                                            input.type === 'Flat' 
                                                                                ? "bg-synos-primary text-white" 
                                                                                : "text-zinc-400 hover:text-zinc-600"
                                                                        )}
                                                                    >
                                                                        ₹
                                                                    </button>
                                                                </div>

                                                                <input 
                                                                    type="number"
                                                                    value={input.value}
                                                                    onChange={(e) => setQuickLearnInputs({
                                                                        ...quickLearnInputs,
                                                                        [test.testId]: { ...input, value: e.target.value }
                                                                    })}
                                                                    placeholder={input.type === 'Percentage' ? "15" : "150"}
                                                                    className="w-20 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-black text-center focus:ring-2 focus:ring-synos-primary/20 outline-none"
                                                                />

                                                                <button
                                                                    onClick={() => handleQuickLearnRate(test.testId)}
                                                                    disabled={isSaving}
                                                                    className="px-4 py-1.5 bg-synos-primary hover:bg-synos-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shrink-0 flex items-center gap-1 shadow-sm"
                                                                >
                                                                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                                                    <span>Lock</span>
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
                                                <Sparkles size={16} className="text-synos-primary" />
                                                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white">
                                                    Active Learned Rate Card ({profile.learnedRules?.length || 0})
                                                </h4>
                                            </div>
                                            <span className="text-[11px] text-zinc-400 font-semibold">
                                                Default Cut: <b className="text-synos-primary">{profile.partner.defaultCommissionPercentage}%</b>
                                            </span>
                                        </div>

                                        {profile.learnedRules?.length === 0 ? (
                                            <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 space-y-2">
                                                <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">No Custom Test Rates Configured Yet</p>
                                                <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                                                    This doctor currently receives the global default {profile.partner.defaultCommissionPercentage}% commission. As you lock rates above or via the Rate Queue, they will be cataloged here.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                                                <table className="w-full text-left border-collapse text-xs">
                                                    <thead>
                                                        <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                                                            <th className="py-3 px-4">Test Code & Name</th>
                                                            <th className="py-3 px-3">Dept</th>
                                                            <th className="py-3 px-3">Base ₹</th>
                                                            <th className="py-3 px-3">Configured Cut</th>
                                                            <th className="py-3 px-3 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                                                        {profile.learnedRules.map(rule => (
                                                            <tr key={rule.ruleId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                                                <td className="py-3 px-4">
                                                                    <p className="font-bold text-zinc-900 dark:text-white">{rule.testName}</p>
                                                                    <p className="font-mono text-[10px] text-zinc-400 font-bold">{rule.testCode}</p>
                                                                </td>
                                                                <td className="py-3 px-3 text-zinc-500 text-[11px] font-medium">{rule.departmentName}</td>
                                                                <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300 font-bold">₹{rule.testPrice}</td>
                                                                <td className="py-3 px-3">
                                                                    <span className="px-2.5 py-1 bg-synos-primary/10 text-synos-primary rounded-xl font-black text-xs">
                                                                        {rule.commissionType === 'Flat' || rule.commissionType === 1 
                                                                            ? `₹${rule.commissionValue} Flat` 
                                                                            : `${rule.commissionValue}%`}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-3 text-right">
                                                                    <button
                                                                        onClick={() => handleDeleteRule(rule.ruleId)}
                                                                        className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                                                        title="Delete Rule (Revert to Default)"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
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

                            {/* TAB 2: DEMOGRAPHICS & BIO FORM */}
                            {activeTab === 'demographics' && demographicsForm && (
                                <form onSubmit={handleSaveDemographics} className="space-y-5">
                                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-900">
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white">
                                                Doctor Profile & Demographics
                                            </h4>
                                            <p className="text-[11px] text-zinc-400">Manage medical registration and commercial settlement coordinates</p>
                                        </div>
                                        {demoSuccess && (
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                                                <CheckCircle2 size={14} /> Saved Successfully
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Speciality</label>
                                            <input 
                                                type="text"
                                                value={demographicsForm.speciality || ''}
                                                onChange={(e) => setDemographicsForm({...demographicsForm, speciality: e.target.value})}
                                                placeholder="e.g. Cardiologist, General Physician"
                                                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-synos-primary/20 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Qualifications</label>
                                            <input 
                                                type="text"
                                                value={demographicsForm.qualifications || ''}
                                                onChange={(e) => setDemographicsForm({...demographicsForm, qualifications: e.target.value})}
                                                placeholder="e.g. MBBS, MD (Medicine)"
                                                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-synos-primary/20 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Medical Registration Number (MCI / SMC)</label>
                                            <input 
                                                type="text"
                                                value={demographicsForm.registrationNumber || ''}
                                                onChange={(e) => setDemographicsForm({...demographicsForm, registrationNumber: e.target.value})}
                                                placeholder="e.g. MCI-58291"
                                                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-synos-primary/20 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Clinic / Hospital Name</label>
                                            <input 
                                                type="text"
                                                value={demographicsForm.clinicName || profile.partner.clinicName || ''}
                                                onChange={(e) => setDemographicsForm({...demographicsForm, clinicName: e.target.value})}
                                                placeholder="e.g. Care PolyClinic"
                                                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-synos-primary/20 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Phone Number</label>
                                            <input 
                                                type="text"
                                                value={demographicsForm.phone || ''}
                                                onChange={(e) => setDemographicsForm({...demographicsForm, phone: e.target.value})}
                                                placeholder="e.g. 9876543210"
                                                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-synos-primary/20 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">WhatsApp Number</label>
                                            <input 
                                                type="text"
                                                value={demographicsForm.whatsapp || ''}
                                                onChange={(e) => setDemographicsForm({...demographicsForm, whatsapp: e.target.value})}
                                                placeholder="e.g. 9876543210"
                                                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-synos-primary/20 outline-none"
                                            />
                                        </div>

                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Clinic Address / Location</label>
                                            <input 
                                                type="text"
                                                value={demographicsForm.clinicAddress || profile.partner.location || ''}
                                                onChange={(e) => setDemographicsForm({...demographicsForm, clinicAddress: e.target.value, location: e.target.value})}
                                                placeholder="e.g. 2nd Floor, Sai Complex, Main Road"
                                                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-synos-primary/20 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Payout Banking Coordinates */}
                                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 space-y-3">
                                        <h5 className="text-[11px] font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                            <CreditCard size={14} className="text-synos-primary" />
                                            Commercial Settlement & Payout Details
                                        </h5>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 sm:col-span-1 space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">UPI ID (VPA)</label>
                                                <input 
                                                    type="text"
                                                    value={demographicsForm.upiId || ''}
                                                    onChange={(e) => setDemographicsForm({...demographicsForm, upiId: e.target.value})}
                                                    placeholder="doctor@okhdfcbank"
                                                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-synos-primary/20 outline-none"
                                                />
                                            </div>

                                            <div className="col-span-2 sm:col-span-1 space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Bank Name</label>
                                                <input 
                                                    type="text"
                                                    value={demographicsForm.bankName || ''}
                                                    onChange={(e) => setDemographicsForm({...demographicsForm, bankName: e.target.value})}
                                                    placeholder="HDFC Bank"
                                                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-synos-primary/20 outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Account Number</label>
                                                <input 
                                                    type="text"
                                                    value={demographicsForm.accountNumber || ''}
                                                    onChange={(e) => setDemographicsForm({...demographicsForm, accountNumber: e.target.value})}
                                                    placeholder="501002948291"
                                                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-synos-primary/20 outline-none font-mono"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">IFSC Code</label>
                                                <input 
                                                    type="text"
                                                    value={demographicsForm.ifscCode || ''}
                                                    onChange={(e) => setDemographicsForm({...demographicsForm, ifscCode: e.target.value.toUpperCase()})}
                                                    placeholder="HDFC0001234"
                                                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-synos-primary/20 outline-none font-mono"
                                                />
                                            </div>

                                            <div className="col-span-2 space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Notes & Commercial Terms</label>
                                                <textarea 
                                                    rows={2}
                                                    value={demographicsForm.notes || ''}
                                                    onChange={(e) => setDemographicsForm({...demographicsForm, notes: e.target.value})}
                                                    placeholder="Special terms, payment cycle, or contact preference..."
                                                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-synos-primary/20 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={savingDemographics}
                                            className="px-6 py-3 bg-synos-primary hover:bg-synos-primary/90 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-synos-primary/20"
                                        >
                                            {savingDemographics ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                            <span>Save Demographics</span>
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* TAB 3: REFERRED VISITS */}
                            {activeTab === 'visits' && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white">
                                        Recent Referred Patient Visits ({profile.recentVisits?.length || 0})
                                    </h4>

                                    {profile.recentVisits?.length === 0 ? (
                                        <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl text-zinc-400 text-xs font-bold">
                                            No visits recorded yet for this doctor.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {profile.recentVisits.map(visit => (
                                                <div 
                                                    key={visit.visitId}
                                                    className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900 rounded-2xl flex items-center justify-between gap-4"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-xs font-black text-synos-primary bg-synos-primary/10 px-2 py-0.5 rounded-lg">
                                                                {visit.token}
                                                            </span>
                                                            <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                                                {visit.patientName}
                                                            </span>
                                                            <span className="text-[10px] text-zinc-400 font-semibold">
                                                                ({visit.age}y / {visit.gender || 'N/A'})
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-zinc-500 font-medium line-clamp-1">
                                                            Tests: {visit.testsSummary?.join(', ') || 'Diagnostics'}
                                                        </p>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <p className="text-xs font-black text-zinc-900 dark:text-white">
                                                            ₹{visit.totalBill}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                                                                visit.commissionStatus === 'Settled' ? "bg-emerald-500/10 text-emerald-600" :
                                                                visit.commissionStatus === 'Recognized' ? "bg-purple-500/10 text-purple-600" :
                                                                visit.commissionStatus === 'Awaiting Rate' ? "bg-amber-500/10 text-amber-600" :
                                                                "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                                            )}>
                                                                {visit.commissionStatus}
                                                            </span>
                                                            {visit.commissionAmount > 0 && (
                                                                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                                                                    ₹{visit.commissionAmount}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 4: TOP TESTS MIX */}
                            {activeTab === 'mix' && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white">
                                        Top Prescribed Diagnostic Tests
                                    </h4>

                                    {profile.topPrescribedTests?.length === 0 ? (
                                        <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl text-zinc-400 text-xs font-bold">
                                            No test history available.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {profile.topPrescribedTests.map(t => (
                                                <div 
                                                    key={t.testId}
                                                    className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900 rounded-2xl flex items-center justify-between"
                                                >
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-bold text-zinc-900 dark:text-white">{t.testName}</p>
                                                        <p className="text-[10px] text-zinc-400 font-semibold">{t.departmentName} • {t.prescriptionCount} Prescriptions</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-zinc-900 dark:text-white">
                                                            ₹{Number(t.totalRevenueGenerated || 0).toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-zinc-400 font-semibold">Total Revenue</p>
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
/* APPROVE MODAL                                                              */
/* -------------------------------------------------------------------------- */
const ApprovalModal = ({ partner, onClose, onConfirm }) => {
    const [commission, setCommission] = useState(partner.defaultCommissionPercentage || 10);
    const [loading, setLoading] = useState(false);

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border dark:border-zinc-900 border-zinc-100 animate-in zoom-in-95 duration-300">
                <div className="p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold dark:text-white text-zinc-900">Approve Doctor</h2>
                            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">Empanel {partner.name}</p>
                        </div>
                    </div>

                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-2">
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-500 flex items-center gap-2">
                            <AlertCircle size={14} /> Central Governance Backfill Triggered
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                            Approving this doctor will invoke the Central Governing Engine to atomically backfill commissions for all walk-in visits created under draft status.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Default Commission (%)</label>
                        <input 
                            type="number"
                            value={commission}
                            onChange={(e) => setCommission(e.target.value)}
                            className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xl font-black text-synos-primary focus:ring-4 focus:ring-synos-primary/10 outline-none transition-all text-center"
                        />
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 rounded-2xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                        >
                            CANCEL
                        </button>
                        <button 
                            onClick={async () => {
                                setLoading(true);
                                await onConfirm(parseFloat(commission));
                                setLoading(false);
                            }}
                            disabled={loading}
                            className="flex-1 py-4 bg-synos-primary text-white rounded-2xl text-xs font-bold hover:shadow-lg hover:shadow-synos-primary/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? "PROCESSING..." : "CONFIRM & BACKFILL"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* ADD / EDIT DOCTOR MODAL                                                    */
/* -------------------------------------------------------------------------- */
const PartnerFormModal = ({ partner, onClose, onSave }) => {
    const isEdit = !!partner;
    const [formData, setFormData] = useState({
        name: partner?.name || '',
        partnerType: partner?.partnerType || 'Doctor',
        clinicName: partner?.clinicName || '',
        location: partner?.location || '',
        defaultCommissionPercentage: partner?.defaultCommissionPercentage || 10,
        calculationBase: partner?.calculationBase ?? 1, // AfterDiscounts
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
                defaultCommissionPercentage: parseFloat(formData.defaultCommissionPercentage)
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
            <div className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl border dark:border-zinc-900 border-zinc-100 animate-in zoom-in-95 duration-300">
                <div className="p-8 flex justify-between items-center border-b dark:border-zinc-900 border-zinc-100 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-synos-primary/10 text-synos-primary rounded-2xl">
                            {isEdit ? <MoreHorizontal size={20} /> : <UserPlus size={20} />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold dark:text-white text-zinc-900">{isEdit ? 'Update Doctor' : 'Onboard Doctor'}</h2>
                            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">{isEdit ? `Modifying ${partner.name}` : 'Empanel a referring doctor or partner'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all">
                        <X size={20} className="text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Doctor Full Name</label>
                            <input 
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                                placeholder="e.g. Dr. Ramesh Kumar"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Clinic Name</label>
                            <input 
                                type="text"
                                value={formData.clinicName}
                                onChange={(e) => setFormData({...formData, clinicName: e.target.value})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                                placeholder="e.g. Apollo Clinic"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Location / Area</label>
                            <input 
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({...formData, location: e.target.value})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                                placeholder="e.g. Indiranagar, Bangalore"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Partner Type</label>
                            <select 
                                value={formData.partnerType}
                                onChange={(e) => setFormData({...formData, partnerType: e.target.value})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                            >
                                <option value="Doctor">Individual Doctor</option>
                                <option value="Clinic">Clinic Partner</option>
                                <option value="Hospital">Hospital / Center</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Default Cut (%)</label>
                            <input 
                                type="number"
                                value={formData.defaultCommissionPercentage}
                                onChange={(e) => setFormData({...formData, defaultCommissionPercentage: e.target.value})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Calculation Base</label>
                            <select 
                                value={formData.calculationBase}
                                onChange={(e) => setFormData({...formData, calculationBase: parseInt(e.target.value)})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                            >
                                <option value={0}>Before Discounts (Gross)</option>
                                <option value={1}>After Discounts (Net)</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Account Status</label>
                            <select 
                                value={formData.isActive}
                                onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                            >
                                <option value={true}>Active</option>
                                <option value={false}>Suspended</option>
                            </select>
                        </div>

                        <div className="col-span-2 space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">DEFAULT PAYMENT COLLECTION MODEL</label>
                            <div className="grid grid-cols-3 gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, paymentCollectionModel: 'LabCollects'})}
                                    className={cn("px-3 py-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 text-center", 
                                        formData.paymentCollectionModel === 'LabCollects' 
                                        ? "bg-synos-primary/10 border-synos-primary text-synos-primary shadow-lg shadow-synos-primary/10" 
                                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 opacity-60")}
                                >
                                    <Building2 size={18} />
                                    LAB COLLECTS
                                    <span className="text-[8.5px] font-medium opacity-70 leading-tight">Patient pays at counter</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, paymentCollectionModel: 'PartnerCollects'})}
                                    className={cn("px-3 py-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 text-center", 
                                        formData.paymentCollectionModel === 'PartnerCollects' 
                                        ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/10" 
                                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 opacity-60")}
                                >
                                    <Users size={18} />
                                    PARTNER COLLECTS
                                    <span className="text-[8.5px] font-medium opacity-70 leading-tight">Prepaid at clinic</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, paymentCollectionModel: 'Both'})}
                                    className={cn("px-3 py-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 text-center", 
                                        (formData.paymentCollectionModel === 'Both' || formData.paymentCollectionModel === 'Hybrid') 
                                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/10" 
                                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 opacity-60")}
                                >
                                    <Layers size={18} />
                                    BOTH (HYBRID)
                                    <span className="text-[8.5px] font-medium opacity-70 leading-tight">Supports counter & prepaid</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 rounded-2xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                        >
                            CANCEL
                        </button>
                        <button 
                            disabled={submitting}
                            className="flex-1 py-4 bg-synos-primary text-white rounded-2xl text-xs font-bold hover:shadow-lg hover:shadow-synos-primary/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {submitting ? 'SAVING...' : (isEdit ? 'UPDATE DOCTOR' : 'EMPANEL DOCTOR')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PartnerRegistryTab;
