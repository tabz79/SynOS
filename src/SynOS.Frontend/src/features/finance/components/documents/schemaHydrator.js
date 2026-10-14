// Schema Hydrator: Binds live domain entities into customizable document schemas
import { DEFAULT_DOCUMENT_SCHEMAS } from './documentLayoutSchemas';

export function hydrateDocumentSchema(slotId, rawSchema, liveData, stationerySettings = {}) {
    // Start from active custom schema or factory default
    const baseSchema = rawSchema && rawSchema.boxes 
        ? JSON.parse(JSON.stringify(rawSchema))
        : JSON.parse(JSON.stringify(DEFAULT_DOCUMENT_SCHEMAS[slotId] || {}));

    if (!baseSchema || !baseSchema.boxes || !liveData) {
        return baseSchema;
    }

    const { boxes } = baseSchema;
    const lab = liveData.lab || {};
    const settings = { ...stationerySettings, ...lab };

    // 1. LAB BRAND & LETTERHEAD
    if (boxes.header?.fields) {
        if (boxes.header.fields.legalName) boxes.header.fields.legalName.value = settings.labLegalName || boxes.header.fields.legalName.value;
        if (boxes.header.fields.tagline) boxes.header.fields.tagline.value = settings.labTradeName || boxes.header.fields.tagline.value;
        if (boxes.header.fields.address) boxes.header.fields.address.value = settings.address || boxes.header.fields.address.value;
        if (boxes.header.fields.phone) boxes.header.fields.phone.value = settings.phone || boxes.header.fields.phone.value;
        if (boxes.header.fields.email) boxes.header.fields.email.value = settings.email || boxes.header.fields.email.value;
        if (boxes.header.fields.gstin) boxes.header.fields.gstin.value = settings.gstin || boxes.header.fields.gstin.value;
        if (boxes.header.fields.pan) boxes.header.fields.pan.value = settings.pan || boxes.header.fields.pan.value;
    }

    // 2. DOCUMENT TYPE SPECIFIC HYDRATION
    switch (slotId) {
        case 'patient_tax_invoice': {
            const p = liveData.patient || {};
            const fin = liveData.financial || {};

            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.billNumber) boxes.docBadge.fields.billNumber.value = liveData.billNumber || liveData.invoiceNumber || boxes.docBadge.fields.billNumber.value;
                if (boxes.docBadge.fields.date) boxes.docBadge.fields.date.value = liveData.date ? new Date(liveData.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString();
                if (boxes.docBadge.fields.tokenNumber) boxes.docBadge.fields.tokenNumber.value = p.token || liveData.token || "COUNTER";
                if (boxes.docBadge.fields.branchName) boxes.docBadge.fields.branchName.value = p.branchName || liveData.branchName || "Main Facility";
                if (boxes.docBadge.fields.paymentStatus) {
                    const isPaid = (fin.balanceDue <= 0 || (liveData.status || '').toLowerCase() === 'paid');
                    boxes.docBadge.fields.paymentStatus.value = isPaid ? "PAID FULL" : ((liveData.status || '').toLowerCase() === 'partial' ? "PARTIAL DUE" : "PAYMENT PENDING");
                }
            }

            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.fullName) boxes.partyDetails.fields.fullName.value = p.name || p.fullName || "Direct Walk-in Patient";
                if (boxes.partyDetails.fields.uhid) boxes.partyDetails.fields.uhid.value = p.uhid || p.mrn || "WALK-IN";
                if (boxes.partyDetails.fields.ageGender) boxes.partyDetails.fields.ageGender.value = p.ageGender || (p.age ? `${p.age} / ${p.gender || ''}` : "Adult");
                if (boxes.partyDetails.fields.phone) boxes.partyDetails.fields.phone.value = p.phone || p.mobile || "N/A";
                if (boxes.partyDetails.fields.refDoctor) boxes.partyDetails.fields.refDoctor.value = p.referringDoctor || liveData.referringDoctorName || "Self / Direct";
                if (boxes.partyDetails.fields.address) boxes.partyDetails.fields.address.value = p.address || "N/A";
            }

            if (boxes.itemsTable && Array.isArray(liveData.items) && liveData.items.length > 0) {
                boxes.itemsTable.rows = liveData.items.map((it, idx) => ({
                    id: `live-item-${idx}`,
                    index: it.index || idx + 1,
                    description: it.name || it.testName || it.description || 'Clinical Investigation',
                    code: it.code || it.testCode || '',
                    department: it.department || 'Pathology',
                    sacCode: it.sacCode || '999312',
                    price: Number(it.price || it.unitPrice || 0),
                    discount: Number(it.discount || 0),
                    amount: Number(it.amount || it.netPrice || it.price || 0)
                }));
            }

            if (boxes.financialSummary?.fields) {
                const sub = fin.grossSubtotal || fin.subtotal || fin.totalAmount || 0;
                const disc = fin.discountAmount || fin.itemDiscounts || 0;
                const net = fin.totalAmount || fin.grandTotal || (sub - disc);
                const paid = fin.totalCollected || fin.amountPaid || 0;
                const due = fin.balanceDue !== undefined ? fin.balanceDue : (net - paid);

                if (boxes.financialSummary.fields.grossSubtotal) boxes.financialSummary.fields.grossSubtotal.value = `₹${Number(sub).toLocaleString()}`;
                if (boxes.financialSummary.fields.discountAmount) boxes.financialSummary.fields.discountAmount.value = `-₹${Number(disc).toLocaleString()}`;
                if (boxes.financialSummary.fields.taxableAmount) boxes.financialSummary.fields.taxableAmount.value = `₹${Number(fin.taxableAmount || net).toLocaleString()}`;
                if (boxes.financialSummary.fields.totalAmount) boxes.financialSummary.fields.totalAmount.value = `₹${Number(net).toLocaleString()}`;
                if (boxes.financialSummary.fields.totalPaid) boxes.financialSummary.fields.totalPaid.value = `₹${Number(paid).toLocaleString()}`;
                if (boxes.financialSummary.fields.balanceDue) boxes.financialSummary.fields.balanceDue.value = `₹${Number(due).toLocaleString()}`;
            }

            if (boxes.amountInWords) {
                boxes.amountInWords.value = fin.amountInWords || boxes.amountInWords.value;
            }

            if (boxes.receiptHistory && Array.isArray(liveData.payments) && liveData.payments.length > 0) {
                boxes.receiptHistory.entries = liveData.payments.map((pmt, idx) => ({
                    id: `rcpt-${idx}`,
                    receiptNumber: pmt.receiptNumber || `RCPT-0${idx + 1}`,
                    mode: pmt.method || pmt.paymentMethod || 'Cash',
                    amount: `₹${Number(pmt.amount).toLocaleString()}`,
                    date: pmt.date ? new Date(pmt.date).toLocaleDateString() : new Date().toLocaleDateString(),
                    ref: pmt.reference || ''
                }));
            }
            break;
        }

        case 'patient_thermal_receipt': {
            const p = liveData.patient || {};
            const fin = liveData.financial || liveData.billing || {};

            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.receiptNumber) boxes.docBadge.fields.receiptNumber.value = liveData.receiptNumber || liveData.token || boxes.docBadge.fields.receiptNumber.value;
                if (boxes.docBadge.fields.date) boxes.docBadge.fields.date.value = liveData.dateTime || new Date().toLocaleString();
                if (boxes.docBadge.fields.tokenNumber) boxes.docBadge.fields.tokenNumber.value = liveData.token ? `TOKEN # ${liveData.token}` : "TOKEN # COUNTER";
            }

            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.fullName) boxes.partyDetails.fields.fullName.value = p.name || p.fullName || "Patient";
                if (boxes.partyDetails.fields.uhid) boxes.partyDetails.fields.uhid.value = p.uhid || p.mrn || "WALK-IN";
                if (boxes.partyDetails.fields.ageGender) boxes.partyDetails.fields.ageGender.value = p.ageGender || `${p.age || ''} / ${p.gender || ''}`;
            }

            if (boxes.itemsTable && Array.isArray(liveData.items || liveData.orders)) {
                const list = liveData.items || liveData.orders;
                boxes.itemsTable.rows = list.map((it, idx) => ({
                    id: `r-${idx}`,
                    index: idx + 1,
                    description: it.testName || it.name || it.description || 'Test',
                    price: Number(it.price || it.grossAmount || 0),
                    amount: Number(it.amount || it.netAmount || it.price || 0)
                }));
            }

            if (boxes.financialSummary?.fields) {
                const net = fin.grandTotal || fin.totalAmount || fin.netAmount || 0;
                const paid = fin.amountPaid || fin.totalCollected || net;
                const due = fin.balanceDue !== undefined ? fin.balanceDue : 0;

                if (boxes.financialSummary.fields.totalAmount) boxes.financialSummary.fields.totalAmount.value = `₹${Number(net).toLocaleString()}`;
                if (boxes.financialSummary.fields.totalPaid) boxes.financialSummary.fields.totalPaid.value = `₹${Number(paid).toLocaleString()}`;
                if (boxes.financialSummary.fields.balanceDue) boxes.financialSummary.fields.balanceDue.value = `₹${Number(due).toLocaleString()}`;
            }
            break;
        }

        case 'partner_b2b_invoice': {
            const partner = liveData.partner || {};
            const summary = liveData.summary || {};

            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.billNumber) boxes.docBadge.fields.billNumber.value = liveData.statementNo || boxes.docBadge.fields.billNumber.value;
                if (boxes.docBadge.fields.date) boxes.docBadge.fields.date.value = liveData.generatedAt ? new Date(liveData.generatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString();
            }

            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.fullName) boxes.partyDetails.fields.fullName.value = partner.name || partner.partnerName || "Doctor Partner";
                if (boxes.partyDetails.fields.clinicName) boxes.partyDetails.fields.clinicName.value = partner.clinicName || "Medical Clinic";
                if (boxes.partyDetails.fields.partnerId) boxes.partyDetails.fields.partnerId.value = partner.partnerId || "";
                if (boxes.partyDetails.fields.phone) boxes.partyDetails.fields.phone.value = partner.phone || "";
                if (boxes.partyDetails.fields.address) boxes.partyDetails.fields.address.value = partner.address || "";
            }

            if (boxes.itemsTable && Array.isArray(liveData.items)) {
                boxes.itemsTable.rows = liveData.items.map((it, idx) => ({
                    id: `b2b-${idx}`,
                    index: idx + 1,
                    token: it.visitToken || it.token || `T-0${idx + 1}`,
                    date: it.date ? new Date(it.date).toLocaleDateString() : '',
                    patientName: it.patientName || 'Patient',
                    investigations: it.investigations || 'Diagnostic Tests',
                    labBilled: Number(it.grossBilled || it.labStandardCharge || 0),
                    received: Number(it.amountReceived || 0),
                    netDue: Number(it.netClaimDue || it.outstandingAmount || 0)
                }));
            }

            if (boxes.financialSummary?.fields) {
                const count = summary.totalVisits || (liveData.items ? liveData.items.length : 0);
                const billed = summary.grossBilled || 0;
                const rec = summary.amountReceived || 0;
                const due = summary.netClaimDue || (billed - rec);

                if (boxes.financialSummary.fields.totalVisits) boxes.financialSummary.fields.totalVisits.value = `${count} Visits Claimed`;
                if (boxes.financialSummary.fields.grossSubtotal) boxes.financialSummary.fields.grossSubtotal.value = `₹${Number(billed).toLocaleString()}`;
                if (boxes.financialSummary.fields.totalPaid) boxes.financialSummary.fields.totalPaid.value = `₹${Number(rec).toLocaleString()}`;
                if (boxes.financialSummary.fields.balanceDue) boxes.financialSummary.fields.balanceDue.value = `₹${Number(due).toLocaleString()}`;
            }

            if (boxes.amountInWords) {
                boxes.amountInWords.value = summary.amountInWords || boxes.amountInWords.value;
            }
            break;
        }

        case 'referral_payout_voucher': {
            const doc = liveData.doctor || {};
            const summary = liveData.summary || {};

            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.voucherNumber) boxes.docBadge.fields.voucherNumber.value = liveData.voucherNo || boxes.docBadge.fields.voucherNumber.value;
                if (boxes.docBadge.fields.date) boxes.docBadge.fields.date.value = liveData.generatedAt ? new Date(liveData.generatedAt).toLocaleDateString() : new Date().toLocaleDateString();
                if (boxes.docBadge.fields.financialYear) boxes.docBadge.fields.financialYear.value = liveData.financialYear || "2026 - 2027";
            }

            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.fullName) boxes.partyDetails.fields.fullName.value = doc.name || doc.partnerName || "Doctor Partner";
                if (boxes.partyDetails.fields.clinicName) boxes.partyDetails.fields.clinicName.value = doc.clinicName || "";
                if (boxes.partyDetails.fields.pan) boxes.partyDetails.fields.pan.value = doc.pan || "";
                if (boxes.partyDetails.fields.bankName) boxes.partyDetails.fields.bankName.value = doc.bankName || "";
                if (boxes.partyDetails.fields.accountNumber) boxes.partyDetails.fields.accountNumber.value = doc.accountNumber || "";
                if (boxes.partyDetails.fields.ifsc) boxes.partyDetails.fields.ifsc.value = doc.ifsc || "";
            }

            if (boxes.itemsTable && Array.isArray(liveData.items)) {
                boxes.itemsTable.rows = liveData.items.map((it, idx) => ({
                    id: `v-${idx}`,
                    index: idx + 1,
                    token: it.token || `T-0${idx + 1}`,
                    date: it.date ? new Date(it.date).toLocaleDateString() : '',
                    patientName: it.patientName || 'Patient',
                    testNames: it.testNames || 'Prescribed Tests',
                    patientPaid: Number(it.patientPaid || 0),
                    rate: it.commissionRatePct ? `${it.commissionRatePct}%` : '20%',
                    referralAmount: Number(it.referralAmount || 0)
                }));
            }

            if (boxes.financialSummary?.fields) {
                if (boxes.financialSummary.fields.totalReferredVisits) boxes.financialSummary.fields.totalReferredVisits.value = `${summary.totalReferredVisits || (liveData.items?.length || 0)} Cases`;
                if (boxes.financialSummary.fields.totalPatientCollection) boxes.financialSummary.fields.totalPatientCollection.value = `₹${Number(summary.totalPatientCollection || 0).toLocaleString()}`;
                if (boxes.financialSummary.fields.grossReferralAmount) boxes.financialSummary.fields.grossReferralAmount.value = `₹${Number(summary.grossReferralAmount || 0).toLocaleString()}`;
                if (boxes.financialSummary.fields.tdsDeduction) boxes.financialSummary.fields.tdsDeduction.value = `-₹${Number(summary.tdsDeduction || 0).toLocaleString()}`;
                if (boxes.financialSummary.fields.netPayoutAmount) boxes.financialSummary.fields.netPayoutAmount.value = `₹${Number(summary.netPayoutAmount || 0).toLocaleString()}`;
            }

            if (boxes.amountInWords) {
                boxes.amountInWords.value = summary.netPayoutInWords || boxes.amountInWords.value;
            }
            break;
        }

        case 'procurement_po': {
            const v = liveData.vendor || {};
            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.poNumber) boxes.docBadge.fields.poNumber.value = liveData.poNumber || boxes.docBadge.fields.poNumber.value;
                if (boxes.docBadge.fields.date) boxes.docBadge.fields.date.value = liveData.date || new Date().toLocaleDateString();
            }
            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.fullName) boxes.partyDetails.fields.fullName.value = v.name || "Vendor";
                if (boxes.partyDetails.fields.contactPerson) boxes.partyDetails.fields.contactPerson.value = v.contactPerson || "";
                if (boxes.partyDetails.fields.phone) boxes.partyDetails.fields.phone.value = v.phone || "";
                if (boxes.partyDetails.fields.gstin) boxes.partyDetails.fields.gstin.value = v.gstin || "";
                if (boxes.partyDetails.fields.address) boxes.partyDetails.fields.address.value = v.address || "";
            }
            if (boxes.itemsTable && Array.isArray(liveData.items)) {
                boxes.itemsTable.rows = liveData.items.map((it, idx) => ({
                    id: `po-${idx}`,
                    index: idx + 1,
                    description: it.description || it.itemName || 'Item',
                    packSize: it.packSize || '-',
                    quantity: it.quantity || 1,
                    price: Number(it.price || it.unitRate || 0),
                    amount: Number(it.amount || it.total || 0)
                }));
            }
            if (boxes.financialSummary?.fields) {
                if (boxes.financialSummary.fields.totalAmount) boxes.financialSummary.fields.totalAmount.value = `₹${Number(liveData.totalAmount || 0).toLocaleString()}`;
            }
            break;
        }

        case 'workforce_payslip': {
            const emp = liveData.employee || liveData.staff || {};
            const empName = liveData.employeeName || emp.name || emp.fullName;
            const empCode = liveData.employeeId || emp.code || emp.employeeId;
            const desig = liveData.designation || emp.designation;
            const dept = liveData.department || emp.department;

            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.monthYear) boxes.docBadge.fields.monthYear.value = liveData.period || liveData.monthYear || boxes.docBadge.fields.monthYear.value;
                if (boxes.docBadge.fields.disbursementDate) {
                    boxes.docBadge.fields.disbursementDate.value = liveData.paidAt 
                        ? new Date(liveData.paidAt).toLocaleDateString('en-IN') 
                        : (liveData.date || new Date().toLocaleDateString('en-IN'));
                }
            }
            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.fullName && empName) boxes.partyDetails.fields.fullName.value = empName;
                if (boxes.partyDetails.fields.employeeId && empCode) boxes.partyDetails.fields.employeeId.value = empCode;
                if (boxes.partyDetails.fields.designation && desig) boxes.partyDetails.fields.designation.value = desig;
                if (boxes.partyDetails.fields.department && dept) boxes.partyDetails.fields.department.value = dept;
                if (boxes.partyDetails.fields.pan && (liveData.pan || emp.pan)) boxes.partyDetails.fields.pan.value = liveData.pan || emp.pan;
                if (boxes.partyDetails.fields.uan && (liveData.uan || emp.uan)) boxes.partyDetails.fields.uan.value = liveData.uan || emp.uan;
                if (boxes.partyDetails.fields.esiNo && (liveData.esiNo || emp.esiNo)) boxes.partyDetails.fields.esiNo.value = liveData.esiNo || emp.esiNo;
            }

            // Salary Rows (Earnings & Deductions)
            if (boxes.itemsTable) {
                const baseSalary = Number(liveData.snapshotBaseSalary || liveData.baseSalary || 0);
                const gross = Number(liveData.grossSalary || liveData.grossWages || baseSalary);
                const allowances = Math.max(0, gross - baseSalary);
                const pf = Number(liveData.pfDeduction || 0);
                const esi = Number(liveData.esiDeduction || 0);
                const tds = Number(liveData.tdsDeduction || 0);
                const otherDeds = Number(liveData.otherDeductions || 0);

                if (baseSalary > 0 || gross > 0) {
                    boxes.itemsTable.rows = [
                        {
                            id: 'w-1',
                            earningDesc: 'Basic Pay & Dearness Allowance',
                            earningAmount: baseSalary,
                            deductionDesc: `Provident Fund (EPF ${(liveData.snapshotPFRate ? liveData.snapshotPFRate * 100 : 12)}%)`,
                            deductionAmount: pf
                        },
                        {
                            id: 'w-2',
                            earningDesc: 'Special Allowances & Shift Differential',
                            earningAmount: allowances,
                            deductionDesc: `ESIC Contribution ${(liveData.snapshotESIRate ? liveData.snapshotESIRate * 100 : 0.75)}%`,
                            deductionAmount: esi
                        },
                        {
                            id: 'w-3',
                            earningDesc: 'Attendance Incentives',
                            earningAmount: 0,
                            deductionDesc: 'Tax Deducted at Source (TDS)',
                            deductionAmount: tds
                        }
                    ];
                    if (otherDeds > 0) {
                        boxes.itemsTable.rows.push({
                            id: 'w-4',
                            earningDesc: '',
                            earningAmount: 0,
                            deductionDesc: 'Salary Advances / Loss of Pay (LOP)',
                            deductionAmount: otherDeds
                        });
                    }
                }
            }

            if (boxes.financialSummary?.fields) {
                const grossVal = liveData.grossSalary || liveData.grossWages || liveData.snapshotBaseSalary || 0;
                const pf = Number(liveData.pfDeduction || 0);
                const esi = Number(liveData.esiDeduction || 0);
                const tds = Number(liveData.tdsDeduction || 0);
                const otherDeds = Number(liveData.otherDeductions || 0);
                const totalDeds = pf + esi + tds + otherDeds;
                const netVal = liveData.netPayable || liveData.netSalary || (grossVal - totalDeds);

                if (boxes.financialSummary.fields.grossEarnings) {
                    boxes.financialSummary.fields.grossEarnings.value = `₹${Number(grossVal).toLocaleString('en-IN')}`;
                }
                if (boxes.financialSummary.fields.totalDeductions) {
                    boxes.financialSummary.fields.totalDeductions.value = `₹${Number(totalDeds).toLocaleString('en-IN')}`;
                }
                if (boxes.financialSummary.fields.netSalary) {
                    boxes.financialSummary.fields.netSalary.value = `₹${Number(netVal).toLocaleString('en-IN')}`;
                }
            }
            break;
        }

        case 'overhead_expense_voucher': {
            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.voucherNumber) {
                    boxes.docBadge.fields.voucherNumber.value = liveData.voucherNumber || liveData.expenseId || boxes.docBadge.fields.voucherNumber.value;
                }
                if (boxes.docBadge.fields.date) {
                    boxes.docBadge.fields.date.value = liveData.date || (liveData.dueDate ? new Date(liveData.dueDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'));
                }
                if (boxes.docBadge.fields.paymentMode) {
                    boxes.docBadge.fields.paymentMode.value = liveData.paymentMode || liveData.paymentMethod || 'Petty Cash Desk';
                }
            }
            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.fullName) {
                    boxes.partyDetails.fields.fullName.value = liveData.payee || liveData.vendorName || liveData.description || boxes.partyDetails.fields.fullName.value;
                }
                if (boxes.partyDetails.fields.expenseCategory) {
                    boxes.partyDetails.fields.expenseCategory.value = liveData.category || boxes.partyDetails.fields.expenseCategory.value;
                }
                if (boxes.partyDetails.fields.approvedBy) {
                    boxes.partyDetails.fields.approvedBy.value = liveData.approvedBy || 'Operations Lead';
                }
            }
            if (boxes.itemsTable) {
                if (Array.isArray(liveData.items) && liveData.items.length > 0) {
                    boxes.itemsTable.rows = liveData.items.map((it, idx) => ({
                        id: `exp-${idx}`,
                        index: idx + 1,
                        description: it.description || it.particulars || 'Expense Item',
                        amount: Number(it.amount || 0)
                    }));
                } else if (liveData.description || liveData.amount) {
                    boxes.itemsTable.rows = [
                        {
                            id: 'exp-1',
                            index: 1,
                            description: liveData.description || 'Clinical / Diagnostic Operational Expense',
                            amount: Number(liveData.amount || 0)
                        }
                    ];
                }
            }
            if (boxes.financialSummary?.fields) {
                if (boxes.financialSummary.fields.totalAmount) {
                    boxes.financialSummary.fields.totalAmount.value = `₹${Number(liveData.amount || 0).toLocaleString('en-IN')}`;
                }
            }
            break;
        }

        default:
            break;
    }

    // 3. BANK & UPI DETAILS (Merged from lab / stationery profile)
    if (boxes.bankAndUpi?.fields) {
        if (boxes.bankAndUpi.fields.bankName) boxes.bankAndUpi.fields.bankName.value = settings.bankName || boxes.bankAndUpi.fields.bankName.value;
        if (boxes.bankAndUpi.fields.accountNumber) boxes.bankAndUpi.fields.accountNumber.value = settings.accountNumber || boxes.bankAndUpi.fields.accountNumber.value;
        if (boxes.bankAndUpi.fields.ifsc) boxes.bankAndUpi.fields.ifsc.value = settings.ifscCode || boxes.bankAndUpi.fields.ifsc.value;
        if (boxes.bankAndUpi.fields.branch) boxes.bankAndUpi.fields.branch.value = settings.branch || boxes.bankAndUpi.fields.branch.value;
        if (boxes.bankAndUpi.fields.upiId) boxes.bankAndUpi.fields.upiId.value = settings.upiId || boxes.bankAndUpi.fields.upiId.value;
    }

    // 4. TERMS AND SIGNATORY
    if (boxes.termsAndConditions) {
        boxes.termsAndConditions.text = settings.termsAndConditions || boxes.termsAndConditions.text;
    }
    if (boxes.signatory) {
        boxes.signatory.title = settings.signatoryTitle || boxes.signatory.title;
    }

    return baseSchema;
}
