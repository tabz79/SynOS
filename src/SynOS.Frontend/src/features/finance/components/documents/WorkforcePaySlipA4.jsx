import React from 'react';

export const WorkforcePaySlipA4 = ({ 
    data, 
    letterheadMode = "digital", 
    topMarginMm = 40 
}) => {
    if (!data) return <div className="p-8 text-center text-zinc-400">Loading salary slip...</div>;

    const {
        slipNumber = "PAYSLIP-202610-008",
        monthYear = "October 2026",
        payPeriod = "01-Oct-2026 to 31-Oct-2026",
        disbursedDate = new Date().toISOString(),
        lab = {},
        employee = {
            id: "EMP-0042",
            name: "V. Sandhya Rani",
            designation: "Senior Medical Lab Technologist (Biochemistry)",
            department: "Clinical Pathology & Biochemistry",
            doj: "15-Jun-2023",
            pan: "BCPSR8899K",
            bankName: "State Bank of India",
            accountNumber: "XXXXXXXX4920",
            ifsc: "SBIN0001234",
            pfUan: "101829402911",
            esiNumber: "52001928490001"
        },
        attendance = {
            totalDays: 31,
            paidDays: 30,
            lossOfPayDays: 1,
            casualLeavesTaken: 1
        },
        earnings = [
            { title: "Basic Salary", amount: 22000 },
            { title: "House Rent Allowance (HRA)", amount: 8800 },
            { title: "Medical Allowance", amount: 2500 },
            { title: "Special Skill Allowance", amount: 3500 },
            { title: "Night Shift Performance Incentive", amount: 2200 }
        ],
        deductions = [
            { title: "Provident Fund (Employee PF 12%)", amount: 2640 },
            { title: "Employee State Insurance (ESI 0.75%)", amount: 292 },
            { title: "Professional Tax (Telangana PT)", amount: 200 },
            { title: "Loss of Pay Deduction (1 Day)", amount: 1258 },
            { title: "Salary Advance Recovery", amount: 0 }
        ],
        summary = {
            grossEarnings: 39000,
            totalDeductions: 4390,
            netPayable: 34610,
            netPayableInWords: "Rupees Thirty Four Thousand Six Hundred Ten Only"
        }
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
                                {lab.labTradeName || "Department of Human Resources & Payroll"}
                            </p>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">
                                {lab.address || "Khammam, Telangana - 507001"}
                            </p>
                        </div>
                        <div className="text-right space-y-1">
                            <div className="inline-block px-3 py-1 bg-zinc-900 text-white rounded font-black text-[11px] tracking-wider uppercase">
                                Confidential Pay Slip
                            </div>
                            <p className="text-[10px] font-bold text-indigo-700">{monthYear}</p>
                            <p className="text-[9px] text-zinc-500 font-mono">Ref: {slipNumber}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* EMPLOYEE & ATTENDANCE METRICS */}
            <div className="border border-zinc-300 rounded-lg p-3.5 mb-4 bg-zinc-50/50 text-[11px]">
                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-zinc-200">
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Employee ID / Name:</span>
                            <strong>{employee.id} — {employee.name}</strong>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Designation / Role:</span>
                            <span>{employee.designation}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Department:</span>
                            <span>{employee.department}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Date of Joining:</span>
                            <span className="font-mono">{employee.doj}</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Bank & Account:</span>
                            <span className="font-mono">{employee.bankName} ({employee.accountNumber})</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">PAN & UAN:</span>
                            <span className="font-mono">{employee.pan} / {employee.pfUan}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Total Calendar Days:</span>
                            <span className="font-mono">{attendance.totalDays} Days</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Days Paid:</span>
                            <strong className="font-mono text-emerald-700">{attendance.paidDays} Days</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* DUAL BREAKDOWN: EARNINGS VS DEDUCTIONS */}
            <div className="grid grid-cols-2 gap-4 mb-4 border border-zinc-300 rounded-lg overflow-hidden text-[11px]">
                {/* LEFT: EARNINGS */}
                <div className="border-r border-zinc-300">
                    <div className="bg-emerald-50 px-3 py-2 font-black uppercase text-emerald-900 border-b border-zinc-300 flex justify-between">
                        <span>Earnings</span>
                        <span>Amount (₹)</span>
                    </div>
                    <div className="divide-y divide-zinc-100 p-2 space-y-1">
                        {earnings.map((e, idx) => (
                            <div key={idx} className="flex justify-between py-1 px-1">
                                <span className="text-zinc-700">{e.title}</span>
                                <strong className="font-mono text-zinc-900">₹{e.amount?.toLocaleString()}</strong>
                            </div>
                        ))}
                    </div>
                    <div className="bg-zinc-100 px-3 py-2 font-bold flex justify-between border-t border-zinc-300">
                        <span>Gross Earnings:</span>
                        <strong className="font-mono text-emerald-800">₹{summary.grossEarnings?.toLocaleString()}</strong>
                    </div>
                </div>

                {/* RIGHT: DEDUCTIONS */}
                <div>
                    <div className="bg-rose-50 px-3 py-2 font-black uppercase text-rose-900 border-b border-zinc-300 flex justify-between">
                        <span>Deductions</span>
                        <span>Amount (₹)</span>
                    </div>
                    <div className="divide-y divide-zinc-100 p-2 space-y-1">
                        {deductions.map((d, idx) => (
                            <div key={idx} className="flex justify-between py-1 px-1">
                                <span className="text-zinc-700">{d.title}</span>
                                <strong className="font-mono text-zinc-900">₹{d.amount?.toLocaleString()}</strong>
                            </div>
                        ))}
                    </div>
                    <div className="bg-zinc-100 px-3 py-2 font-bold flex justify-between border-t border-zinc-300">
                        <span>Total Deductions:</span>
                        <strong className="font-mono text-rose-800">₹{summary.totalDeductions?.toLocaleString()}</strong>
                    </div>
                </div>
            </div>

            {/* NET SALARY HIGHLIGHT */}
            <div className="p-4 rounded-xl border-2 border-zinc-900 bg-zinc-50 flex justify-between items-center mb-4">
                <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 block">Net Disbursed Salary</span>
                    <strong className="text-base text-zinc-900">{summary.netPayableInWords}</strong>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-black font-mono text-emerald-700">₹{summary.netPayable?.toLocaleString()}</span>
                </div>
            </div>

            {/* FOOTER */}
            <div className="border-t border-zinc-300 pt-3 flex justify-between items-end text-[10px]">
                <p className="text-zinc-500 italic max-w-[60%]">
                    This document is a confidential statement of earnings and statutory withholdings generated electronically.
                </p>
                <div className="text-right space-y-4">
                    <div className="h-4"></div>
                    <p className="font-bold border-t border-zinc-800 pt-1 text-zinc-800">Head of Human Resources & Finance</p>
                </div>
            </div>
        </div>
    );
};
