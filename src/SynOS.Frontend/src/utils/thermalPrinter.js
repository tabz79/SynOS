import { DEFAULT_DOCUMENT_SCHEMAS } from '../features/finance/components/documents/documentLayoutSchemas';
import { hydrateDocumentSchema } from '../features/finance/components/documents/schemaHydrator';
import QRCode from 'qrcode';

/**
 * Generates pure vector SVG QR code synchronously without external HTTP calls.
 */
function renderQrSvgSync(text, size = 68) {
    if (!text) return '';
    try {
        const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
        const modSize = qr.modules.size;
        const data = qr.modules.data;
        let rects = '';
        for (let r = 0; r < modSize; r++) {
            for (let c = 0; c < modSize; c++) {
                if (data[r * modSize + c]) {
                    rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="#000000"/>`;
                }
            }
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${modSize} ${modSize}" width="${size}" height="${size}" style="display: block; flex-shrink: 0;" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`;
    } catch (e) {
        console.warn("Failed to generate thermal QR SVG", e);
        return '';
    }
}

function formatInr(val) {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateThermalInvoiceHtml(payload = {}) {
    const isPrepaid = payload.isPrepaid 
        || payload.billingMode === 'PrepaidPartner'
        || payload.Method === 'PartnerCollects'
        || payload.PaymentCollectionModel === 'PartnerCollects'
        || payload.billing?.paymentMethod === 'Corporate B2B Prepaid'
        || payload.billing?.paymentMethod === 'PartnerAccount'
        || payload.billing?.paymentMethod === 'Prepaid'
        || payload.billing?.paymentMethod === 'PartnerCollects';

    if (isPrepaid && !payload.forceStandardReceipt) {
        return generateThermalPrepaidSlipHtml(payload);
    }

    const isInsurance = payload.isInsurance
        || payload.billingMode === 'Insurance'
        || payload.billingMode === 'TPA'
        || payload.PaymentCollectionModel === 'Insurance'
        || payload.billing?.paymentMethod === 'Insurance'
        || payload.billing?.paymentMethod === 'TPA'
        || payload.billing?.isInsurance;

    if (isInsurance && !payload.forceStandardReceipt) {
        return generateThermalInsuranceReceiptHtml(payload);
    }

    const visitId = payload.visitId || payload.VisitId || '';
    const token = payload.token || payload.Token || payload.visitToken || '';
    const patientObj = payload.patient || payload.Patient || {};
    const patientName = patientObj.name || patientObj.fullName || payload.patientName || payload.PatientName || 'Patient';
    const patientUhid = patientObj.uhid || patientObj.mrn || payload.mrn || payload.Mrn || 'SYN-2026-0001';
    const patientAge = patientObj.age || payload.age || payload.Age || '';
    const patientGender = patientObj.gender || patientObj.sex || payload.gender || payload.Gender || 'M';
    const billingObj = payload.billing || payload.Billing || payload.financial || {};
    const ordersList = payload.orders || payload.Orders || payload.items || [];
    const doctorName = payload.referringDoctorName || payload.ReferringDoctorName || billingObj?.referral?.partner?.displayName || '';
    const labName = payload.labName || payload.LabName || '';
    const branchObj = payload.branch || payload.Branch || {};
    const customLayout = payload.customLayout;

    // 1. Resolve Schema from Custom Studio Override or Defaults
    let schema = customLayout || DEFAULT_DOCUMENT_SCHEMAS['patient_thermal_receipt'];
    let labSettings = {
        labLegalName: "SRI DIVYA DIAGNOSTIC CENTRE",
        labTradeName: "AN ISO 9001:2015 CERTIFIED DIAGNOSTIC CENTRE",
        address: "Wyra Road, Khammam | Ph: 9876543210",
        phone: "+91 98765 43210"
    };

    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            if (!customLayout) {
                const studioSaved = window.localStorage.getItem('synos_document_layout_patient_thermal_receipt');
                if (studioSaved) {
                    schema = JSON.parse(studioSaved);
                }
            }
            const settingsSaved = window.localStorage.getItem('synos_stationery_settings');
            if (settingsSaved) {
                labSettings = { ...labSettings, ...JSON.parse(settingsSaved) };
            }
            if (window.__synos_stationery_settings) {
                labSettings = { ...labSettings, ...window.__synos_stationery_settings };
            }
            const cachedLogo = window.localStorage.getItem('synos_lab_logo');
            if (cachedLogo && !labSettings.logoUrl) {
                labSettings.logoUrl = cachedLogo;
            }
            const cachedQr = window.localStorage.getItem('synos_custom_qr_image');
            if (cachedQr && !labSettings.customQrImage) {
                labSettings.customQrImage = cachedQr;
            }
        } catch (e) {
            console.warn("Could not load stored thermal schema/settings", e);
        }
    }

    if (branchObj?.name) labSettings.branchName = branchObj.name;
    if (branchObj?.address) labSettings.address = branchObj.address;
    if (branchObj?.phone) labSettings.phone = branchObj.phone;

    // 2. Prepare normalized live data for Schema Hydrator
    const allItems = ordersList.map((it, idx) => ({
        id: `r-${idx}`,
        index: idx + 1,
        testName: it.testName || it.name || it.testCode || 'Diagnostic Test',
        price: Number(it.grossAmount || it.price || 0),
        amount: Number(it.netAmount || it.amount || it.price || 0)
    }));

    const grossSubtotal = Number(billingObj.grossAmount || billingObj.subtotal || billingObj.netAmount || 0);
    const discountAmount = Number(billingObj.discountAmount || billingObj.discount || billingObj.appliedDiscount?.discountAmount || 0);
    const totalPaid = Number(billingObj.totalPaid || billingObj.amountPaid || 0);
    const totalAmount = Number(billingObj.netAmount || billingObj.totalAmount || (grossSubtotal - discountAmount) || 0);
    const dueVal = Number(billingObj.balanceDue ?? Math.max(0, totalAmount - totalPaid));

    const billerObj = payload.biller || billingObj.biller || payload.visit?.biller || {};
    const billerDisplay = payload.billerName 
        || (typeof payload.biller === 'string' ? payload.biller : '')
        || (billerObj.billedBy || (billerObj.fullName ? `${billerObj.fullName}${billerObj.username ? ` (${billerObj.username})` : ''}` : ''))
        || billingObj.billedBy 
        || payload.visit?.billedBy 
        || payload.billedBy 
        || "Staff Desk";

    const discountReason = payload.discountReason 
        || billingObj.discountReason 
        || billingObj.appliedDiscount?.reason 
        || billingObj.appliedDiscount?.name 
        || payload.stagedDiscount?.reason 
        || payload.stagedDiscount?.name 
        || "";

    const normalizedData = {
        receiptNumber: payload.receiptNumber || payload.billNumber || (token ? `RCPT-${token}` : `RCPT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`),
        dateTime: payload.dateTime || new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
        token: token || "WAIT",
        patient: {
            name: patientName,
            fullName: patientName,
            uhid: patientUhid,
            ageGender: `${patientAge ? `${patientAge}Y` : ''} / ${patientGender}`.trim(),
            phone: patientObj.phone || patientObj.mobile || ""
        },
        items: allItems,
        orders: allItems,
        financial: {
            grossSubtotal,
            discountAmount,
            totalAmount,
            totalPaid,
            balanceDue: dueVal,
            discountReason
        },
        biller: {
            billedBy: billerDisplay
        },
        billerName: billerDisplay,
        discountReason
    };

    // 3. Hydrate Schema
    const hydrated = hydrateDocumentSchema('patient_thermal_receipt', schema, normalizedData, labSettings);
    const { boxes } = hydrated;

    // A. Brand Header (boxes.header)
    let headerHtml = "";
    if (boxes.header?.enabled) {
        const hf = boxes.header.fields || {};
        const legalName = labSettings.labLegalName || labSettings.legalName || hf.legalName?.value || "SRI DIVYA DIAGNOSTIC CENTRE";
        const rawTagline = labSettings.labTradeName || labSettings.tagline || hf.tagline?.value || "";
        const tagline = (rawTagline && rawTagline.trim().toLowerCase() !== legalName.trim().toLowerCase()) ? rawTagline : "";
        const address = labSettings.address || hf.address?.value || "Wyra Road, Khammam | Ph: 9876543210";
        const gstin = labSettings.gstin || hf.gstin?.value || "";
        const phone = labSettings.phone || hf.phone?.value || "";
        const effectiveLogo = labSettings.logoUrl || (typeof window !== 'undefined' ? window.localStorage?.getItem('synos_lab_logo') : "");

        headerHtml = `
            <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 5px; margin-bottom: 5px;">
                ${effectiveLogo ? `
                    <div style="margin-bottom: 3px; display: flex; justify-content: center;">
                        <img src="${effectiveLogo}" style="max-height: 44px; max-width: 140px; object-fit: contain; filter: grayscale(100%) contrast(200%);" alt="Logo" />
                    </div>
                ` : ''}
                ${hf.legalName?.enabled !== false ? `<div style="font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.02em; color: #000000; line-height: 1.2;">${legalName}</div>` : ''}
                ${hf.tagline?.enabled !== false && tagline ? `<div style="font-size: 9.5px; font-weight: 700; color: #000000; text-transform: uppercase; margin-top: 2px; letter-spacing: 0.02em;">${tagline}</div>` : ''}
                ${hf.address?.enabled !== false && address ? `<div style="font-size: 9.5px; font-weight: 600; color: #000000; margin-top: 2px; line-height: 1.25;">${address}</div>` : ''}
                <div style="font-size: 9.5px; font-weight: 800; color: #000000; margin-top: 2px;">
                    ${hf.gstin?.enabled !== false && gstin ? `GSTIN: <span style="font-family: monospace;">${gstin}</span>` : ''}
                    ${phone ? ` | Ph: ${phone}` : ''}
                </div>
            </div>
        `;
    }

    // B. Document Badge (boxes.docBadge)
    let badgeHtml = "";
    if (boxes.docBadge?.enabled) {
        const df = boxes.docBadge.fields || {};
        const dueVal = Number(normalizedData.financial.balanceDue || 0);
        const paidVal = Number(normalizedData.financial.totalPaid || 0);
        let defaultTitle = "CASH PAYMENT RECEIPT";
        if (dueVal > 0 && paidVal > 0) {
            defaultTitle = "PARTIAL PAYMENT RECEIPT";
        } else if (dueVal > 0 && paidVal === 0) {
            defaultTitle = "PAYMENT DUE RECEIPT";
        }
        const title = (df.badgeTitle?.value && df.badgeTitle.value !== "CASH PAYMENT RECEIPT") ? df.badgeTitle.value : defaultTitle;
        const dateVal = df.date?.value || normalizedData.dateTime;
        const receiptNo = df.receiptNumber?.value || normalizedData.receiptNumber;

        badgeHtml = `
            <div style="text-align: center; margin-bottom: 5px; border-bottom: 1.5px solid #000000; padding-bottom: 5px;">
                ${df.badgeTitle?.enabled !== false ? `
                    <div style="margin-bottom: 4px;">
                        <span style="background: #000000; color: #ffffff; padding: 2px 10px; border-radius: 2px; font-weight: 900; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; display: inline-block;">
                            ${title}
                        </span>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 700; color: #000000; padding: 0 1px;">
                    ${df.date?.enabled !== false ? `<span>Date: <b>${dateVal}</b></span>` : ''}
                    ${df.receiptNumber?.enabled !== false ? `<span>Rcpt: <b style="font-family: monospace;">${receiptNo}</b></span>` : ''}
                </div>
                ${token && df.tokenNumber?.enabled !== false ? `
                    <div style="margin-top: 5px; padding: 3px 6px; border: 2px solid #000000; text-align: center; background: #ffffff;">
                        <span style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 0.05em;">Token Number</span>
                        <div style="font-size: 24px; font-weight: 900; font-family: monospace; color: #000000; line-height: 1.1; margin-top: 1px;">${token}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // C. Patient Details Box (boxes.partyDetails)
    let patientHtml = "";
    if (boxes.partyDetails?.enabled) {
        const pf = boxes.partyDetails.fields || {};
        const ptName = pf.fullName?.value || normalizedData.patient.fullName;
        const mrnVal = pf.uhid?.value || normalizedData.patient.uhid;
        const ageGender = pf.ageGender?.value || normalizedData.patient.ageGender;

        patientHtml = `
            <div style="border-bottom: 1px dashed #000000; padding-bottom: 4px; margin-bottom: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
                    <span style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 0.04em;">${boxes.partyDetails.title || 'PATIENT DETAILS'}</span>
                    ${pf.uhid?.enabled !== false && mrnVal ? `<span style="font-size: 11px; font-weight: 900; font-family: monospace; color: #000000;">MRN: <b>${mrnVal}</b></span>` : ''}
                </div>
                <div style="font-size: 10.5px; line-height: 1.3; color: #000000;">
                    <div style="font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.02em; color: #000000; margin-bottom: 2px;">
                        ${ptName}
                    </div>
                    <div style="font-weight: 700; margin-top: 1px;">
                        ${pf.ageGender?.enabled !== false ? `<span>Age/Sex: <b>${ageGender}</b></span>` : ''}
                    </div>
                    ${doctorName ? `
                        <div style="font-weight: 700; margin-top: 1px; line-height: 1.25; word-break: break-word;">
                            Ref: <b style="font-weight: 900;">${doctorName}</b>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // C2. Biller / Desk Audit Details Box (boxes.billerDetails)
    let billerHtml = "";
    if (boxes.billerDetails?.enabled && !isPrepaid) {
        const bf = boxes.billerDetails.fields || {};
        const billedByVal = bf.billedBy?.value || billerDisplay;
        const discountReasonVal = bf.discountReason?.value || discountReason;

        billerHtml = `
            <div style="border-bottom: 1px dashed #000000; padding-bottom: 4px; margin-bottom: 5px;">
                <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 0.04em; margin-bottom: 2px;">
                    ${boxes.billerDetails.title || 'BILLING DESK'}
                </div>
                <div style="font-size: 10px; line-height: 1.35; color: #000000;">
                    <div>Billed by: <b style="font-weight: 900;">${billedByVal}</b></div>
                    ${discountReasonVal ? `<div style="margin-top: 1px;">discount: <b style="font-weight: 900;">${discountReasonVal}</b></div>` : ''}
                </div>
            </div>
        `;
    }

    // D. Items Table Box (boxes.itemsTable)
    let itemsTableHtml = "";
    if (boxes.itemsTable?.enabled) {
        const rows = boxes.itemsTable.rows || [];
        itemsTableHtml = `
            <div style="border-bottom: 1px dashed #000000; padding-bottom: 4px; margin-bottom: 5px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: left; color: #000000; table-layout: fixed;">
                    <thead>
                        <tr style="border-bottom: 1.5px solid #000000; font-size: 9.5px; font-weight: 900; text-transform: uppercase;">
                            <th style="padding: 2px 1px; width: 14px; text-align: center;">#</th>
                            <th style="padding: 2px 2px; width: calc(100% - 80px);">TEST ITEM</th>
                            <th style="padding: 2px 1px; text-align: right; width: 66px;">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((r, idx) => `
                            <tr style="border-bottom: 1px dotted #000000;">
                                <td style="padding: 3px 1px; text-align: center; font-weight: 700; vertical-align: top;">${idx + 1}</td>
                                <td style="padding: 3px 2px; font-weight: 800; word-break: break-word; line-height: 1.25; vertical-align: top;">${r.description || r.testName || 'Test'}</td>
                                <td style="padding: 3px 1px; text-align: right; font-family: monospace; font-weight: 900; white-space: nowrap; vertical-align: top;">${formatInr(r.amount || r.price || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // E. Financial Summary Box (boxes.financialSummary)
    let finHtml = "";
    if (boxes.financialSummary?.enabled) {
        const ff = boxes.financialSummary.fields || {};
        const grossVal = ff.grossAmount?.value || formatInr(grossSubtotal);
        const discVal = ff.discountAmount?.value || (discountAmount > 0 ? `- ₹${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${discountReason ? `(${discountReason})` : ''}`.trim() : '');
        const grandTotal = ff.totalAmount?.value || formatInr(normalizedData.financial.totalAmount);
        const totalPaidStr = ff.totalPaid?.value || formatInr(normalizedData.financial.totalPaid);
        const balanceDueStr = ff.balanceDue?.value || formatInr(normalizedData.financial.balanceDue);

        finHtml = `
            <div style="border-bottom: 1.5px solid #000000; padding-bottom: 4px; margin-bottom: 5px; font-size: 11px; color: #000000;">
                ${discountAmount > 0 && ff.grossAmount?.enabled !== false ? `
                    <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 10px; margin-bottom: 2px;">
                        <span>Gross Subtotal:</span>
                        <span style="font-family: monospace; text-align: right;">${grossVal}</span>
                    </div>
                ` : ''}
                ${discountAmount > 0 && ff.discountAmount?.enabled !== false ? `
                    <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 10px; margin-bottom: 2px;">
                        <span>Discount:</span>
                        <span style="font-family: monospace; text-align: right;">${discVal}</span>
                    </div>
                ` : ''}
                ${ff.totalAmount?.enabled !== false ? `
                    <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 13.5px; border-bottom: 1px dashed #000000; padding-bottom: 2px; margin-bottom: 2px; ${discountAmount > 0 ? 'border-top: 1px dashed #000000; padding-top: 2px;' : ''}">
                        <span>GRAND TOTAL:</span>
                        <span style="font-family: monospace; text-align: right;">${grandTotal}</span>
                    </div>
                ` : ''}
                ${ff.totalPaid?.enabled !== false ? `
                    <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 10.5px; margin-bottom: 1px;">
                        <span>Amount Received:</span>
                        <span style="font-family: monospace; text-align: right;">${totalPaidStr}</span>
                    </div>
                ` : ''}
                ${ff.balanceDue?.enabled !== false ? `
                    <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 11px; ${normalizedData.financial.balanceDue > 0 ? 'font-size: 12px;' : ''}">
                        <span>${normalizedData.financial.balanceDue > 0 ? '*** BALANCE DUE ***:' : 'Balance Due:'}</span>
                        <span style="font-family: monospace; text-align: right;">${balanceDueStr}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // F. Instant Payment QR Box (boxes.bankAndUpi)
    let upiQrHtml = "";
    if (boxes.bankAndUpi?.enabled && boxes.bankAndUpi.fields?.showQr?.enabled !== false) {
        const upiId = boxes.bankAndUpi.fields?.upiId?.value || labSettings.upiId || 'synoslab@hdfcbank';
        const labLegal = boxes.header?.fields?.legalName?.value || labSettings.labTradeName || 'SynOS Lab';
        const netAmt = normalizedData.financial.balanceDue > 0 ? normalizedData.financial.balanceDue : normalizedData.financial.totalAmount;
        const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(labLegal)}&am=${encodeURIComponent(netAmt.toFixed(2))}&cu=INR`;
        
        const effectiveQrImage = boxes.bankAndUpi.customQrImage 
            || labSettings.customQrImage 
            || (typeof window !== 'undefined' ? window.localStorage?.getItem('synos_custom_qr_image') : "");

        const qrRenderHtml = effectiveQrImage 
            ? `<img src="${effectiveQrImage}" style="max-height: 68px; max-width: 68px; object-fit: contain; filter: grayscale(100%) contrast(200%); image-rendering: pixelated;" alt="UPI QR" />`
            : renderQrSvgSync(upiUrl, 68);

        const qrTitle = boxes.bankAndUpi.title || "SCAN QR TO PAY";
        const qrSubtitle = boxes.bankAndUpi.subtitle || "Instant Bharat UPI";

        upiQrHtml = `
            <div style="border: 1px dashed #000000; padding: 4px; margin-bottom: 5px; text-align: center;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                    ${qrRenderHtml}
                    <div style="text-align: left; color: #000000;">
                        <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.03em;">${qrTitle}</div>
                        <div style="font-size: 8.5px; font-family: monospace; font-weight: 700; margin-top: 1px; word-break: break-all;">${upiId}</div>
                        <div style="font-size: 8px; font-weight: 700; margin-top: 1px;">${qrSubtitle}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // G. Terms & System Note (boxes.termsAndConditions)
    let termsHtml = "";
    if (boxes.termsAndConditions?.enabled) {
        termsHtml = `
            <div style="text-align: center; margin-top: 3px; font-size: 9px; font-weight: 700; color: #000000; line-height: 1.25;">
                ${boxes.termsAndConditions.text ? `<div style="white-space: pre-line;">${boxes.termsAndConditions.text}</div>` : ''}
                ${boxes.termsAndConditions.systemNote ? `<div style="font-size: 8.5px; font-weight: 800; margin-top: 2px; letter-spacing: 0.02em;">${boxes.termsAndConditions.systemNote}</div>` : ''}
            </div>
        `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Cash-Slip</title>
    <style>
        @page {
            size: 80mm auto;
            margin: 0mm !important;
        }
        @media print {
            @page {
                size: 80mm auto;
                margin: 0mm !important;
            }
            html, body {
                width: 70mm !important;
                max-width: 70mm !important;
                margin: 0 auto !important;
                padding: 1mm 2mm !important;
                color: #000000 !important;
                background: #ffffff !important;
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box !important;
            }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
            margin: 0 auto;
            padding: 1mm 2mm;
            width: 70mm;
            max-width: 70mm;
            color: #000000;
            font-size: 10.5px;
            line-height: 1.3;
            background: #ffffff;
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
        }
    </style>
</head>
<body>
    ${headerHtml}
    ${badgeHtml}
    ${patientHtml}
    ${billerHtml}
    ${itemsTableHtml}
    ${finHtml}
    ${upiQrHtml}
    ${termsHtml}
</body>
</html>
    `;
}

/**
 * Dedicated 80mm POS slip for Prepaid / Corporate B2B Partner Visits.
 * Zero pricing disclosed: displays Token, Patient, Sponsor/Partner info, and Investigation items only.
 */
export function generateThermalPrepaidSlipHtml(payload = {}) {
    const token = payload.token || payload.Token || payload.visitToken || '';
    const patientObj = payload.patient || payload.Patient || {};
    const patientName = patientObj.name || patientObj.fullName || payload.patientName || payload.PatientName || 'Patient';
    const patientUhid = patientObj.uhid || patientObj.mrn || payload.mrn || payload.Mrn || 'SYN-2026-0001';
    const patientAge = patientObj.age || payload.age || payload.Age || '';
    const patientGender = patientObj.gender || patientObj.sex || payload.gender || payload.Gender || 'M';
    const billingObj = payload.billing || payload.Billing || payload.financial || {};
    const ordersList = payload.orders || payload.Orders || payload.items || [];
    const doctorName = payload.referringDoctorName || payload.ReferringDoctorName || billingObj?.referral?.partner?.displayName || '';
    const sponsorName = payload.sponsorName || payload.partnerName || billingObj?.referral?.partner?.displayName || billingObj?.referral?.partner?.name || doctorName || 'B2B Referral Partner';
    const labName = payload.labName || payload.LabName || '';
    const branchObj = payload.branch || payload.Branch || {};
    const customLayout = payload.customLayout;

    let schema = customLayout || DEFAULT_DOCUMENT_SCHEMAS['patient_thermal_prepaid_slip'];
    let labSettings = {
        labLegalName: "SRI DIVYA DIAGNOSTIC CENTRE",
        labTradeName: "AN ISO 9001:2015 CERTIFIED DIAGNOSTIC CENTRE",
        address: "Wyra Road, Khammam | Ph: 9876543210",
        phone: "+91 98765 43210"
    };

    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            if (!customLayout) {
                const studioSaved = window.localStorage.getItem('synos_document_layout_patient_thermal_prepaid_slip');
                if (studioSaved) {
                    schema = JSON.parse(studioSaved);
                }
            }
            const settingsSaved = window.localStorage.getItem('synos_stationery_settings');
            if (settingsSaved) {
                labSettings = { ...labSettings, ...JSON.parse(settingsSaved) };
            }
            if (window.__synos_stationery_settings) {
                labSettings = { ...labSettings, ...window.__synos_stationery_settings };
            }
            const cachedLogo = window.localStorage.getItem('synos_lab_logo');
            if (cachedLogo && !labSettings.logoUrl) {
                labSettings.logoUrl = cachedLogo;
            }
            const cachedQr = window.localStorage.getItem('synos_custom_qr_image');
            if (cachedQr && !labSettings.customQrImage) {
                labSettings.customQrImage = cachedQr;
            }
        } catch (e) {
            console.warn("Could not load stored prepaid thermal schema/settings", e);
        }
    }

    if (branchObj?.name) labSettings.branchName = branchObj.name;
    if (branchObj?.address) labSettings.address = branchObj.address;
    if (branchObj?.phone) labSettings.phone = branchObj.phone;

    const billerObj = payload.biller || billingObj.biller || payload.visit?.biller || {};
    const billerDisplay = payload.billerName 
        || (typeof payload.biller === 'string' ? payload.biller : '')
        || (billerObj.billedBy || (billerObj.fullName ? `${billerObj.fullName}${billerObj.username ? ` (${billerObj.username})` : ''}` : ''))
        || billingObj.billedBy 
        || payload.visit?.billedBy 
        || payload.billedBy 
        || "Staff Desk";

    const allItems = ordersList.map((it, idx) => ({
        id: `r-${idx}`,
        index: idx + 1,
        testName: it.testName || it.name || it.testCode || 'Diagnostic Test'
    }));

    const normalizedData = {
        receiptNumber: payload.receiptNumber || (token ? `SLIP-${token}` : `SLIP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`),
        dateTime: payload.dateTime || new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
        token: token || "WAIT",
        patient: {
            name: patientName,
            fullName: patientName,
            uhid: patientUhid,
            ageGender: `${patientAge ? `${patientAge}Y` : ''} / ${patientGender}`.trim(),
            phone: patientObj.phone || patientObj.mobile || ""
        },
        biller: {
            billedBy: billerDisplay
        },
        referringDoctorName: doctorName,
        partnerName: sponsorName,
        items: allItems,
        orders: allItems
    };

    const hydrated = hydrateDocumentSchema('patient_thermal_prepaid_slip', schema, normalizedData, labSettings);
    const { boxes } = hydrated;

    // A. Brand Header
    let headerHtml = "";
    if (boxes.header?.enabled) {
        const hf = boxes.header.fields || {};
        const legalName = labSettings.labLegalName || labSettings.legalName || hf.legalName?.value || "SRI DIVYA DIAGNOSTIC CENTRE";
        const rawTagline = labSettings.labTradeName || labSettings.tagline || hf.tagline?.value || "";
        const tagline = (rawTagline && rawTagline.trim().toLowerCase() !== legalName.trim().toLowerCase()) ? rawTagline : "";
        const address = labSettings.address || hf.address?.value || "Wyra Road, Khammam | Ph: 9876543210";
        const gstin = labSettings.gstin || hf.gstin?.value || "";
        const phone = labSettings.phone || hf.phone?.value || "";
        const effectiveLogo = labSettings.logoUrl || (typeof window !== 'undefined' ? window.localStorage?.getItem('synos_lab_logo') : "");

        headerHtml = `
            <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 5px; margin-bottom: 5px;">
                ${effectiveLogo ? `
                    <div style="margin-bottom: 3px; display: flex; justify-content: center;">
                        <img src="${effectiveLogo}" style="max-height: 44px; max-width: 140px; object-fit: contain; filter: grayscale(100%) contrast(200%);" alt="Logo" />
                    </div>
                ` : ''}
                ${hf.legalName?.enabled !== false ? `<div style="font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.02em; color: #000000; line-height: 1.2;">${legalName}</div>` : ''}
                ${hf.tagline?.enabled !== false && tagline ? `<div style="font-size: 9.5px; font-weight: 700; color: #000000; text-transform: uppercase; margin-top: 2px; letter-spacing: 0.02em;">${tagline}</div>` : ''}
                ${hf.address?.enabled !== false && address ? `<div style="font-size: 9.5px; font-weight: 600; color: #000000; margin-top: 2px; line-height: 1.25;">${address}</div>` : ''}
                <div style="font-size: 9.5px; font-weight: 800; color: #000000; margin-top: 2px;">
                    ${hf.gstin?.enabled !== false && gstin ? `GSTIN: <span style="font-family: monospace;">${gstin}</span>` : ''}
                    ${phone ? ` | Ph: ${phone}` : ''}
                </div>
            </div>
        `;
    }

    // B. Document Badge & Token
    let badgeHtml = "";
    if (boxes.docBadge?.enabled) {
        const df = boxes.docBadge.fields || {};
        const title = df.badgeTitle?.value || "PREPAID PATIENT SLIP";
        const dateVal = df.date?.value || normalizedData.dateTime;
        const slipNo = df.receiptNumber?.value || normalizedData.receiptNumber;

        badgeHtml = `
            <div style="text-align: center; margin-bottom: 5px; border-bottom: 1.5px solid #000000; padding-bottom: 5px;">
                ${df.badgeTitle?.enabled !== false ? `
                    <div style="margin-bottom: 4px;">
                        <span style="background: #000000; color: #ffffff; padding: 2px 10px; border-radius: 2px; font-weight: 900; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; display: inline-block;">
                            ${title}
                        </span>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 700; color: #000000; padding: 0 1px;">
                    ${df.date?.enabled !== false ? `<span>Date: <b>${dateVal}</b></span>` : ''}
                    ${df.receiptNumber?.enabled !== false ? `<span>Slip: <b style="font-family: monospace;">${slipNo}</b></span>` : ''}
                </div>
                ${token && df.tokenNumber?.enabled !== false ? `
                    <div style="margin-top: 5px; padding: 3px 6px; border: 2px solid #000000; text-align: center; background: #ffffff;">
                        <span style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 0.05em;">Token Number</span>
                        <div style="font-size: 24px; font-weight: 900; font-family: monospace; color: #000000; line-height: 1.1; margin-top: 1px;">${token}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // C. Patient & Sponsor Details (NO PRICES)
    let patientHtml = "";
    if (boxes.partyDetails?.enabled) {
        const pf = boxes.partyDetails.fields || {};
        const ptName = pf.fullName?.value || normalizedData.patient.fullName;
        const mrnVal = pf.uhid?.value || normalizedData.patient.uhid;
        const ageGender = pf.ageGender?.value || normalizedData.patient.ageGender;
        const isBilledDoctorSlip = schema.slotId === 'patient_thermal_prepaid_billed_doctor';
        const billedToDoc = pf.billedToDoctor?.value || payload.billedToDoctorName || sponsorName;
        const refDoc = pf.referringDoctor?.value || payload.prescribingDoctorName || doctorName;

        patientHtml = `
            <div style="border-bottom: 1px dashed #000000; padding-bottom: 4px; margin-bottom: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
                    <span style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 0.04em;">PATIENT</span>
                    ${pf.uhid?.enabled !== false && mrnVal ? `<span style="font-size: 11px; font-weight: 900; font-family: monospace; color: #000000;">MRN: <b>${mrnVal}</b></span>` : ''}
                </div>
                <div style="font-size: 10.5px; line-height: 1.3; color: #000000;">
                    <div style="font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.02em; color: #000000; margin-bottom: 2px;">
                        ${ptName}
                    </div>
                    <div style="font-weight: 700; margin-top: 1px;">
                        ${pf.ageGender?.enabled !== false ? `<span>Age/Sex: <b>${ageGender}</b></span>` : ''}
                    </div>
                    ${isBilledDoctorSlip ? `
                        ${pf.billedToDoctor?.enabled !== false && billedToDoc ? `
                            <div style="font-weight: 700; margin-top: 1px; line-height: 1.25; word-break: break-word;">
                                Billed To Doctor: <b style="font-weight: 900;">${billedToDoc}</b>
                            </div>
                        ` : ''}
                        ${pf.referringDoctor?.enabled !== false && refDoc ? `
                            <div style="font-weight: 700; margin-top: 1px; line-height: 1.25; word-break: break-word;">
                                Prescribing Doctor: <b style="font-weight: 900;">${refDoc}</b>
                            </div>
                        ` : ''}
                    ` : `
                        ${pf.referringDoctor?.enabled !== false && refDoc ? `
                            <div style="font-weight: 700; margin-top: 1px; line-height: 1.25; word-break: break-word;">
                                Ref Doctor: <b style="font-weight: 900;">${refDoc}</b>
                            </div>
                        ` : ''}
                    `}
                </div>
            </div>
        `;
    }

    // C2. Biller / Desk Audit Details Box (NO DISCOUNT DISCLOSED ON PREPAID)
    let billerHtml = "";
    if (boxes.billerDetails?.enabled !== false) {
        const bf = boxes.billerDetails?.fields || {};
        const billedByVal = bf.billedBy?.value || billerDisplay;

        billerHtml = `
            <div style="border-bottom: 1px dashed #000000; padding-bottom: 4px; margin-bottom: 5px;">
                <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 0.04em; margin-bottom: 2px;">
                    ${boxes.billerDetails?.title || 'BILLING DESK'}
                </div>
                <div style="font-size: 10px; line-height: 1.35; color: #000000;">
                    <div>Billed by: <b style="font-weight: 900;">${billedByVal}</b></div>
                </div>
            </div>
        `;
    }

    // D. Investigation Items Table (NO AMOUNT COLUMN)
    let itemsTableHtml = "";
    if (boxes.itemsTable?.enabled) {
        const rows = boxes.itemsTable.rows || [];
        itemsTableHtml = `
            <div style="border-bottom: 1px dashed #000000; padding-bottom: 4px; margin-bottom: 5px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: left; color: #000000; table-layout: fixed;">
                    <thead>
                        <tr style="border-bottom: 1.5px solid #000000; font-size: 9.5px; font-weight: 900; text-transform: uppercase;">
                            <th style="padding: 2px 1px; width: 16px; text-align: center;">#</th>
                            <th style="padding: 2px 2px; width: calc(100% - 16px);">INVESTIGATION / TEST ITEM</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((r, idx) => `
                            <tr style="border-bottom: 1px dotted #000000;">
                                <td style="padding: 3px 1px; text-align: center; font-weight: 700; vertical-align: top;">${idx + 1}</td>
                                <td style="padding: 3px 2px; font-weight: 800; word-break: break-word; line-height: 1.25; vertical-align: top;">${r.description || r.testName || 'Test'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // E. Prepaid Account Notice Banner (ZERO COUNTER PAYMENT)
    let prepaidNoticeHtml = "";
    if (boxes.financialSummary?.enabled !== false) {
        const ff = boxes.financialSummary?.fields || {};
        const title = boxes.financialSummary?.title || "BILLED TO REFERRAL PARTNER ACCOUNT";
        const counterPayable = ff.counterPayable?.value || "Amount Payable at Counter: ₹0.00 (Prepaid)";

        prepaidNoticeHtml = `
            <div style="border: 1.5px solid #000000; padding: 4px; margin-bottom: 5px; text-align: center; background: #ffffff;">
                <div style="font-size: 10px; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase;">${title}</div>
                <div style="font-size: 9.5px; font-weight: 800; margin-top: 1px;">${counterPayable}</div>
            </div>
        `;
    }

    // F. Terms & Instructions
    let termsHtml = "";
    if (boxes.termsAndConditions?.enabled) {
        termsHtml = `
            <div style="text-align: center; margin-top: 3px; font-size: 9px; font-weight: 700; color: #000000; line-height: 1.25;">
                ${boxes.termsAndConditions.text ? `<div style="white-space: pre-line;">${boxes.termsAndConditions.text}</div>` : ''}
                ${boxes.termsAndConditions.systemNote ? `<div style="font-size: 8.5px; font-weight: 800; margin-top: 2px; letter-spacing: 0.02em;">${boxes.termsAndConditions.systemNote}</div>` : ''}
            </div>
        `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Prepaid-Slip</title>
    <style>
        @page {
            size: 80mm auto;
            margin: 0mm !important;
        }
        @media print {
            @page {
                size: 80mm auto;
                margin: 0mm !important;
            }
            html, body {
                width: 70mm !important;
                max-width: 70mm !important;
                margin: 0 auto !important;
                padding: 1mm 2mm !important;
                color: #000000 !important;
                background: #ffffff !important;
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box !important;
            }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
            margin: 0 auto;
            padding: 1mm 2mm;
            width: 70mm;
            max-width: 70mm;
            color: #000000;
            font-size: 10.5px;
            line-height: 1.3;
            background: #ffffff;
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
        }
    </style>
</head>
<body>
    ${headerHtml}
    ${badgeHtml}
    ${patientHtml}
    ${billerHtml}
    ${itemsTableHtml}
    ${prepaidNoticeHtml}
    ${termsHtml}
</body>
</html>
    `;
}

/**
 * Generates an 80mm thermal cashless insurance slip HTML formatted string.
 */
export function generateThermalInsuranceReceiptHtml(payload = {}) {
    const token = payload.token || payload.Token || payload.visitToken || '';
    const patientObj = payload.patient || payload.Patient || {};
    const patientName = patientObj.name || patientObj.fullName || payload.patientName || payload.PatientName || 'Patient';
    const patientUhid = patientObj.uhid || patientObj.mrn || payload.mrn || payload.Mrn || 'SYN-2026-0001';
    const patientAge = patientObj.age || payload.age || payload.Age || '';
    const patientGender = patientObj.gender || patientObj.sex || payload.gender || payload.Gender || 'M';
    const billingObj = payload.billing || payload.Billing || payload.financial || {};
    const ordersList = payload.orders || payload.Orders || payload.items || [];
    const labName = payload.labName || payload.LabName || '';
    const branchObj = payload.branch || payload.Branch || {};
    const customLayout = payload.customLayout;

    let schema = customLayout || DEFAULT_DOCUMENT_SCHEMAS['insurance_thermal_receipt'];
    let labSettings = {};

    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            if (!customLayout) {
                const studioSaved = window.localStorage.getItem('synos_document_layout_insurance_thermal_receipt');
                if (studioSaved) {
                    schema = JSON.parse(studioSaved);
                }
            }
            const settingsSaved = window.localStorage.getItem('synos_stationery_settings');
            if (settingsSaved) {
                labSettings = JSON.parse(settingsSaved);
            }
            const cachedLogo = window.localStorage.getItem('synos_lab_logo');
            if (cachedLogo && !labSettings.logoUrl) {
                labSettings.logoUrl = cachedLogo;
            }
            const cachedQr = window.localStorage.getItem('synos_custom_qr_image');
            if (cachedQr && !labSettings.customQrImage) {
                labSettings.customQrImage = cachedQr;
            }
        } catch (e) {
            console.warn("Could not load stored insurance thermal schema/settings", e);
        }
    }

    if (labName) labSettings.labTradeName = labName;
    if (branchObj?.name) labSettings.branchName = branchObj.name;
    if (branchObj?.address) labSettings.address = branchObj.address;
    if (branchObj?.phone) labSettings.phone = branchObj.phone;

    const billerObj = payload.biller || billingObj.biller || payload.visit?.biller || {};
    const billerDisplay = payload.billerName 
        || (typeof payload.biller === 'string' ? payload.biller : '')
        || (billerObj.billedBy || (billerObj.fullName ? `${billerObj.fullName}${billerObj.username ? ` (${billerObj.username})` : ''}` : ''))
        || billingObj.billedBy 
        || payload.visit?.billedBy 
        || payload.billedBy 
        || "Staff Desk";

    const insObj = payload.insurance || payload.billingContext || billingObj.insurance || {};
    const insCompany = insObj.insuranceCompanyName || insObj.insuranceCompany || payload.insuranceCompany || 'Cashless Insurance Provider';
    const insTpa = insObj.insuranceTpaName || insObj.tpaName || payload.tpaName || 'TPA Desk';
    const policyNo = insObj.policyNumber || payload.policyNumber || 'N/A';
    const preAuthNo = insObj.preAuthApprovalNumber || payload.preAuthApprovalNumber || payload.preAuthNumber || 'N/A';

    const allItems = ordersList.map((it, idx) => ({
        id: `r-${idx}`,
        index: idx + 1,
        testName: it.testName || it.name || it.description || it.packageName || 'Investigation / Package',
        price: Number(it.price || it.amount || 0)
    }));

    const gross = Number(billingObj.grossSubtotal || billingObj.grossAmount || payload.grossAmount || payload.totalAmount || allItems.reduce((s, x) => s + x.price, 0));
    const coPay = Number(billingObj.coPayAmount || payload.coPayAmount || 0);
    const netTpa = Number(billingObj.netClaimApproved || (gross - coPay));
    const balanceDue = Number(billingObj.balanceDue !== undefined ? billingObj.balanceDue : 0);

    const normalizedData = {
        receiptNumber: payload.receiptNumber || (token ? `CLM-${token}` : `CLM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`),
        dateTime: payload.dateTime || new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
        token: token || "WAIT",
        claimStatus: payload.claimStatus || "APPROVED / PRE-AUTH",
        patient: {
            name: patientName,
            fullName: patientName,
            uhid: patientUhid,
            ageGender: `${patientAge ? `${patientAge}Y` : ''} / ${patientGender}`.trim(),
            phone: patientObj.phone || patientObj.mobile || ""
        },
        insurance: {
            insuranceCompanyName: insCompany,
            insuranceTpaName: insTpa,
            policyNumber: policyNo,
            preAuthApprovalNumber: preAuthNo
        },
        biller: {
            billedBy: billerDisplay
        },
        items: allItems,
        orders: allItems,
        financial: {
            grossSubtotal: gross,
            coPayAmount: coPay,
            netClaimApproved: netTpa,
            balanceDue: balanceDue
        }
    };

    const hydrated = hydrateDocumentSchema('insurance_thermal_receipt', schema, normalizedData, labSettings);
    const { boxes } = hydrated;

    // A. Brand Header
    let headerHtml = "";
    if (boxes.header?.enabled) {
        const hf = boxes.header.fields || {};
        headerHtml = `
            <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 5px; margin-bottom: 5px;">
                ${labSettings.logoUrl ? `<img src="${labSettings.logoUrl}" style="max-height: 40px; max-width: 140px; margin: 0 auto 3px auto; display: block; object-fit: contain;" alt="Logo" />` : ''}
                <div style="font-size: 15px; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; color: #000000; line-height: 1.15;">
                    ${hf.legalName?.value || labSettings.labTradeName || 'SYNOS DIAGNOSTICS'}
                </div>
                ${hf.tagline?.enabled && hf.tagline.value ? `
                    <div style="font-size: 8.5px; font-weight: 700; text-transform: uppercase; color: #000000; letter-spacing: 0.05em; margin-top: 1px;">
                        ${hf.tagline.value}
                    </div>
                ` : ''}
                ${hf.address?.enabled && hf.address.value ? `
                    <div style="font-size: 8px; font-weight: 600; line-height: 1.25; color: #000000; margin-top: 2px;">
                        ${hf.address.value}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // B. Claim Particulars Badge
    let badgeHtml = "";
    if (boxes.docBadge?.enabled) {
        const bf = boxes.docBadge.fields || {};
        badgeHtml = `
            <div style="border-bottom: 1px dashed #000000; padding-bottom: 4px; margin-bottom: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.03em; color: #000000;">
                        ${bf.badgeTitle?.value || 'CASHLESS TPA CLAIM SLIP'}
                    </span>
                    <span style="font-size: 8.5px; font-weight: 800; border: 1px solid #000000; padding: 1px 3px; border-radius: 2px;">
                        ${bf.claimStatus?.value || 'APPROVED'}
                    </span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #000000; margin-top: 2px; font-family: monospace;">
                    <span>Claim: <b>${bf.receiptNumber?.value || normalizedData.receiptNumber}</b></span>
                    <span>${bf.date?.value || normalizedData.dateTime}</span>
                </div>
                ${token ? `
                    <div style="margin-top: 3px; text-align: center; border: 1.5px dashed #000000; padding: 3px 0; background-color: #f7f7f7;">
                        <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 0.05em;">Token Number</span>
                        <div style="font-size: 24px; font-weight: 900; font-family: monospace; color: #000000; line-height: 1.1; margin-top: 1px;">${token}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // C. Patient & Insurance Details
    let patientHtml = "";
    if (boxes.partyDetails?.enabled) {
        const pf = boxes.partyDetails.fields || {};
        const ptName = pf.fullName?.value || patientName;
        const mrnVal = pf.uhid?.value || patientUhid;
        patientHtml = `
            <div style="border-bottom: 1px dashed #000000; padding-bottom: 4px; margin-bottom: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
                    <span style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 0.04em;">PATIENT & INSURANCE INFO</span>
                    ${mrnVal ? `<span style="font-size: 11px; font-weight: 900; font-family: monospace; color: #000000;">MRN: <b>${mrnVal}</b></span>` : ''}
                </div>
                <div style="font-size: 10px; line-height: 1.3; color: #000000;">
                    <div style="font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.02em; color: #000000; margin-bottom: 2px;">
                        ${ptName}
                    </div>
                    <div style="font-weight: 700; margin-top: 1px;">
                        <span>Age/Sex: <b>${pf.ageGender?.value || normalizedData.patient.ageGender}</b></span>
                    </div>
                    <div style="font-weight: 700; margin-top: 1px;">
                        Ins Co: <b>${pf.insuranceProvider?.value || insCompany}</b>
                    </div>
                    <div style="font-weight: 700; margin-top: 1px;">
                        TPA: <b>${pf.tpaName?.value || insTpa}</b>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 700; margin-top: 1px;">
                        <span>Policy: <b>${pf.policyNumber?.value || policyNo}</b></span>
                        <span>Pre-Auth: <b>${pf.preAuthApprovalNumber?.value || preAuthNo}</b></span>
                    </div>
                </div>
            </div>
        `;
    }

    // C2. Biller Desk Box
    let billerHtml = "";
    if (boxes.billerDetails?.enabled !== false) {
        const bf = boxes.billerDetails?.fields || {};
        billerHtml = `
            <div style="border-bottom: 1px dashed #000000; padding-bottom: 4px; margin-bottom: 5px;">
                <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 0.04em; margin-bottom: 2px;">
                    ${boxes.billerDetails?.title || 'BILLING DESK'}
                </div>
                <div style="font-size: 10px; line-height: 1.35; color: #000000;">
                    <div>Billed by: <b style="font-weight: 900;">${bf.billedBy?.value || billerDisplay}</b></div>
                </div>
            </div>
        `;
    }

    // D. Approved Items & Health Packages Table
    let itemsTableHtml = "";
    if (boxes.itemsTable?.enabled) {
        const rows = boxes.itemsTable.rows || [];
        itemsTableHtml = `
            <div style="border-bottom: 1px solid #000000; padding-bottom: 4px; margin-bottom: 5px;">
                <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 0.04em; margin-bottom: 3px;">
                    APPROVED TESTS & PACKAGES
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; line-height: 1.25;">
                    <thead>
                        <tr style="border-bottom: 1px solid #000000; border-top: 1px solid #000000; font-weight: 900;">
                            <th style="text-align: left; padding: 2px 0; width: 12px;">#</th>
                            <th style="text-align: left; padding: 2px 4px;">Investigation / Package</th>
                            <th style="text-align: right; padding: 2px 0; width: 50px;">Tariff</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((r, i) => `
                            <tr style="border-bottom: 1px dotted #cccccc;">
                                <td style="padding: 2.5px 0; vertical-align: top; font-weight: 700;">${r.index || (i + 1)}</td>
                                <td style="padding: 2.5px 4px; vertical-align: top; font-weight: 800; word-break: break-word;">${r.description || r.testName}</td>
                                <td style="padding: 2.5px 0; vertical-align: top; text-align: right; font-weight: 800; font-family: monospace;">${formatInr(r.price || r.amount || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // E. Financial Summary
    let financialHtml = "";
    if (boxes.financialSummary?.enabled) {
        const ff = boxes.financialSummary.fields || {};
        financialHtml = `
            <div style="border-bottom: 1px dashed #000000; padding-bottom: 4px; margin-bottom: 5px; font-size: 10px; line-height: 1.35;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Total Tariff:</span>
                    <span style="font-weight: 800; font-family: monospace;">${ff.grossAmount?.value || formatInr(gross)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Patient Co-Pay:</span>
                    <span style="font-weight: 800; font-family: monospace;">${ff.coPayAmount?.value || formatInr(coPay)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 11px; margin-top: 2px; border-top: 1px dotted #000000; padding-top: 2px;">
                    <span>Approved TPA Claim:</span>
                    <span style="font-family: monospace;">${ff.totalAmount?.value || formatInr(netTpa)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 10.5px; margin-top: 1px;">
                    <span>Patient Desk Due:</span>
                    <span style="font-family: monospace;">${ff.balanceDue?.value || formatInr(balanceDue)}</span>
                </div>
            </div>
        `;
    }

    // F. Notice & Terms
    let termsHtml = "";
    if (boxes.termsAndConditions?.enabled) {
        const text = boxes.termsAndConditions.text || '';
        termsHtml = `
            <div style="text-align: center; font-size: 8px; color: #000000; line-height: 1.25; padding-top: 2px;">
                ${text.split('\n').filter(Boolean).map(line => `<div>${line}</div>`).join('')}
                <div style="margin-top: 3px; font-weight: 700; text-transform: uppercase;">
                    ${boxes.termsAndConditions.systemNote || 'Thank You • SynOS Diagnostic OS'}
                </div>
            </div>
        `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Insurance-Cashless-Slip</title>
    <style>
        @page {
            size: 80mm auto;
            margin: 0mm !important;
        }
        @media print {
            @page {
                size: 80mm auto;
                margin: 0mm !important;
            }
            html, body {
                width: 70mm !important;
                max-width: 70mm !important;
                margin: 0 auto !important;
                padding: 1mm 2mm !important;
                color: #000000 !important;
                background: #ffffff !important;
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box !important;
            }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
            margin: 0 auto;
            padding: 1mm 2mm;
            width: 70mm;
            max-width: 70mm;
            color: #000000;
            font-size: 10.5px;
            line-height: 1.3;
            background: #ffffff;
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
        }
    </style>
</head>
<body>
    ${headerHtml}
    ${badgeHtml}
    ${patientHtml}
    ${billerHtml}
    ${itemsTableHtml}
    ${financialHtml}
    ${termsHtml}
</body>
</html>
    `;
}

export function generateThermalSlipHtml(payload) {
    return generateThermalInvoiceHtml(payload);
}

/**
 * Attempts to print using the Electron wrapper. Fallbacks to browser native printing.
 */
export async function legacyTriggerPrint(htmlContent) {
    const configuredPrinter = typeof window !== 'undefined'
        ? (window.localStorage?.getItem('synos_receipt_printer_name') || '')
        : '';

    if (window.api && typeof window.api.printLabel === 'function') {
        const pageWidthMicrons = 70000; // 70mm safe printable width for 80mm roll
        const pageHeightMicrons = 200000;
        try {
            await window.api.printLabel({
                html: htmlContent,
                width: pageWidthMicrons,
                height: pageHeightMicrons,
                deviceName: configuredPrinter || undefined,
                printerName: configuredPrinter || undefined,
                silent: !!configuredPrinter
            });
            console.log("Successfully sent to Electron thermal printer:", configuredPrinter || "default");
            return;
        } catch (err) {
            console.warn("Electron printing failed, falling back to window.print", err);
        }
    }

    return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.style.opacity = '0.01';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(htmlContent);
        doc.close();

        let printed = false;
        const triggerPrint = () => {
            if (printed) return;
            printed = true;
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                console.warn("Direct iframe print call error:", err);
            }
            setTimeout(() => {
                try {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                } catch {}
                resolve();
            }, 800);
        };

        if (doc.readyState === 'complete') {
            setTimeout(triggerPrint, 100);
        } else {
            iframe.onload = triggerPrint;
            setTimeout(triggerPrint, 300);
        }
    });
}
