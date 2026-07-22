import React, { useState, useEffect } from 'react';
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
    X
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { cn } from '@/lib/utils';

export const PartnerRegistryTab = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [approvalTarget, setApprovalTarget] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getReferralPartners();
            setPartners(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id, commission) => {
        try {
            await FinanceApi.approvePartner(id, commission);
            loadPartners();
            setApprovalTarget(null);
        } catch (err) {
            alert(err.message);
        }
    };

    const filtered = partners.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        (p.partnerType && p.partnerType.toLowerCase().includes(search.toLowerCase())) ||
        (p.clinicName && p.clinicName.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* ACTION BAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group flex-1 max-w-md">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-synos-primary transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search by partner name, clinic or type..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-synos-primary/20 transition-all outline-none"
                    />
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-synos-primary text-white rounded-2xl text-xs font-bold hover:shadow-lg hover:shadow-synos-primary/20 active:scale-95 transition-all"
                >
                    <UserPlus size={18} /> ADD NEW PARTNER
                </button>
            </div>

            {/* PARTNERS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? [1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl animate-pulse" />) : (
                    filtered.map(partner => (
                        <PartnerCard 
                            key={partner.referralPartnerId} 
                            partner={partner} 
                            onApprove={() => setApprovalTarget(partner)}
                            onEdit={() => setEditTarget(partner)}
                        />
                    ))
                )}
            </div>

            {isModalOpen && <PartnerFormModal onClose={() => setIsModalOpen(false)} onSave={loadPartners} />}
            {editTarget && <PartnerFormModal partner={editTarget} onClose={() => setEditTarget(null)} onSave={loadPartners} />}
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

const PartnerCard = ({ partner, onApprove, onEdit }) => {
    // Status Logic: Backend returns string enums (JsonStringEnumConverter)
    const status = partner.status; 
    const isDraft = status === 'Draft' || status === 0;
    const isActive = status === 'Active' || status === 1;
    const isSuspended = status === 'Suspended' || status === 3;

    return (
        <div className="p-6 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
                <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all">
                    <MoreHorizontal size={16} className="text-zinc-400" />
                </button>
            </div>

            <div className="flex items-start gap-4 mb-6">
                <div className={cn("p-4 rounded-2xl transition-all duration-500", 
                    isDraft ? "bg-amber-500/10 text-amber-500" : "bg-synos-primary/5 text-synos-primary group-hover:bg-synos-primary group-hover:text-white")}>
                    {partner.partnerType === 'Hospital' ? <Building2 size={24} /> : <Users size={24} />}
                </div>
                <div>
                    <h3 className="text-sm font-bold dark:text-white text-zinc-900 tracking-tight">{partner.name}</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                        {partner.clinicName ? `${partner.clinicName} • ` : ""}{partner.partnerType}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl">
                    <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-tighter">Default Cut</p>
                    <p className="text-[11px] font-bold text-synos-primary mt-1">{partner.defaultCommissionPercentage}%</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl">
                    <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-tighter">Collection</p>
                    <p className="text-[11px] font-bold dark:text-zinc-300 text-zinc-700 mt-1 capitalize">{partner.paymentCollectionModel || 'Lab'}</p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t dark:border-zinc-900 border-zinc-100">
                <div className="flex items-center gap-1.5">
                    {isActive ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                            <ShieldCheck size={10} /> Active
                        </div>
                    ) : isDraft ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                            <AlertCircle size={10} /> Pending Approval
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-500/10 text-zinc-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-zinc-500/20">
                            <AlertCircle size={10} /> Suspended
                        </div>
                    )}
                </div>
                
                {isDraft ? (
                    <button 
                        onClick={onApprove}
                        className="px-3 py-1.5 bg-amber-500 text-white rounded-xl text-[10px] font-bold hover:bg-amber-600 transition-all uppercase tracking-widest shadow-lg shadow-amber-500/20"
                    >
                        Approve Draft
                    </button>
                ) : (
                    <button 
                        onClick={onEdit}
                        className="text-[10px] font-bold text-synos-primary hover:underline uppercase tracking-widest"
                    >
                        Configuration
                    </button>
                )}
            </div>
        </div>
    );
};

const ApprovalModal = ({ partner, onClose, onConfirm }) => {
    const [commission, setCommission] = useState(partner.defaultCommissionPercentage || 10);
    const [loading, setLoading] = useState(false);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border dark:border-zinc-900 border-zinc-100 animate-in zoom-in-95 duration-300">
                <div className="p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold dark:text-white text-zinc-900">Approve Partner</h2>
                            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">Activate {partner.name}</p>
                        </div>
                    </div>

                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-2">
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-500 flex items-center gap-2">
                            <AlertCircle size={14} /> Retroactive Backfill Triggered
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                            Approving this partner will retroactively generate commission payouts for all visits created while in draft status.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Assigned Commission (%)</label>
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

const PartnerFormModal = ({ partner, onClose, onSave }) => {
    const isEdit = !!partner;
    const [formData, setFormData] = useState({
        name: partner?.name || '',
        partnerType: partner?.partnerType || 'Doctor',
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
            alert("Failed to save partner: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl border dark:border-zinc-900 border-zinc-100 animate-in zoom-in-95 duration-300">
                <div className="p-8 flex justify-between items-center border-b dark:border-zinc-900 border-zinc-100 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-synos-primary/10 text-synos-primary rounded-2xl">
                            {isEdit ? <MoreHorizontal size={20} /> : <UserPlus size={20} />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold dark:text-white text-zinc-900">{isEdit ? 'Update Partner' : 'Partner Onboarding'}</h2>
                            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">{isEdit ? `Modifying ${partner.name}` : 'Register a new doctor or clinic'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all">
                        <X size={20} className="text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Full Name / Clinic Name</label>
                            <input 
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                                placeholder="Dr. Sameer Rao or Apollo Clinic"
                            />
                        </div>

                        <div className="space-y-2">
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

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Default Cut (%)</label>
                            <input 
                                type="number"
                                value={formData.defaultCommissionPercentage}
                                onChange={(e) => setFormData({...formData, defaultCommissionPercentage: e.target.value})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
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

                        <div className="space-y-2">
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

                        <div className="col-span-2 space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">DEFAULT PAYMENT COLLECTION MODEL</label>
                                <span className="text-[9px] text-zinc-400 font-medium">Can be toggled per visit at Reception</span>
                            </div>
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
                            {submitting ? 'SAVING...' : (isEdit ? 'UPDATE PARTNER' : 'REGISTER PARTNER')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
