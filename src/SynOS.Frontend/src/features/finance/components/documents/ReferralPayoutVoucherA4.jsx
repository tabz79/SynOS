import React from 'react';
import { Building2, User, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

export const ReferralPayoutVoucherA4 = ({ 
    data, 
    letterheadMode = "digital", 
    topMarginMm = 40 
}) => {
    if (!data) return <div className="p-8 text-center text-zinc-400">Loading payout voucher...</div>;

    const {
        voucherNumber,
        date,
        billingPeriod,
        lab,
        doctor,
        items = [],
        summary = {}
    } = data;

    return (
        <div className="w-full flex flex-col justify-between text-zinc-900 text-xs font-sans leading-normal">

            {/* TOP HEADER SECTION */}
            {letterheadMode === 'preprinted' ? (
                <div style={{ height: `${topMarginMm}mm` }} className="w-full print:block" />
            ) : (
                <div className="border-b-2 border-zinc-900 pb-4 mb-4">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1 max-w-[65%]">
                            <h1 className="text-xl font-black text-zinc-900 tracking-tight uppercase">
                                {lab?.labLegalName || "SynOS Diagnostic Centre & Laboratory"}
                            </h1>
                            <p className="text-[11px] font-bold text-zinc-600">
                                {lab?.labTradeName || "Comprehensive Pathology & Medical Imaging"}
                            </p>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">
                                {lab?.address || "Central Diagnostic Facility, Hyderabad, Telangana"}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[9px] text-zinc-600 font-semibold pt-0.5">
                                <span>Phone: {lab?.phone || "+91 98765 43210"}</span>
                                <span>Email: {lab?.email || "billing@synoslab.in"}</span>
                                <span>GSTIN: <strong className="font-mono text-zinc-900">{lab?.gstin || "36AAAAA0000A1Z5"}</strong></span>
                            </div>
                        </div>

                        {/* DOCUMENT BADGE */}
                        <div className="text-right space-y-1">
                            <div className="inline-block px-3 py-1 bg-emerald-800 text-white rounded font-black text-[11px] tracking-wider uppercase">
                                Referral Payout Voucher
                            </div>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                                Commission Advice
                            </p>
                            <p className="text-[9px] text-zinc-400 font-semibold">
                                Professional Incentive Slip
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* DOCTOR (PAYEE) & VOUCHER PARTICULARS */}
            <div className="grid grid-cols-2 gap-4 border border-zinc-300 rounded-lg p-3.5 mb-4 bg-zinc-50/50 print:bg-transparent">
                {/* Left: Doctor Particulars */}
                <div className="space-y-1 border-r border-zinc-200 pr-3">
                    <p className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider">
                        Payee / Referral Doctor Details
                    </p>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Doctor Name:</span>
                        <strong className="text-zinc-900 font-bold text-xs">{doctor?.name || "Dr. Partner"}</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Clinic / Hospital:</span>
                        <span className="font-semibold text-zinc-800">{doctor?.clinicName || "Medical Practice"}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Location:</span>
                        <span>{doctor?.address || "Registered Medical Address"}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Contact / Phone:</span>
                        <span className="font-mono">{doctor?.phone || "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Payout Category:</span>
                        <span className="font-semibold text-emerald-800">
                            Diagnostic Referral Incentive
                        </span>
                    </div>
                </div>

                {/* Right: Voucher Particulars */}
                <div className="space-y-1 pl-1">
                    <p className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Voucher Details</p>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Voucher Reference:</span>
                        <strong className="font-mono font-black text-zinc-900">{voucherNumber}</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Disbursement Date:</span>
                        <span>{new Date(date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Settlement Period:</span>
                        <span className="font-medium text-zinc-800">{billingPeriod}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-zinc-200">
                        <span className="text-zinc-500">Total Patient Visits:</span>
                        <span className="px-2 py-0.5 rounded font-black text-[10px] bg-emerald-100 text-emerald-900">
                            {summary.totalVisitsCount || items.length} Referred Cases
                        </span>
                    </div>
                </div>
            </div>

            {/* NOTICE BANNER */}
            <div className="mb-3 p-2 bg-emerald-50/70 border border-emerald-200 rounded text-[10px] text-emerald-900 flex items-center justify-between">
                <span>
                    <strong>Professional Incentive Advice:</strong> The investigations below were referred by your clinical practice and processed by our diagnostic laboratory.
                </span>
                <span className="font-semibold">Agreed Tariff Schedule</span>
            </div>

            {/* ITEMIZED REFERRAL SCHEDULE */}
            <div className="mb-4 overflow-hidden rounded-lg border border-zinc-300">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-100 border-b border-zinc-300 text-[10px] font-black uppercase text-zinc-700 tracking-wider">
                            <th className="p-2 w-8 text-center">#</th>
                            <th className="p-2 w-20">Date</th>
                            <th className="p-2 w-24">Token / Ref</th>
                            <th className="p-2">Patient Name & Age</th>
                            <th className="p-2">Investigation Performed</th>
                            <th className="p-2 w-24 text-right">Billed (₹)</th>
                            <th className="p-2 w-24 text-right text-emerald-800 font-black">Incentive (₹)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="p-4 text-center text-zinc-400">No referred visits in this voucher.</td>
                            </tr>
                        ) : (
                            items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-zinc-50 text-[11px] print:break-inside-avoid">
                                    <td className="p-2 text-center text-zinc-400 font-mono">{item.index || idx + 1}</td>
                                    <td className="p-2 text-zinc-500 font-mono text-[10px]">{new Date(item.date).toLocaleDateString()}</td>
                                    <td className="p-2 font-mono font-bold text-zinc-800 text-[10px]">{item.token}</td>
                                    <td className="p-2">
                                        <strong className="text-zinc-900 block">{item.patientName}</strong>
                                        {item.ageGender && <span className="text-[9px] text-zinc-400">{item.ageGender}</span>}
                                    </td>
                                    <td className="p-2 text-zinc-700 text-[10px] max-w-xs truncate" title={item.investigations}>
                                        {item.investigations}
                                    </td>
                                    <td className="p-2 text-right font-mono text-zinc-600">
                                        ₹{Number(item.patientBilledAmount || 0).toLocaleString()}
                                    </td>
                                    <td className="p-2 text-right font-mono font-bold text-emerald-700">
                                        ₹{Number(item.commissionAmount || 0).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* VOUCHER SUMMARY & REMITTANCE RECORD */}
            <div className="grid grid-cols-12 gap-4 mb-4">
                {/* Left 7 Columns: Words & Payment Remittance Mode */}
                <div className="col-span-7 space-y-3">
                    <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">Net Disbursed Amount in Words</span>
                        <p className="text-xs font-black text-emerald-950 italic">
                            {summary.amountInWords || "Zero Rupees Only"}
                        </p>
                    </div>

                    {/* Disbursement Mode Confirmation Box */}
                    <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 space-y-1.5 text-[10px]">
                        <strong className="text-zinc-900 uppercase block tracking-wider text-[10px]">Settlement Remittance Confirmation</strong>
                        <div className="grid grid-cols-2 gap-2 text-zinc-600">
                            <div>Payment Mode: <strong className="text-zinc-900">Bank Transfer (NEFT/IMPS)</strong></div>
                            <div>Reference / UTR: <strong className="font-mono text-zinc-900">DIRECT DISBURSEMENT</strong></div>
                            <div>Debited From: <strong className="text-zinc-800">{lab?.bankName || "HDFC Bank"} (A/C ...{lab?.accountNumber?.slice(-4) || "4567"})</strong></div>
                            <div>Disbursement Date: <strong className="text-zinc-800">{new Date(date).toLocaleDateString()}</strong></div>
                        </div>
                    </div>
                </div>

                {/* Right 5 Columns: Financial Breakdown */}
                <div className="col-span-5 bg-zinc-50 rounded-lg border border-zinc-300 p-3 space-y-2 text-[11px]">
                    <div className="flex justify-between text-zinc-600">
                        <span>Gross Referral Incentive:</span>
                        <span className="font-mono font-bold">
                            ₹{Number(summary.grossCommission || 0).toLocaleString()}
                        </span>
                    </div>

                    {summary.tdsAmount > 0 && (
                        <div className="flex justify-between text-rose-700 font-semibold">
                            <span>Less: TDS (Sec 194H) ({summary.tdsPercentage}%):</span>
                            <span className="font-mono">-₹{Number(summary.tdsAmount).toLocaleString()}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-xs font-black text-emerald-900 border-t-2 border-emerald-800 pt-2">
                        <span>Net Payout Disbursed:</span>
                        <span className="font-mono text-sm">₹{Number(summary.netDisbursed || 0).toLocaleString()}</span>
                    </div>

                    <p className="text-[9px] text-zinc-400 italic leading-tight pt-1">
                        * Payout confirmed and credited as per diagnostic professional collaboration policy.
                    </p>
                </div>
            </div>

            {/* DUAL SIGNATURE SIGN-OFF */}
            <div className="border-t border-zinc-300 pt-4 mt-auto">
                <div className="flex justify-between items-end">
                    <div className="text-center space-y-8 min-w-[180px]">
                        <div className="h-6" />
                        <div className="border-t border-zinc-400 pt-1">
                            <p className="text-[10px] font-bold text-zinc-900 uppercase">
                                {lab?.signatoryTitle || "Authorised Signatory"}
                            </p>
                            <p className="text-[9px] text-zinc-400">Finance & Accounts Desk</p>
                        </div>
                    </div>

                    <div className="text-center space-y-1 text-[9px] text-zinc-400 italic max-w-[40%]">
                        <p>This payout advice serves as official documentary acknowledgment of professional referral fees disbursed.</p>
                    </div>

                    <div className="text-center space-y-8 min-w-[180px]">
                        <div className="h-6" />
                        <div className="border-t border-zinc-400 pt-1">
                            <p className="text-[10px] font-bold text-zinc-900 uppercase">
                                Doctor / Receiver Signature
                            </p>
                            <p className="text-[9px] text-zinc-400">Date & Clinic Seal</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
