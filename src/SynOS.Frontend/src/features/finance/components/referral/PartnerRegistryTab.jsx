import React, { useState, useEffect } from 'react';
import { 
    Users, 
    Plus, 
    Search, 
    MoreHorizontal, 
    UserPlus,
    Building2,
    ShieldCheck,
    AlertCircle,
    X
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';

export const PartnerRegistryTab = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    const filtered = partners.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.partnerType?.toLowerCase().includes(search.toLowerCase())
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
                        <PartnerCard key={partner.referralPartnerId} partner={partner} />
                    ))
                )}
            </div>

            {isModalOpen && <AddPartnerModal onClose={() => setIsModalOpen(false)} onSave={loadPartners} />}
        </div>
    );
};

const PartnerCard = ({ partner }) => {
    return (
        <div className="p-6 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
                <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all">
                    <MoreHorizontal size={16} className="text-zinc-400" />
                </button>
            </div>

            <div className="flex items-start gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-synos-primary/5 text-synos-primary group-hover:bg-synos-primary group-hover:text-white transition-all duration-500">
                    {partner.partnerType === 'Hospital' ? <Building2 size={24} /> : <Users size={24} />}
                </div>
                <div>
                    <h3 className="text-sm font-bold dark:text-white text-zinc-900 tracking-tight">{partner.name}</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">{partner.partnerType}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl">
                    <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-tighter">Collection Model</p>
                    <p className="text-[11px] font-bold dark:text-zinc-300 text-zinc-700 mt-1">{partner.paymentCollectionModel === 'PartnerCollects' ? 'Partner (Prepaid)' : 'Lab Collects'}</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl">
                    <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-tighter">Default Cut</p>
                    <p className="text-[11px] font-bold text-synos-primary mt-1">{partner.defaultCommissionPercentage}%</p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t dark:border-zinc-900 border-zinc-100">
                <div className="flex items-center gap-1.5">
                    {partner.isActive ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                            <ShieldCheck size={10} /> Active
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-500/10 text-zinc-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-zinc-500/20">
                            <AlertCircle size={10} /> Inactive
                        </div>
                    )}
                </div>
                <button className="text-[10px] font-bold text-synos-primary hover:underline uppercase tracking-widest">Configuration</button>
            </div>
        </div>
    );
};

const AddPartnerModal = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        partnerType: 'Doctor',
        paymentCollectionModel: 'LabCollects',
        defaultCommissionPercentage: 10,
        calculationBase: 1, // AfterDiscounts
        contactInfo: '',
        isActive: true
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            
            // Ensure data types are correct
            const payload = {
                ...formData,
                defaultCommissionPercentage: parseFloat(formData.defaultCommissionPercentage)
            };
            
            await FinanceApi.createReferralPartner(payload);
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
                            <UserPlus size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold dark:text-white text-zinc-900">Partner Onboarding</h2>
                            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">Register a new doctor or clinic</p>
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
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Collection Model</label>
                            <select 
                                value={formData.paymentCollectionModel}
                                onChange={(e) => setFormData({...formData, paymentCollectionModel: e.target.value})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                            >
                                <option value="LabCollects">Lab Collects (Standard)</option>
                                <option value="PartnerCollects">Partner Collects (Prepaid)</option>
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
                            {submitting ? 'ONBOARDING...' : 'REGISTER PARTNER'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
