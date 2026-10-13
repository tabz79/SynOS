import React from 'react';
import { QrCode, Building2, User, FileText, ArrowRight } from 'lucide-react';

export const PartnerClaimStatementA4 = ({ 
    data, 
    letterheadMode = "digital", 
    topMarginMm = 40 
}) => {
    if (!data) return <div className="p-8 text-center text-zinc-400">Loading claim statement...</div>;

    const {
        statementNumber,
        date,
        dueDate,
        billingPeriod,
        lab,
        partner,
        items = [],
        summary = {},
        upiQrString
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
                            <div className="inline-block px-3 py-1 bg-indigo-900 text-white rounded font-black text-[11px] tracking-wider uppercase">
                                B2B Partner Claim Bill
                            </div>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                                Statement of Account
                            </p>
                            <p className="text-[9px] text-zinc-400 font-semibold">
                                Diagnostic Services Settlement
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* PARTNER (BILL TO) & STATEMENT METADATA */}
            <div className="grid grid-cols-2 gap-4 border border-zinc-300 rounded-lg p-3.5 mb-4 bg-zinc-50/50 print:bg-transparent">
                {/* Left: Referral Doctor Details */}
                <div className="space-y-1 border-r border-zinc-200 pr-3">
                    <p className="text-[10px] font-extrabold uppercase text-indigo-700 tracking-wider">
                        Billed To Referral Partner / Doctor
                    </p>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Doctor / Partner:</span>
                        <strong className="text-zinc-900 font-bold text-xs">{partner?.name || "Dr. Partner"}</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Clinic / Hospital:</span>
                        <span className="font-semibold text-zinc-800">{partner?.clinicName || "Medical Practice"}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Location:</span>
                        <span>{partner?.address || "Registered Medical Address"}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Contact / Phone:</span>
                        <span className="font-mono">{partner?.phone || "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Billing Model:</span>
                        <span className="font-semibold text-indigo-800">
                            Partner B2B (Standard Lab Tariff)
                        </span>
                    </div>
                </div>

                {/* Right: Statement Particulars */}
                <div className="space-y-1 pl-1">
                    <p className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Statement Details</p>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Statement Reference:</span>
                        <strong className="font-mono font-black text-zinc-900">{statementNumber}</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Statement Date:</span>
                        <span>{new Date(date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Settlement Due Date:</span>
                        <span className="font-bold text-rose-600">{new Date(dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Billing Period:</span>
                        <span className="font-medium text-zinc-800">{billingPeriod}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-zinc-200">
                        <span className="text-zinc-500">Total Patient Visits:</span>
                        <span className="px-2 py-0.5 rounded font-black text-[10px] bg-zinc-200 text-zinc-800">
                            {summary.totalVisitsCount || items.length} Invoices
                        </span>
                    </div>
                </div>
            </div>

            {/* NOTICE BANNER */}
            <div className="mb-3 p-2 bg-indigo-50/70 border border-indigo-200 rounded text-[10px] text-indigo-900 flex items-center justify-between">
                <span>
                    <strong>Settlement Notice:</strong> The investigations listed below were registered through your partner account and billed at standard lab tariff.
                </span>
                <span className="font-semibold">B2B Standard Rates</span>
            </div>

            {/* ITEMIZED VISITS LEDGER TABLE */}
            <div className="mb-4 overflow-hidden rounded-lg border border-zinc-300">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-100 border-b border-zinc-300 text-[10px] font-black uppercase text-zinc-700 tracking-wider">
                            <th className="p-2 w-8 text-center">#</th>
                            <th className="p-2 w-20">Date</th>
                            <th className="p-2 w-24">Token / Ref</th>
                            <th className="p-2">Patient Name & Age</th>
                            <th className="p-2">Investigations Performed</th>
                            <th className="p-2 w-28 text-right text-indigo-950 font-black">Lab Rate (₹)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-4 text-center text-zinc-400">No visits included in this statement.</td>
                            </tr>
                        ) : (
                            items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-zinc-50 text-[11px] print:break-inside-avoid">
                                    <td className="p-2 text-center text-zinc-400 font-mono">{item.index || idx + 1}</td>
                                    <td className="p-2 text-zinc-500 font-mono text-[10px]">{new Date(item.date).toLocaleDateString()}</td>
                                    <td className="p-2 font-mono font-bold text-zinc-800 text-[10px]">{item.token || item.billNumber}</td>
                                    <td className="p-2">
                                        <strong className="text-zinc-900 block">{item.patientName}</strong>
                                        {item.ageGender && <span className="text-[9px] text-zinc-400">{item.ageGender}</span>}
                                    </td>
                                    <td className="p-2 text-zinc-700 text-[10px] max-w-xs truncate" title={item.investigations}>
                                        {item.investigations}
                                    </td>
                                    <td className="p-2 text-right font-mono font-bold text-zinc-900">
                                        ₹{Number(item.grossAmount ?? item.rate ?? 0).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* STATEMENT SUMMARY & BANK SCAN & PAY */}
            <div className="grid grid-cols-12 gap-4 mb-4">
                {/* Left 7 Columns: Words & Bank Transfer QR */}
                <div className="col-span-7 space-y-3">
                    <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">Net Amount in Words</span>
                        <p className="text-xs font-black text-indigo-950 italic">
                            {summary.amountInWords || "Zero Rupees Only"}
                        </p>
                    </div>

                    {/* Remittance Box */}
                    <div className="p-3 rounded-lg border border-zinc-200 flex gap-3 items-center">
                        <div className="w-20 h-20 bg-white p-1 rounded border border-zinc-300 flex flex-col items-center justify-center shrink-0">
                            {upiQrString ? (
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(upiQrString)}`}
                                    alt="UPI QR"
                                    className="w-16 h-16 object-contain"
                                />
                            ) : (
                                <QrCode size={40} className="text-zinc-400" />
                            )}
                            <span className="text-[8px] font-extrabold uppercase text-zinc-500 mt-0.5">UPI Remit</span>
                        </div>

                        <div className="space-y-0.5 text-[10px] text-zinc-600 flex-1">
                            <strong className="text-zinc-900 uppercase block tracking-wider text-[10px]">Direct Lab Account Remittance</strong>
                            <p>Bank: <strong className="text-zinc-800">{lab?.bankName || "HDFC Bank"}</strong></p>
                            <p>A/C No: <strong className="font-mono text-zinc-900">{lab?.accountNumber || "50200012345678"}</strong></p>
                            <p>IFSC: <strong className="font-mono text-zinc-900">{lab?.ifscCode || "HDFC0001234"}</strong> ({lab?.branch || "Main Branch"})</p>
                            <p>UPI ID: <strong className="font-mono text-indigo-700">{lab?.upiId || "synoslab@hdfcbank"}</strong></p>
                        </div>
                    </div>
                </div>

                {/* Right 5 Columns: Financial Breakdown */}
                <div className="col-span-5 bg-zinc-50 rounded-lg border border-zinc-300 p-3 space-y-2 text-[11px]">
                    <div className="flex justify-between text-zinc-600">
                        <span>Total Diagnostic Charges:</span>
                        <span className="font-mono font-bold">
                            ₹{Number(summary.totalDiagnosticCharges ?? summary.totalGrossBilled ?? 0).toLocaleString()}
                        </span>
                    </div>

                    {summary.totalPaid > 0 && (
                        <div className="flex justify-between text-emerald-700 font-semibold">
                            <span>Less: Prior Receipts Realized:</span>
                            <span className="font-mono">-₹{Number(summary.totalPaid).toLocaleString()}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-xs font-black text-indigo-900 border-t-2 border-indigo-900 pt-2">
                        <span>Net Amount Due to Lab:</span>
                        <span className="font-mono text-sm">₹{Number(summary.netClaimDue || 0).toLocaleString()}</span>
                    </div>

                    <p className="text-[9px] text-zinc-400 italic leading-tight pt-1">
                        * Please transfer the net claim amount of ₹{Number(summary.netClaimDue || 0).toLocaleString()} within 15 days of this statement.
                    </p>
                </div>
            </div>

            {/* FOOTER & SIGN-OFF */}
            <div className="border-t border-zinc-300 pt-3 mt-auto">
                <div className="flex justify-between items-end">
                    <div className="space-y-1 text-[9px] text-zinc-500 max-w-[65%]">
                        <strong className="text-zinc-700 uppercase block tracking-wider">Settlement Terms</strong>
                        <p>{lab?.termsAndConditions || "1. All disputes subject to local jurisdiction.\n2. In case of online payment, please quote statement reference."}</p>
                        <p className="italic text-zinc-400 pt-0.5">Automated B2B Partner Statement generated by SynOS Finance Intelligence.</p>
                    </div>

                    {/* Authorized Signature Box */}
                    <div className="text-center space-y-10 min-w-[150px]">
                        <div className="h-8" />
                        <div className="border-t border-zinc-400 pt-1">
                            <p className="text-[10px] font-bold text-zinc-900 uppercase">
                                {lab?.signatoryTitle || "Authorised Signatory"}
                            </p>
                            <p className="text-[9px] text-zinc-400">Finance & Partner Desk</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
