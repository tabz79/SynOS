import React from 'react';
import { IndianRupee, ShieldCheck } from 'lucide-react';

export const ProcurementPurchaseOrderA4 = ({ 
    data, 
    letterheadMode = "digital", 
    topMarginMm = 40 
}) => {
    if (!data) return <div className="p-8 text-center text-zinc-400">Loading purchase order...</div>;

    const {
        poNumber = "PO-202610-0012",
        date = new Date().toISOString(),
        deliveryDueDate = new Date(Date.now() + 5 * 86400000).toISOString(),
        status = "Approved",
        lab = {},
        vendor = {
            name: "Roche Diagnostics India Pvt Ltd",
            contactPerson: "Mr. Anand Varma",
            phone: "+91 98490 88776",
            email: "orders@roche-india.com",
            gstin: "36AABCR1234F1Z9",
            address: "Industrial Area, Phase 2, Hyderabad, Telangana"
        },
        items = [
            { code: "RCH-001", name: "Cobas c311 Reagent Pack (LFT / ALT / AST)", packSize: "Kit of 500 Tests", qty: 4, unitPrice: 3200, taxRate: 12, netAmount: 14336 },
            { code: "RCH-004", name: "Cobas Multi-Analyte Calibrator (Liquid)", packSize: "Pack of 4 Vials", qty: 2, unitPrice: 1850, taxRate: 18, netAmount: 4366 },
            { code: "RCH-012", name: "Reaction Cuvette Segments (Cobas)", packSize: "Box of 200 Segments", qty: 5, unitPrice: 850, taxRate: 18, netAmount: 5015 }
        ],
        financial = {
            subtotal: 20250,
            taxAmount: 3467,
            totalAmount: 23717,
            amountInWords: "Rupees Twenty Three Thousand Seven Hundred Seventeen Only"
        },
        deliveryTerms = "Direct Delivery to Central Diagnostic Laboratory Stores, Khammam. Cold chain (2°C - 8°C) mandatory with continuous temperature logger.",
        terms = "1. Goods must have minimum 12 months remaining shelf life upon receipt.\n2. Certificate of Analysis (CoA) and Batch QC sheet must accompany dispatch.\n3. Payment within 30 days of GRN verification."
    } = data;

    return (
        <div className="w-full flex flex-col justify-between text-zinc-900 text-xs font-sans leading-normal">
            {letterheadMode === 'preprinted' ? (
                <div style={{ height: `${topMarginMm}mm` }} className="w-full print:block" />
            ) : (
                <div className="border-b-2 border-zinc-900 pb-4 mb-4">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1 max-w-[65%]">
                            <h1 className="text-xl font-black text-zinc-900 tracking-tight uppercase">
                                {lab.labLegalName || "SynOS Diagnostic Centre & Laboratory"}
                            </h1>
                            <p className="text-[11px] font-bold text-zinc-600">
                                {lab.labTradeName || "Central Procurement & Stores Division"}
                            </p>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">
                                {lab.address || "Khammam, Telangana - 507001"}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[9px] text-zinc-600 font-semibold pt-0.5">
                                <span>Phone: {lab.phone || "+91 98765 43210"}</span>
                                <span>Email: {lab.email || "procurement@synoslab.in"}</span>
                                <span>GSTIN: <strong className="font-mono text-zinc-900">{lab.gstin || "36AAAAA0000A1Z5"}</strong></span>
                            </div>
                        </div>

                        <div className="text-right space-y-1">
                            <div className="inline-block px-3 py-1 bg-zinc-900 text-white rounded font-black text-[11px] tracking-wider uppercase">
                                Purchase Order (PO)
                            </div>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Commercial Vendor Order</p>
                            <p className="text-[10px] font-mono font-bold text-zinc-800">PO #: {poNumber}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* VENDOR & ORDER PARTICULARS */}
            <div className="grid grid-cols-2 gap-4 border border-zinc-300 rounded-lg p-3.5 mb-4 bg-zinc-50/50 print:bg-transparent">
                <div className="space-y-1 border-r border-zinc-200 pr-3">
                    <p className="text-[10px] font-extrabold uppercase text-indigo-700 tracking-wider">Vendor / Supplier Details</p>
                    <div className="text-xs font-bold text-zinc-900">{vendor.name}</div>
                    <div className="text-[11px] text-zinc-600">Attn: {vendor.contactPerson}</div>
                    <div className="text-[11px] text-zinc-600">Address: {vendor.address}</div>
                    <div className="text-[11px]">Phone: <span className="font-mono">{vendor.phone}</span></div>
                    <div className="text-[11px]">GSTIN: <strong className="font-mono">{vendor.gstin}</strong></div>
                </div>

                <div className="space-y-1 pl-1">
                    <p className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Order Specifics</p>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">PO Date:</span>
                        <strong className="font-mono">{new Date(date).toLocaleDateString()}</strong>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Expected Delivery Date:</span>
                        <strong className="font-mono text-amber-700">{new Date(deliveryDueDate).toLocaleDateString()}</strong>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Delivery Location:</span>
                        <span className="font-semibold text-zinc-800">Central Stores Dock</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Payment Terms:</span>
                        <span className="font-semibold text-emerald-800">Credit 30 Days from GRN</span>
                    </div>
                </div>
            </div>

            {/* LINE ITEMS TABLE */}
            <table className="w-full text-left border-collapse border border-zinc-300 mb-4 text-[11px]">
                <thead>
                    <tr className="bg-zinc-100 text-[10px] font-black uppercase text-zinc-700 border-b border-zinc-300">
                        <th className="p-2 w-10 text-center">#</th>
                        <th className="p-2">Item Code & Description</th>
                        <th className="p-2">Packaging</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Unit Rate (₹)</th>
                        <th className="p-2 text-center">GST %</th>
                        <th className="p-2 text-right">Net Amount (₹)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                    {items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="p-2 text-center font-mono text-zinc-400">{idx + 1}</td>
                            <td className="p-2">
                                <strong className="text-zinc-900 block">{item.name}</strong>
                                <span className="text-[9px] font-mono text-zinc-500">SKU: {item.code}</span>
                            </td>
                            <td className="p-2 text-zinc-600">{item.packSize}</td>
                            <td className="p-2 text-center font-bold font-mono">{item.qty}</td>
                            <td className="p-2 text-right font-mono">₹{item.unitPrice?.toLocaleString()}</td>
                            <td className="p-2 text-center font-mono">{item.taxRate}%</td>
                            <td className="p-2 text-right font-mono font-bold text-zinc-900">₹{item.netAmount?.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* FINANCIAL SUMMARY & DELIVERY INSTRUCTIONS */}
            <div className="grid grid-cols-2 gap-4 mb-4 items-start">
                <div className="p-3 border border-zinc-200 rounded-lg space-y-1 bg-zinc-50 text-[10px]">
                    <strong className="text-zinc-700 block uppercase tracking-wider font-extrabold">Delivery & Storage Instructions:</strong>
                    <p className="text-zinc-600 leading-relaxed">{deliveryTerms}</p>
                </div>

                <div className="space-y-1.5 border border-zinc-300 rounded-lg p-3 bg-zinc-50/70">
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-600">Taxable Subtotal:</span>
                        <strong className="font-mono">₹{financial.subtotal?.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-600">Estimated GST / Taxes:</span>
                        <strong className="font-mono">₹{financial.taxAmount?.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between border-t-2 border-zinc-900 pt-1.5 text-xs">
                        <strong className="text-zinc-900 uppercase">Total Purchase Order Value:</strong>
                        <strong className="font-mono text-zinc-900 text-sm">₹{financial.totalAmount?.toLocaleString()}</strong>
                    </div>
                    <p className="text-[9px] text-zinc-500 italic pt-1">{financial.amountInWords}</p>
                </div>
            </div>

            {/* TERMS & SIGNATURE */}
            <div className="border-t border-zinc-300 pt-3 flex justify-between items-end text-[10px]">
                <div className="max-w-[60%] space-y-1">
                    <strong className="text-zinc-700 uppercase tracking-wider">Purchase Terms & Conditions:</strong>
                    <pre className="font-sans text-[9px] text-zinc-500 whitespace-pre-wrap leading-tight">{terms}</pre>
                </div>
                <div className="text-center space-y-8 pr-4">
                    <div className="h-6"></div>
                    <div className="border-t border-zinc-800 pt-1">
                        <p className="font-bold text-zinc-900">Purchase Manager / Stores Lead</p>
                        <p className="text-[9px] text-zinc-500">{lab.labLegalName || "SynOS Diagnostic Centre"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
