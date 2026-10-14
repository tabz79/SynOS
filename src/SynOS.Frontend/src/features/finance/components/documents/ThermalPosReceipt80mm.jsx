import React from 'react';
import { IndianRupee, QrCode } from 'lucide-react';

export const ThermalPosReceipt80mm = ({ data }) => {
    if (!data) return <div className="p-4 text-center font-mono text-xs">Loading receipt...</div>;

    const {
        receiptNumber = "RCPT-202610-0912",
        dateTime = new Date().toLocaleString(),
        lab = {},
        patient = {},
        items = [],
        financial = {},
        token = "T-0142",
        cashier = "Counter Desk #1",
        upiQrString
    } = data;

    return (
        <div className="w-[76mm] max-w-full mx-auto p-3 bg-white text-zinc-900 font-mono text-[11px] leading-tight border border-dashed border-zinc-400 print:border-none print:p-0">
            {/* LAB HEADER */}
            <div className="text-center pb-2 border-b border-dashed border-zinc-800 space-y-0.5">
                <h2 className="font-black text-sm uppercase tracking-tight">{lab.labLegalName || "SynOS Diagnostic Centre"}</h2>
                <p className="text-[10px] text-zinc-600">{lab.address || "Khammam, Telangana"}</p>
                <p className="text-[10px] font-bold">Ph: {lab.phone || "+91 98765 43210"}</p>
                <p className="text-[9px]">GSTIN: {lab.gstin || "36AAAAA0000A1Z5"}</p>
            </div>

            {/* TOKEN BADGE */}
            <div className="my-2 p-1.5 bg-zinc-100 border border-zinc-300 rounded text-center">
                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block">Counter Token</span>
                <span className="text-2xl font-black tracking-tight">{token}</span>
            </div>

            {/* RECEIPT PARTICULARS */}
            <div className="py-1.5 border-b border-dashed border-zinc-400 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                    <span>Receipt No:</span>
                    <strong>{receiptNumber}</strong>
                </div>
                <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{dateTime}</span>
                </div>
                <div className="flex justify-between">
                    <span>Patient:</span>
                    <strong className="truncate max-w-[150px]">{patient.fullName || "Walk-in Patient"}</strong>
                </div>
                <div className="flex justify-between">
                    <span>MRN / Age / Sex:</span>
                    <span>{patient.mrn || "SYN-2026-9042"} / {patient.age || "42Y"} / {patient.gender || "M"}</span>
                </div>
                <div className="flex justify-between">
                    <span>Counter:</span>
                    <span>{cashier}</span>
                </div>
            </div>

            {/* ITEM SCHEDULE */}
            <div className="py-2 border-b border-dashed border-zinc-800">
                <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-zinc-300">
                    <span>Investigation</span>
                    <span>Price</span>
                </div>
                <div className="space-y-1 pt-1 text-[10px]">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                            <span className="truncate max-w-[190px]">{item.testName}</span>
                            <span>₹{item.netPrice || item.unitPrice}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* FINANCIAL SUMMARY */}
            <div className="py-2 border-b border-dashed border-zinc-800 text-[11px] space-y-1">
                <div className="flex justify-between">
                    <span>Total Billed:</span>
                    <strong>₹{financial.grandTotal || financial.subtotal || 0}</strong>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Amount Paid (Cash/UPI):</span>
                    <strong>₹{financial.amountPaid || 0}</strong>
                </div>
                {(financial.balanceDue > 0) && (
                    <div className="flex justify-between text-rose-700 font-bold border-t border-dotted border-zinc-400 pt-0.5">
                        <span>Balance Due:</span>
                        <strong>₹{financial.balanceDue}</strong>
                    </div>
                )}
            </div>

            {/* DYNAMIC UPI QR */}
            {lab.enableUpiQr && (
                <div className="py-3 text-center border-b border-dashed border-zinc-400 space-y-1">
                    <div className="inline-block p-1 bg-white border border-zinc-400 rounded">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(upiQrString || `upi://pay?pa=${lab.upiId}&pn=${encodeURIComponent(lab.labLegalName)}&am=${financial.balanceDue || financial.grandTotal}&cu=INR`)}`} 
                            alt="Scan UPI to Pay" 
                            className="w-20 h-20 mx-auto"
                        />
                    </div>
                    <p className="text-[9px] font-bold text-zinc-600">Scan using PhonePe / GPay / Paytm</p>
                </div>
            )}

            {/* FOOTER */}
            <div className="pt-2 text-center text-[9px] text-zinc-500 space-y-0.5">
                <p className="font-bold">Thank You • Get Well Soon</p>
                <p>Reports ready within 4 hours. Download online via SMS link.</p>
                <p className="text-[8px] pt-1 font-mono">Printed via SynOS Cloud POS</p>
            </div>
        </div>
    );
};
