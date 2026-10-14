import React from 'react';

export const PettyExpenseVoucherA4 = ({ 
    data, 
    letterheadMode = "digital", 
    topMarginMm = 25 
}) => {
    if (!data) return <div className="p-8 text-center text-zinc-400">Loading expense voucher...</div>;

    const {
        voucherNumber = "EXP-202610-0031",
        date = new Date().toISOString(),
        category = "Facility Maintenance & Operating Supplies",
        headOfAccount = "Printing & Stationeries / Clinical Consumables",
        lab = {},
        payee = {
            name: "Sri Balaji Medical Print & Offset Solutions",
            phone: "+91 98480 33445",
            address: "Gandhi Nagar, Khammam"
        },
        expenseDetails = "Payment towards 50 Books of OPD Sample Barcode Labels and 2,000 Patient Thermal Rolls.",
        paymentMode = "Cash",
        financial = {
            amount: 4850,
            amountInWords: "Rupees Four Thousand Eight Hundred Fifty Only"
        },
        approvals = {
            requestedBy: "M. Srinivas (Stores Executive)",
            verifiedBy: "Accounts Officer",
            approvedBy: "Managing Director / Admin"
        }
    } = data;

    return (
        <div className="w-full flex flex-col justify-between text-zinc-900 text-xs font-sans leading-normal">
            {letterheadMode === 'preprinted' ? (
                <div style={{ height: `${topMarginMm}mm` }} className="w-full print:block" />
            ) : (
                <div className="border-b-2 border-zinc-900 pb-3 mb-3">
                    <div className="flex justify-between items-start">
                        <div className="space-y-0.5 max-w-[65%]">
                            <h1 className="text-base font-black text-zinc-900 tracking-tight uppercase">
                                {lab.labLegalName || "SynOS Diagnostic Centre & Laboratory"}
                            </h1>
                            <p className="text-[10px] text-zinc-600">
                                {lab.address || "Khammam, Telangana"} • Ph: {lab.phone || "+91 98765 43210"}
                            </p>
                        </div>
                        <div className="text-right space-y-0.5">
                            <div className="inline-block px-2.5 py-0.5 bg-zinc-900 text-white rounded font-black text-[10px] tracking-wider uppercase">
                                Cash Payment Voucher
                            </div>
                            <p className="text-[10px] font-mono font-bold text-zinc-700">VCH #: {voucherNumber}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* VOUCHER HEADER PARTICULARS */}
            <div className="grid grid-cols-2 gap-3 border border-zinc-300 rounded-lg p-3 mb-3 bg-zinc-50/50 text-[11px]">
                <div className="space-y-1 border-r border-zinc-200 pr-2">
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Paid To (Payee):</span>
                        <strong className="text-zinc-900">{payee.name}</strong>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Head of Account:</span>
                        <span className="font-semibold text-indigo-700">{headOfAccount}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Expense Category:</span>
                        <span>{category}</span>
                    </div>
                </div>

                <div className="space-y-1 pl-1">
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Date:</span>
                        <strong className="font-mono">{new Date(date).toLocaleDateString()}</strong>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Disbursement Mode:</span>
                        <span className="font-bold text-emerald-700 uppercase">{paymentMode}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Cost Center:</span>
                        <span>Central Diagnostic Unit</span>
                    </div>
                </div>
            </div>

            {/* DESCRIPTION BOX */}
            <div className="border border-zinc-300 rounded-lg p-3 mb-3 bg-white space-y-1">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400 block">Particulars & Rationale of Expenditure:</span>
                <p className="text-[11px] text-zinc-800 leading-relaxed">{expenseDetails}</p>
            </div>

            {/* AMOUNT HIGHLIGHT */}
            <div className="p-3 rounded-lg border-2 border-zinc-900 bg-zinc-50 flex justify-between items-center mb-4">
                <div>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-500 block">Total Amount Disbursed</span>
                    <strong className="text-xs text-zinc-900">{financial.amountInWords}</strong>
                </div>
                <div>
                    <span className="text-xl font-black font-mono text-zinc-900">₹{financial.amount?.toLocaleString()}</span>
                </div>
            </div>

            {/* 3-TIER APPROVAL SIGNATURE GRID */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-300 text-center text-[10px]">
                <div className="space-y-4">
                    <div className="h-6"></div>
                    <div className="border-t border-zinc-700 pt-1">
                        <p className="font-bold text-zinc-800">{approvals.requestedBy}</p>
                        <p className="text-[9px] text-zinc-400">Prepared By</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="h-6"></div>
                    <div className="border-t border-zinc-700 pt-1">
                        <p className="font-bold text-zinc-800">{approvals.verifiedBy}</p>
                        <p className="text-[9px] text-zinc-400">Verified By Accounts</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="h-6"></div>
                    <div className="border-t border-zinc-700 pt-1">
                        <p className="font-bold text-zinc-800">{approvals.approvedBy}</p>
                        <p className="text-[9px] text-zinc-400">Sanctioned By</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="h-6"></div>
                    <div className="border-t border-zinc-700 pt-1">
                        <p className="font-bold text-zinc-800">Receiver's Sign</p>
                        <p className="text-[9px] text-zinc-400">Payee Acknowledgment</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
