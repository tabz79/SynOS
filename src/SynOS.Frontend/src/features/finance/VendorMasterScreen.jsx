import { useState, useEffect } from 'react';
import { 
    Truck, 
    Plus, 
    Search, 
    Mail, 
    Phone, 
    Building2, 
    Tag, 
    FileText,
    ExternalLink,
    ChevronRight,
    Edit3,
    Trash2,
    X,
    CheckCircle2
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { cn } from '@/lib/utils';

export const VendorMasterScreen = () => {
    const [vendors, setVendors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        taxId: '',
        category: 'Reagents',
        email: '',
        phone: '',
        contactInfo: ''
    });

    const load = async () => {
        setIsLoading(true);
        try {
            const data = await FinanceApi.getVendors();
            setVendors(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openModal = (vendor = null) => {
        if (vendor) {
            setEditingVendor(vendor);
            setFormData({
                name: vendor.name,
                taxId: vendor.taxId || '',
                category: vendor.category || 'Reagents',
                email: vendor.email || '',
                phone: vendor.phone || '',
                contactInfo: vendor.contactInfo || ''
            });
        } else {
            setEditingVendor(null);
            setFormData({
                name: '',
                taxId: '',
                category: 'Reagents',
                email: '',
                phone: '',
                contactInfo: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingVendor) {
                await FinanceApi.updateVendor(editingVendor.supplierId, formData);
            } else {
                await FinanceApi.createVendor(formData);
            }
            setIsModalOpen(false);
            load();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredVendors = vendors.filter(v => 
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.taxId?.toLowerCase().includes(search.toLowerCase()) ||
        v.category?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex items-end justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-synos-primary/10 rounded-xl">
                            <Truck className="w-6 h-6 text-synos-primary" />
                        </div>
                        <h1 className="type-display !text-4xl">Vendor Master</h1>
                    </div>
                    <p className="type-body text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em] ml-1">Enterprise Creditor & Supplier Registry</p>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-synos-primary text-white font-black px-6 py-4 rounded-2xl shadow-xl shadow-synos-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Onboard New Vendor
                </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-4 flex items-center gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                        type="text" 
                        placeholder="Search by Name, Tax ID, or Category..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-white/5 border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-bold outline-none ring-synos-primary focus:ring-2 transition-all"
                    />
                </div>
            </div>

            {/* Vendor List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-64 bg-zinc-100 dark:bg-white/5 rounded-[2.5rem] animate-pulse border border-zinc-200 dark:border-white/5" />
                    ))
                ) : filteredVendors.map(vendor => (
                    <div 
                        key={vendor.supplierId}
                        className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-synos-primary/5 hover:border-synos-primary/20 transition-all duration-500 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => openModal(vendor)}
                                className="p-3 bg-zinc-50 dark:bg-white/5 hover:bg-synos-primary/10 hover:text-synos-primary rounded-2xl transition-all"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex flex-col h-full gap-6">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-3 py-1 bg-zinc-100 dark:bg-white/5 text-[9px] font-black uppercase text-zinc-500 rounded-full border border-zinc-200 dark:border-white/10">
                                        {vendor.category || 'General'}
                                    </span>
                                    {!vendor.isActive && (
                                        <span className="px-3 py-1 bg-red-500/10 text-[9px] font-black uppercase text-red-500 rounded-full border border-red-500/20">Inactive</span>
                                    )}
                                </div>
                                <h3 className="type-display !text-xl dark:text-white line-clamp-1">{vendor.name}</h3>
                                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{vendor.taxId || 'NO TAX ID'}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-zinc-500 hover:text-synos-primary transition-colors cursor-pointer group/link">
                                    <div className="p-2 bg-zinc-50 dark:bg-white/5 rounded-xl group-hover/link:bg-synos-primary/10">
                                        <Mail className="w-3 h-3" />
                                    </div>
                                    <span className="text-xs font-bold truncate">{vendor.email || 'No email provided'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-zinc-500 hover:text-synos-primary transition-colors cursor-pointer group/link">
                                    <div className="p-2 bg-zinc-50 dark:bg-white/5 rounded-xl group-hover/link:bg-synos-primary/10">
                                        <Phone className="w-3 h-3" />
                                    </div>
                                    <span className="text-xs font-bold">{vendor.phone || 'No phone provided'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-zinc-500">
                                    <div className="p-2 bg-zinc-50 dark:bg-white/5 rounded-xl">
                                        <FileText className="w-3 h-3" />
                                    </div>
                                    <span className="text-xs font-bold line-clamp-2 leading-relaxed">{vendor.contactInfo || 'No additional details'}</span>
                                </div>
                            </div>

                            <div className="mt-auto pt-6 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-white dark:border-zinc-900">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    </div>
                                </div>
                                <button className="text-[10px] font-black uppercase text-zinc-400 group-hover:text-synos-primary transition-colors flex items-center gap-1">
                                    View Ledger <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-950 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-zinc-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50 dark:bg-white/[0.02]">
                            <div>
                                <h3 className="text-2xl font-black dark:text-white tracking-tight">{editingVendor ? 'Modify Vendor' : 'Onboard Vendor'}</h3>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Registry Entry Profile</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-2xl transition-colors">
                                <X className="w-6 h-6 text-zinc-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2 col-span-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Legal Name / Entity</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                        <input 
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="w-full bg-zinc-100 dark:bg-white/5 border-none rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                            placeholder="e.g. LifeCare Diagnostic Reagents Ltd"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Tax ID (GST/VAT)</label>
                                    <input 
                                        type="text"
                                        value={formData.taxId}
                                        onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                                        className="bg-zinc-100 dark:bg-white/5 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white font-mono uppercase"
                                        placeholder="GST-2024-XXX"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Category</label>
                                    <select 
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                                        className="bg-zinc-100 dark:bg-white/5 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                    >
                                        <option value="Reagents">Reagents & Chemicals</option>
                                        <option value="Consumables">Lab Consumables</option>
                                        <option value="Equipment">Medical Equipment</option>
                                        <option value="Stationery">Office & Stationery</option>
                                        <option value="Maintenance">Maintenance & Repairs</option>
                                        <option value="Other">Other Services</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Email Address</label>
                                    <input 
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="bg-zinc-100 dark:bg-white/5 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                        placeholder="orders@vendor.com"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Phone Number</label>
                                    <input 
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        className="bg-zinc-100 dark:bg-white/5 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                        placeholder="+91 XXXX XXX XXX"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 col-span-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Address & Detailed Info</label>
                                    <textarea 
                                        value={formData.contactInfo}
                                        onChange={(e) => setFormData({...formData, contactInfo: e.target.value})}
                                        rows={3}
                                        className="bg-zinc-100 dark:bg-white/5 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white resize-none"
                                        placeholder="Full address, secondary contacts, payment instructions..."
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-synos-primary text-white font-black py-6 rounded-[1.5rem] shadow-2xl shadow-synos-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-6 h-6" />
                                        {editingVendor ? 'UPDATE REGISTRY' : 'COMMIT TO MASTER DATA'}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
