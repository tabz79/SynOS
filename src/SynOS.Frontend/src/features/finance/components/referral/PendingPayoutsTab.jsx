import React, { useState, useEffect } from 'react';
import { 
    DollarSign, 
    ChevronRight, 
    MoreHorizontal, 
    CreditCard, 
    Banknote, 
    Send,
    Search,
    Filter,
    CheckCircle2,
    X,
    Receipt
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { CommercialDocumentViewer } from '../documents/CommercialDocumentViewer';
import { DynamicDocumentRenderer } from '../documents/DynamicDocumentRenderer';

export const PendingPayoutsTab = () => {
    const [payables, setPayables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [settling, setSettling] = useState(false);
    const [expandedPartnerId, setExpandedPartnerId] = useState(null);

    // Enterprise Referral Payout Voucher State
    const [voucherDocData, setVoucherDocData] = useState(null);
    const [isVoucherOpen, setIsVoucherOpen] = useState(false);
    const [generatingVoucher, setGeneratingVoucher] = useState(false);
    const [selectedFactIds, setSelectedFactIds] = useState(new Set());

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getReferralPayables();
            const grouped = groupPayables(data);
            setPayables(grouped);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const groupPayables = (data) => {
        const groups = {};
        data.forEach(p => {
            if (!groups[p.referralPartnerId]) {
                groups[p.referralPartnerId] = {
                    partnerId: p.referralPartnerId,
                    partnerName: p.partnerName,
                    totalAmount: 0,
                    billCount: 0,
                    oldestDate: p.createdAt,
                    items: []
                };
            }
            groups[p.referralPartnerId].totalAmount += p.amount;
            groups[p.referralPartnerId].billCount += 1;
            if (new Date(p.createdAt) < new Date(groups[p.referralPartnerId].oldestDate)) {
                groups[p.referralPartnerId].oldestDate = p.createdAt;
            }
            groups[p.referralPartnerId].items.push(p);
        });
        return Object.values(groups);
    };

    const handleSettleBulk = async (partner, amount, method) => {
        try {
            setSettling(true);
            const factIds = partner.items.map(i => i.factId);
            const payload = {
                partnerId: partner.partnerId,
                factIds,
                totalAmount: amount,
                paymentMethod: method
            };
            console.log("Settling Referral Payout:", payload);
            await FinanceApi.settleReferralPayout(payload);
            setSelectedPartner(null);
            loadData();
        } catch (err) {
            alert("Settlement failed: " + err.message);
        } finally {
            setSettling(false);
        }
    };

    const handleGeneratePayoutVoucher = async (partner, specificFactIds = null) => {
        try {
            setGeneratingVoucher(true);
            const targetFactIds = specificFactIds && specificFactIds.length > 0
                ? specificFactIds
                : partner.items.map(i => i.factId);
            
            const res = await FinanceApi.getReferralPayoutVoucher({
                partnerId: partner.partnerId,
                factIds: targetFactIds
            });
            setVoucherDocData(res);
            setIsVoucherOpen(true);
        } catch (err) {
            console.error("Failed to generate referral payout voucher:", err);
            alert("Could not load payout voucher: " + (err.response?.data?.message || err.message));
        } finally {
            setGeneratingVoucher(false);
        }
    };

    const handleWhatsAppVoucherShare = () => {
        if (!voucherDocData) return;
        const phone = voucherDocData?.doctor?.phone || '';
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const netPayout = voucherDocData?.summary?.netPayoutAmount || 0;
        const count = voucherDocData?.items?.length || 0;
        const voucherNo = voucherDocData?.voucherNo || 'VCH';
        const msg = `Dear ${voucherDocData?.doctor?.name || 'Doctor'},\n\nReferral Commission Payout Voucher (${voucherNo}) from ${voucherDocData?.lab?.labLegalName || 'SynOS Healthcare'}:\n• Referred Patient Visits: ${count}\n• Gross Commission: ₹${(voucherDocData?.summary?.grossReferralAmount || 0).toLocaleString()}\n• TDS Deducted: ₹${(voucherDocData?.summary?.tdsDeduction || 0).toLocaleString()}\n• Net Disbursed Payout: ₹${netPayout.toLocaleString()}\n\nPayment advice and bank remittance particulars are attached. Please acknowledge receipt. Thank you!`;
        window.open(`https://wa.me/${cleanPhone ? (cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone) : ''}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const filtered = payables.filter(p => p.partnerName.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* SEARCH & FILTERS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group flex-1 max-w-md">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-synos-primary transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search partner payables..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-synos-primary/20 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-3 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-xl text-zinc-400 hover:text-synos-primary transition-all">
                        <Filter size={18} />
                    </button>
                    <button className="px-6 py-3 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-2xl text-xs font-bold hover:shadow-lg transition-all">
                        BULK SETTLE ALL
                    </button>
                </div>
            </div>

            {/* TABLE-BASED LIST */}
            <div className="rounded-3xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-20 text-center text-zinc-500 animate-pulse">Calculating payout liabilities...</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b dark:border-zinc-900 border-zinc-100">
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Partner / Account</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Pending Items</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Total Payout</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Oldest Dues</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-900 divide-zinc-100">
                            {filtered.map((partner) => (
                                <React.Fragment key={partner.partnerId}>
                                    <tr className={`group transition-all ${expandedPartnerId === partner.partnerId ? 'bg-synos-primary/5' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30'}`}>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => setExpandedPartnerId(expandedPartnerId === partner.partnerId ? null : partner.partnerId)}
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${expandedPartnerId === partner.partnerId ? 'bg-synos-primary text-white rotate-90' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'}`}
                                                >
                                                    <ChevronRight size={12} />
                                                </button>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold dark:text-white text-zinc-900">{partner.partnerName}</span>
                                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">PARTNER ID: {partner.partnerId.toString().substring(0, 8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center text-sm font-semibold dark:text-zinc-400">{partner.billCount}</td>
                                        <td className="p-6 text-right">
                                            <div className="text-sm font-black text-synos-primary">₹{partner.totalAmount.toLocaleString()}</div>
                                        </td>
                                        <td className="p-6 text-xs text-zinc-400 font-medium">{new Date(partner.oldestDate).toLocaleDateString()}</td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleGeneratePayoutVoucher(partner)}
                                                    disabled={generatingVoucher}
                                                    title="Generate Official Referral Commission Payout Voucher (A4)"
                                                    className="px-3 py-2 rounded-xl border border-synos-primary/30 dark:border-synos-primary/40 bg-synos-primary/5 dark:bg-synos-primary/10 text-synos-primary text-[10px] font-black uppercase tracking-wider hover:bg-synos-primary/15 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                                                >
                                                    <Receipt size={12} />
                                                    <span>Payout Voucher</span>
                                                </button>
                                                <button 
                                                    onClick={() => setSelectedPartner(partner)}
                                                    className="px-4 py-2 rounded-xl bg-synos-primary text-white text-[10px] font-black uppercase tracking-wider hover:shadow-lg hover:shadow-synos-primary/30 active:scale-95 transition-all cursor-pointer"
                                                >
                                                    Settle Dues
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedPartnerId === partner.partnerId && (() => {
                                        const partnerFactIds = partner.items.map(i => i.factId);
                                        const selectedInPartner = partner.items.filter(i => selectedFactIds.has(i.factId));
                                        const selectedCount = selectedInPartner.length;
                                        const selectedSum = selectedInPartner.reduce((sum, i) => sum + (i.amount || 0), 0);
                                        const allPartnerSelected = partner.items.length > 0 && selectedCount === partner.items.length;

                                        return (
                                            <tr>
                                                <td colSpan="5" className="p-0 bg-zinc-50/50 dark:bg-zinc-950/50">
                                                    <div className="p-6 border-x border-b dark:border-zinc-900 border-zinc-100 mx-4 mb-4 rounded-b-2xl bg-white dark:bg-zinc-950 shadow-inner">
                                                        
                                                        {/* BATCH SELECTION ACTION BAR */}
                                                        {selectedCount > 0 && (
                                                            <div className="flex items-center justify-between p-3.5 mb-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 animate-in fade-in duration-200">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-7 h-7 rounded-lg bg-synos-primary text-white flex items-center justify-center font-black text-xs shadow-xs">
                                                                        {selectedCount}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                                                                            {selectedCount} of {partner.items.length} Commissions Selected
                                                                        </p>
                                                                        <p className="text-[10px] text-zinc-500 font-medium">
                                                                            Total Selected Payout: <strong className="text-synos-primary font-mono">₹{selectedSum.toLocaleString()}</strong>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            const next = new Set(selectedFactIds);
                                                                            partnerFactIds.forEach(id => next.delete(id));
                                                                            setSelectedFactIds(next);
                                                                        }}
                                                                        className="px-3 py-1.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-[10px] font-bold cursor-pointer transition-all"
                                                                    >
                                                                        Clear Selection
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleGeneratePayoutVoucher(partner, selectedInPartner.map(i => i.factId))}
                                                                        disabled={generatingVoucher}
                                                                        className="px-4 py-2 rounded-xl bg-synos-primary hover:bg-synos-primary/90 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-synos-primary/20 active:scale-95 cursor-pointer transition-all disabled:opacity-50"
                                                                    >
                                                                        <Receipt size={13} />
                                                                        <span>Generate Payout Voucher ({selectedCount})</span>
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
                                                                                    partnerFactIds.forEach(id => next.add(id));
                                                                                } else {
                                                                                    partnerFactIds.forEach(id => next.delete(id));
                                                                                }
                                                                                setSelectedFactIds(next);
                                                                            }}
                                                                            className="rounded border-zinc-300 dark:border-zinc-700 text-synos-primary focus:ring-synos-primary cursor-pointer"
                                                                            title={allPartnerSelected ? "Deselect all" : "Select all commissions"}
                                                                        />
                                                                    </th>
                                                                    <th className="pb-2">Token / Reference</th>
                                                                    <th className="pb-2">Patient</th>
                                                                    <th className="pb-2">Date</th>
                                                                    <th className="pb-2 text-right">Original Bill</th>
                                                                    <th className="pb-2 text-right">Patient Paid</th>
                                                                    <th className="pb-2 text-right">Doctor Commission</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y dark:divide-zinc-900/50 divide-zinc-100">
                                                                {partner.items.map(fact => {
                                                                    const isChecked = selectedFactIds.has(fact.factId);
                                                                    return (
                                                                        <tr key={fact.factId} className={isChecked ? 'bg-synos-primary/5 dark:bg-synos-primary/10' : ''}>
                                                                            <td className="py-3 w-8 text-center">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    onChange={(e) => {
                                                                                        const next = new Set(selectedFactIds);
                                                                                        if (e.target.checked) {
                                                                                            next.add(fact.factId);
                                                                                        } else {
                                                                                            next.delete(fact.factId);
                                                                                        }
                                                                                        setSelectedFactIds(next);
                                                                                    }}
                                                                                    className="rounded border-zinc-300 dark:border-zinc-700 text-synos-primary focus:ring-synos-primary cursor-pointer"
                                                                                />
                                                                            </td>
                                                                            <td className="py-3 text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400">{fact.token || 'N/A'}</td>
                                                                            <td className="py-3 text-[10px] font-bold dark:text-zinc-300">{fact.patientName || 'Unknown Patient'}</td>
                                                                            <td className="py-3 text-[10px] text-zinc-400">{new Date(fact.createdAt).toLocaleDateString()}</td>
                                                                            <td className="py-3 text-[10px] font-black text-right dark:text-zinc-300">₹{fact.originalAmount?.toLocaleString()}</td>
                                                                            <td className="py-3 text-[10px] font-black text-right text-emerald-500">₹{fact.amountPaid?.toLocaleString()}</td>
                                                                            <td className="py-3 text-[10px] font-black text-right text-synos-primary">₹{fact.amount?.toLocaleString()}</td>
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
                <BulkSettleModal 
                    partner={selectedPartner} 
                    onClose={() => setSelectedPartner(null)} 
                    onConfirm={(amount, method) => handleSettleBulk(selectedPartner, amount, method)}
                    settling={settling}
                />
            )}

            {/* ENTERPRISE DOCTOR COMMISSION PAYOUT VOUCHER VIEWER */}
            {isVoucherOpen && voucherDocData && (
                <CommercialDocumentViewer
                    isOpen={isVoucherOpen}
                    onClose={() => {
                        setIsVoucherOpen(false);
                        setVoucherDocData(null);
                    }}
                    title={`Doctor Commission Payout Voucher - ${voucherDocData?.doctor?.name || 'Doctor'}`}
                    onWhatsAppShare={handleWhatsAppVoucherShare}
                    defaultLetterheadMode={voucherDocData?.lab?.defaultLetterheadMode || "digital"}
                    topMarginMm={voucherDocData?.lab?.topMarginMm || 40}
                >
                    <DynamicDocumentRenderer slotId="referral_payout_voucher" data={voucherDocData} />
                </CommercialDocumentViewer>
            )}
        </div>
    );
};

const BulkSettleModal = ({ partner, onClose, onConfirm, settling }) => {
    const [amount, setAmount] = useState(partner.totalAmount.toString());
    const [method, setMethod] = useState('BankTransfer');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border dark:border-zinc-900 border-zinc-100 animate-in zoom-in-95 duration-300">
                <div className="p-8 flex justify-between items-center border-b dark:border-zinc-900 border-zinc-100 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold dark:text-white text-zinc-900">Commission Payout</h2>
                            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">Settle dues for {partner.partnerName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all">
                        <X size={20} className="text-zinc-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl text-center space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2">
                            <span>Total Dues</span>
                            <span>Bills: {partner.billCount}</span>
                        </div>
                        <div className="text-3xl font-black text-synos-primary">₹{partner.totalAmount.toLocaleString()}</div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Settlement Amount (₹)</label>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter total amount to payout"
                                className="w-full px-5 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-2 border-transparent focus:border-synos-primary outline-none transition-all dark:text-white font-black text-2xl"
                            />
                            <div className="flex gap-2 pt-2">
                                {[0.5, 1].map(pct => (
                                    <button 
                                        key={pct}
                                        onClick={() => setAmount((partner.totalAmount * pct).toFixed(2))}
                                        className="flex-1 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-500 hover:bg-synos-primary/10 hover:text-synos-primary transition-all"
                                    >
                                        {pct * 100}% Dues
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest ml-1">Payment Method</p>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'BankTransfer', label: 'Bank Transfer', icon: CreditCard },
                                    { id: 'Cash', label: 'Cash Payment', icon: Banknote },
                                    { id: 'UPI', label: 'UPI / Digital', icon: Send },
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setMethod(m.id)}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                                            method === m.id 
                                            ? 'border-synos-primary bg-synos-primary/5 text-synos-primary' 
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
                                Payout will be applied to the oldest referral commissions first.
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
                            className="flex-[2] py-4 bg-synos-primary text-white rounded-2xl text-xs font-bold hover:shadow-lg hover:shadow-synos-primary/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {settling ? 'PROCESSING...' : 'CONFIRM PAYOUT'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
