import React, { useState, useEffect } from 'react';
import { 
    Settings, 
    Plus, 
    Search, 
    Trash2, 
    ShieldCheck, 
    AlertCircle,
    Package,
    Beaker,
    Info,
    X,
    Filter
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';

export const CommissionRulesTab = () => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getReferralRules();
            setRules(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this commission rule?")) return;
        try {
            await FinanceApi.deleteReferralRule(id);
            loadRules();
        } catch (err) {
            alert("Failed to delete rule: " + err.message);
        }
    };

    const filtered = rules.filter(r => 
        r.ruleName?.toLowerCase().includes(search.toLowerCase()) || 
        r.testName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* ALERT BOX */}
            <div className="p-4 bg-synos-primary/5 border border-synos-primary/10 rounded-2xl flex gap-3">
                <Info size={18} className="text-synos-primary shrink-0" />
                <p className="text-[11px] text-synos-primary font-medium leading-relaxed">
                    <span className="font-bold uppercase tracking-widest mr-2">Advanced Config:</span>
                    Test-specific rules always override partner default percentages. The hierarchy follows: 
                    <span className="font-bold mx-1">Test Override &gt; Package Override &gt; Partner Default.</span>
                </p>
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group flex-1 max-w-md">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-synos-primary transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search rules by test name or partner..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-synos-primary/20 transition-all outline-none"
                    />
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-synos-primary text-white rounded-2xl text-xs font-bold hover:shadow-lg hover:shadow-synos-primary/20 active:scale-95 transition-all"
                >
                    <Plus size={18} /> CREATE OVERRIDE RULE
                </button>
            </div>

            {/* RULES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? [1,2,3].map(i => <div key={i} className="h-48 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl animate-pulse" />) : (
                    filtered.length === 0 ? (
                        <div className="col-span-full p-20 text-center text-zinc-400 text-xs font-medium border border-dashed rounded-[32px]">
                            No specific override rules found. Partner defaults will apply.
                        </div>
                    ) : (
                        filtered.map(rule => (
                            <RuleCard key={rule.ruleId} rule={rule} onDelete={handleDelete} />
                        ))
                    )
                )}
            </div>

            {isModalOpen && <AddRuleModal onClose={() => setIsModalOpen(false)} onSave={loadRules} />}
        </div>
    );
};

const RuleCard = ({ rule, onDelete }) => {
    return (
        <div className="p-6 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onDelete(rule.ruleId)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-zinc-400 hover:text-rose-500 rounded-xl transition-all">
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="flex items-start gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 text-zinc-400 group-hover:bg-synos-primary group-hover:text-white transition-all duration-500">
                    {rule.isPackage ? <Package size={24} /> : <Beaker size={24} />}
                </div>
                <div>
                    <h3 className="text-sm font-bold dark:text-white text-zinc-900 tracking-tight">{rule.testName || 'Global Rule'}</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Applies to: {rule.partnerName || 'All Partners'}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl">
                    <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-tighter">Calculation Base</p>
                    <p className="text-[11px] font-bold dark:text-zinc-300 text-zinc-700 mt-1">
                        {rule.calculationBase === 0 ? 'Before Discounts' : 'After Discounts'}
                    </p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl">
                    <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-tighter">Commission</p>
                    <p className="text-[11px] font-bold text-synos-primary mt-1">
                        {rule.commissionType === 0 ? `${rule.commissionValue}%` : `₹${rule.commissionValue}`}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t dark:border-zinc-900 border-zinc-100">
                <div className="flex items-center gap-1.5">
                    {rule.isActive ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                            <ShieldCheck size={10} /> Active
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-500/10 text-zinc-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-zinc-500/20">
                            <AlertCircle size={10} /> Suspended
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                   {rule.allowCommissionOnOutsourcedTests && (
                       <span title="Outsourced Tests Allowed" className="p-1 bg-amber-500/10 text-amber-500 rounded-lg">
                           <Beaker size={12} />
                       </span>
                   )}
                </div>
            </div>
        </div>
    );
};

const AddRuleModal = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        partnerId: '',
        testId: '',
        commissionType: 0, // Percentage
        commissionValue: 15,
        calculationBase: 1, // AfterDiscounts
        isActive: true,
        allowCommissionOnOutsourcedTests: false
    });
    const [partners, setPartners] = useState([]);
    const [tests, setTests] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            const [pData, tData] = await Promise.all([
                FinanceApi.getReferralPartners(),
                FinanceApi.getTests()
            ]);
            setPartners(pData);
            setTests(tData);
        };
        load();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await FinanceApi.createReferralRule(formData.partnerId, formData);
            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to save rule: " + err.message);
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
                            <Settings size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold dark:text-white text-zinc-900">Commission Override</h2>
                            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">Define test-specific partner agreements</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all">
                        <X size={20} className="text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Referral Partner</label>
                            <select 
                                required
                                value={formData.partnerId}
                                onChange={(e) => setFormData({...formData, partnerId: e.target.value})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                            >
                                <option value="">Select Partner</option>
                                {partners.map(p => <option key={p.referralPartnerId} value={p.referralPartnerId}>{p.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Target Test / Profile</label>
                            <select 
                                required
                                value={formData.testId}
                                onChange={(e) => setFormData({...formData, testId: e.target.value})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                            >
                                <option value="">Select Test</option>
                                {tests.map(t => <option key={t.testId} value={t.testId}>{t.testName}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Commission Type</label>
                            <select 
                                value={formData.commissionType}
                                onChange={(e) => setFormData({...formData, commissionType: parseInt(e.target.value)})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                            >
                                <option value={0}>Percentage (%)</option>
                                <option value={1}>Flat Amount (₹)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Commission Value</label>
                            <input 
                                required
                                type="number"
                                value={formData.commissionValue}
                                onChange={(e) => setFormData({...formData, commissionValue: e.target.value})}
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

                        <div className="flex items-center gap-3 pt-6 ml-1">
                            <input 
                                type="checkbox"
                                checked={formData.allowCommissionOnOutsourcedTests}
                                onChange={(e) => setFormData({...formData, allowCommissionOnOutsourcedTests: e.target.checked})}
                                className="w-4 h-4 accent-synos-primary"
                            />
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Allow on Outsourced</label>
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
                            {submitting ? 'SAVING RULE...' : 'APPLY OVERRIDE'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
