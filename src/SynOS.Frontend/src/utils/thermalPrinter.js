// src/utils/thermalPrinter.js

/**
 * 80mm Thermal Printer Width: ~72mm printable area = ~270 pixels at 96 DPI
 * 58mm Thermal Printer Width: ~48mm printable area = ~180 pixels at 96 DPI
 */

export function getActiveThermalSettings() {
    if (typeof window !== 'undefined' && window.localStorage) {
        const local = window.localStorage.getItem('synos_thermal_layout_settings');
        if (local) {
            try {
                return JSON.parse(local);
            } catch {
                // Ignore parsing errors
            }
        }
    }
    // Standard system defaults
    return {
        paperWidth: '80mm',
        textSize: 'standard',
        fontFamily: 'sans-serif',
        showHeader: true,
        showAgeGender: true,
        showVisitId: true,
        showTokenBox: true,
        showDoctorName: true,
        showItemDiscounts: true,
        showUpiQr: false,
        upiId: '',
        headerSubtext: '',
        footerDisclaimer: '* Clinical correlation required'
    };
}

export function generateThermalInvoiceHtml(payload) {
    const { visitId, token, patient, billing, orders, referringDoctorName, labName, branch, labAddress, labPhone, labEmail, labWebsite } = payload;
    const items = orders || [];
    const now = new Date();
    const settings = getActiveThermalSettings();

    // Determine font family styling
    let fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
    if (settings.fontFamily === 'mono') {
        fontFamily = "'Courier New', Courier, monospace";
    } else if (settings.fontFamily === 'outfit') {
        fontFamily = "'Outfit', sans-serif";
    }

    // Determine typography sizes and spacing
    const isCompact = settings.textSize === 'compact';
    const bodyFontSize = isCompact ? '10px' : '12px';
    const bodyPadding = isCompact ? '2mm' : '5mm';
    const titleFontSize = isCompact ? '13px' : '16px';
    const subTitleFontSize = isCompact ? '11px' : '13px';
    const dividerMargin = isCompact ? '5px 0' : '10px 0';
    const tableFontSize = isCompact ? '9px' : '11px';
    const itemPadding = isCompact ? '2px 0' : '4px 0';

    const itemsHtml = items.map((item, index) => {
        const gross = item.grossAmount || 0;
        const net = item.netAmount || 0;
        const discount = item.discount || 0;
        return `
            <tr style="border-bottom: 1px dashed #ccc;">
                <td style="padding: ${itemPadding};">${index + 1}</td>
                <td style="padding: ${itemPadding};">${item.testName || item.testCode}</td>
                <td style="padding: ${itemPadding}; text-align: right;">${gross.toFixed(2)}</td>
                ${settings.showItemDiscounts ? `<td style="padding: ${itemPadding}; text-align: right;">${discount > 0 ? discount.toFixed(2) : '-'}</td>` : ''}
                <td style="padding: ${itemPadding}; text-align: right;">${net.toFixed(2)}</td>
            </tr>
        `;
    }).join("");

    // Generate UPI Payment QR Code if active
    let upiQrHtml = "";
    if (settings.showUpiQr && settings.upiId) {
        const netAmt = (billing.netAmount || 0).toFixed(2);
        const upiUrl = `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(labName || "Laboratory")}&am=${netAmt}&tn=${encodeURIComponent(visitId.substring(0, 8))}&cu=INR`;
        const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(upiUrl)}`;
        upiQrHtml = `
            <div class="text-center" style="margin-top: 10px; margin-bottom: 10px;">
                <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; color: #555;">Scan to Pay via UPI</div>
                <img src="${qrCodeApiUrl}" style="width: 90px; height: 90px; border: 1px solid #ddd; padding: 2px;" alt="UPI QR" />
                <div style="font-size: 8px; font-family: monospace; opacity: 0.6; margin-top: 2px;">${settings.upiId}</div>
            </div>
        `;
    }

    let headerBrandingHtml = "";
    if (settings.showHeader) {
        const displayLabName = labName || "Laboratory";
        const displayBranchName = branch?.name || "";
        
        headerBrandingHtml = `
            <h2>TAX INVOICE</h2>
            <div class="text-center" style="font-size: ${subTitleFontSize}; font-weight: bold;">${displayLabName}</div>
            ${displayBranchName ? `<div class="text-center" style="font-size: 9px; font-weight: 600; opacity: 0.85; margin-top: 1px;">${displayBranchName}</div>` : ''}
        `;

        const activeAddress = branch?.address || labAddress || "";
        const activePhone = branch?.phone || labPhone || "";
        const activeEmail = branch?.email || labEmail || "";
        const activeWebsite = labWebsite || "";

        if (activeAddress || activePhone || activeEmail || activeWebsite) {
            if (activeAddress) {
                headerBrandingHtml += `<div class="text-center" style="font-size: 8px; margin-top: 2px; opacity: 0.8;">${activeAddress}</div>`;
            }
            if (activePhone || activeEmail) {
                const phoneStr = activePhone ? `Tel: ${activePhone}` : "";
                const emailStr = activeEmail ? `Email: ${activeEmail}` : "";
                const divider = (activePhone && activeEmail) ? " | " : "";
                headerBrandingHtml += `<div class="text-center" style="font-size: 8px; margin-top: 1px; opacity: 0.8;">${phoneStr}${divider}${emailStr}</div>`;
            }
            if (activeWebsite) {
                headerBrandingHtml += `<div class="text-center" style="font-size: 8px; margin-top: 1px; opacity: 0.8;">${activeWebsite}</div>`;
            }
        } else if (settings.headerSubtext) {
            headerBrandingHtml += `<div class="text-center" style="font-size: 8px; margin-top: 2px;">${settings.headerSubtext}</div>`;
        }
    }

    return `
<html>
<head>
    <style>
        @page { margin: 0; size: ${settings.paperWidth} auto; }
        body {
            font-family: ${fontFamily};
            margin: 0;
            padding: ${bodyPadding};
            width: ${settings.paperWidth === '58mm' ? '48mm' : '70mm'};
            font-size: ${bodyFontSize};
            color: #000;
        }
        h2 { text-align: center; font-size: ${titleFontSize}; margin: 0 0 3px 0; font-weight: bold; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .margin-b-10 { margin-bottom: 10px; }
        .divider { border-top: 1px dashed #000; margin: ${dividerMargin}; }
        table { width: 100%; border-collapse: collapse; font-size: ${tableFontSize}; }
        th { border-bottom: 1px solid #000; padding-bottom: 3px; text-align: left; }
    </style>
</head>
<body>
    ${headerBrandingHtml}
    <div class="text-center" style="font-size: 9px; opacity: 0.7; margin-top: 4px;">Date: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</div>
    
    <div class="divider"></div>
    
    <div style="margin-bottom: 4px;"><strong>Patient:</strong> ${patient.name}</div>
    ${settings.showAgeGender ? `<div style="margin-bottom: 4px;"><strong>Sex/Age:</strong> ${patient.sex} / ${patient.age} Yrs</div>` : ''}
    ${settings.showVisitId ? `<div style="margin-bottom: 4px;"><strong>Visit ID:</strong> ${visitId.substring(0, 8)}...</div>` : ''}
    ${settings.showDoctorName && referringDoctorName ? `<div style="margin-bottom: 4px;"><strong>Ref. By:</strong> ${referringDoctorName}</div>` : ''}
    
    ${settings.showTokenBox ? `
        <div style="border: 1px solid #000; padding: 4px; text-align: center; margin: 6px 0;">
            <div style="font-size: 8px; text-transform: uppercase;">Lab Token Number</div>
            <div style="font-size: 20px; font-weight: bold;">${token || 'N/A'}</div>
        </div>
    ` : `<div><strong>Token:</strong> <span style="font-size: 13px; font-weight: bold;">${token || 'N/A'}</span></div>`}
 
    <div class="divider"></div>
 
    <table>
        <thead>
            <tr>
                <th style="width: 10%;">#</th>
                <th style="width: ${settings.showItemDiscounts ? '40%' : '55%'};">Test</th>
                <th style="width: 15%; text-align: right;">Rate</th>
                ${settings.showItemDiscounts ? '<th style="width: 15%; text-align: right;">Disc.</th>' : ''}
                <th style="width: 20%; text-align: right;">Amt</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
    </table>
 
    <div class="divider"></div>
 
    <div class="text-right margin-b-10" style="font-size: ${isCompact ? '9px' : '11px'};">
        <div>Gross: ₹${(billing.grossAmount || 0).toFixed(2)}</div>
        ${billing.discountAmount > 0 ? `<div>Discount: -₹${billing.discountAmount.toFixed(2)}</div>` : ''}
        <div class="font-bold" style="font-size: ${isCompact ? '12px' : '14px'}; margin-top: 3px;">Total Paid: ₹${(billing.netAmount || 0).toFixed(2)}</div>
    </div>
 
    ${upiQrHtml}
 
    <div class="text-center" style="font-size: 9px; margin-top: 15px; border-top: 1px dashed #eee; padding-top: 5px;">
        ${settings.footerDisclaimer || 'Thank you for choosing SynOS Lab!'}<br>
        <span style="font-size: 7px; opacity: 0.5;">Powered by SynOS</span>
    </div>
</body>
</html>
    `;
}

export function generateThermalSlipHtml(payload) {
    const { visitId, token, patient, orders, labName, branch } = payload;
    const items = orders || [];
    const now = new Date();
    const settings = getActiveThermalSettings();

    // Determine font family styling
    let fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
    if (settings.fontFamily === 'mono') {
        fontFamily = "'Courier New', Courier, monospace";
    } else if (settings.fontFamily === 'outfit') {
        fontFamily = "'Outfit', sans-serif";
    }

    // Determine typography sizes and spacing
    const isCompact = settings.textSize === 'compact';
    const bodyFontSize = isCompact ? '11px' : '13px';
    const bodyPadding = isCompact ? '2mm' : '5mm';
    const titleFontSize = isCompact ? '15px' : '18px';
    const dividerMargin = isCompact ? '8px 0' : '15px 0';
    const itemPadding = isCompact ? '2px 0' : '4px 0';

    const testsListHtml = items.map(item => `
        <div style="padding: ${itemPadding}; border-bottom: 1px dashed #ccc;">
            &#8226; ${item.testName || item.testCode}
        </div>
    `).join("");

    return `
<html>
<head>
    <style>
        @page { margin: 0; size: ${settings.paperWidth} auto; }
        body {
            font-family: ${fontFamily};
            margin: 0;
            padding: ${bodyPadding};
            width: ${settings.paperWidth === '58mm' ? '48mm' : '70mm'};
            font-size: ${bodyFontSize};
            color: #000;
        }
        h2 { text-align: center; font-size: ${titleFontSize}; margin: 0 0 5px 0; font-weight: bold; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .divider { border-top: 2px solid #000; margin: ${dividerMargin}; }
        .token-box {
            border: 2px solid #000;
            padding: ${isCompact ? '5px' : '10px'};
            text-align: center;
            margin: ${isCompact ? '8px 0' : '15px 0'};
        }
        .token-number {
            font-size: ${isCompact ? '28px' : '36px'};
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h2>PATIENT SLIP</h2>
    <div class="text-center" style="font-size: 10px; margin-bottom: 10px;">${branch?.name || labName || 'Laboratory'} - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</div>
    
    <div style="margin-bottom: 6px;"><strong>Name:</strong> ${patient.name}</div>
    ${settings.showAgeGender ? `<div style="margin-bottom: 6px;"><strong>Sex/Age:</strong> ${patient.sex} / ${patient.age} Yrs</div>` : ''}
    ${settings.showVisitId ? `<div style="margin-bottom: 6px;"><strong>Visit ID:</strong> ${visitId.substring(0, 8)}...</div>` : ''}
 
    <div class="token-box">
        <div style="font-size: 10px; text-transform: uppercase;">Lab Token Number</div>
        <div class="token-number">${token || 'WAIT'}</div>
    </div>
 
    <div style="font-weight: bold; margin-bottom: 4px;">Tests Ordered:</div>
    <div style="font-size: ${isCompact ? '11px' : '13px'};">
        ${testsListHtml}
    </div>
 
    <div class="text-center" style="font-size: 9px; margin-top: 20px;">
        Please keep this slip and wait for your token number to be called.<br>
        Proceed to Sample Collection.
    </div>
</body>
</html>
    `;
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
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(htmlContent);
        doc.close();

        iframe.onload = function () {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
                resolve();
            }, 500);
        };
    });
}
