import { DEFAULT_DOCUMENT_SCHEMAS } from '../features/finance/components/documents/documentLayoutSchemas';
import { hydrateDocumentSchema } from '../features/finance/components/documents/schemaHydrator';

export function generateThermalInvoiceHtml(payload = {}) {
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
    let labSettings = {};

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
                labSettings = JSON.parse(settingsSaved);
            }
        } catch (e) {
            console.warn("Could not load stored thermal schema/settings", e);
        }
    }

    if (labName) labSettings.labTradeName = labName;
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
    const totalPaid = Number(billingObj.totalPaid || billingObj.amountPaid || 0);
    const totalAmount = Number(billingObj.netAmount || billingObj.totalAmount || grossSubtotal || 0);
    const dueVal = Number(billingObj.balanceDue ?? Math.max(0, totalAmount - totalPaid));

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
            totalAmount,
            totalPaid,
            balanceDue: dueVal
        }
    };

    // 3. Hydrate Schema
    const hydrated = hydrateDocumentSchema('patient_thermal_receipt', schema, normalizedData, labSettings);
    const { boxes } = hydrated;

    // A. Brand Header (boxes.header)
    let headerHtml = "";
    if (boxes.header?.enabled) {
        const hf = boxes.header.fields || {};
        const legalName = labSettings.legalName || labSettings.labTradeName || hf.legalName?.value || "SYNOS DIAGNOSTIC CENTRE";
        const tagline = labSettings.tagline || hf.tagline?.value || "AN ISO 9001:2015 CERTIFIED DIAGNOSTIC CENTRE";
        const address = labSettings.address || hf.address?.value || "";
        const gstin = labSettings.gstin || hf.gstin?.value || "";
        const phone = labSettings.phone || hf.phone?.value || "";

        headerHtml = `
            <div style="text-align: center; border-bottom: 2px solid #18181b; padding-bottom: 6px; margin-bottom: 8px;">
                ${hf.legalName?.enabled !== false ? `<div style="font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.03em; color: #09090b;">${legalName}</div>` : ''}
                ${hf.tagline?.enabled !== false && tagline ? `<div style="font-size: 8.5px; font-weight: 700; color: #52525b; text-transform: uppercase; margin-top: 2px; letter-spacing: 0.02em;">${tagline}</div>` : ''}
                ${hf.address?.enabled !== false && address ? `<div style="font-size: 8px; color: #71717a; margin-top: 2px; line-height: 1.25;">${address}</div>` : ''}
                <div style="font-size: 8px; font-weight: 700; color: #27272a; margin-top: 2px;">
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
        const title = df.badgeTitle?.value || "CASH PAYMENT RECEIPT";
        const dateVal = df.date?.value || normalizedData.dateTime;
        const receiptNo = df.receiptNumber?.value || normalizedData.receiptNumber;

        badgeHtml = `
            <div style="text-align: center; margin-bottom: 6px; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px;">
                ${df.badgeTitle?.enabled !== false ? `
                    <div style="margin-bottom: 4px;">
                        <span style="background: #18181b; color: #ffffff; padding: 2.5px 10px; border-radius: 4px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block;">
                            ${title}
                        </span>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; font-size: 8.5px; color: #52525b; padding: 0 1px;">
                    ${df.date?.enabled !== false ? `<span>Date/Time: <b>${dateVal}</b></span>` : ''}
                    ${df.receiptNumber?.enabled !== false ? `<span>Receipt: <b style="font-family: monospace;">${receiptNo}</b></span>` : ''}
                </div>
                ${token && df.tokenNumber?.enabled !== false ? `
                    <div style="margin-top: 6px; padding: 4px; background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 6px; text-align: center;">
                        <span style="font-size: 8px; font-weight: 700; text-transform: uppercase; color: #71717a; letter-spacing: 0.05em;">Token Number</span>
                        <div style="font-size: 18px; font-weight: 900; font-family: monospace; color: #18181b;">${token}</div>
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
        const uhid = pf.uhid?.value || normalizedData.patient.uhid;
        const ageGender = pf.ageGender?.value || normalizedData.patient.ageGender;

        patientHtml = `
            <div style="border: 1px solid #d4d4d8; border-radius: 6px; padding: 5px 7px; margin-bottom: 6px; background: #fafafa;">
                <div style="font-size: 7.5px; font-weight: 900; text-transform: uppercase; color: #71717a; letter-spacing: 0.05em; border-bottom: 1px solid #e4e4e7; padding-bottom: 2px; margin-bottom: 4px;">
                    ${boxes.partyDetails.title || 'PATIENT'}
                </div>
                <div style="font-size: 9.5px; line-height: 1.35;">
                    <div style="display: flex; justify-content: space-between;">
                        ${pf.fullName?.enabled !== false ? `<span>Patient Name: <b style="color: #09090b;">${ptName}</b></span>` : ''}
                        ${pf.uhid?.enabled !== false ? `<span style="font-family: monospace; font-size: 8.5px;">UHID: <b>${uhid}</b></span>` : ''}
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 1px;">
                        ${pf.ageGender?.enabled !== false ? `<span>Age/Sex: <b>${ageGender}</b></span>` : ''}
                        ${doctorName ? `<span style="font-size: 8.5px; color: #52525b;">Ref: <b>${doctorName}</b></span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // D. Items Table Box (boxes.itemsTable)
    let itemsTableHtml = "";
    if (boxes.itemsTable?.enabled) {
        const rows = boxes.itemsTable.rows || [];
        itemsTableHtml = `
            <div style="border: 1px solid #d4d4d8; border-radius: 6px; overflow: hidden; margin-bottom: 6px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 9px; text-align: left;">
                    <thead>
                        <tr style="background: #f4f4f5; border-bottom: 1px solid #d4d4d8; font-size: 7.5px; font-weight: 900; text-transform: uppercase; color: #52525b;">
                            <th style="padding: 3px 5px; width: 14px; text-align: center;">#</th>
                            <th style="padding: 3px 5px;">TEST ITEM</th>
                            <th style="padding: 3px 5px; text-align: right; width: 55px;">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((r, idx) => `
                            <tr style="border-bottom: 1px dashed #e4e4e7;">
                                <td style="padding: 3.5px 5px; text-align: center; color: #71717a;">${idx + 1}</td>
                                <td style="padding: 3.5px 5px; font-weight: 600; color: #18181b;">${r.description || r.testName || 'Test'}</td>
                                <td style="padding: 3.5px 5px; text-align: right; font-family: monospace; font-weight: 700;">₹${Number(r.amount || r.price || 0).toFixed(2)}</td>
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
        const grandTotal = ff.totalAmount?.value || `₹${normalizedData.financial.totalAmount.toFixed(2)}`;
        const totalPaidStr = ff.totalPaid?.value || `₹${normalizedData.financial.totalPaid.toFixed(2)}`;
        const balanceDueStr = ff.balanceDue?.value || `₹${normalizedData.financial.balanceDue.toFixed(2)}`;

        finHtml = `
            <div style="border: 1px solid #d4d4d8; border-radius: 6px; padding: 5px 7px; margin-bottom: 6px; background: #fafafa; font-size: 9.5px;">
                ${ff.totalAmount?.enabled !== false ? `
                    <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 10.5px; border-bottom: 1px solid #18181b; padding-bottom: 2px; margin-bottom: 3px;">
                        <span>Grand Total:</span>
                        <span style="font-family: monospace;">${grandTotal}</span>
                    </div>
                ` : ''}
                ${ff.totalPaid?.enabled !== false ? `
                    <div style="display: flex; justify-content: space-between; color: #15803d; font-weight: 700; margin-bottom: 1.5px;">
                        <span>Amount Received (Cash):</span>
                        <span style="font-family: monospace;">${totalPaidStr}</span>
                    </div>
                ` : ''}
                ${ff.balanceDue?.enabled !== false ? `
                    <div style="display: flex; justify-content: space-between; font-weight: 700; ${normalizedData.financial.balanceDue > 0 ? 'color: #dc2626;' : 'color: #71717a;'}">
                        <span>Balance Due:</span>
                        <span style="font-family: monospace;">${balanceDueStr}</span>
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
        const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=85x85&data=${encodeURIComponent(upiUrl)}`;

        upiQrHtml = `
            <div style="border: 1px solid #d4d4d8; border-radius: 6px; padding: 5px; margin-bottom: 6px; text-align: center; background: #fafafa;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <img src="${qrImgUrl}" style="width: 65px; height: 65px; display: block;" alt="UPI QR" />
                    <div style="text-align: left;">
                        <div style="font-size: 7.5px; font-weight: 900; text-transform: uppercase; color: #27272a; letter-spacing: 0.04em;">SCAN QR TO PAY</div>
                        <div style="font-size: 7px; font-family: monospace; color: #52525b; margin-top: 2px;">${upiId}</div>
                        <div style="font-size: 6.5px; color: #71717a; margin-top: 1px;">Instant Bharat UPI</div>
                    </div>
                </div>
            </div>
        `;
    }

    // G. Terms & System Note (boxes.termsAndConditions)
    let termsHtml = "";
    if (boxes.termsAndConditions?.enabled) {
        termsHtml = `
            <div style="text-align: center; margin-top: 6px; font-size: 7.5px; color: #71717a;">
                ${boxes.termsAndConditions.text ? `<div style="white-space: pre-line; line-height: 1.3;">${boxes.termsAndConditions.text}</div>` : ''}
                ${boxes.termsAndConditions.systemNote ? `<div style="font-size: 7px; color: #a1a1aa; margin-top: 3px; font-weight: 700; letter-spacing: 0.02em;">${boxes.termsAndConditions.systemNote}</div>` : ''}
            </div>
        `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Thermal Receipt</title>
    <style>
        @page {
            margin: 0;
            size: 80mm auto;
        }
        @media print {
            body {
                width: 72mm !important;
                padding: 2mm !important;
            }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
            margin: 0;
            padding: 2.5mm;
            width: 72mm;
            color: #18181b;
            font-size: 10px;
            line-height: 1.3;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            box-sizing: border-box;
        }
    </style>
</head>
<body>
    ${headerHtml}
    ${badgeHtml}
    ${patientHtml}
    ${itemsTableHtml}
    ${finHtml}
    ${upiQrHtml}
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
    if (window.api && typeof window.api.printLabel === 'function') {
        const pageWidthMicrons = 80000;
        const pageHeightMicrons = 150000;
        try {
            await window.api.printLabel({
                html: htmlContent,
                width: pageWidthMicrons,
                height: pageHeightMicrons
            });
            console.log("Successfully sent to Electron printer.");
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
