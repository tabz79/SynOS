import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowDownLeft, 
    ChevronRight, 
    Search,
    Filter,
    CheckCircle2,
    X,
    CreditCard,
    Banknote,
    Building2,
    Calendar,
    Clock,
    Receipt,
    Printer,
    ShieldCheck,
    Briefcase
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { SignalRService } from '@/lib/signalr';
import { cn } from '@/lib/utils';
import { CommercialDocumentViewer } from '../documents/CommercialDocumentViewer';
import { DynamicDocumentRenderer } from '../documents/DynamicDocumentRenderer';

export const PartnerReceivablesTab = () => {
    const [activePayerTab, setActivePayerTab] = useState('partner'); // 'partner' | 'insurance' | 'corporate'
    const [rawReceivables, setRawReceivables] = useState([]);
    const [receivables, setReceivables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [settling, setSettling] = useState(false);
    const [expandedPartnerId, setExpandedPartnerId] = useState(null);

    // Enterprise Claim Statement State
    const [claimDocData, setClaimDocData] = useState(null);
    const [isClaimDocOpen, setIsClaimDocOpen] = useState(false);
    const [generatingClaim, setGeneratingClaim] = useState(false);
    const [selectedFactIds, setSelectedFactIds] = useState(new Set());

    const activePayerTabRef = useRef(activePayerTab);
    useEffect(() => {
        activePayerTabRef.current = activePayerTab;
    }, [activePayerTab]);

    const loadData = async (showSpinner = true) => {
        try {
            if (showSpinner) setLoading(true);
            const data = await FinanceApi.getReceivables();
            setRawReceivables(data || []);
            const tabToUse = activePayerTabRef.current || 'partner';
            const grouped = groupReceivables(data || [], tabToUse);
            setReceivables(grouped);
            setSelectedPartner(prev => {
                if (!prev) return null;
                return grouped.find(g => g.partnerId === prev.partnerId) || null;
            });
        } catch (err) {
            console.error("PartnerReceivablesTab load error:", err);
        } finally {
            if (showSpinner) setLoading(false);
        }
    };

    useEffect(() => {
        loadData(true);

        // Real-time live synchronization via SignalR
        SignalRService.startConnection().catch(console.error);
        const conn = SignalRService._getConnection();

        const handleLiveSync = () => {
            loadData(false);
        };

        conn.on("ActionQueueDeltaReceived", handleLiveSync);
        conn.on("ActionQueueUpdated", handleLiveSync);
        conn.on("ReceptionSummaryUpdated", handleLiveSync);
        conn.on("ReceivableUpdated", handleLiveSync);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                loadData(false);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            conn.off("ActionQueueDeltaReceived", handleLiveSync);
            conn.off("ActionQueueUpdated", handleLiveSync);
            conn.off("ReceptionSummaryUpdated", handleLiveSync);
            conn.off("ReceivableUpdated", handleLiveSync);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const normalizeDebtorType = (val) => {
        if (!val && val !== 0) return 'partner';
        const s = String(val).toLowerCase();
        if (s === '1' || s === 'partner') return 'partner';
        if (s === '2' || s === 'insurance') return 'insurance';
        if (s === '3' || s === 'corporate') return 'corporate';
        return s;
    };

    const groupReceivables = (data, tab = activePayerTab) => {
        const groups = {};
        if (!Array.isArray(data)) return [];
        data.forEach(r => {
            if (!r) return;
            const normType = normalizeDebtorType(r.debtorType);
            
            // STRICT TAB MATCHING:
            if (tab === 'partner' && normType !== 'partner') return;
            if (tab === 'insurance' && normType !== 'insurance') return;
            if (tab === 'corporate' && normType !== 'corporate') return;

            const key = r.debtorId || r.referralPartnerId || r.partnerId || r.debtorName || 'Unknown';
            if (!groups[key]) {
                groups[key] = {
                    partnerId: key,
                    debtorType: normType,
                    partnerName: r.debtorName || r.partnerName || (tab === 'insurance' ? 'Empanelled Insurer' : tab === 'corporate' ? 'Corporate Account' : 'Unknown Partner'),
                    totalAmount: 0,
                    billCount: 0,
                    oldestDate: r.occurredAt || r.date || new Date().toISOString(),
                    items: []
                };
            }
            const total = Number(r.totalAmount || r.amount || 0);
            const paid = Number(r.paidAmount || r.amountReceived || 0);
            const due = r.balanceDue !== undefined && !isNaN(r.balanceDue) ? Number(r.balanceDue) : (total - paid);
            const safeDue = isNaN(due) ? 0 : due;

            groups[key].totalAmount += safeDue;
            groups[key].billCount += 1;
            const itemDate = r.occurredAt || r.date;
            if (itemDate && new Date(itemDate) < new Date(groups[key].oldestDate)) {
                groups[key].oldestDate = itemDate;
            }
            groups[key].items.push({
                ...r,
                totalAmount: total,
                paidAmount: paid,
                balanceDue: safeDue,
                token: r.token || r.visitToken || '-'
            });
        });
        return Object.values(groups).filter(g => g.totalAmount > 0);
    };

    const handleSwitchTab = (tab) => {
        setActivePayerTab(tab);
        setReceivables(groupReceivables(rawReceivables, tab));
        setSelectedPartner(null);
        setExpandedPartnerId(null);
        setSelectedFactIds(new Set());
    };

    const partnerTotal = rawReceivables
        .filter(r => normalizeDebtorType(r.debtorType) === 'partner')
        .reduce((sum, r) => {
            const due = r.balanceDue !== undefined && !isNaN(r.balanceDue) ? Number(r.balanceDue) : (Number(r.totalAmount || r.amount || 0) - Number(r.paidAmount || r.amountReceived || 0));
            return sum + (isNaN(due) ? 0 : due);
        }, 0);

    const insuranceTotal = rawReceivables
        .filter(r => normalizeDebtorType(r.debtorType) === 'insurance')
        .reduce((sum, r) => {
            const due = r.balanceDue !== undefined && !isNaN(r.balanceDue) ? Number(r.balanceDue) : (Number(r.totalAmount || r.amount || 0) - Number(r.paidAmount || r.amountReceived || 0));
            return sum + (isNaN(due) ? 0 : due);
        }, 0);

    const corporateTotal = rawReceivables
        .filter(r => normalizeDebtorType(r.debtorType) === 'corporate')
        .reduce((sum, r) => {
            const due = r.balanceDue !== undefined && !isNaN(r.balanceDue) ? Number(r.balanceDue) : (Number(r.totalAmount || r.amount || 0) - Number(r.paidAmount || r.amountReceived || 0));
            return sum + (isNaN(due) ? 0 : due);
        }, 0);

    const handleSettleRecovery = async (partner, amount, method) => {
        try {
            setSettling(true);
            const factIds = partner.items.map(i => i.receivableFactId);
            const payload = {
                partnerId: partner.partnerId,
                debtorId: partner.partnerId,
                debtorType: activePayerTab === 'insurance' ? 2 : activePayerTab === 'corporate' ? 3 : 1,
                factIds,
                totalAmount: amount,
                paymentMethod: method
            };
            console.log("Settling Multi-Payer Recovery:", payload);
            await FinanceApi.settleReferralRecovery(payload);
            setSelectedPartner(null);
            loadData();
        } catch (err) {
            alert("Settlement failed: " + err.message);
        } finally {
            setSettling(false);
        }
    };

    const handleGenerateClaimStatement = async (partner, specificFactIds = null) => {
        try {
            setGeneratingClaim(true);
            const targetFactIds = specificFactIds && specificFactIds.length > 0
                ? specificFactIds
                : partner.items.map(i => i.receivableFactId);
            const res = await FinanceApi.getPartnerClaimStatement({
                partnerId: partner.partnerId,
                receivableFactIds: targetFactIds
            });
            setClaimDocData(res);
            setIsClaimDocOpen(true);
        } catch (err) {
            console.error("Failed to generate claim statement:", err);
            alert("Could not load claim statement: " + (err.response?.data?.message || err.message));
        } finally {
            setGeneratingClaim(false);
        }
    };

    const handleWhatsAppClaimShare = () => {
        if (!claimDocData) return;
        const phone = claimDocData?.partner?.phone || '';
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const netDue = claimDocData?.summary?.netClaimDue || 0;
        const count = claimDocData?.items?.length || 0;
        const recipientTitle = activePayerTab === 'insurance' ? 'TPA Desk' : activePayerTab === 'corporate' ? 'HR / Corporate Desk' : 'Doctor';
        const msg = `Dear ${claimDocData?.partner?.name || recipientTitle},\n\nDiagnostic claim statement from ${claimDocData?.lab?.labLegalName || 'SynOS Healthcare'}:\n• Selected Patient Visits: ${count}\n• Total Diagnostic Charges: ₹${netDue.toLocaleString()}\n• Net Amount Payable: ₹${netDue.toLocaleString()}\n\nPayment details and remittance UPI QR are attached in the statement. Please verify and clear dues at your convenience. Thank you!`;
        window.open(`https://wa.me/${cleanPhone ? (cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone) : ''}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const filtered = receivables.filter(p => p.partnerName.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* MULTI-PAYER TOP SUB-NAV TABS */}
            <div className="flex flex-wrap items-center gap-2 border-b dark:border-zinc-800 border-zinc-200 pb-4">
                <button
                    onClick={() => handleSwitchTab('partner')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer",
                        activePayerTab === 'partner'
                            ? "bg-synos-primary text-white shadow-lg shadow-synos-primary/20 scale-[1.02]"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                >
                    <Building2 size={15} />
                    <span>Referral Partners</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/20">₹{partnerTotal.toLocaleString()}</span>
                </button>

                <button
                    onClick={() => handleSwitchTab('insurance')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer",
                        activePayerTab === 'insurance'
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                >
                    <ShieldCheck size={15} />
                    <span>Insurance Claims & TPAs</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/20">₹{insuranceTotal.toLocaleString()}</span>
                </button>

                <button
                    onClick={() => handleSwitchTab('corporate')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer",
                        activePayerTab === 'corporate'
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-[1.02]"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                >
                    <Briefcase size={15} />
                    <span>Corporate B2B Receivables</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/20">₹{corporateTotal.toLocaleString()}</span>
                </button>
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group flex-1 max-w-md">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-synos-primary transition-colors" />
                    <input 
                        type="text" 
                        placeholder={
                            activePayerTab === 'insurance' 
                                ? "Search insurance company / TPA claims..." 
                                : activePayerTab === 'corporate'
                                    ? "Search corporate accounts..."
                                    : "Search partner receivables..."
                        }
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-synos-primary/20 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer">
                        RECORD RECOVERY
                    </button>
                </div>
            </div>

            {/* RECEIVABLES LIST */}
            <div className="rounded-3xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-20 text-center text-zinc-500 animate-pulse">Reconciling ledger facts...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-20 text-center">
                        {activePayerTab === 'insurance' ? (
                            <ShieldCheck size={48} className="text-zinc-200 mx-auto mb-4" />
                        ) : activePayerTab === 'corporate' ? (
                            <Briefcase size={48} className="text-zinc-200 mx-auto mb-4" />
                        ) : (
                            <Building2 size={48} className="text-zinc-200 mx-auto mb-4" />
                        )}
                        <p className="text-sm font-bold dark:text-zinc-500 text-zinc-400 tracking-tight">
                            {activePayerTab === 'insurance' 
                                ? "No outstanding claims from insurance companies." 
                                : activePayerTab === 'corporate'
                                    ? "No outstanding receivables from corporate accounts."
                                    : "No outstanding receivables from referral partners."}
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b dark:border-zinc-900 border-zinc-100">
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Partner / Account</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Open Bills</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Total Outstanding</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Oldest Dues</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                            {filtered.map((partner) => (
                                <React.Fragment key={partner.partnerId}>
                                    <tr className={`group transition-all ${expandedPartnerId === partner.partnerId ? 'bg-emerald-500/5' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30'}`}>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => setExpandedPartnerId(expandedPartnerId === partner.partnerId ? null : partner.partnerId)}
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${expandedPartnerId === partner.partnerId ? 'bg-emerald-500 text-white rotate-90' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'}`}
                                                >
                                                    <ChevronRight size={12} />
                                                </button>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold dark:text-white text-zinc-900">{partner.partnerName}</span>
                                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">PARTNER ID: {partner.partnerId?.toString()?.substring(0, 8) || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center text-sm font-semibold dark:text-zinc-400">{partner.billCount}</td>
                                        <td className="p-6 text-right">
                                            <div className="text-sm font-black text-emerald-500">₹{partner.totalAmount.toLocaleString()}</div>
                                        </td>
                                        <td className="p-6 text-xs text-zinc-400 font-medium">{new Date(partner.oldestDate).toLocaleDateString()}</td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleGenerateClaimStatement(partner)}
                                                    disabled={generatingClaim}
                                                    title="Generate B2B Diagnostic Tax Invoice for partner collections"
                                                    className="px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                                                >
                                                    <Receipt size={12} />
                                                    <span>B2B Invoice</span>
                                                </button>
                                                <button 
                                                    onClick={() => setSelectedPartner(partner)}
                                                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer"
                                                >
                                                    Record Receipt
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedPartnerId === partner.partnerId && (() => {
                                        const partnerItemIds = partner.items.map(i => i.receivableFactId);
                                        const selectedInPartner = partner.items.filter(i => selectedFactIds.has(i.receivableFactId));
                                        const selectedCount = selectedInPartner.length;
                                        const selectedSum = selectedInPartner.reduce((sum, i) => sum + (i.amount - i.amountReceived), 0);
                                        const allPartnerSelected = partner.items.length > 0 && selectedCount === partner.items.length;

                                        return (
                                            <tr>
                                                <td colSpan="8" className="p-0 bg-zinc-50/50 dark:bg-zinc-950/50">
                                                    <div className="p-6 border-x border-b dark:border-zinc-900 border-zinc-100 mx-4 mb-4 rounded-b-2xl bg-white dark:bg-zinc-950 shadow-inner">
                                                        
                                                        {/* BATCH SELECTION ACTION BAR */}
                                                        {selectedCount > 0 && (
                                                            <div className="flex items-center justify-between p-3.5 mb-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 animate-in fade-in duration-200">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                                                                        {selectedCount}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                                                                            {selectedCount} of {partner.items.length} Invoices Selected
                                                                        </p>
                                                                        <p className="text-[10px] text-zinc-500 font-medium">
                                                                            Total Selected Due: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">₹{selectedSum.toLocaleString()}</strong>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            const next = new Set(selectedFactIds);
                                                                            partnerItemIds.forEach(id => next.delete(id));
                                                                            setSelectedFactIds(next);
                                                                        }}
                                                                        className="px-3 py-1.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-[10px] font-bold cursor-pointer transition-all"
                                                                    >
                                                                        Clear Selection
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleGenerateClaimStatement(partner, selectedInPartner.map(i => i.receivableFactId))}
                                                                        disabled={generatingClaim}
                                                                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer transition-all disabled:opacity-50"
                                                                    >
                                                                        <Receipt size={13} />
                                                                        <span>Generate B2B Invoice ({selectedCount})</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 border-b dark:border-zinc-900 pb-2">
                                                                    <th className="pb-2 w-8 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={allPartnerSelected}
                                                                            onChange={(e) => {
                                                                                const next = new Set(selectedFactIds);
                                                                                if (e.target.checked) {
                                                                                    partnerItemIds.forEach(id => next.add(id));
                                                                                } else {
                                                                                    partnerItemIds.forEach(id => next.delete(id));
                                                                                }
                                                                                setSelectedFactIds(next);
                                                                            }}
                                                                            className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                            title={allPartnerSelected ? "Deselect all" : "Select all open bills"}
                                                                        />
                                                                    </th>
                                                                    <th className="pb-2">Token / Reference</th>
                                                                    <th className="pb-2">Patient</th>
                                                                    <th className="pb-2">Main Doctor</th>
                                                                    <th className="pb-2">Tests / Investigations</th>
                                                                    <th className="pb-2">Date</th>
                                                                    <th className="pb-2 text-right">Original</th>
                                                                    <th className="pb-2 text-right">Outstanding</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                                                                {partner.items.map(fact => {
                                                                    const isChecked = selectedFactIds.has(fact.receivableFactId);
                                                                    return (
                                                                        <tr key={fact.receivableFactId} className={isChecked ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : ''}>
                                                                            <td className="py-3 w-8 text-center">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    onChange={(e) => {
                                                                                        const next = new Set(selectedFactIds);
                                                                                        if (e.target.checked) {
                                                                                            next.add(fact.receivableFactId);
                                                                                        } else {
                                                                                            next.delete(fact.receivableFactId);
                                                                                        }
                                                                                        setSelectedFactIds(next);
                                                                                    }}
                                                                                    className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                                />
                                                                            </td>
                                                                            <td className="py-3 text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400">
                                                                                <div>{fact.token || fact.visitToken || fact.receivableFactId.toString().substring(0, 13)}</div>
                                                                                {fact.claimReference && (
                                                                                    <div className="text-[9px] text-indigo-500 font-sans font-semibold">
                                                                                        {activePayerTab === 'insurance' ? `Policy/Claim: ${fact.claimReference}` : `Emp ID: ${fact.claimReference}`}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-3 text-[10px] font-bold dark:text-zinc-300">{fact.patientName || 'Unknown Patient'}</td>
                                                                            <td className="py-3 text-[10px]">
                                                                                {fact.primaryDoctorName ? (
                                                                                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-[10px] truncate max-w-[160px] inline-block" title={fact.primaryDoctorName}>
                                                                                        {fact.primaryDoctorName}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-zinc-400 text-[10px]">—</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-3 text-[10px] text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate" title={fact.testsSummary || (fact.testNames?.join(', ')) || (fact.tests?.join(', ')) || '-'}>
                                                                                {fact.testsSummary || (fact.testNames?.join(', ')) || (fact.tests?.join(', ')) || '-'}
                                                                            </td>
                                                                            <td className="py-3 text-[10px] text-zinc-400">{new Date(fact.occurredAt || fact.date).toLocaleDateString()}</td>
                                                                            <td className="py-3 text-[10px] font-black text-right dark:text-zinc-300">₹{(fact.totalAmount || fact.amount || 0).toLocaleString()}</td>
                                                                            <td className="py-3 text-[10px] font-black text-right text-rose-500">₹{(fact.balanceDue !== undefined && !isNaN(fact.balanceDue) ? fact.balanceDue : (fact.amount || 0) - (fact.amountReceived || 0)).toLocaleString()}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })()}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedPartner && (
                <RecoveryModal 
                    partner={selectedPartner} 
                    onClose={() => setSelectedPartner(null)} 
                    onConfirm={(amount, method) => handleSettleRecovery(selectedPartner, amount, method)}
                    settling={settling}
                />
            )}

            {/* ENTERPRISE B2B PARTNER CLAIM BILL VIEWER */}
            {isClaimDocOpen && claimDocData && (
                <CommercialDocumentViewer
                    isOpen={isClaimDocOpen}
                    onClose={() => {
                        setIsClaimDocOpen(false);
                        setClaimDocData(null);
                    }}
                    title={`B2B Diagnostic Invoice - ${claimDocData?.partner?.name || 'Partner'}`}
                    onWhatsAppShare={handleWhatsAppClaimShare}
                    defaultLetterheadMode={claimDocData?.lab?.defaultLetterheadMode || "digital"}
                    topMarginMm={claimDocData?.lab?.topMarginMm || 40}
                >
                    <DynamicDocumentRenderer slotId="partner_b2b_invoice" data={claimDocData} />
                </CommercialDocumentViewer>
            )}
        </div>
    );
};

const RecoveryModal = ({ partner, onClose, onConfirm, settling }) => {
    const [amount, setAmount] = useState(partner.totalAmount.toString());
    const [method, setMethod] = useState('BankTransfer');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border dark:border-zinc-900 border-zinc-100 animate-in zoom-in-95 duration-300">
                <div className="p-8 flex justify-between items-center border-b dark:border-zinc-900 border-zinc-100 bg-emerald-500/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                            <ArrowDownLeft size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold dark:text-white text-zinc-900">Partner Recovery</h2>
                            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">Collecting dues from {partner.partnerName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all">
                        <X size={20} className="text-zinc-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl text-center space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2">
                            <span>Total Outstanding</span>
                            <span>Bills: {partner.billCount}</span>
                        </div>
                        <div className="text-3xl font-black text-emerald-500">₹{partner.totalAmount.toLocaleString()}</div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Recovery Amount (₹)</label>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter total amount received"
                                className="w-full px-5 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-2 border-transparent focus:border-emerald-500 outline-none transition-all dark:text-white font-black text-2xl"
                            />
                            <div className="flex gap-2 pt-2">
                                {[0.5, 1].map(pct => (
                                    <button 
                                        key={pct}
                                        onClick={() => setAmount((partner.totalAmount * pct).toFixed(2))}
                                        className="flex-1 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-500 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all"
                                    >
                                        {pct * 100}% Dues
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest ml-1">Received Via</p>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'BankTransfer', label: 'Bank Transfer', icon: CreditCard },
                                    { id: 'Cash', label: 'Cash Recovery', icon: Banknote },
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setMethod(m.id)}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                                            method === m.id 
                                            ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600' 
                                            : 'border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 text-zinc-500 hover:border-zinc-300'
                                        }`}
                                    >
                                        <m.icon size={18} />
                                        <span className="text-[11px] font-bold">{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                            <p className="text-[10px] text-amber-600 leading-relaxed font-bold">
                                <span className="uppercase mr-1">FIFO Distribution:</span>
                                Funds will be applied to the oldest invoices first.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button 
                            disabled={settling}
                            onClick={onClose}
                            className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 rounded-2xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                        >
                            CANCEL
                        </button>
                        <button 
                            disabled={settling || !amount || parseFloat(amount) <= 0}
                            onClick={() => onConfirm(parseFloat(amount), method)}
                            className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {settling ? 'RECOVERING...' : 'RECORD SETTLEMENT'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
