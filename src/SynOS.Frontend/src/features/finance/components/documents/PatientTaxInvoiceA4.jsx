import React from 'react';
import { IndianRupee, QrCode, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

export const PatientTaxInvoiceA4 = ({ 
    data, 
    letterheadMode = "digital", 
    topMarginMm = 40 
}) => {
    if (!data) return <div className="p-8 text-center text-zinc-400">Loading document data...</div>;

    const {
        billNumber,
        date,
        dueDate,
        status,
        lab,
        patient,
        items = [],
        financial = {},
        payments = [],
        upiQrString
    } = data;

    const isPaid = (status || '').toLowerCase() === 'paid' || financial.balanceDue <= 0;
    const isPartial = (status || '').toLowerCase() === 'partial';

    return (
        <div className="w-full flex flex-col justify-between text-zinc-900 text-xs font-sans leading-normal">
            
            {/* TOP HEADER SECTION */}
            {letterheadMode === 'preprinted' ? (
                // Blank top spacing for physical pre-printed letterhead
                <div style={{ height: `${topMarginMm}mm` }} className="w-full print:block" />
            ) : (
                // Full Digital Letterhead
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
                                {lab?.address || "Central Facility, Khammam, Telangana - 507001"}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[9px] text-zinc-600 font-semibold pt-0.5">
                                <span>Phone: {lab?.phone || "+91 98765 43210"}</span>
                                <span>Email: {lab?.email || "billing@synoslab.in"}</span>
                                <span>GSTIN: <strong className="font-mono text-zinc-900">{lab?.gstin || "36AAAAA0000A1Z5"}</strong></span>
                            </div>
                        </div>

                        {/* DOCUMENT BADGE / LOGO */}
                        <div className="text-right space-y-1">
                            <div className="inline-block px-3 py-1 bg-zinc-900 text-white rounded font-black text-[11px] tracking-wider uppercase">
                                Tax Invoice
                            </div>
                            <p className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider block">
                                Original for Recipient
                            </p>
                            {lab?.pan && (
                                <p className="text-[9px] text-zinc-500 font-mono">PAN: {lab.pan}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* INVOICE META & PATIENT DETAILS GRID */}
            <div className="grid grid-cols-2 gap-4 border border-zinc-300 rounded-lg p-3.5 mb-4 bg-zinc-50/50 print:bg-transparent">
                {/* Left: Patient Details */}
                <div className="space-y-1 border-r border-zinc-200 pr-3">
                    <p className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Patient Details (Billed To)</p>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Name:</span>
                        <strong className="text-zinc-900 font-bold">{patient?.name || "Direct Walk-in Patient"}</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">UHID / MRN:</span>
                        <span className="font-mono font-bold text-zinc-800">{patient?.uhid || "WALK-IN"}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Age / Gender:</span>
                        <span>{patient?.ageGender || "Adult"}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Contact No:</span>
                        <span className="font-mono">{patient?.phone || "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Ref Doctor:</span>
                        <span className="font-semibold text-zinc-800">{patient?.referringDoctor || "Self / Direct"}</span>
                    </div>
                </div>

                {/* Right: Invoice Meta & Status */}
                <div className="space-y-1 pl-1">
                    <p className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Bill Particulars</p>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Invoice Number:</span>
                        <strong className="font-mono font-black text-zinc-900">{billNumber}</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Invoice Date:</span>
                        <span>{new Date(date).toLocaleDateString()} {new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Token Number:</span>
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                            {patient?.token || "COUNTER"}
                        </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Branch Facility:</span>
                        <span>{patient?.branchName || "Main Facility"}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                        <span className="text-zinc-500">Payment Status:</span>
                        <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase border tracking-wider ${
                            isPaid 
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                                : (isPartial 
                                    ? "bg-amber-100 text-amber-800 border-amber-300" 
                                    : "bg-rose-100 text-rose-800 border-rose-300")
                        }`}>
                            {isPaid ? "PAID FULL" : (isPartial ? "PARTIAL DUE" : "PAYMENT PENDING")}
                        </span>
                    </div>
                </div>
            </div>

            {/* ITEMIZED SERVICES / INVESTIGATIONS TABLE */}
            <div className="mb-4 overflow-hidden rounded-lg border border-zinc-300">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-100 border-b border-zinc-300 text-[10px] font-black uppercase text-zinc-700 tracking-wider">
                            <th className="p-2.5 w-8 text-center">#</th>
                            <th className="p-2.5">Investigation / Service Description</th>
                            <th className="p-2.5 w-24">Department</th>
                            <th className="p-2.5 w-20 text-center font-mono">SAC Code</th>
                            <th className="p-2.5 w-20 text-right">Tariff (₹)</th>
                            <th className="p-2.5 w-16 text-right">Disc</th>
                            <th className="p-2.5 w-24 text-right">Net Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="p-4 text-center text-zinc-400">Routine Investigation / General Diagnostic Services</td>
                            </tr>
                        ) : (
                            items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-zinc-50 text-[11px]">
                                    <td className="p-2 text-center text-zinc-400 font-mono">{item.index || idx + 1}</td>
                                    <td className="p-2 font-semibold text-zinc-900">
                                        {item.name}
                                        {item.code && <span className="text-[9px] text-zinc-400 font-mono ml-2">[{item.code}]</span>}
                                    </td>
                                    <td className="p-2 text-zinc-600">{item.department || "Pathology"}</td>
                                    <td className="p-2 text-center font-mono text-zinc-500">{item.sacCode || "999312"}</td>
                                    <td className="p-2 text-right font-mono">₹{Number(item.price).toLocaleString()}</td>
                                    <td className="p-2 text-right font-mono text-zinc-500">₹{Number(item.discount || 0).toLocaleString()}</td>
                                    <td className="p-2 text-right font-mono font-bold text-zinc-900">₹{Number(item.amount || item.price).toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* FINANCIAL SUMMARY & GST BREAKUP */}
            <div className="grid grid-cols-12 gap-4 mb-4">
                {/* Left 7 Columns: Amount in words & Bank Details */}
                <div className="col-span-7 space-y-3">
                    <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">Amount in Words</span>
                        <p className="text-xs font-bold text-zinc-900 italic">
                            {financial.amountInWords || "Zero Rupees Only"}
                        </p>
                    </div>

                    {/* Bank Settlement & UPI QR Code */}
                    <div className="p-3 rounded-lg border border-zinc-200 flex gap-3 items-center">
                        {/* Dynamic UPI QR Code */}
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
                            <span className="text-[8px] font-extrabold uppercase text-zinc-500 mt-0.5">Scan to Pay</span>
                        </div>

                        {/* Bank Text */}
                        <div className="space-y-0.5 text-[10px] text-zinc-600 flex-1">
                            <strong className="text-zinc-900 uppercase block tracking-wider text-[10px]">Bank Transfer Details</strong>
                            <p>Bank: <strong className="text-zinc-800">{lab?.bankName || "HDFC Bank"}</strong></p>
                            <p>A/C No: <strong className="font-mono text-zinc-900">{lab?.accountNumber || "50200012345678"}</strong></p>
                            <p>IFSC: <strong className="font-mono text-zinc-900">{lab?.ifscCode || "HDFC0001234"}</strong> ({lab?.branch || "Main Branch"})</p>
                            <p>UPI ID: <strong className="font-mono text-indigo-700">{lab?.upiId || "synoslab@hdfcbank"}</strong></p>
                        </div>
                    </div>
                </div>

                {/* Right 5 Columns: Totals Calculation */}
                <div className="col-span-5 bg-zinc-50 rounded-lg border border-zinc-300 p-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-zinc-600">
                        <span>Gross Subtotal:</span>
                        <span className="font-mono">₹{Number(financial.grossSubtotal || financial.totalAmount || 0).toLocaleString()}</span>
                    </div>

                    {financial.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                            <span>Discount / Concession:</span>
                            <span className="font-mono">-₹{Number(financial.discountAmount).toLocaleString()}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-zinc-600 border-t border-zinc-200 pt-1">
                        <span>Taxable Value (SAC 999312):</span>
                        <span className="font-mono">₹{Number(financial.taxableAmount || financial.totalAmount || 0).toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>CGST (0%) & SGST (0%):</span>
                        <span className="italic">Exempted (Health Services)</span>
                    </div>

                    <div className="flex justify-between text-sm font-black text-zinc-900 border-t-2 border-zinc-900 pt-1.5">
                        <span>Net Total Billed:</span>
                        <span className="font-mono">₹{Number(financial.totalAmount || 0).toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-emerald-700 font-bold border-t border-zinc-200 pt-1">
                        <span>Total Paid / Received:</span>
                        <span className="font-mono">₹{Number(financial.totalCollected || 0).toLocaleString()}</span>
                    </div>

                    <div className={`flex justify-between font-black pt-1 border-t border-zinc-200 ${
                        financial.balanceDue > 0 ? "text-rose-600" : "text-zinc-500"
                    }`}>
                        <span>Balance Outstanding Due:</span>
                        <span className="font-mono text-xs">₹{Number(financial.balanceDue || 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* PAYMENTS HISTORY STRIP (IF ANY RECORDED) */}
            {payments.length > 0 && (
                <div className="mb-4 p-2.5 bg-zinc-50/70 rounded border border-zinc-200 text-[10px] space-y-1">
                    <span className="font-bold uppercase text-zinc-400 tracking-wider">Settlement Receipt History</span>
                    <div className="flex flex-wrap gap-4 text-zinc-700">
                        {payments.map((p, i) => (
                            <span key={i} className="inline-flex items-center gap-1 font-mono">
                                • {p.method}: <strong>₹{Number(p.amount).toLocaleString()}</strong> ({new Date(p.date).toLocaleDateString()}) [Ref: {p.reference}]
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* FOOTER & SIGN-OFF SECTION */}
            <div className="border-t border-zinc-300 pt-3 mt-auto">
                <div className="flex justify-between items-end">
                    <div className="space-y-1 text-[9px] text-zinc-500 max-w-[65%]">
                        <strong className="text-zinc-700 uppercase block tracking-wider">Terms & Conditions</strong>
                        <p>{lab?.termsAndConditions || "1. All disputes subject to local jurisdiction.\n2. Diagnostic tests are subject to clinical correlation."}</p>
                        {lab?.systemNote !== undefined ? (
                            lab.systemNote ? <p className="italic text-zinc-400 pt-1">{lab.systemNote}</p> : null
                        ) : (
                            <p className="italic text-zinc-400 pt-1">This is an authentic computer-generated Tax Invoice generated by SynOS Diagnostic OS.</p>
                        )}
                    </div>

                    {/* Authorized Signatory Stamp Box */}
                    <div className="text-center space-y-10 min-w-[150px]">
                        <div className="h-8" /> {/* Space for stamp / physical signature */}
                        <div className="border-t border-zinc-400 pt-1">
                            <p className="text-[10px] font-bold text-zinc-900 uppercase">
                                {lab?.signatoryTitle || "Authorised Signatory"}
                            </p>
                            <p className="text-[9px] text-zinc-400">Accounts & Billing Desk</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
