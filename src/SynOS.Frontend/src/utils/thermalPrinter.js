// src/utils/thermalPrinter.js

/**
 * 80mm Thermal Printer Width: ~72mm printable area = ~270 pixels at 96 DPI (or just use mm/percentages in CSS)
 */

export function generateThermalInvoiceHtml(payload) {
    const { visitId, token, patient, billing, orders } = payload;
    const items = orders || [];
    const now = new Date();

    const itemsHtml = items.map((item, index) => {
        const gross = item.grossAmount || 0;
        const net = item.netAmount || 0;
        const discount = item.discount || 0;
        return `
            <tr style="border-bottom: 1px dashed #ccc;">
                <td style="padding: 4px 0;">${index + 1}</td>
                <td style="padding: 4px 0;">${item.testName || item.testCode}</td>
                <td style="padding: 4px 0; text-align: right;">${gross.toFixed(2)}</td>
                <td style="padding: 4px 0; text-align: right;">${discount > 0 ? discount.toFixed(2) : '-'}</td>
                <td style="padding: 4px 0; text-align: right;">${net.toFixed(2)}</td>
            </tr>
        `;
    }).join("");

    return `
<html>
<head>
    <style>
        @page { margin: 0; size: 80mm auto; }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 5mm;
            width: 70mm;
            font-size: 12px;
            color: #000;
        }
        h2 { text-align: center; font-size: 16px; margin: 0 0 5px 0; font-weight: bold; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .margin-b-10 { margin-bottom: 10px; }
        .divider { border-top: 1px dashed #000; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { border-bottom: 1px solid #000; padding-bottom: 4px; text-align: left; }
    </style>
</head>
<body>
    <h2>TAX INVOICE</h2>
    <div class="text-center margin-b-10" style="font-size: 14px; font-weight: bold;">SynOS Lab</div>
    <div class="text-center" style="font-size: 10px;">Date: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</div>
    
    <div class="divider"></div>
    
    <div style="margin-bottom: 5px;"><strong>Patient:</strong> ${patient.name}</div>
    <div style="margin-bottom: 5px;"><strong>Sex/Age:</strong> ${patient.sex} / ${patient.age} Yrs</div>
    <div style="margin-bottom: 5px;"><strong>Visit ID:</strong> ${visitId.substring(0, 8)}...</div>
    <div><strong>Token:</strong> <span style="font-size: 14px; font-weight: bold;">${token || 'N/A'}</span></div>

    <div class="divider"></div>

    <table>
        <thead>
            <tr>
                <th style="width: 10%;">#</th>
                <th style="width: 40%;">Test</th>
                <th style="width: 15%; text-align: right;">Rate</th>
                <th style="width: 15%; text-align: right;">Disc.</th>
                <th style="width: 20%; text-align: right;">Amt</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
    </table>

    <div class="divider"></div>

    <div class="text-right margin-b-10">
        <div>Gross: ₹${(billing.grossAmount || 0).toFixed(2)}</div>
        ${billing.discountAmount > 0 ? `<div>Discount: -₹${billing.discountAmount.toFixed(2)}</div>` : ''}
        <div class="font-bold" style="font-size: 14px; margin-top: 5px;">Total Paid: ₹${(billing.netAmount || 0).toFixed(2)}</div>
    </div>

    <div class="text-center" style="font-size: 10px; margin-top: 20px;">
        Thank you for choosing SynOS Lab!<br>
        Powered by SynOS
    </div>
</body>
</html>
    `;
}

export function generateThermalSlipHtml(payload) {
    const { visitId, token, patient, orders } = payload;
    const items = orders || [];
    const now = new Date();

    const testsListHtml = items.map(item => `
        <div style="padding: 4px 0; border-bottom: 1px dashed #ccc;">
            &#8226; ${item.testName || item.testCode}
        </div>
    `).join("");

    return `
<html>
<head>
    <style>
        @page { margin: 0; size: 80mm auto; }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 5mm;
            width: 70mm;
            font-size: 14px;
            color: #000;
        }
        h2 { text-align: center; font-size: 18px; margin: 0 0 10px 0; font-weight: bold; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .divider { border-top: 2px solid #000; margin: 15px 0; }
        .token-box {
            border: 2px solid #000;
            padding: 10px;
            text-align: center;
            margin: 15px 0;
        }
        .token-number {
            font-size: 36px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h2>PATIENT SLIP</h2>
    <div class="text-center" style="font-size: 12px; margin-bottom: 15px;">SynOS Lab - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</div>
    
    <div style="margin-bottom: 8px;"><strong>Name:</strong> ${patient.name}</div>
    <div style="margin-bottom: 8px;"><strong>Sex/Age:</strong> ${patient.sex} / ${patient.age} Yrs</div>
    <div style="margin-bottom: 8px;"><strong>Visit ID:</strong> ${visitId.substring(0, 8)}...</div>

    <div class="token-box">
        <div style="font-size: 12px; text-transform: uppercase;">Lab Token Number</div>
        <div class="token-number">${token || 'WAIT'}</div>
    </div>

    <div style="font-weight: bold; margin-bottom: 5px;">Tests Ordered:</div>
    <div style="font-size: 13px;">
        ${testsListHtml}
    </div>

    <div class="text-center" style="font-size: 11px; margin-top: 25px;">
        Please keep this slip and wait for your token number to be called.<br>
        Proceed to Sample Collection.
    </div>
</body>
</html>
    `;
}

/**
 * Attempts to print using the Electron wrapper. Fallbacks to browser native printing.
 * NOTE: UI Trigger removed. Use PrintOrchestratorContext.
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
