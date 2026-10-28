// Schema Hydrator: Binds live domain entities into customizable document schemas
import { DEFAULT_DOCUMENT_SCHEMAS } from './documentLayoutSchemas';
import { formatDateCompact } from '@/lib/utils';

export function hydrateDocumentSchema(slotId, rawSchema, liveData, stationerySettings = {}) {
    // Start from active custom schema or factory default
    const defaultSchema = DEFAULT_DOCUMENT_SCHEMAS[slotId] || {};
    const baseSchema = rawSchema && rawSchema.boxes 
        ? JSON.parse(JSON.stringify(rawSchema))
        : JSON.parse(JSON.stringify(defaultSchema));

    if (!baseSchema || !baseSchema.boxes || !liveData) {
        return baseSchema;
    }

    // Ensure standard boxes and fields from default schema are never dropped if omitted in saved custom layout
    if (defaultSchema.boxes) {
        Object.keys(defaultSchema.boxes).forEach(boxKey => {
            if (!baseSchema.boxes[boxKey]) {
                baseSchema.boxes[boxKey] = JSON.parse(JSON.stringify(defaultSchema.boxes[boxKey]));
            } else if (defaultSchema.boxes[boxKey].fields) {
                baseSchema.boxes[boxKey].fields = {
                    ...JSON.parse(JSON.stringify(defaultSchema.boxes[boxKey].fields)),
                    ...(baseSchema.boxes[boxKey].fields || {})
                };
            }
        });
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
            const bCtx = liveData.billingContext || {};

            // Context extraction
            const isCorp = bCtx.isCorporate || Boolean(bCtx.corporateName || p.corporateName);
            const corpName = bCtx.corporateName || p.corporateName || "";
            const corpCode = bCtx.corporateCode || p.corporateCode || "";
            const empId = bCtx.employeeId || p.employeeId || "";

            const isIns = bCtx.isInsurance || Boolean(bCtx.insuranceCompanyName || p.insuranceCompanyName);
            const insName = bCtx.insuranceCompanyName || p.insuranceCompanyName || "";
            const insTpa = bCtx.insuranceTpaName || p.insuranceTpaName || "";
            const policyNo = bCtx.policyNumber || p.policyNumber || "";
            const preAuth = bCtx.preAuthApprovalNumber || p.preAuthNumber || "";

            const isReferred = bCtx.isReferred || Boolean(bCtx.referralPartnerName || (p.referringDoctor && p.referringDoctor !== "Direct Patient" && p.referringDoctor !== "Self / Direct"));
            const refPartnerName = bCtx.referralPartnerName || "";
            const refClinic = bCtx.referralPartnerClinic || "";

            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.billNumber) boxes.docBadge.fields.billNumber.value = liveData.billNumber || liveData.invoiceNumber || boxes.docBadge.fields.billNumber.value;
                if (boxes.docBadge.fields.date) boxes.docBadge.fields.date.value = liveData.date ? new Date(liveData.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString();
                if (boxes.docBadge.fields.tokenNumber) boxes.docBadge.fields.tokenNumber.value = p.token || liveData.token || "COUNTER";
                if (boxes.docBadge.fields.branchName) boxes.docBadge.fields.branchName.value = p.branchName || liveData.branchName || "Main Facility";
                if (boxes.docBadge.fields.paymentStatus) {
                    const isPaid = (fin.balanceDue <= 0 || (liveData.status || '').toLowerCase() === 'paid');
                    boxes.docBadge.fields.paymentStatus.value = isPaid ? "PAID FULL" : ((liveData.status || '').toLowerCase() === 'partial' ? "PARTIAL DUE" : "PAYMENT PENDING");
                }
                if (isCorp && boxes.docBadge.fields.subBadge) {
                    boxes.docBadge.fields.subBadge.value = corpName ? `Corporate: ${corpName}` : "Corporate B2B Account";
                } else if (isIns && boxes.docBadge.fields.subBadge) {
                    boxes.docBadge.fields.subBadge.value = insName ? `Insurance / TPA: ${insName}` : "Cashless Insurance Claim";
                }
            }

            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.fullName) boxes.partyDetails.fields.fullName.value = p.name || p.fullName || "Direct Walk-in Patient";
                if (boxes.partyDetails.fields.uhid) boxes.partyDetails.fields.uhid.value = p.uhid || p.mrn || "WALK-IN";
                if (boxes.partyDetails.fields.ageGender) boxes.partyDetails.fields.ageGender.value = p.ageGender || (p.age ? `${p.age} / ${p.gender || ''}` : "Adult");
                if (boxes.partyDetails.fields.phone) boxes.partyDetails.fields.phone.value = p.phone || p.mobile || "N/A";
                if (boxes.partyDetails.fields.refDoctor) {
                    let docStr = p.referringDoctor || liveData.referringDoctorName || "Self / Direct";
                    if (refPartnerName && !docStr.includes(refPartnerName)) {
                        docStr = refClinic ? `${refPartnerName} (${refClinic})` : refPartnerName;
                    }
                    boxes.partyDetails.fields.refDoctor.value = docStr;
                }
                if (boxes.partyDetails.fields.address) boxes.partyDetails.fields.address.value = p.address || "N/A";

                // Corporate fields
                if (isCorp && corpName) {
                    boxes.partyDetails.fields.corporateClient = {
                        id: 'corporateClient',
                        enabled: true,
                        label: 'Corporate Client',
                        value: corpCode ? `${corpName} [${corpCode}]` : corpName
                    };
                    if (empId) {
                        boxes.partyDetails.fields.employeeId = {
                            id: 'employeeId',
                            enabled: true,
                            label: 'Employee ID / Staff No',
                            value: empId
                        };
                    }
                    boxes.partyDetails.fields.billingCategory = {
                        id: 'billingCategory',
                        enabled: true,
                        label: 'Billing Category',
                        value: 'Corporate B2B Contracted'
                    };
                }

                // Insurance / TPA fields
                if (isIns && insName) {
                    boxes.partyDetails.fields.insuranceProvider = {
                        id: 'insuranceProvider',
                        enabled: true,
                        label: 'Insurance Provider / TPA',
                        value: insTpa ? `${insName} (TPA: ${insTpa})` : insName
                    };
                    if (policyNo) {
                        boxes.partyDetails.fields.policyNumber = {
                            id: 'policyNumber',
                            enabled: true,
                            label: 'Policy / Card No',
                            value: policyNo
                        };
                    }
                    if (preAuth) {
                        boxes.partyDetails.fields.preAuthApprovalNumber = {
                            id: 'preAuthApprovalNumber',
                            enabled: true,
                            label: 'Pre-Auth Approval No',
                            value: preAuth
                        };
                    }
                    boxes.partyDetails.fields.billingCategory = {
                        id: 'billingCategory',
                        enabled: true,
                        label: 'Billing Category',
                        value: 'Cashless Insurance / TPA'
                    };
                }
            }

            // Biller & Desk Audit Particulars (Direct / Standard Mode)
            const billerStr = liveData.biller?.billedBy || liveData.billerName || liveData.billedBy || p.biller || "Staff Desk";
            const discountReasonStr = fin.discountReason || bCtx.discountReason || liveData.discountReason || "";

            if (boxes.billerDetails?.fields) {
                if (boxes.billerDetails.fields.billedBy) boxes.billerDetails.fields.billedBy.value = billerStr;
                if (boxes.billerDetails.fields.discountReason) {
                    if (discountReasonStr) {
                        boxes.billerDetails.fields.discountReason.value = discountReasonStr;
                        boxes.billerDetails.fields.discountReason.enabled = true;
                    } else {
                        boxes.billerDetails.fields.discountReason.enabled = false;
                    }
                }
            }

            if (boxes.itemsTable && Array.isArray(liveData.items) && liveData.items.length > 0) {
                boxes.itemsTable.rows = liveData.items.map((it, idx) => {
                    let desc = it.name || it.testName || it.description || 'Clinical Investigation';
                    if (it.isOutsourced || it.referenceLabName) {
                        desc += ` [Outsourced: ${it.referenceLabName || 'Reference Lab'}]`;
                    }
                    return {
                        id: `live-item-${idx}`,
                        index: it.index || idx + 1,
                        description: desc,
                        code: it.code || it.testCode || '',
                        department: it.department || 'Pathology',
                        sacCode: it.sacCode || '999312',
                        price: Number(it.price || it.unitPrice || 0),
                        discount: Number(it.discount || 0),
                        amount: Number(it.amount || it.netPrice || it.price || 0)
                    };
                });
            }

            if (boxes.financialSummary?.fields) {
                const sub = fin.grossSubtotal || fin.subtotal || fin.totalAmount || 0;
                const disc = fin.discountAmount || fin.itemDiscounts || 0;
                const net = fin.totalAmount || fin.grandTotal || (sub - disc);
                const paid = fin.totalPaid !== undefined ? fin.totalPaid : (fin.totalCollected !== undefined ? fin.totalCollected : (fin.amountPaid !== undefined ? fin.amountPaid : 0));
                const due = fin.balanceDue !== undefined ? fin.balanceDue : Math.max(0, net - paid);

                if (boxes.financialSummary.fields.grossSubtotal) boxes.financialSummary.fields.grossSubtotal.value = `₹${Number(sub).toLocaleString()}`;
                if (boxes.financialSummary.fields.discountAmount) {
                    boxes.financialSummary.fields.discountAmount.value = `-₹${Number(disc).toLocaleString()} ${discountReasonStr ? `(${discountReasonStr})` : ''}`.trim();
                }
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

            // Biller & Desk Audit Particulars (Direct / Standard Mode)
            const thermalBillerStr = liveData.biller?.billedBy || liveData.billerName || liveData.billedBy || p.biller || "Staff Desk";
            const thermalDiscountReasonStr = fin.discountReason || liveData.discountReason || "";

            if (boxes.billerDetails?.fields) {
                if (boxes.billerDetails.fields.billedBy) boxes.billerDetails.fields.billedBy.value = thermalBillerStr;
                if (boxes.billerDetails.fields.discountReason) {
                    if (thermalDiscountReasonStr) {
                        boxes.billerDetails.fields.discountReason.value = thermalDiscountReasonStr;
                        boxes.billerDetails.fields.discountReason.enabled = true;
                    } else {
                        boxes.billerDetails.fields.discountReason.enabled = false;
                    }
                }
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
                const gross = fin.grossSubtotal || fin.subtotal || fin.grossAmount || 0;
                const disc = fin.discountAmount || fin.discount || (fin.appliedDiscount?.discountAmount) || 0;
                const net = fin.grandTotal || fin.totalAmount || fin.netAmount || (gross - disc);
                const paid = fin.totalPaid !== undefined ? fin.totalPaid : (fin.amountPaid !== undefined ? fin.amountPaid : (fin.totalCollected !== undefined ? fin.totalCollected : net));
                const due = fin.balanceDue !== undefined ? fin.balanceDue : Math.max(0, net - paid);

                if (boxes.docBadge?.fields?.badgeTitle) {
                    if (due > 0 && paid > 0) boxes.docBadge.fields.badgeTitle.value = "PARTIAL PAYMENT RECEIPT";
                    else if (due > 0 && paid === 0) boxes.docBadge.fields.badgeTitle.value = "PAYMENT DUE RECEIPT";
                    else boxes.docBadge.fields.badgeTitle.value = "CASH PAYMENT RECEIPT";
                }

                if (boxes.financialSummary.fields.grossAmount) {
                    boxes.financialSummary.fields.grossAmount.value = `₹${Number(gross).toLocaleString()}`;
                    boxes.financialSummary.fields.grossAmount.enabled = disc > 0;
                }
                if (boxes.financialSummary.fields.discountAmount) {
                    boxes.financialSummary.fields.discountAmount.value = disc > 0 
                        ? `-₹${Number(disc).toLocaleString()} ${thermalDiscountReasonStr ? `(${thermalDiscountReasonStr})` : ''}`.trim()
                        : `₹0`;
                    boxes.financialSummary.fields.discountAmount.enabled = disc > 0;
                }
                if (boxes.financialSummary.fields.totalAmount) boxes.financialSummary.fields.totalAmount.value = `₹${Number(net).toLocaleString()}`;
                if (boxes.financialSummary.fields.totalPaid) boxes.financialSummary.fields.totalPaid.value = `₹${Number(paid).toLocaleString()}`;
                if (boxes.financialSummary.fields.balanceDue) boxes.financialSummary.fields.balanceDue.value = `₹${Number(due).toLocaleString()}`;
            }
            break;
        }

        case 'prepaid_patient_a4_slip': {
            const p = liveData.patient || {};
            const refPartnerName = liveData.referringDoctorName || liveData.partnerName || liveData.billing?.referral?.partner?.displayName || liveData.billing?.referral?.partner?.name || liveData.billingContext?.referralPartnerName || "Referring Doctor / Clinic";
            const refClinic = liveData.partnerClinic || liveData.billingContext?.referralPartnerClinic || "";

            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.billNumber) boxes.docBadge.fields.billNumber.value = liveData.billNumber || liveData.invoiceNumber || (liveData.token ? `ORD-${liveData.token}` : boxes.docBadge.fields.billNumber.value);
                if (boxes.docBadge.fields.date) boxes.docBadge.fields.date.value = liveData.date || liveData.dateTime ? new Date(liveData.date || liveData.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString();
                if (boxes.docBadge.fields.tokenNumber) boxes.docBadge.fields.tokenNumber.value = p.token || liveData.token || "COUNTER";
                if (boxes.docBadge.fields.branchName) boxes.docBadge.fields.branchName.value = p.branchName || liveData.branchName || "Main Facility";
                if (boxes.docBadge.fields.paymentStatus) {
                    boxes.docBadge.fields.paymentStatus.value = "PARTNER SETTLED (NO DESK PAYMENT)";
                }
            }

            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.fullName) boxes.partyDetails.fields.fullName.value = p.name || p.fullName || "Patient";
                if (boxes.partyDetails.fields.uhid) boxes.partyDetails.fields.uhid.value = p.uhid || p.mrn || "WALK-IN";
                if (boxes.partyDetails.fields.ageGender) boxes.partyDetails.fields.ageGender.value = p.ageGender || (p.age ? `${p.age} / ${p.gender || ''}` : "Adult");
                if (boxes.partyDetails.fields.phone) boxes.partyDetails.fields.phone.value = p.phone || p.mobile || "N/A";
                if (boxes.partyDetails.fields.refDoctor) {
                    boxes.partyDetails.fields.refDoctor.value = refClinic ? `${refPartnerName} (${refClinic})` : refPartnerName;
                }
                if (boxes.partyDetails.fields.sponsorName) {
                    boxes.partyDetails.fields.sponsorName.value = refClinic ? `${refPartnerName} (${refClinic})` : refPartnerName;
                }
                if (boxes.partyDetails.fields.address) boxes.partyDetails.fields.address.value = p.address || "N/A";
            }

            if (boxes.billerDetails?.fields) {
                const billerObj = liveData.biller || liveData.visit?.biller || {};
                const billerDisplay = liveData.billerName 
                    || (typeof liveData.biller === 'string' ? liveData.biller : '')
                    || (billerObj.billedBy || (billerObj.fullName ? `${billerObj.fullName}${billerObj.username ? ` (${billerObj.username})` : ''}` : ''))
                    || liveData.billedBy 
                    || "Billing Desk";

                if (boxes.billerDetails.fields.billedBy) {
                    boxes.billerDetails.fields.billedBy.value = billerDisplay;
                }
            }

            if (boxes.itemsTable && Array.isArray(liveData.items || liveData.orders)) {
                const list = liveData.items || liveData.orders;
                boxes.itemsTable.rows = list.map((it, idx) => ({
                    id: `r-${idx}`,
                    index: idx + 1,
                    description: it.testName || it.name || it.description || 'Test',
                    department: it.department || it.section || 'Pathology / Radiology',
                    sampleType: it.sampleType || it.specimen || 'Standard Specimen',
                    tat: it.tat || it.timeline || 'Same Day'
                }));
            }

            if (boxes.financialSummary?.fields) {
                if (boxes.financialSummary.fields.counterPayable) {
                    boxes.financialSummary.fields.counterPayable.value = "₹0.00 (Zero Desk Cash Due)";
                }
                if (boxes.financialSummary.fields.settlementMode) {
                    boxes.financialSummary.fields.settlementMode.value = "Direct Settlement by Referring Clinic / Doctor";
                }
                if (boxes.financialSummary.fields.settlementType) {
                    boxes.financialSummary.fields.settlementType.value = "B2B Partner Prepaid Account";
                }
            }
            break;
        }

        case 'patient_thermal_prepaid_slip': {
            const p = liveData.patient || {};
            const refPartnerName = liveData.referringDoctorName || liveData.partnerName || liveData.billing?.referral?.partner?.displayName || liveData.billing?.referral?.partner?.name || "Corporate B2B Partner";

            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.receiptNumber) boxes.docBadge.fields.receiptNumber.value = liveData.receiptNumber || (liveData.token ? `SLIP-${liveData.token}` : boxes.docBadge.fields.receiptNumber.value);
                if (boxes.docBadge.fields.date) boxes.docBadge.fields.date.value = liveData.dateTime || new Date().toLocaleString();
                if (boxes.docBadge.fields.tokenNumber) boxes.docBadge.fields.tokenNumber.value = liveData.token ? `TOKEN # ${liveData.token}` : "TOKEN # COUNTER";
            }

            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.fullName) boxes.partyDetails.fields.fullName.value = p.name || p.fullName || "Patient";
                if (boxes.partyDetails.fields.uhid) boxes.partyDetails.fields.uhid.value = p.uhid || p.mrn || "WALK-IN";
                if (boxes.partyDetails.fields.ageGender) boxes.partyDetails.fields.ageGender.value = p.ageGender || `${p.age || ''} / ${p.gender || ''}`;
                if (boxes.partyDetails.fields.sponsorName) boxes.partyDetails.fields.sponsorName.value = refPartnerName;
                if (boxes.partyDetails.fields.referringDoctor) boxes.partyDetails.fields.referringDoctor.value = liveData.referringDoctorName || refPartnerName;
            }

            if (boxes.itemsTable && Array.isArray(liveData.items || liveData.orders)) {
                const list = liveData.items || liveData.orders;
                boxes.itemsTable.rows = list.map((it, idx) => ({
                    id: `r-${idx}`,
                    index: idx + 1,
                    description: it.testName || it.name || it.description || 'Test'
                }));
            }

            if (boxes.billerDetails?.fields) {
                const billerObj = liveData.biller || liveData.visit?.biller || {};
                const billerDisplay = liveData.billerName 
                    || (typeof liveData.biller === 'string' ? liveData.biller : '')
                    || (billerObj.billedBy || (billerObj.fullName ? `${billerObj.fullName}${billerObj.username ? ` (${billerObj.username})` : ''}` : ''))
                    || liveData.billedBy 
                    || "Dr. Vasudeva Rao (admin)";

                if (boxes.billerDetails.fields.billedBy) {
                    boxes.billerDetails.fields.billedBy.value = billerDisplay;
                }
            }

            if (boxes.financialSummary?.fields) {
                if (boxes.financialSummary.fields.counterPayable) {
                    boxes.financialSummary.fields.counterPayable.value = "Amount Payable at Counter: ₹0.00 (Prepaid)";
                }
            }
            break;
        }

        case 'partner_b2b_invoice': {
            const partner = liveData.partner || {};
            const summary = liveData.summary || {};

            if (boxes.docBadge?.fields) {
                const statementNum = liveData.statementNumber || liveData.statementNo || liveData.billNumber;
                if (boxes.docBadge.fields.billNumber && statementNum) {
                    boxes.docBadge.fields.billNumber.value = statementNum;
                }
                const dateVal = liveData.generatedAt || liveData.date;
                if (boxes.docBadge.fields.date && dateVal) {
                    boxes.docBadge.fields.date.value = new Date(dateVal).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                }
                if (boxes.docBadge.fields.billingCycle && liveData.billingPeriod) {
                    boxes.docBadge.fields.billingCycle.value = liveData.billingPeriod;
                }
            }

            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.fullName) boxes.partyDetails.fields.fullName.value = partner.name || partner.partnerName || "Doctor Partner";
                if (boxes.partyDetails.fields.clinicName) boxes.partyDetails.fields.clinicName.value = partner.clinicName || "Medical Clinic";
                
                if (boxes.partyDetails.fields.partnerId) {
                    let pId = partner.code || partner.partnerCode || partner.partnerId || "";
                    if (typeof pId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pId)) {
                        const cleanName = (partner.name || partner.partnerName || "PARTNER")
                            .toUpperCase()
                            .replace(/[^A-Z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '')
                            .slice(0, 16);
                        pId = `PART-${cleanName || pId.slice(0, 8).toUpperCase()}`;
                    }
                    boxes.partyDetails.fields.partnerId.value = pId;
                }
                
                if (boxes.partyDetails.fields.phone) boxes.partyDetails.fields.phone.value = partner.phone || "";
                if (boxes.partyDetails.fields.address) boxes.partyDetails.fields.address.value = partner.address || "";
            }

            if (boxes.itemsTable && Array.isArray(liveData.items)) {
                boxes.itemsTable.rows = liveData.items.map((it, idx) => {
                    const rowLabBilled = Number(it.labStandardCharge ?? it.grossAmount ?? it.grossBilled ?? it.labBilled ?? it.rate ?? 0);
                    const rowReceived = Number(it.amountReceived ?? it.received ?? 0);
                    const rowNetDue = Number(it.netClaimDue ?? it.netPayableToLab ?? it.outstandingAmount ?? it.netDue ?? 0);
                    const rowToken = it.visitToken || it.token || `T-0${idx + 1}`;

                    return {
                        id: `b2b-${idx}`,
                        index: idx + 1,
                        token: rowToken,
                        visitToken: rowToken,
                        date: it.date ? new Date(it.date).toLocaleDateString() : '',
                        patientName: it.patientName || 'Patient',
                        investigations: it.investigations || 'Diagnostic Tests',
                        tests: it.investigations || 'Diagnostic Tests',
                        labBilled: rowLabBilled,
                        grossAmount: rowLabBilled,
                        labStandardCharge: rowLabBilled,
                        tariff: rowLabBilled,
                        price: rowLabBilled,
                        rate: Number(it.rate ?? rowLabBilled),
                        received: rowReceived,
                        amountReceived: rowReceived,
                        netDue: rowNetDue,
                        netClaimDue: rowNetDue,
                        netPayableToLab: rowNetDue,
                        total: rowNetDue,
                        amount: rowNetDue
                    };
                });
            }

            if (boxes.financialSummary?.fields) {
                const count = summary.totalVisits ?? summary.totalVisitsCount ?? (liveData.items ? liveData.items.length : 0);
                const billed = summary.grossBilled ?? summary.totalGrossBilled ?? summary.totalDiagnosticCharges ?? 0;
                const rec = summary.amountReceived ?? summary.totalReceived ?? summary.totalPaid ?? 0;
                const due = summary.netClaimDue ?? summary.balanceDue ?? summary.totalNetDue ?? (billed - rec);

                if (boxes.financialSummary.fields.totalVisits) {
                    boxes.financialSummary.fields.totalVisits.value = `${count} ${count === 1 ? 'Visit' : 'Visits'} Claimed`;
                }
                if (boxes.financialSummary.fields.grossSubtotal) {
                    boxes.financialSummary.fields.grossSubtotal.value = `₹${Number(billed).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                if (boxes.financialSummary.fields.discount) {
                    const totalDisc = summary.totalDiscount !== undefined ? summary.totalDiscount : Math.max(0, billed - due - rec);
                    boxes.financialSummary.fields.discount.value = `₹${Number(totalDisc).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                if (boxes.financialSummary.fields.totalPaid) {
                    boxes.financialSummary.fields.totalPaid.value = `₹${Number(rec).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                if (boxes.financialSummary.fields.balanceDue) {
                    boxes.financialSummary.fields.balanceDue.value = `₹${Number(due).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
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

        case 'procurement_grn': {
            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.grnNumber) boxes.docBadge.fields.grnNumber.value = liveData.grnNumber || liveData.movementId || liveData.lotNumber || boxes.docBadge.fields.grnNumber.value;
                if (boxes.docBadge.fields.date) boxes.docBadge.fields.date.value = liveData.movedAt || liveData.date ? new Date(liveData.movedAt || liveData.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
                if (boxes.docBadge.fields.poNumber) boxes.docBadge.fields.poNumber.value = liveData.poNumber || liveData.poReference || 'DIRECT INWARD';
                if (boxes.docBadge.fields.receivedBy) boxes.docBadge.fields.receivedBy.value = liveData.recordedBy || liveData.receivedBy || 'Store Incharge';
            }
            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.supplierName) boxes.partyDetails.fields.supplierName.value = liveData.supplierName || liveData.vendorName || liveData.supplier?.name || boxes.partyDetails.fields.supplierName.value;
                if (boxes.partyDetails.fields.invoiceNumber) boxes.partyDetails.fields.invoiceNumber.value = liveData.invoiceNumber || liveData.vendorInvoiceNo || boxes.partyDetails.fields.invoiceNumber.value;
                if (boxes.partyDetails.fields.challanNumber) boxes.partyDetails.fields.challanNumber.value = liveData.challanNumber || boxes.partyDetails.fields.challanNumber.value;
                if (boxes.partyDetails.fields.storageLocation) boxes.partyDetails.fields.storageLocation.value = liveData.storageLocation || liveData.branchName || boxes.partyDetails.fields.storageLocation.value;
            }
            if (boxes.itemsTable) {
                const itemsToMap = Array.isArray(liveData.items) && liveData.items.length > 0 
                    ? liveData.items 
                    : (liveData.itemName || liveData.name ? [liveData] : []);
                if (itemsToMap.length > 0) {
                    boxes.itemsTable.rows = itemsToMap.map((it, idx) => {
                        const qty = Number(it.receivedQuantity || it.quantity || 1);
                        const rate = Number(it.unitCost || it.unitPrice || 0);
                        return {
                            id: `grn-${idx}`,
                            index: idx + 1,
                            description: it.description || it.itemName || it.name || 'Consumable Item',
                            batchNumber: it.batchNumber || it.lotNumber || '-',
                            expiryDate: it.expiryDate ? new Date(it.expiryDate).toLocaleDateString('en-IN') : '-',
                            receivedQuantity: qty,
                            unitCost: rate,
                            total: Number(it.total || (qty * rate))
                        };
                    });
                }
            }
            if (boxes.financialSummary?.fields) {
                const itemsCount = boxes.itemsTable?.rows?.length || 1;
                const totalVal = boxes.itemsTable?.rows?.reduce((s, r) => s + (Number(r.total) || 0), 0) || Number(liveData.totalAmount || 0);
                if (boxes.financialSummary.fields.totalItemsCount) boxes.financialSummary.fields.totalItemsCount.value = `${itemsCount} Material Lines`;
                if (boxes.financialSummary.fields.totalAmount) boxes.financialSummary.fields.totalAmount.value = `₹${totalVal.toLocaleString('en-IN')}`;
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

        case 'corporate_b2b_invoice': {
            const p = liveData.patient || {};
            const refPartnerName = liveData.referringDoctorName 
                || liveData.partnerName 
                || liveData.partner?.name 
                || liveData.billing?.referral?.partner?.displayName 
                || liveData.billing?.referral?.partner?.name 
                || liveData.billingContext?.referralPartnerName 
                || "Referring Doctor / Clinic";
            const refClinic = liveData.partnerClinic 
                || liveData.partner?.clinicName 
                || liveData.billingContext?.referralPartnerClinic 
                || "";
            const refDoctor = liveData.referringDoctorName 
                || liveData.partnerDoctor 
                || liveData.partner?.doctorName 
                || (refClinic ? refPartnerName : "");
            const partnerCode = liveData.partnerCode 
                || liveData.partnerId 
                || liveData.partner?.code 
                || "";

            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.billNumber) {
                    boxes.docBadge.fields.billNumber.value = liveData.billNumber || liveData.invoiceNumber || (liveData.token ? `INV-B2B-${liveData.token}` : boxes.docBadge.fields.billNumber.value);
                }
                if (boxes.docBadge.fields.date) {
                    boxes.docBadge.fields.date.value = liveData.date || liveData.createdAt 
                        ? new Date(liveData.date || liveData.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) 
                        : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                }
                if (boxes.docBadge.fields.tokenNumber) {
                    boxes.docBadge.fields.tokenNumber.value = p.token || liveData.token || "COUNTER";
                }
                if (boxes.docBadge.fields.paymentStatus) {
                    boxes.docBadge.fields.paymentStatus.value = "PARTNER SETTLED (PATIENT CASH: ₹0.00)";
                }
            }

            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.sponsorName) {
                    boxes.partyDetails.fields.sponsorName.value = refClinic ? `${refPartnerName} (${refClinic})` : refPartnerName;
                }
                if (boxes.partyDetails.fields.referringDoctor) {
                    boxes.partyDetails.fields.referringDoctor.value = refDoctor || refPartnerName;
                }
                if (boxes.partyDetails.fields.partnerId && partnerCode) {
                    boxes.partyDetails.fields.partnerId.value = partnerCode;
                }
                if (boxes.partyDetails.fields.fullName) {
                    boxes.partyDetails.fields.fullName.value = p.name || p.fullName || liveData.patientName || "Patient";
                }
                if (boxes.partyDetails.fields.uhid) {
                    boxes.partyDetails.fields.uhid.value = p.uhid || p.mrn || liveData.mrn || "WALK-IN";
                }
                if (boxes.partyDetails.fields.ageGender) {
                    boxes.partyDetails.fields.ageGender.value = p.ageGender || (p.age ? `${p.age} Yrs / ${p.gender || ''}` : "Adult");
                }
                if (boxes.partyDetails.fields.phone) {
                    boxes.partyDetails.fields.phone.value = p.phone || p.mobile || liveData.phone || "N/A";
                }
                if (boxes.partyDetails.fields.address) {
                    boxes.partyDetails.fields.address.value = p.address || liveData.address || "N/A";
                }
            }

            if (boxes.billerDetails?.fields) {
                const billerObj = liveData.biller || liveData.visit?.biller || {};
                const billerDisplay = liveData.billerName 
                    || (typeof liveData.biller === 'string' ? liveData.biller : '')
                    || (billerObj.billedBy || (billerObj.fullName ? `${billerObj.fullName}${billerObj.username ? ` (${billerObj.username})` : ''}` : ''))
                    || liveData.billedBy 
                    || "Dr. Vasudeva Rao (admin)";

                if (boxes.billerDetails.fields.billedBy) {
                    boxes.billerDetails.fields.billedBy.value = billerDisplay;
                }
            }

            if (boxes.itemsTable) {
                let rawList = liveData.items || liveData.orders || liveData.tests;
                if (!rawList && liveData.testsSummary) {
                    rawList = liveData.testsSummary.split(',').map(s => s.trim()).filter(Boolean);
                }
                if (Array.isArray(rawList) && rawList.length > 0) {
                    boxes.itemsTable.rows = rawList.map((it, idx) => {
                        const isStr = typeof it === 'string';
                        const desc = isStr ? it : (it.description || it.testName || it.name || 'Investigation');
                        const rate = isStr ? 0 : Number(it.price || it.rate || it.grossAmount || 0);
                        const disc = isStr ? 0 : Number(it.discount || it.concession || 0);
                        const net = isStr ? rate : Number(it.amount || it.netAmount || (rate - disc));
                        return {
                            id: `b2b-${idx}`,
                            index: idx + 1,
                            description: desc,
                            department: isStr ? 'Pathology' : (it.department || it.section || 'Diagnostics'),
                            sacCode: isStr ? '999312' : (it.sacCode || '999312'),
                            price: rate,
                            discount: disc,
                            amount: net
                        };
                    });
                }
            }

            if (boxes.financialSummary?.fields) {
                const fin = liveData.financial || liveData.billing || {};
                const gross = fin.grossSubtotal || fin.subtotal || fin.grossAmount || liveData.grossAmount || 0;
                const disc = fin.discountAmount || fin.discount || liveData.discountAmount || 0;
                const total = fin.grandTotal || fin.totalAmount || fin.netAmount || liveData.totalAmount || (gross - disc);

                if (boxes.financialSummary.fields.grossSubtotal) {
                    boxes.financialSummary.fields.grossSubtotal.value = `₹${Number(gross).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                if (boxes.financialSummary.fields.partnerDiscount) {
                    boxes.financialSummary.fields.partnerDiscount.value = `-₹${Number(disc).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    boxes.financialSummary.fields.partnerDiscount.enabled = disc > 0;
                }
                if (boxes.financialSummary.fields.totalAmount) {
                    boxes.financialSummary.fields.totalAmount.value = `₹${Number(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                if (boxes.financialSummary.fields.settlementMode) {
                    boxes.financialSummary.fields.settlementMode.value = "Direct Settlement by Referring Clinic / Doctor";
                }
                if (boxes.financialSummary.fields.counterPayable) {
                    boxes.financialSummary.fields.counterPayable.value = "₹0.00 (Paid at Partner Clinic)";
                }
            }

            if (boxes.amountInWords) {
                if (liveData.amountInWords) {
                    boxes.amountInWords.value = liveData.amountInWords;
                }
            }
            break;
        }

        case 'insurance_thermal_receipt': {
            const p = liveData.patient || {};
            const ins = liveData.insurance || liveData.billingContext || {};

            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.receiptNumber) {
                    boxes.docBadge.fields.receiptNumber.value = liveData.receiptNumber || liveData.claimNumber || (liveData.token ? `CLM-${liveData.token}` : boxes.docBadge.fields.receiptNumber.value);
                }
                if (boxes.docBadge.fields.date) {
                    boxes.docBadge.fields.date.value = liveData.dateTime || liveData.date 
                        ? new Date(liveData.dateTime || liveData.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) 
                        : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                }
                if (boxes.docBadge.fields.tokenNumber) {
                    boxes.docBadge.fields.tokenNumber.value = liveData.token ? `TOKEN # ${liveData.token}` : "TOKEN # COUNTER";
                }
                if (boxes.docBadge.fields.claimStatus) {
                    boxes.docBadge.fields.claimStatus.value = liveData.claimStatus || "APPROVED / PRE-AUTH";
                }
            }

            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.fullName) boxes.partyDetails.fields.fullName.value = p.name || p.fullName || liveData.patientName || "Patient";
                if (boxes.partyDetails.fields.uhid) boxes.partyDetails.fields.uhid.value = p.uhid || p.mrn || "WALK-IN";
                if (boxes.partyDetails.fields.ageGender) boxes.partyDetails.fields.ageGender.value = p.ageGender || `${p.age || ''} / ${p.gender || ''}`;
                if (boxes.partyDetails.fields.insuranceProvider) {
                    boxes.partyDetails.fields.insuranceProvider.value = ins.insuranceCompanyName || liveData.insuranceProvider || liveData.insuranceCompany || "Insurance Provider";
                }
                if (boxes.partyDetails.fields.tpaName) {
                    boxes.partyDetails.fields.tpaName.value = ins.insuranceTpaName || liveData.tpaName || "TPA Network";
                }
                if (boxes.partyDetails.fields.policyNumber) {
                    boxes.partyDetails.fields.policyNumber.value = ins.policyNumber || liveData.policyNumber || "N/A";
                }
                if (boxes.partyDetails.fields.preAuthApprovalNumber) {
                    boxes.partyDetails.fields.preAuthApprovalNumber.value = ins.preAuthApprovalNumber || liveData.preAuthApprovalNumber || liveData.preAuthNumber || "N/A";
                }
            }

            if (boxes.billerDetails?.fields) {
                const billerObj = liveData.biller || liveData.visit?.biller || {};
                const billerDisplay = liveData.billerName 
                    || (typeof liveData.biller === 'string' ? liveData.biller : '')
                    || (billerObj.billedBy || (billerObj.fullName ? `${billerObj.fullName}${billerObj.username ? ` (${billerObj.username})` : ''}` : ''))
                    || liveData.billedBy 
                    || "Dr. Vasudeva Rao (admin)";

                if (boxes.billerDetails.fields.billedBy) {
                    boxes.billerDetails.fields.billedBy.value = billerDisplay;
                }
            }

            if (boxes.itemsTable) {
                let rawList = liveData.items || liveData.orders || liveData.tests;
                if (!rawList && liveData.testsSummary) {
                    rawList = liveData.testsSummary.split(',').map(s => s.trim()).filter(Boolean);
                }
                if (Array.isArray(rawList) && rawList.length > 0) {
                    boxes.itemsTable.rows = rawList.map((it, idx) => {
                        const isStr = typeof it === 'string';
                        return {
                            id: `r-${idx}`,
                            index: idx + 1,
                            description: isStr ? it : (it.description || it.testName || it.name || it.packageName || 'Investigation / Package'),
                            price: isStr ? 0 : Number(it.price || it.amount || 0)
                        };
                    });
                }
            }

            if (boxes.financialSummary?.fields) {
                const fin = liveData.financial || liveData.billing || {};
                const gross = Number(fin.grossSubtotal || fin.subtotal || liveData.grossAmount || liveData.totalAmount || 0);
                const coPay = Number(fin.coPayAmount || liveData.coPayAmount || 0);
                const netClaim = Number(fin.netClaimApproved || (gross - coPay));
                const deskDue = Number(fin.balanceDue !== undefined ? fin.balanceDue : 0);

                if (boxes.financialSummary.fields.grossAmount) {
                    boxes.financialSummary.fields.grossAmount.value = `₹${gross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                if (boxes.financialSummary.fields.coPayAmount) {
                    boxes.financialSummary.fields.coPayAmount.value = `₹${coPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                if (boxes.financialSummary.fields.totalAmount) {
                    boxes.financialSummary.fields.totalAmount.value = `₹${netClaim.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                if (boxes.financialSummary.fields.balanceDue) {
                    boxes.financialSummary.fields.balanceDue.value = deskDue > 0 
                        ? `₹${deskDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Due)` 
                        : '₹0.00 (Settled)';
                }
            }
            break;
        }

        case 'insurance_tpa_claim': {
            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.billNumber) boxes.docBadge.fields.billNumber.value = liveData.billNumber || liveData.invoiceNumber || liveData.visitId || boxes.docBadge.fields.billNumber.value;
                if (boxes.docBadge.fields.date) boxes.docBadge.fields.date.value = liveData.date || liveData.createdAt ? new Date(liveData.date || liveData.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
                if (boxes.docBadge.fields.claimStatus) boxes.docBadge.fields.claimStatus.value = liveData.status || liveData.claimStatus || "APPROVED / PRE-AUTH";
            }
            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.fullName) boxes.partyDetails.fields.fullName.value = liveData.patientName || boxes.partyDetails.fields.fullName.value;
                if (boxes.partyDetails.fields.uhid) boxes.partyDetails.fields.uhid.value = liveData.patientMrn || liveData.uhid || boxes.partyDetails.fields.uhid.value;
                if (boxes.partyDetails.fields.insuranceProvider) boxes.partyDetails.fields.insuranceProvider.value = liveData.insuranceCompanyName || liveData.insuranceCompany || liveData.insuranceProvider || boxes.partyDetails.fields.insuranceProvider.value;
                if (boxes.partyDetails.fields.tpaName) boxes.partyDetails.fields.tpaName.value = liveData.tpaName || boxes.partyDetails.fields.tpaName.value;
                if (boxes.partyDetails.fields.policyNumber) boxes.partyDetails.fields.policyNumber.value = liveData.policyNumber || boxes.partyDetails.fields.policyNumber.value;
                if (boxes.partyDetails.fields.preAuthApprovalNumber) boxes.partyDetails.fields.preAuthApprovalNumber.value = liveData.preAuthApprovalNumber || boxes.partyDetails.fields.preAuthApprovalNumber.value;
            }
            if (boxes.billerDetails?.fields) {
                const billerObj = liveData.biller || liveData.visit?.biller || {};
                const billerDisplay = liveData.billerName 
                    || (typeof liveData.biller === 'string' ? liveData.biller : '')
                    || (billerObj.billedBy || (billerObj.fullName ? `${billerObj.fullName}${billerObj.username ? ` (${billerObj.username})` : ''}` : ''))
                    || liveData.billedBy 
                    || "Dr. Vasudeva Rao (admin)";

                if (boxes.billerDetails.fields.billedBy) {
                    boxes.billerDetails.fields.billedBy.value = billerDisplay;
                }
            }
            if (boxes.itemsTable) {
                let rawList = liveData.items || liveData.tests;
                if (!rawList && liveData.testsSummary) {
                    rawList = liveData.testsSummary.split(',').map(s => s.trim()).filter(Boolean);
                }
                if (Array.isArray(rawList) && rawList.length > 0) {
                    boxes.itemsTable.rows = rawList.map((it, idx) => {
                        const isStr = typeof it === 'string';
                        return {
                            id: `ins-${idx}`,
                            index: idx + 1,
                            description: isStr ? it : (it.description || it.testName || it.name || it.packageName || 'Investigation / Package'),
                            sacCode: isStr ? '999312' : (it.sacCode || '999312'),
                            price: isStr ? Number(liveData.grossAmount || 0) : Number(it.price || it.amount || 0),
                            discount: isStr ? 0 : Number(it.discount || 0),
                            amount: isStr ? Number(liveData.grossAmount || 0) : Number(it.amount || it.price || 0)
                        };
                    });
                }
            }
            if (boxes.financialSummary?.fields) {
                const total = Number(liveData.grossAmount || liveData.totalAmount || 0);
                const coPay = Number(liveData.coPayAmount || 0);
                const due = Number(liveData.claimAmount !== undefined ? liveData.claimAmount : (total - coPay));
                if (boxes.financialSummary.fields.grossSubtotal) boxes.financialSummary.fields.grossSubtotal.value = `₹${total.toLocaleString('en-IN')}`;
                if (boxes.financialSummary.fields.coPayAmount) boxes.financialSummary.fields.coPayAmount.value = `₹${coPay.toLocaleString('en-IN')}`;
                if (boxes.financialSummary.fields.totalAmount) boxes.financialSummary.fields.totalAmount.value = `₹${total.toLocaleString('en-IN')}`;
                if (boxes.financialSummary.fields.balanceDue) boxes.financialSummary.fields.balanceDue.value = `₹${due.toLocaleString('en-IN')}`;
            }
            break;
        }

        case 'outsourced_lab_manifest': {
            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.manifestNumber) boxes.docBadge.fields.manifestNumber.value = liveData.manifestNumber || liveData.id || boxes.docBadge.fields.manifestNumber.value;
                if (boxes.docBadge.fields.date) boxes.docBadge.fields.date.value = liveData.date || liveData.createdAt ? new Date(liveData.date || liveData.createdAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
            }
            if (boxes.partyDetails?.fields) {
                if (boxes.partyDetails.fields.referenceLabName) boxes.partyDetails.fields.referenceLabName.value = liveData.referenceLabName || boxes.partyDetails.fields.referenceLabName.value;
            }
            if (boxes.itemsTable) {
                const itemsToMap = Array.isArray(liveData.items) && liveData.items.length > 0 
                    ? liveData.items 
                    : (liveData.patientName ? [liveData] : []);
                if (itemsToMap.length > 0) {
                    boxes.itemsTable.rows = itemsToMap.map((it, idx) => ({
                        id: `out-${idx}`,
                        index: idx + 1,
                        patientName: it.patientName || it.name || 'Patient',
                        token: it.token || it.sampleBarcode || it.testCode || '-',
                        description: it.description || it.testName || 'Investigation',
                        sampleType: it.sampleType || 'Specimen / Blood',
                        rate: Number(it.rate || it.amountDue || it.amount || 0)
                    }));
                }
            }
            break;
        }

        case 'summary_bills_daybook':
        case 'summary_doctor_dues':
        case 'summary_corporate':
        case 'summary_insurance':
        case 'summary_outsource': {
            if (boxes.docBadge?.fields) {
                if (boxes.docBadge.fields.badgeTitle && liveData.title) {
                    boxes.docBadge.fields.badgeTitle.value = liveData.title.toUpperCase();
                }
                if (boxes.docBadge.fields.statementPeriod) {
                    boxes.docBadge.fields.statementPeriod.value = liveData.dateRangeText || liveData.statementPeriod || liveData.period || boxes.docBadge.fields.statementPeriod.value;
                }
                if (boxes.docBadge.fields.generatedAt) {
                    boxes.docBadge.fields.generatedAt.value = new Date().toLocaleString('en-IN');
                }
                if (boxes.docBadge.fields.branchName) {
                    boxes.docBadge.fields.branchName.value = liveData.branchName || 'All Branches';
                }
            }
            if (Array.isArray(liveData.columns) && liveData.columns.length > 0 && boxes.itemsTable) {
                const dynamicCols = {
                    index: { id: 'index', enabled: true, label: '#' }
                };
                liveData.columns.forEach(col => {
                    dynamicCols[col.key] = {
                        id: col.key,
                        label: col.label,
                        enabled: true
                    };
                });
                boxes.itemsTable.columns = dynamicCols;
            }
            const rows = Array.isArray(liveData.data) ? liveData.data : (Array.isArray(liveData.items) ? liveData.items : []);
            if (boxes.itemsTable && rows.length > 0) {
                boxes.itemsTable.rows = rows.map((it, idx) => {
                    const row = {
                        ...it,
                        id: it.id || it.visitId || it.billId || `row-${idx}`,
                        index: idx + 1
                    };
                    // Evaluate custom render callbacks from caller column definitions
                    if (Array.isArray(liveData.columns)) {
                        liveData.columns.forEach(col => {
                            if (typeof col.render === 'function') {
                                try {
                                    row[col.key] = col.render(it[col.key], it);
                                } catch (e) {
                                    console.warn(`Error evaluating col.render for ${col.key}:`, e);
                                }
                            }
                        });
                    }
                    // Enterprise Fallback: Compact date format for any unrendered ISO date strings
                    ['date', 'occurredAt', 'createdAt', 'timestamp'].forEach(dk => {
                        if (row[dk] && typeof row[dk] === 'string' && row[dk].includes('T') && row[dk].includes('-')) {
                            row[dk] = formatDateCompact(row[dk]);
                        }
                    });
                    // Enterprise Fallback: Dept/Modality synthesis if unrendered
                    if (row.department && row.modality && row.modality !== 'General' && row.modality !== row.department && !String(row.department).includes('/')) {
                        row.department = `${row.department} / ${row.modality}`;
                    }
                    return row;
                });
            }
            if (boxes.financialSummary?.fields) {
                if (liveData.summaryTotals) {
                    Object.entries(liveData.summaryTotals).forEach(([k, val]) => {
                        if (boxes.financialSummary.fields[k]) {
                            boxes.financialSummary.fields[k].value = typeof val === 'number' ? `₹${val.toLocaleString('en-IN')}` : String(val);
                        }
                    });
                }
                if (Array.isArray(liveData.kpis) && liveData.kpis.length > 0) {
                    liveData.kpis.forEach((kpi, idx) => {
                        const kpiKey = `kpi_${idx}`;
                        boxes.financialSummary.fields[kpiKey] = {
                            id: kpiKey,
                            label: kpi.label,
                            value: String(kpi.value),
                            enabled: true
                        };
                    });
                }
                if (boxes.financialSummary.fields.totalBilled && liveData.totalBilled !== undefined) {
                    boxes.financialSummary.fields.totalBilled.value = `₹${Number(liveData.totalBilled).toLocaleString('en-IN')}`;
                }
                if (boxes.financialSummary.fields.totalCollected && liveData.totalCollected !== undefined) {
                    boxes.financialSummary.fields.totalCollected.value = `₹${Number(liveData.totalCollected).toLocaleString('en-IN')}`;
                }
                if (boxes.financialSummary.fields.totalDue && liveData.totalDue !== undefined) {
                    boxes.financialSummary.fields.totalDue.value = `₹${Number(liveData.totalDue).toLocaleString('en-IN')}`;
                }
                if (boxes.financialSummary.fields.totalBillsCount && liveData.totalVisitsCount !== undefined) {
                    boxes.financialSummary.fields.totalBillsCount.value = `${liveData.totalVisitsCount} Bills`;
                }
            }
            break;
        }

        default:
            break;
    }

    // 3. BANK & UPI DETAILS (Merged from lab / stationery profile)
    if (boxes.bankAndUpi) {
        if (settings.customQrImage) boxes.bankAndUpi.customQrImage = settings.customQrImage;
        if (boxes.bankAndUpi.fields) {
            if (boxes.bankAndUpi.fields.bankName) boxes.bankAndUpi.fields.bankName.value = settings.bankName || boxes.bankAndUpi.fields.bankName.value;
            if (boxes.bankAndUpi.fields.accountNumber) boxes.bankAndUpi.fields.accountNumber.value = settings.accountNumber || boxes.bankAndUpi.fields.accountNumber.value;
            if (boxes.bankAndUpi.fields.ifsc) boxes.bankAndUpi.fields.ifsc.value = settings.ifscCode || boxes.bankAndUpi.fields.ifsc.value;
            if (boxes.bankAndUpi.fields.branch) boxes.bankAndUpi.fields.branch.value = settings.branch || boxes.bankAndUpi.fields.branch.value;
            if (boxes.bankAndUpi.fields.upiId) boxes.bankAndUpi.fields.upiId.value = settings.upiId || boxes.bankAndUpi.fields.upiId.value;
        }
    }

    // 4. TERMS AND SIGNATORY
    if (boxes.termsAndConditions) {
        if (!baseSchema.isThermal) {
            boxes.termsAndConditions.text = settings.termsAndConditions || boxes.termsAndConditions.text;
        }
    }
    if (boxes.signatory) {
        boxes.signatory.title = settings.signatoryTitle || boxes.signatory.title;
    }

    return baseSchema;
}
