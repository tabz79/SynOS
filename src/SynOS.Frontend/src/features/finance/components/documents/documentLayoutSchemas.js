// Default Modular Layout Schemas for SynOS Commercial Paperwork

export const DEFAULT_DOCUMENT_SCHEMAS = {
    patient_tax_invoice: {
        slotId: 'patient_tax_invoice',
        title: 'Patient Tax Invoice (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Letterhead & Clinic Brand',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Legal Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Trade Tagline', value: 'Comprehensive Pathology, Radiology & Molecular Diagnostics' },
                    address: { id: 'address', enabled: true, label: 'Facility Address', value: 'Central Diagnostic Complex, Main Road' },
                    phone: { id: 'phone', enabled: true, label: 'Phone', value: '+91 98765 43210' },
                    email: { id: 'email', enabled: true, label: 'Email', value: 'billing@synoslab.in' },
                    gstin: { id: 'gstin', enabled: true, label: 'GSTIN', value: '36AAAAA0000A1Z5' },
                    pan: { id: 'pan', enabled: true, label: 'PAN', value: 'AAAAA0000A' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Document Badge & Meta Numbers',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Document Title', value: 'TAX INVOICE' },
                    subBadge: { id: 'subBadge', enabled: true, label: 'Sub-Badge', value: 'Original for Recipient' },
                    billNumber: { id: 'billNumber', enabled: true, label: 'Invoice No', value: 'INV-202610-0042' },
                    date: { id: 'date', enabled: true, label: 'Invoice Date & Time', value: '14/10/2026 12:45 PM' },
                    tokenNumber: { id: 'tokenNumber', enabled: true, label: 'Token No', value: 'COUNTER-104' },
                    branchName: { id: 'branchName', enabled: true, label: 'Branch Facility', value: 'Main Diagnostic Hub' },
                    paymentStatus: { id: 'paymentStatus', enabled: true, label: 'Payment Status', value: 'PARTIAL DUE' }
                },
                customLines: []
            },
            partyDetails: {
                id: 'partyDetails',
                name: 'Patient Details (Billed To)',
                enabled: true,
                title: 'Patient Details (Billed To)',
                fields: {
                    fullName: { id: 'fullName', enabled: true, label: 'Patient Name', value: 'K. Ramesh Kumar' },
                    uhid: { id: 'uhid', enabled: true, label: 'UHID / MRN', value: 'SYN-2026-9042' },
                    ageGender: { id: 'ageGender', enabled: true, label: 'Age / Gender', value: '46 Yrs / Male' },
                    phone: { id: 'phone', enabled: true, label: 'Contact Phone', value: '+91 98480 22334' },
                    refDoctor: { id: 'refDoctor', enabled: true, label: 'Referring Doctor', value: 'Dr. Khaleeq Ur Rahman, MD' },
                    address: { id: 'address', enabled: true, label: 'Patient Address', value: 'Doctors Colony, Khammam' },
                    corporateClient: { id: 'corporateClient', enabled: false, label: 'Corporate Client', value: '' },
                    employeeId: { id: 'employeeId', enabled: false, label: 'Employee ID / Staff No', value: '' },
                    insuranceProvider: { id: 'insuranceProvider', enabled: false, label: 'Insurance / TPA', value: '' },
                    policyNumber: { id: 'policyNumber', enabled: false, label: 'Policy / Card No', value: '' },
                    preAuthApprovalNumber: { id: 'preAuthApprovalNumber', enabled: false, label: 'Pre-Auth Approval No', value: '' },
                    billingCategory: { id: 'billingCategory', enabled: false, label: 'Billing Category', value: '' }
                },
                customLines: []
            },
            billerDetails: {
                id: 'billerDetails',
                name: 'Biller / Desk Audit Particulars',
                enabled: true,
                title: 'Billing Desk',
                fields: {
                    billedBy: { id: 'billedBy', enabled: true, label: 'Billed by', value: 'Dr. Vasudeva Rao (admin)' },
                    discountReason: { id: 'discountReason', enabled: true, label: 'discount', value: 'A S X RAY SERVICES' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Investigation Line Items Table',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    description: { id: 'description', enabled: true, label: 'Investigation / Service Description' },
                    department: { id: 'department', enabled: true, label: 'Department' },
                    sacCode: { id: 'sacCode', enabled: true, label: 'SAC Code' },
                    price: { id: 'price', enabled: true, label: 'Tariff (₹)' },
                    discount: { id: 'discount', enabled: true, label: 'Disc (₹)' },
                    amount: { id: 'amount', enabled: true, label: 'Net Amount (₹)' }
                },
                rows: [
                    { id: 'row-1', index: 1, description: 'Complete Blood Count (5-Part Automated with ESR)', code: 'CBC', department: 'Hematology', sacCode: '999312', price: 350, discount: 0, amount: 350 },
                    { id: 'row-2', index: 2, description: 'Liver Function Test Profile (LFT 11 Parameters)', code: 'LFT', department: 'Biochemistry', sacCode: '999312', price: 850, discount: 50, amount: 800 },
                    { id: 'row-3', index: 3, description: 'Ultrasound Whole Abdomen (Sonography)', code: 'USG', department: 'Radiology', sacCode: '999312', price: 1200, discount: 0, amount: 1200 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Financial Totals & Breakdown',
                enabled: true,
                fields: {
                    grossSubtotal: { id: 'grossSubtotal', enabled: true, label: 'Gross Subtotal', value: '₹2,400.00' },
                    discountAmount: { id: 'discountAmount', enabled: true, label: 'Concession / Discount', value: '-₹50.00' },
                    taxableAmount: { id: 'taxableAmount', enabled: true, label: 'Taxable Value (SAC 999312)', value: '₹2,350.00' },
                    taxBreakdown: { id: 'taxBreakdown', enabled: true, label: 'CGST (0%) & SGST (0%)', value: 'Exempted (Healthcare Services)' },
                    totalAmount: { id: 'totalAmount', enabled: true, label: 'Net Total Billed', value: '₹2,350.00' },
                    totalPaid: { id: 'totalPaid', enabled: true, label: 'Total Paid / Received', value: '₹1,500.00' },
                    balanceDue: { id: 'balanceDue', enabled: true, label: 'Balance Outstanding Due', value: '₹850.00' }
                },
                customLines: []
            },
            amountInWords: {
                id: 'amountInWords',
                name: 'Amount in Words Box',
                enabled: true,
                label: 'Amount in Words',
                value: 'Rupees Two Thousand Three Hundred Fifty Only'
            },
            receiptHistory: {
                id: 'receiptHistory',
                name: 'Settlement Receipt History Strip',
                enabled: true,
                title: 'Settlement Receipt History',
                entries: [
                    { id: 'rcpt-1', receiptNumber: 'RCPT-0811', mode: 'UPI', amount: '₹1,500', date: '14/10/2026 12:45 PM', ref: 'UPI/6291048201' }
                ]
            },
            bankAndUpi: {
                id: 'bankAndUpi',
                name: 'Bank Remittance & Dynamic Bharat UPI QR',
                enabled: true,
                title: 'Bank Wire & Instant QR',
                fields: {
                    showQr: { id: 'showQr', enabled: true, label: 'Bharat UPI QR Code', value: true },
                    bankName: { id: 'bankName', enabled: true, label: 'Bank Name', value: 'HDFC Bank' },
                    accountNumber: { id: 'accountNumber', enabled: true, label: 'A/C No', value: '50200012345678' },
                    ifsc: { id: 'ifsc', enabled: true, label: 'IFSC Code', value: 'HDFC0001234' },
                    branch: { id: 'branch', enabled: true, label: 'Branch', value: 'Main Branch, Hyderabad' },
                    upiId: { id: 'upiId', enabled: true, label: 'UPI VPA ID', value: 'synoslab@hdfcbank' }
                },
                customLines: []
            },
            termsAndConditions: {
                id: 'termsAndConditions',
                name: 'Terms & Conditions / Declarations',
                enabled: true,
                title: 'Terms & Conditions',
                text: '1. All disputes subject to local jurisdiction.\n2. Diagnostic tests are subject to clinical correlation.\n3. Cheques / Online payments subject to realization.\n4. In case of online payment, please mention invoice reference.',
                systemNote: 'This is an authentic computer-generated Tax Invoice generated by SynOS Diagnostic OS.'
            },
            signatory: {
                id: 'signatory',
                name: 'Authorised Signatory Box',
                enabled: true,
                title: 'Authorised Signatory',
                subtitle: 'Accounts & Billing Desk'
            }
        }
    },

    patient_thermal_receipt: {
        slotId: 'patient_thermal_receipt',
        title: 'Thermal POS Cash Slip (80mm)',
        isThermal: true,
        boxes: {
            header: {
                id: 'header',
                name: 'Thermal Brand Header',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Lab Name', value: 'SYNOS DIAGNOSTIC LAB' },
                    tagline: { id: 'tagline', enabled: false, label: 'Tagline', value: 'Automated Pathology & Imaging' },
                    address: { id: 'address', enabled: true, label: 'Address', value: 'Central Diagnostic Complex, Main Road | Ph: 9876543210' },
                    gstin: { id: 'gstin', enabled: false, label: 'GSTIN', value: '36AAAAA0000A1Z5' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Receipt Particulars',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Slip Title', value: 'CASH PAYMENT RECEIPT' },
                    receiptNumber: { id: 'receiptNumber', enabled: true, label: 'Receipt No', value: 'RCPT-202610-0912' },
                    date: { id: 'date', enabled: true, label: 'Date/Time', value: '14/10/2026 12:48 PM' },
                    tokenNumber: { id: 'tokenNumber', enabled: true, label: 'Token No', value: 'TOKEN # T-0142' }
                },
                customLines: []
            },
            partyDetails: {
                id: 'partyDetails',
                name: 'Patient Quick Info',
                enabled: true,
                title: 'Patient',
                fields: {
                    fullName: { id: 'fullName', enabled: true, label: 'Patient Name', value: 'K. Ramesh Kumar' },
                    uhid: { id: 'uhid', enabled: true, label: 'UHID', value: 'SYN-2026-9042' },
                    ageGender: { id: 'ageGender', enabled: true, label: 'Age/Sex', value: '46Y / M' }
                },
                customLines: []
            },
            billerDetails: {
                id: 'billerDetails',
                name: 'Billing Desk Particulars',
                enabled: true,
                title: 'BILLING DESK',
                fields: {
                    billedBy: { id: 'billedBy', enabled: true, label: 'Billed by', value: 'Dr. Vasudeva Rao (admin)' },
                    discountReason: { id: 'discountReason', enabled: true, label: 'discount', value: 'A S X RAY SERVICES' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Tests & Charges Slip',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    description: { id: 'description', enabled: true, label: 'Test Item' },
                    price: { id: 'price', enabled: true, label: 'Amount (₹)' }
                },
                rows: [
                    { id: 'r-1', index: 1, description: 'Complete Blood Count (CBC)', price: 350, amount: 350 },
                    { id: 'r-2', index: 2, description: 'Serum Creatinine', price: 200, amount: 200 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Cash Totals',
                enabled: true,
                fields: {
                    grossAmount: { id: 'grossAmount', enabled: true, label: 'Sub Total', value: '₹550.00' },
                    discountAmount: { id: 'discountAmount', enabled: true, label: 'Discount', value: '₹0.00' },
                    totalAmount: { id: 'totalAmount', enabled: true, label: 'Grand Total', value: '₹550.00' },
                    totalPaid: { id: 'totalPaid', enabled: true, label: 'Amount Received (Cash)', value: '₹550.00' },
                    balanceDue: { id: 'balanceDue', enabled: true, label: 'Balance Due', value: '₹0.00' }
                },
                customLines: []
            },
            bankAndUpi: {
                id: 'bankAndUpi',
                name: 'Instant Payment QR',
                enabled: true,
                title: 'Scan QR to Pay',
                subtitle: 'Instant Bharat UPI',
                customQrImage: '',
                fields: {
                    showQr: { id: 'showQr', enabled: true, label: 'UPI QR', value: true },
                    upiId: { id: 'upiId', enabled: true, label: 'UPI ID', value: 'synoslab@hdfcbank' }
                },
                customLines: []
            },
            termsAndConditions: {
                id: 'termsAndConditions',
                name: 'Counter Instructions',
                enabled: true,
                title: 'Notice',
                text: 'Please collect reports at counter or via WhatsApp.\nReports available within 4 hours.',
                systemNote: 'Thank You • SynOS Diagnostic OS'
            }
        }
    },

    prepaid_patient_a4_slip: {
        slotId: 'prepaid_patient_a4_slip',
        title: 'Prepaid Patient Slip (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Letterhead & Clinic Brand',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Legal Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Trade Tagline', value: 'Comprehensive Pathology, Radiology & Molecular Diagnostics' },
                    address: { id: 'address', enabled: true, label: 'Facility Address', value: 'Central Diagnostic Complex, Main Road' },
                    phone: { id: 'phone', enabled: true, label: 'Phone', value: '+91 98765 43210' },
                    email: { id: 'email', enabled: true, label: 'Email', value: 'billing@synoslab.in' },
                    gstin: { id: 'gstin', enabled: true, label: 'GSTIN', value: '36AAAAA0000A1Z5' },
                    pan: { id: 'pan', enabled: true, label: 'PAN', value: 'AAAAA0000A' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Document Badge & Meta Numbers',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Document Title', value: 'PATIENT ACKNOWLEDGEMENT & TEST ORDER' },
                    subBadge: { id: 'subBadge', enabled: true, label: 'Sub-Badge', value: 'Prepaid / Partner Account Billing' },
                    billNumber: { id: 'billNumber', enabled: true, label: 'Order / Slip No', value: 'ORD-202610-0042' },
                    date: { id: 'date', enabled: true, label: 'Order Date & Time', value: '14/10/2026 12:45 PM' },
                    tokenNumber: { id: 'tokenNumber', enabled: true, label: 'Token No', value: 'COUNTER-104' },
                    branchName: { id: 'branchName', enabled: true, label: 'Branch Facility', value: 'Main Diagnostic Facility' },
                    paymentStatus: { id: 'paymentStatus', enabled: true, label: 'Payment Status', value: 'PARTNER ACCOUNT SETTLED (NO CASH DUE)' }
                },
                customLines: []
            },
            partyDetails: {
                id: 'partyDetails',
                name: 'Patient & Sponsor Particulars',
                enabled: true,
                title: 'Patient & Referral Information',
                fields: {
                    fullName: { id: 'fullName', enabled: true, label: 'Patient Name', value: 'K. Ramesh Kumar' },
                    uhid: { id: 'uhid', enabled: true, label: 'UHID / MRN', value: 'SYN-2026-9042' },
                    ageGender: { id: 'ageGender', enabled: true, label: 'Age / Gender', value: '46 Yrs / Male' },
                    phone: { id: 'phone', enabled: true, label: 'Contact Phone', value: '+91 98480 22334' },
                    refDoctor: { id: 'refDoctor', enabled: true, label: 'Referring Doctor', value: 'Dr. Khaleeq Ur Rahman, MD' },
                    sponsorName: { id: 'sponsorName', enabled: true, label: 'Referral Partner / Account', value: 'Khaleeq Polyclinic & Hospital' },
                    address: { id: 'address', enabled: true, label: 'Patient Address', value: 'Doctors Colony, Khammam' }
                },
                customLines: []
            },
            billerDetails: {
                id: 'billerDetails',
                name: 'Biller / Desk Audit Particulars',
                enabled: true,
                title: 'Billing Desk',
                fields: {
                    billedBy: { id: 'billedBy', enabled: true, label: 'Billed by', value: 'Dr. Vasudeva Rao (admin)' },
                    discountReason: { id: 'discountReason', enabled: false, label: 'Discount Context', value: '' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Investigation Line Items Table (Zero Pricing Disclosed)',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    description: { id: 'description', enabled: true, label: 'Investigation / Prescribed Test' },
                    department: { id: 'department', enabled: true, label: 'Department / Section' },
                    sampleType: { id: 'sampleType', enabled: true, label: 'Specimen / Sample' },
                    tat: { id: 'tat', enabled: true, label: 'Expected Delivery Timeline' }
                },
                rows: [
                    { id: 'row-1', index: 1, description: 'Complete Blood Picture (CBC with Automated 5-Part Differential)', department: 'Hematology', sampleType: 'EDTA Whole Blood (2ml)', tat: 'Within 2-3 Hours' },
                    { id: 'row-2', index: 2, description: 'Liver Function Test (LFT 11 Parameters)', department: 'Biochemistry', sampleType: 'Plain Serum (SST)', tat: 'Within 3-4 Hours' },
                    { id: 'row-3', index: 3, description: 'Whole Abdomen & Pelvis Ultrasound (USG)', department: 'Radiology & Imaging', sampleType: 'In-Person Scan', tat: 'Same Day' }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Prepaid Settlement Notice',
                enabled: true,
                title: 'BILLED TO REFERRAL PARTNER ACCOUNT',
                isPrepaidNotice: true,
                fields: {
                    settlementType: { id: 'settlementType', enabled: true, label: 'Billing Mode', value: 'B2B Partner Prepaid Account' },
                    settlementMode: { id: 'settlementMode', enabled: true, label: 'Settlement Status', value: 'Direct Settlement by Referring Clinic / Doctor' },
                    counterPayable: { id: 'counterPayable', enabled: true, label: 'Amount Payable at Desk', value: '₹0.00 (Zero Desk Cash Due)' }
                },
                customLines: []
            },
            termsAndConditions: {
                id: 'termsAndConditions',
                name: 'Patient Instructions & Collection Guidelines',
                enabled: true,
                title: 'Instructions for Sample Collection & Test Reports',
                text: '1. Please present this order slip at the Phlebotomy / Sample Collection and Radiology reception desks.\n2. Diagnostic findings and reports will be dispatched directly to your referring doctor / clinic upon clinical verification.\n3. Digital PDF test reports will be shared via WhatsApp / SMS on your registered mobile number.\n4. For duplicate copies or clinical enquiries, please contact the central counter with your UHID and Order No.',
                systemNote: 'This is an authentic computer-generated Test Order Slip generated by SynOS Diagnostic OS.'
            },
            signatory: {
                id: 'signatory',
                name: 'Authorised Desk Signatory',
                enabled: true,
                title: 'Phlebotomy & Billing Desk',
                subtitle: 'Accounts & Billing Desk'
            }
        }
    },

    patient_thermal_prepaid_slip: {
        slotId: 'patient_thermal_prepaid_slip',
        title: 'Prepaid B2B Investigation Slip (80mm)',
        isThermal: true,
        boxes: {
            header: {
                id: 'header',
                name: 'Thermal Brand Header',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Lab Name', value: 'SYNOS DIAGNOSTIC LAB' },
                    tagline: { id: 'tagline', enabled: false, label: 'Tagline', value: 'Automated Pathology & Imaging' },
                    address: { id: 'address', enabled: true, label: 'Address', value: 'Central Diagnostic Complex, Main Road | Ph: 9876543210' },
                    gstin: { id: 'gstin', enabled: false, label: 'GSTIN', value: '36AAAAA0000A1Z5' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Slip Particulars',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Slip Title', value: 'PREPAID PATIENT SLIP' },
                    receiptNumber: { id: 'receiptNumber', enabled: true, label: 'Slip No', value: 'SLIP-202610-0912' },
                    date: { id: 'date', enabled: true, label: 'Date/Time', value: '14/10/2026 12:48 PM' },
                    tokenNumber: { id: 'tokenNumber', enabled: true, label: 'Token No', value: 'TOKEN # T-0142' }
                },
                customLines: []
            },
            partyDetails: {
                id: 'partyDetails',
                name: 'Patient & Sponsor Info',
                enabled: true,
                title: 'Patient',
                fields: {
                    fullName: { id: 'fullName', enabled: true, label: 'Patient Name', value: 'K. Ramesh Kumar' },
                    uhid: { id: 'uhid', enabled: true, label: 'UHID', value: 'SYN-2026-9042' },
                    ageGender: { id: 'ageGender', enabled: true, label: 'Age/Sex', value: '46Y / M' },
                    sponsorName: { id: 'sponsorName', enabled: true, label: 'Billed To (Partner)', value: 'Padmavathi Nursing Home' },
                    referringDoctor: { id: 'referringDoctor', enabled: true, label: 'Ref Doctor', value: 'Dr. B.S.V. Padmavathi' }
                },
                customLines: []
            },
            billerDetails: {
                id: 'billerDetails',
                name: 'Billing Desk Box',
                enabled: true,
                title: 'BILLING DESK',
                fields: {
                    billedBy: { id: 'billedBy', enabled: true, label: 'Billed by', value: 'Dr. Vasudeva Rao (admin)' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Investigative Tests Ordered (Zero Pricing)',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    description: { id: 'description', enabled: true, label: 'Investigation / Test Item' }
                },
                rows: [
                    { id: 'r-1', index: 1, description: 'Complete Blood Picture (CBP)' },
                    { id: 'r-2', index: 2, description: 'Liver Function Test (LFT)' }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Prepaid Settlement Notice',
                enabled: true,
                title: 'BILLED TO REFERRAL PARTNER ACCOUNT',
                isPrepaidNotice: true,
                fields: {
                    counterPayable: { id: 'counterPayable', enabled: true, label: 'Amount Payable at Counter', value: '₹0.00 (Prepaid)' }
                },
                customLines: []
            },
            termsAndConditions: {
                id: 'termsAndConditions',
                name: 'Counter Instructions',
                enabled: true,
                title: 'Notice',
                text: 'Please proceed to phlebotomy / radiology with this token.\nReports will be delivered to referring clinic / WhatsApp.\nReports available within 4 hours.',
                systemNote: 'Thank You • SynOS Diagnostic OS'
            }
        }
    },

    partner_b2b_invoice: {
        slotId: 'partner_b2b_invoice',
        title: 'Partner B2B Diagnostic Service Invoice (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Letterhead & Clinic Brand',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Legal Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Trade Tagline', value: 'B2B Diagnostic & Outsourced Pathology Services' },
                    address: { id: 'address', enabled: true, label: 'Facility Address', value: 'Central Facility, Wyra Road, Khammam, Telangana - 507001' },
                    phone: { id: 'phone', enabled: true, label: 'Accounts Helpdesk', value: '+91 98765 43210' },
                    email: { id: 'email', enabled: true, label: 'Email', value: 'b2b.billing@synoslab.in' },
                    gstin: { id: 'gstin', enabled: true, label: 'GSTIN', value: '36AAAAA0000A1Z5' },
                    pan: { id: 'pan', enabled: true, label: 'PAN', value: 'AAAAA0000A' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'B2B Claim Statement Badge',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Document Title', value: 'B2B DIAGNOSTIC TAX INVOICE' },
                    subBadge: { id: 'subBadge', enabled: true, label: 'Statement Type', value: 'Commercial Claim Statement' },
                    billNumber: { id: 'billNumber', enabled: true, label: 'Invoice No', value: 'B2B-202610-0019' },
                    date: { id: 'date', enabled: true, label: 'Statement Date', value: '14/10/2026 01:00 PM' },
                    billingCycle: { id: 'billingCycle', enabled: true, label: 'Billing Period', value: 'Current Unsettled Claims' },
                    paymentStatus: { id: 'paymentStatus', enabled: true, label: 'Claim Status', value: 'PAYMENT DUE' }
                },
                customLines: []
            },
            partyDetails: {
                id: 'partyDetails',
                name: 'Referral Partner / B2B Client Details',
                enabled: true,
                title: 'Billed To (Referral Partner / Clinic)',
                fields: {
                    fullName: { id: 'fullName', enabled: true, label: 'Partner / Doctor Name', value: 'Dr. Khaleeq Ur Rahman, MD' },
                    clinicName: { id: 'clinicName', enabled: true, label: 'Clinic / Hospital', value: 'Khaleeq Polyclinic & Maternity Center' },
                    partnerId: { id: 'partnerId', enabled: true, label: 'Partner ID', value: 'PART-DR-KHALIKH' },
                    phone: { id: 'phone', enabled: true, label: 'Contact Phone', value: '+91 98490 11223' },
                    address: { id: 'address', enabled: true, label: 'Clinic Address', value: 'Wyra Road, Khammam, Telangana' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Claimed Patient Visits Table',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    token: { id: 'token', enabled: true, label: 'Visit Token' },
                    date: { id: 'date', enabled: true, label: 'Date' },
                    patientName: { id: 'patientName', enabled: true, label: 'Patient Name' },
                    investigations: { id: 'investigations', enabled: true, label: 'Prescribed Investigations' },
                    labBilled: { id: 'labBilled', enabled: true, label: 'Lab Tariff (₹)' },
                    discount: { id: 'discount', enabled: false, label: 'Concession (₹)' },
                    received: { id: 'received', enabled: false, label: 'Direct Paid (₹)' },
                    netDue: { id: 'netDue', enabled: true, label: 'Claim Due (₹)' }
                },
                rows: [
                    { id: 'b2b-1', index: 1, token: 'T-0104', date: '14/10/2026', patientName: 'Mohammed Afzal', investigations: 'CBC, Serum Creatinine', labBilled: 550, received: 0, netDue: 550 },
                    { id: 'b2b-2', index: 2, token: 'T-0118', date: '14/10/2026', patientName: 'Smt. Lakshmi Devi', investigations: 'Lipid Profile, Thyroid Profile', labBilled: 1250, received: 0, netDue: 1250 },
                    { id: 'b2b-3', index: 3, token: 'T-0131', date: '14/10/2026', patientName: 'K. Venkatesh', investigations: 'Whole Abdomen Ultrasound', labBilled: 1200, received: 0, netDue: 1200 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Financial Summary & Net Payable',
                enabled: true,
                fields: {
                    totalVisits: { id: 'totalVisits', enabled: true, label: 'Total Patient Visits Claimed', value: '3 Visits' },
                    grossSubtotal: { id: 'grossSubtotal', enabled: true, label: 'Gross Diagnostic Tariff', value: '₹3,000.00' },
                    discount: { id: 'discount', enabled: false, label: 'Partner Concession / Discount', value: '₹0.00' },
                    totalPaid: { id: 'totalPaid', enabled: true, label: 'Patient Direct Collection', value: '₹0.00' },
                    balanceDue: { id: 'balanceDue', enabled: true, label: 'Net B2B Receivable Amount Due', value: '₹3,000.00' }
                },
                customLines: []
            },
            amountInWords: {
                id: 'amountInWords',
                name: 'Amount in Words Box',
                enabled: true,
                label: 'Amount in Words',
                value: 'Rupees Three Thousand Only'
            },
            bankAndUpi: {
                id: 'bankAndUpi',
                name: 'Bank Remittance & UPI QR',
                enabled: true,
                title: 'Remittance Wire Instructions',
                fields: {
                    showQr: { id: 'showQr', enabled: true, label: 'Dynamic Bharat UPI QR', value: true },
                    bankName: { id: 'bankName', enabled: true, label: 'Bank Name', value: 'HDFC Bank' },
                    accountNumber: { id: 'accountNumber', enabled: true, label: 'A/C No', value: '50200012345678' },
                    ifsc: { id: 'ifsc', enabled: true, label: 'IFSC Code', value: 'HDFC0001234' },
                    branch: { id: 'branch', enabled: true, label: 'Branch', value: 'Main Branch, Hyderabad' },
                    upiId: { id: 'upiId', enabled: true, label: 'UPI ID', value: 'synoslab@hdfcbank' }
                },
                customLines: []
            },
            termsAndConditions: {
                id: 'termsAndConditions',
                name: 'B2B Settlement Terms',
                enabled: true,
                title: 'Commercial Settlement Terms',
                text: '1. Standard lab tariff applies. B2B claims are net of referral commissions on non-prepaid bills.\n2. Payment is due within 15 calendar days from statement generation.\n3. Please remit via NEFT/RTGS/UPI and share UTR reference with accounts desk.',
                systemNote: 'Authentic computerized statement generated by SynOS Diagnostic Enterprise.'
            },
            signatory: {
                id: 'signatory',
                name: 'Commercial Accounts Signatory',
                enabled: true,
                title: 'Authorised Signatory',
                subtitle: 'Finance & Partner Accounts Desk'
            }
        }
    },

    referral_payout_voucher: {
        slotId: 'referral_payout_voucher',
        title: 'Doctor Commission Payout Voucher (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Letterhead & Clinic Brand',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Legal Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Trade Tagline', value: 'Partner Accounts & Professional Remuneration Desk' },
                    address: { id: 'address', enabled: true, label: 'Facility Address', value: 'Central Facility, Wyra Road, Khammam, Telangana - 507001' },
                    gstin: { id: 'gstin', enabled: true, label: 'GSTIN', value: '36AAAAA0000A1Z5' },
                    pan: { id: 'pan', enabled: true, label: 'PAN', value: 'AAAAA0000A' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Voucher Badge & Ref',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Document Title', value: 'DOCTOR COMMISSION PAYOUT VOUCHER' },
                    subBadge: { id: 'subBadge', enabled: true, label: 'Voucher Type', value: 'TDS Sec 194H Compliant Advice' },
                    voucherNumber: { id: 'voucherNumber', enabled: true, label: 'Voucher No', value: 'VCH-202610-0053' },
                    date: { id: 'date', enabled: true, label: 'Disbursement Date', value: '14/10/2026' },
                    financialYear: { id: 'financialYear', enabled: true, label: 'Financial Year', value: '2026 - 2027' }
                },
                customLines: []
            },
            partyDetails: {
                id: 'partyDetails',
                name: 'Doctor Beneficiary Details',
                enabled: true,
                title: 'Beneficiary Doctor Information',
                fields: {
                    fullName: { id: 'fullName', enabled: true, label: 'Doctor Name', value: 'Dr. Khaleeq Ur Rahman, MD' },
                    clinicName: { id: 'clinicName', enabled: true, label: 'Clinic / Speciality', value: 'Khaleeq Polyclinic & Maternity Center' },
                    pan: { id: 'pan', enabled: true, label: 'Doctor PAN No', value: 'BKPPR9988C' },
                    bankName: { id: 'bankName', enabled: true, label: 'Beneficiary Bank', value: 'State Bank of India' },
                    accountNumber: { id: 'accountNumber', enabled: true, label: 'A/C Number', value: '30291049201' },
                    ifsc: { id: 'ifsc', enabled: true, label: 'IFSC Code', value: 'SBIN0000854' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Referred Patients Table',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    token: { id: 'token', enabled: true, label: 'Token' },
                    date: { id: 'date', enabled: true, label: 'Visit Date' },
                    patientName: { id: 'patientName', enabled: true, label: 'Patient Name' },
                    testNames: { id: 'testNames', enabled: true, label: 'Completed Tests' },
                    patientPaid: { id: 'patientPaid', enabled: true, label: 'Patient Paid (₹)' },
                    rate: { id: 'rate', enabled: true, label: 'Cut %' },
                    referralAmount: { id: 'referralAmount', enabled: true, label: 'Commission (₹)' }
                },
                rows: [
                    { id: 'v-1', index: 1, token: 'T-0042', date: '14/10/2026', patientName: 'P. Anjaiah', testNames: 'Whole Abdomen USG, LFT', patientPaid: 2050, rate: '20%', referralAmount: 410 },
                    { id: 'v-2', index: 2, token: 'T-0068', date: '14/10/2026', patientName: 'B. Suresh Babu', testNames: 'CT Brain Plain', patientPaid: 3200, rate: '25%', referralAmount: 800 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'TDS Deduction & Net Disbursed',
                enabled: true,
                fields: {
                    totalReferredVisits: { id: 'totalReferredVisits', enabled: true, label: 'Total Referred Cases', value: '2 Cases' },
                    totalPatientCollection: { id: 'totalPatientCollection', enabled: true, label: 'Total Patient Collection', value: '₹5,250.00' },
                    grossReferralAmount: { id: 'grossReferralAmount', enabled: true, label: 'Gross Referral Commission', value: '₹1,210.00' },
                    tdsDeduction: { id: 'tdsDeduction', enabled: true, label: 'TDS Deduction @ 5% (Sec 194H)', value: '-₹60.50' },
                    netPayoutAmount: { id: 'netPayoutAmount', enabled: true, label: 'Net Payout Disbursed', value: '₹1,149.50' }
                },
                customLines: []
            },
            amountInWords: {
                id: 'amountInWords',
                name: 'Amount in Words Box',
                enabled: true,
                label: 'Net Payout in Words',
                value: 'Rupees One Thousand One Hundred Forty Nine Only'
            },
            termsAndConditions: {
                id: 'termsAndConditions',
                name: 'Statutory Notes & Declarations',
                enabled: true,
                title: 'Statutory Declaration',
                text: '1. Referral incentives are credited strictly post patient bill realization.\n2. TDS @ 5% is deducted under Section 194H of Income Tax Act for annual payouts exceeding ₹15,000.\n3. Form 16A quarterly TDS certificates will be issued via TRACES.',
                systemNote: 'Authentic voucher generated by SynOS Finance Terminal.'
            },
            signatory: {
                id: 'signatory',
                name: 'Dual Authorization Signatures',
                enabled: true,
                title: 'Authorised Accounts Officer',
                subtitle: 'Doctor / Receiver Acknowledgment Stamp'
            }
        }
    },

    procurement_po: {
        slotId: 'procurement_po',
        title: 'Vendor Purchase Order (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Buyer Entity Header',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Buyer Legal Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Tagline', value: 'Central Reagent Procurement & Medical Stores' },
                    address: { id: 'address', enabled: true, label: 'Delivery Dock Address', value: 'Phase 1 Central Stores, Wyra Road, Khammam - 507001' },
                    phone: { id: 'phone', enabled: true, label: 'Purchase Desk', value: '+91 98765 43210' },
                    email: { id: 'email', enabled: true, label: 'Email', value: 'procurement@synoslab.in' },
                    gstin: { id: 'gstin', enabled: true, label: 'GSTIN', value: '36AAAAA0000A1Z5' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Purchase Order Badge',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Document Title', value: 'COMMERCIAL PURCHASE ORDER' },
                    poNumber: { id: 'poNumber', enabled: true, label: 'PO Number', value: 'PO-202610-0012' },
                    date: { id: 'date', enabled: true, label: 'PO Release Date', value: '14/10/2026' },
                    paymentTerms: { id: 'paymentTerms', enabled: true, label: 'Payment Terms', value: 'Net 30 Days Post GRN' }
                },
                customLines: []
            },
            partyDetails: {
                id: 'partyDetails',
                name: 'Vendor / Supplier Information',
                enabled: true,
                title: 'Vendor / Supplier Details',
                fields: {
                    fullName: { id: 'fullName', enabled: true, label: 'Vendor Company Name', value: 'Roche Diagnostics India Pvt Ltd' },
                    contactPerson: { id: 'contactPerson', enabled: true, label: 'Contact Person', value: 'Mr. Anand Varma' },
                    phone: { id: 'phone', enabled: true, label: 'Contact Phone', value: '+91 98490 88776' },
                    gstin: { id: 'gstin', enabled: true, label: 'Vendor GSTIN', value: '36AABCR1234F1Z9' },
                    address: { id: 'address', enabled: true, label: 'Vendor Address', value: 'Phase 2 Logistics Park, Hyderabad' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Reagents & Supplies Line Items',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    description: { id: 'description', enabled: true, label: 'Item / Reagent Description' },
                    packSize: { id: 'packSize', enabled: true, label: 'Pack Size' },
                    quantity: { id: 'quantity', enabled: true, label: 'Ordered Qty' },
                    price: { id: 'price', enabled: true, label: 'Unit Rate (₹)' },
                    amount: { id: 'amount', enabled: true, label: 'Total Value (₹)' }
                },
                rows: [
                    { id: 'p-1', index: 1, description: 'Cobas c311 Reagent Kit - Creatinine Jaffé Gen.2', packSize: '350 Tests Kit', quantity: '5 Kits', price: 4200, amount: 21000 },
                    { id: 'p-2', index: 2, description: 'Sysmex XN-L Cellpack DCL Diluent 20L', packSize: '20 Litre Canister', quantity: '2 Cans', price: 6800, amount: 13600 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'PO Commercial Totals',
                enabled: true,
                fields: {
                    grossSubtotal: { id: 'grossSubtotal', enabled: true, label: 'Subtotal Value', value: '₹34,600.00' },
                    gstinValue: { id: 'gstinValue', enabled: true, label: 'Estimated GST (12%)', value: '₹4,152.00' },
                    totalAmount: { id: 'totalAmount', enabled: true, label: 'Grand Total PO Value', value: '₹38,752.00' }
                },
                customLines: []
            },
            termsAndConditions: {
                id: 'termsAndConditions',
                name: 'Procurement Terms & SLA',
                enabled: true,
                title: 'Procurement Terms & Conditions',
                text: '1. Goods must have minimum 12 months remaining shelf life upon receiving.\n2. Cold-chain items must be delivered at 2°C - 8°C with digital data-logger.\n3. Defective lots or temperature excursions subject to immediate replacement at vendor cost.',
                systemNote: 'Authorized Purchase Order • SynOS Procurement Terminal'
            },
            signatory: {
                id: 'signatory',
                name: 'Purchase Approval Signatory',
                enabled: true,
                title: 'Head of Stores & Procurement',
                subtitle: 'Medical Director Approval'
            }
        }
    },

    procurement_grn: {
        slotId: 'procurement_grn',
        title: 'Material GRN (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Letterhead',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Legal Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Trade Tagline', value: 'Central Reagent Stores & Receiving Dock' },
                    address: { id: 'address', enabled: true, label: 'Facility Address', value: 'Central Diagnostic Complex, Khammam - 507001' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Document Badge & Meta',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Document Title', value: 'GOODS RECEIPT NOTE (GRN)' },
                    grnNumber: { id: 'grnNumber', enabled: true, label: 'GRN No', value: 'GRN-202610-0014' },
                    date: { id: 'date', enabled: true, label: 'Inward Date', value: '14/10/2026' },
                    poNumber: { id: 'poNumber', enabled: true, label: 'PO Reference', value: 'PO-202610-008' },
                    receivedBy: { id: 'receivedBy', enabled: true, label: 'Received By', value: 'Store Incharge' }
                },
                customLines: []
            },
            partyDetails: {
                id: 'partyDetails',
                name: 'Supplier & Delivery Info',
                enabled: true,
                title: 'Vendor / Delivery Details',
                fields: {
                    supplierName: { id: 'supplierName', enabled: true, label: 'Supplier Name', value: 'Transasia Bio-Medicals Ltd' },
                    invoiceNumber: { id: 'invoiceNumber', enabled: true, label: 'Vendor Invoice No', value: 'INV-TB-99182' },
                    challanNumber: { id: 'challanNumber', enabled: true, label: 'Delivery Challan No', value: 'DC-88192' },
                    storageLocation: { id: 'storageLocation', enabled: true, label: 'Cold-Chain / Room', value: 'Cold Room (2°C - 8°C)' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Received Materials Table',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    description: { id: 'description', enabled: true, label: 'Item / Reagent Name' },
                    batchNumber: { id: 'batchNumber', enabled: true, label: 'Batch No' },
                    expiryDate: { id: 'expiryDate', enabled: true, label: 'Expiry Date' },
                    receivedQuantity: { id: 'receivedQuantity', enabled: true, label: 'Qty Received' },
                    unitCost: { id: 'unitCost', enabled: true, label: 'Unit Rate (₹)' },
                    total: { id: 'total', enabled: true, label: 'Total Value (₹)' }
                },
                rows: [
                    { id: 'grn-1', index: 1, description: 'Erba LFT Reagent Kit (Pack of 500 Tests)', batchNumber: 'ERB-9921', expiryDate: '11/2027', receivedQuantity: 2, unitCost: 4500, total: 9000 },
                    { id: 'grn-2', index: 2, description: 'Vacutainer K2 EDTA Blood Collection Tubes (Pack of 100)', batchNumber: 'BD-8812', expiryDate: '06/2028', receivedQuantity: 5, unitCost: 650, total: 3250 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'GRN Totals',
                enabled: true,
                fields: {
                    totalItemsCount: { id: 'totalItemsCount', enabled: true, label: 'Total Material Lines', value: '2 Lines' },
                    totalAmount: { id: 'totalAmount', enabled: true, label: 'Total Inward Value', value: '₹12,250.00' }
                },
                customLines: []
            },
            signatory: {
                id: 'signatory',
                name: 'Verification Signatures',
                enabled: true,
                title: 'Inspected & Received By (Stores)',
                subtitle: 'Accounts / GRN Stamp'
            }
        }
    },

    workforce_payslip: {
        slotId: 'workforce_payslip',
        title: 'Confidential Salary Pay Slip (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Employer Header',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Employer Name', value: 'SynOS Diagnostic Centre & Laboratory Pvt Ltd' },
                    tagline: { id: 'tagline', enabled: true, label: 'Sub-Header', value: 'Human Resources & Payroll Administration' },
                    address: { id: 'address', enabled: true, label: 'Office Address', value: 'Central Facility, Wyra Road, Khammam, Telangana - 507001' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Payslip Badge & Month',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Slip Title', value: 'CONFIDENTIAL SALARY PAY SLIP' },
                    monthYear: { id: 'monthYear', enabled: true, label: 'Pay Period', value: 'October 2026' },
                    disbursementDate: { id: 'disbursementDate', enabled: true, label: 'Disbursement Date', value: '31/10/2026' }
                },
                customLines: []
            },
            partyDetails: {
                id: 'partyDetails',
                name: 'Staff & Employment Particulars',
                enabled: true,
                title: 'Employee Particulars',
                fields: {
                    fullName: { id: 'fullName', enabled: true, label: 'Employee Name', value: 'B. Vinay Kumar' },
                    employeeId: { id: 'employeeId', enabled: true, label: 'Employee Code', value: 'EMP-0142' },
                    designation: { id: 'designation', enabled: true, label: 'Designation', value: 'Senior Lab Technologist' },
                    department: { id: 'department', enabled: true, label: 'Department', value: 'Pathology & Automation' },
                    pan: { id: 'pan', enabled: true, label: 'PAN No', value: 'ABCDE1234F' },
                    uan: { id: 'uan', enabled: true, label: 'EPF UAN', value: '100928472910' },
                    esiNo: { id: 'esiNo', enabled: true, label: 'ESIC IP No', value: '5201948201' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Earnings & Deductions Table',
                enabled: true,
                columns: {
                    earningDesc: { id: 'earningDesc', enabled: true, label: 'Earnings Description' },
                    earningAmount: { id: 'earningAmount', enabled: true, label: 'Amount (₹)' },
                    deductionDesc: { id: 'deductionDesc', enabled: true, label: 'Statutory Deductions' },
                    deductionAmount: { id: 'deductionAmount', enabled: true, label: 'Amount (₹)' }
                },
                rows: [
                    { id: 'w-1', earningDesc: 'Basic Pay', earningAmount: 18000, deductionDesc: 'Provident Fund (EPF 12%)', deductionAmount: 1800 },
                    { id: 'w-2', earningDesc: 'House Rent Allowance (HRA)', earningAmount: 7000, deductionDesc: 'ESIC Contribution (0.75%)', deductionAmount: 225 },
                    { id: 'w-3', earningDesc: 'Medical & Shift Allowance', earningAmount: 5000, deductionDesc: 'Professional Tax (PT)', deductionAmount: 200 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Net Salary Disbursed',
                enabled: true,
                fields: {
                    grossEarnings: { id: 'grossEarnings', enabled: true, label: 'Gross Monthly Earnings', value: '₹30,000.00' },
                    totalDeductions: { id: 'totalDeductions', enabled: true, label: 'Total Deductions', value: '₹2,225.00' },
                    netSalary: { id: 'netSalary', enabled: true, label: 'Net Take-Home Salary', value: '₹27,775.00' }
                },
                customLines: []
            },
            termsAndConditions: {
                id: 'termsAndConditions',
                name: 'Payroll Confidentiality Notice',
                enabled: true,
                title: 'Confidentiality Note',
                text: 'This is a computer-generated salary advice and requires no physical signature.\nCompensation details are strictly confidential between employee and SynOS Healthcare.',
                systemNote: 'Direct Credit via NEFT / Automated SynOS Workforce Payroll'
            },
            signatory: {
                id: 'signatory',
                name: 'HR & Accounts Signature',
                enabled: true,
                title: 'Head of Human Resources',
                subtitle: 'Finance & Payroll Desk'
            }
        }
    },

    overhead_expense_voucher: {
        slotId: 'overhead_expense_voucher',
        title: 'Petty Expense & Debit Voucher (A5 / Half-Sheet)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Brand Header',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Entity Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Tagline', value: 'Operating Expense & Cash Disbursement Desk' },
                    address: { id: 'address', enabled: true, label: 'Facility', value: 'Wyra Road, Khammam - 507001' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Voucher Number & Meta',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Voucher Title', value: 'PAYMENT & DEBIT VOUCHER' },
                    voucherNumber: { id: 'voucherNumber', enabled: true, label: 'Voucher No', value: 'EXP-202610-0031' },
                    date: { id: 'date', enabled: true, label: 'Payment Date', value: '14/10/2026' },
                    paymentMode: { id: 'paymentMode', enabled: true, label: 'Mode of Payment', value: 'Petty Cash Desk' }
                },
                customLines: []
            },
            partyDetails: {
                id: 'partyDetails',
                name: 'Paid To / Beneficiary Info',
                enabled: true,
                title: 'Paid To / Purpose',
                fields: {
                    fullName: { id: 'fullName', enabled: true, label: 'Payee / Vendor', value: 'Sri Balaji Stationery & Printing' },
                    expenseCategory: { id: 'expenseCategory', enabled: true, label: 'Expense Category', value: 'Office Stationery & Thermal Rolls' },
                    approvedBy: { id: 'approvedBy', enabled: true, label: 'Approved By', value: 'Clinic Operations Manager' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Expense Line Items',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    description: { id: 'description', enabled: true, label: 'Particulars / Description' },
                    amount: { id: 'amount', enabled: true, label: 'Amount (₹)' }
                },
                rows: [
                    { id: 'exp-1', index: 1, description: '80mm POS Thermal Paper Rolls (Pack of 50)', amount: 1250 },
                    { id: 'exp-2', index: 2, description: 'A4 Copier Paper 75 GSM (2 Reams)', amount: 700 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Total Disbursed',
                enabled: true,
                fields: {
                    totalAmount: { id: 'totalAmount', enabled: true, label: 'Total Paid Amount', value: '₹1,950.00' }
                },
                customLines: []
            },
            amountInWords: {
                id: 'amountInWords',
                name: 'Amount in Words',
                enabled: true,
                label: 'Rupees in Words',
                value: 'Rupees One Thousand Nine Hundred Fifty Only'
            },
            signatory: {
                id: 'signatory',
                name: 'Dual Authorization',
                enabled: true,
                title: 'Disbursed By (Cashier)',
                subtitle: 'Receiver Signature & Date'
            }
        }
    },

    corporate_b2b_invoice: {
        slotId: 'corporate_b2b_invoice',
        title: 'Prepaid B2B Bill (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Letterhead & Clinic Brand',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Legal Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Trade Tagline', value: 'Comprehensive Pathology, Radiology & Molecular Diagnostics' },
                    address: { id: 'address', enabled: true, label: 'Facility Address', value: 'Central Diagnostic Complex, Main Road' },
                    phone: { id: 'phone', enabled: true, label: 'Phone', value: '+91 98765 43210' },
                    email: { id: 'email', enabled: true, label: 'Email', value: 'billing@synoslab.in' },
                    gstin: { id: 'gstin', enabled: true, label: 'GSTIN', value: '36AAAAA0000A1Z5' },
                    pan: { id: 'pan', enabled: true, label: 'PAN', value: 'AAAAA0000A' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Document Badge & Meta',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Document Title', value: 'PREPAID B2B TAX INVOICE' },
                    subBadge: { id: 'subBadge', enabled: true, label: 'Billing Mode', value: 'B2B Partner Prepaid Account' },
                    billNumber: { id: 'billNumber', enabled: true, label: 'Invoice No', value: 'INV-B2B-202610-0081' },
                    date: { id: 'date', enabled: true, label: 'Invoice Date', value: '14/10/2026 12:45 PM' },
                    tokenNumber: { id: 'tokenNumber', enabled: true, label: 'Token No', value: 'COUNTER-104' },
                    paymentStatus: { id: 'paymentStatus', enabled: true, label: 'Desk Payment Status', value: 'PARTNER SETTLED (PATIENT CASH: ₹0.00)' }
                },
                customLines: []
            },
            partyDetails: {
                id: 'partyDetails',
                name: 'Referral Partner & Patient Details',
                enabled: true,
                title: 'Billed To (Referral Partner Account)',
                fields: {
                    sponsorName: { id: 'sponsorName', enabled: true, label: 'Billed To Partner', value: 'Padmavathi Nursing Home & Hospital' },
                    referringDoctor: { id: 'referringDoctor', enabled: true, label: 'Referring Doctor', value: 'Dr. B.S.V. Padmavathi, MD' },
                    partnerId: { id: 'partnerId', enabled: true, label: 'Partner Code', value: 'PART-PADMAVATHI-01' },
                    fullName: { id: 'fullName', enabled: true, label: 'Patient Name', value: 'K. Ramesh Kumar' },
                    uhid: { id: 'uhid', enabled: true, label: 'UHID / MRN', value: 'SYN-2026-9042' },
                    ageGender: { id: 'ageGender', enabled: true, label: 'Age / Gender', value: '46 Yrs / Male' },
                    phone: { id: 'phone', enabled: true, label: 'Patient Mobile', value: '+91 98480 22334' },
                    address: { id: 'address', enabled: true, label: 'Patient Address', value: 'Doctors Colony, Khammam' }
                },
                customLines: []
            },
            billerDetails: {
                id: 'billerDetails',
                name: 'Billing Desk Particulars',
                enabled: true,
                title: 'Billing Desk',
                fields: {
                    billedBy: { id: 'billedBy', enabled: true, label: 'Billed by', value: 'Dr. Vasudeva Rao (admin)' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Prescribed Investigations Table',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    description: { id: 'description', enabled: true, label: 'Investigation / Service Description' },
                    department: { id: 'department', enabled: true, label: 'Department' },
                    sacCode: { id: 'sacCode', enabled: true, label: 'SAC Code' },
                    price: { id: 'price', enabled: true, label: 'Lab Tariff (₹)' },
                    discount: { id: 'discount', enabled: true, label: 'Partner Concession (₹)' },
                    amount: { id: 'amount', enabled: true, label: 'Billed to Partner (₹)' }
                },
                rows: [
                    { id: 'b2b-1', index: 1, description: 'Complete Blood Count (5-Part Automated with ESR)', department: 'Hematology', sacCode: '999312', price: 350, discount: 0, amount: 350 },
                    { id: 'b2b-2', index: 2, description: 'Liver Function Test Profile (LFT 11 Parameters)', department: 'Biochemistry', sacCode: '999312', price: 850, discount: 50, amount: 800 },
                    { id: 'b2b-3', index: 3, description: 'Ultrasound Whole Abdomen (Sonography)', department: 'Radiology', sacCode: '999312', price: 1200, discount: 0, amount: 1200 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Prepaid Settlement & Counter Notice',
                enabled: true,
                isPrepaidNotice: true,
                fields: {
                    grossSubtotal: { id: 'grossSubtotal', enabled: true, label: 'Gross Diagnostic Tariff', value: '₹2,400.00' },
                    partnerDiscount: { id: 'partnerDiscount', enabled: true, label: 'Partner Concession', value: '-₹50.00' },
                    totalAmount: { id: 'totalAmount', enabled: true, label: 'Net Billed to Partner Account', value: '₹2,350.00' },
                    settlementMode: { id: 'settlementMode', enabled: true, label: 'Partner Ledger Status', value: 'Direct Settlement by Referring Clinic / Doctor' },
                    counterPayable: { id: 'counterPayable', enabled: true, label: 'Amount Payable by Patient at Desk', value: '₹0.00 (Paid at Partner Clinic)' }
                },
                customLines: []
            },
            amountInWords: {
                id: 'amountInWords',
                name: 'Amount in Words',
                enabled: true,
                label: 'Partner Billed Amount in Words',
                value: 'Rupees Two Thousand Three Hundred Fifty Only'
            },
            termsAndConditions: {
                id: 'termsAndConditions',
                name: 'Prepaid Settlement Terms',
                enabled: true,
                title: 'Terms & Conditions',
                text: '1. Diagnostic charges are billed directly to the referring partner clinic account.\n2. No desk payment collected from patient at sample collection counter.\n3. Verified test results delivered to referring clinic / doctor and sent to registered patient mobile.\n4. Cheques / RTGS subject to periodic monthly realization.',
                systemNote: 'This is an authentic computer-generated Prepaid B2B Tax Invoice generated by SynOS Diagnostic OS.'
            },
            signatory: {
                id: 'signatory',
                name: 'Signatory',
                enabled: true,
                title: 'Authorised Signatory',
                subtitle: 'Accounts & Billing Desk'
            }
        }
    },

    insurance_thermal_receipt: {
        slotId: 'insurance_thermal_receipt',
        title: 'Insurance Cashless Slip (80mm)',
        isThermal: true,
        boxes: {
            header: {
                id: 'header',
                name: 'Thermal Brand Header',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Lab Name', value: 'SYNOS DIAGNOSTIC LAB' },
                    tagline: { id: 'tagline', enabled: false, label: 'Tagline', value: 'Automated Pathology & Imaging' },
                    address: { id: 'address', enabled: true, label: 'Address', value: 'Central Diagnostic Complex, Main Road | Ph: 9876543210' },
                    gstin: { id: 'gstin', enabled: false, label: 'GSTIN', value: '36AAAAA0000A1Z5' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Claim Particulars',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Slip Title', value: 'CASHLESS TPA CLAIM SLIP' },
                    receiptNumber: { id: 'receiptNumber', enabled: true, label: 'Slip / Claim No', value: 'CLM-202610-0912' },
                    date: { id: 'date', enabled: true, label: 'Date/Time', value: '14/10/2026 12:48 PM' },
                    tokenNumber: { id: 'tokenNumber', enabled: true, label: 'Token No', value: 'TOKEN # T-0142' },
                    claimStatus: { id: 'claimStatus', enabled: true, label: 'Claim Status', value: 'APPROVED / PRE-AUTH' }
                },
                customLines: []
            },
            partyDetails: {
                id: 'partyDetails',
                name: 'Claimant & Insurance Info',
                enabled: true,
                title: 'Patient & Insurance',
                fields: {
                    fullName: { id: 'fullName', enabled: true, label: 'Patient Name', value: 'S. Anusha' },
                    uhid: { id: 'uhid', enabled: true, label: 'UHID', value: 'SYN-2026-8819' },
                    ageGender: { id: 'ageGender', enabled: true, label: 'Age/Sex', value: '34Y / F' },
                    insuranceProvider: { id: 'insuranceProvider', enabled: true, label: 'Insurance Co', value: 'Star Health & Allied Insurance' },
                    tpaName: { id: 'tpaName', enabled: true, label: 'TPA Network', value: 'Medi Assist TPA' },
                    policyNumber: { id: 'policyNumber', enabled: true, label: 'Policy No', value: 'POL-STAR-771920' },
                    preAuthApprovalNumber: { id: 'preAuthApprovalNumber', enabled: true, label: 'Pre-Auth No', value: 'PA-STAR-99214' }
                },
                customLines: []
            },
            billerDetails: {
                id: 'billerDetails',
                name: 'Billing Desk Box',
                enabled: true,
                title: 'BILLING DESK',
                fields: {
                    billedBy: { id: 'billedBy', enabled: true, label: 'Billed by', value: 'Dr. Vasudeva Rao (admin)' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Approved Tests & Packages Slip',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    description: { id: 'description', enabled: true, label: 'Investigation / Package' },
                    price: { id: 'price', enabled: true, label: 'Claim (₹)' }
                },
                rows: [
                    { id: 'r-1', index: 1, description: 'MRI Brain with Contrast (3.0 Tesla Protocol)', price: 6500, amount: 6500 },
                    { id: 'r-2', index: 2, description: 'Executive Health Checkup Package', price: 2000, amount: 2000 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Claim Totals',
                enabled: true,
                fields: {
                    grossAmount: { id: 'grossAmount', enabled: true, label: 'Total Diagnostic Tariff', value: '₹8,500.00' },
                    coPayAmount: { id: 'coPayAmount', enabled: true, label: 'Patient Co-Pay Received', value: '₹500.00' },
                    totalAmount: { id: 'totalAmount', enabled: true, label: 'Net Billed to TPA', value: '₹8,000.00' },
                    balanceDue: { id: 'balanceDue', enabled: true, label: 'Patient Desk Due', value: '₹0.00 (Settled)' }
                },
                customLines: []
            },
            termsAndConditions: {
                id: 'termsAndConditions',
                name: 'Counter Instructions',
                enabled: true,
                title: 'Notice',
                text: 'Cashless facility approved as per TPA sanction.\nPlease proceed to phlebotomy / imaging counters.\nReports dispatched to hospital portal & patient WhatsApp.',
                systemNote: 'Thank You • SynOS Diagnostic OS'
            }
        }
    },

    insurance_tpa_claim: {
        slotId: 'insurance_tpa_claim',
        title: 'Insurance Bill (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Letterhead',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Legal Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Trade Tagline', value: 'NABH / NABL Accredited Healthcare Network' },
                    address: { id: 'address', enabled: true, label: 'Facility Address', value: 'Central Diagnostic Complex, Main Road' },
                    phone: { id: 'phone', enabled: true, label: 'Phone', value: '+91 98765 43210' },
                    email: { id: 'email', enabled: true, label: 'Email', value: 'tpa@synoslab.in' },
                    gstin: { id: 'gstin', enabled: true, label: 'GSTIN', value: '36AAAAA0000A1Z5' },
                    pan: { id: 'pan', enabled: true, label: 'PAN', value: 'AAAAA0000A' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Document Badge & Meta',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Document Title', value: 'CASHLESS TPA CLAIM INVOICE' },
                    subBadge: { id: 'subBadge', enabled: true, label: 'Coverage', value: 'Cashless Medical Claim' },
                    billNumber: { id: 'billNumber', enabled: true, label: 'Invoice No', value: 'INV-INS-202610-0055' },
                    date: { id: 'date', enabled: true, label: 'Claim Date', value: '14/10/2026' },
                    claimStatus: { id: 'claimStatus', enabled: true, label: 'Claim Status', value: 'APPROVED / PRE-AUTHORIZED' }
                },
                customLines: []
            },
            partyDetails: {
                id: 'partyDetails',
                name: 'Patient & Insurance Info',
                enabled: true,
                title: 'Claimant & Policy Details',
                fields: {
                    fullName: { id: 'fullName', enabled: true, label: 'Patient Name', value: 'S. Anusha' },
                    uhid: { id: 'uhid', enabled: true, label: 'UHID / IP No', value: 'SYN-2026-8819' },
                    ageGender: { id: 'ageGender', enabled: true, label: 'Age / Gender', value: '34 Yrs / Female' },
                    insuranceProvider: { id: 'insuranceProvider', enabled: true, label: 'Insurance Company', value: 'Star Health & Allied Insurance' },
                    tpaName: { id: 'tpaName', enabled: true, label: 'TPA Network', value: 'Medi Assist Insurance TPA' },
                    policyNumber: { id: 'policyNumber', enabled: true, label: 'Policy / Card No', value: 'POL-STAR-771920' },
                    preAuthApprovalNumber: { id: 'preAuthApprovalNumber', enabled: true, label: 'Pre-Auth Approval No', value: 'PA-STAR-99214' }
                },
                customLines: []
            },
            billerDetails: {
                id: 'billerDetails',
                name: 'Billing Desk Particulars',
                enabled: true,
                title: 'Billing Desk',
                fields: {
                    billedBy: { id: 'billedBy', enabled: true, label: 'Billed by', value: 'Dr. Vasudeva Rao (admin)' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Approved Investigations & Packages Table',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    description: { id: 'description', enabled: true, label: 'Investigation / Health Package' },
                    sacCode: { id: 'sacCode', enabled: true, label: 'SAC Code' },
                    price: { id: 'price', enabled: true, label: 'TPA Tariff (₹)' },
                    discount: { id: 'discount', enabled: true, label: 'Co-Pay (₹)' },
                    amount: { id: 'amount', enabled: true, label: 'Claim Amount (₹)' }
                },
                rows: [
                    { id: 'ins-1', index: 1, description: 'MRI Brain with Contrast (3.0 Tesla Protocol)', sacCode: '999312', price: 6500, discount: 0, amount: 6500 },
                    { id: 'ins-2', index: 2, description: 'Executive Comprehensive Health Checkup Package', sacCode: '999312', price: 2500, discount: 500, amount: 2000 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Claim Financials',
                enabled: true,
                fields: {
                    grossSubtotal: { id: 'grossSubtotal', enabled: true, label: 'Gross Claim', value: '₹9,000.00' },
                    coPayAmount: { id: 'coPayAmount', enabled: true, label: 'Patient Co-Pay Received', value: '₹500.00' },
                    totalAmount: { id: 'totalAmount', enabled: true, label: 'Net Approved TPA Claim', value: '₹8,500.00' },
                    balanceDue: { id: 'balanceDue', enabled: true, label: 'Pending from TPA', value: '₹8,500.00' }
                },
                customLines: []
            },
            amountInWords: {
                id: 'amountInWords',
                name: 'Amount in Words',
                enabled: true,
                label: 'Claim Amount in Words',
                value: 'Rupees Eight Thousand Five Hundred Only'
            },
            signatory: {
                id: 'signatory',
                name: 'Signatory',
                enabled: true,
                title: 'Medical Superintendent',
                subtitle: 'TPA & Cashless Claims Desk'
            }
        }
    },

    outsourced_lab_manifest: {
        slotId: 'outsourced_lab_manifest',
        title: 'Outsource Slip (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Letterhead',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Legal Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Trade Tagline', value: 'Central Specimen Dispatch & Reference Lab Gateway' },
                    address: { id: 'address', enabled: true, label: 'Facility Address', value: 'Wyra Road, Khammam, Telangana - 507001' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Manifest Details',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Document Title', value: 'OUTSOURCED SPECIMEN MANIFEST' },
                    manifestNumber: { id: 'manifestNumber', enabled: true, label: 'Manifest No', value: 'MAN-202610-0019' },
                    date: { id: 'date', enabled: true, label: 'Dispatch Date & Time', value: '14/10/2026 05:30 PM' },
                    courierMode: { id: 'courierMode', enabled: true, label: 'Transport Mode', value: 'Cold-Chain Courier / Express Cargo' }
                },
                customLines: []
            },
            partyDetails: {
                id: 'partyDetails',
                name: 'Reference Lab (Sent To)',
                enabled: true,
                title: 'Destination Reference Laboratory',
                fields: {
                    referenceLabName: { id: 'referenceLabName', enabled: true, label: 'Reference Lab', value: 'Thyrocare Technologies / Metropolis Central Lab' },
                    labCode: { id: 'labCode', enabled: true, label: 'Account Code', value: 'REF-LAB-01' },
                    address: { id: 'address', enabled: true, label: 'Lab City / Hub', value: 'Hyderabad Central Processing Lab' },
                    contactPerson: { id: 'contactPerson', enabled: true, label: 'Courier Waybill No', value: 'WB-991823746' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Specimen Dispatch List',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    patientName: { id: 'patientName', enabled: true, label: 'Patient Name' },
                    token: { id: 'token', enabled: true, label: 'Token / SID' },
                    description: { id: 'description', enabled: true, label: 'Special Investigation' },
                    sampleType: { id: 'sampleType', enabled: true, label: 'Specimen Type & Temp' },
                    rate: { id: 'rate', enabled: true, label: 'Estimated Rate (₹)' }
                },
                rows: [
                    { id: 'out-1', index: 1, patientName: 'N. Rajesh', token: 'T-104', description: 'Dual Marker Prenatal Screen (FMF Accredited)', sampleType: 'Serum (Cold-Chain 2-8°C)', rate: 1600 },
                    { id: 'out-2', index: 2, patientName: 'M. Sridevi', token: 'T-109', description: 'HLA B27 by Real-Time PCR', sampleType: 'Whole Blood EDTA (Ambient)', rate: 1900 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Dispatch Summary',
                enabled: true,
                fields: {
                    totalSamples: { id: 'totalSamples', enabled: true, label: 'Total Specimens Dispatched', value: '2 Vials' },
                    totalAmount: { id: 'totalAmount', enabled: true, label: 'Total B2B Outsource Cost', value: '₹3,500.00' }
                },
                customLines: []
            },
            signatory: {
                id: 'signatory',
                name: 'Dispatch Signatory',
                enabled: true,
                title: 'Phlebotomy / Dispatch Incharge',
                subtitle: 'Courier Acceptance Signature'
            }
        }
    },

    summary_bills_daybook: {
        slotId: 'summary_bills_daybook',
        title: 'Bills Daybook (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Letterhead',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Legal Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Trade Tagline', value: 'Daily Commercial Daybook & Collection Audit' },
                    address: { id: 'address', enabled: true, label: 'Facility Address', value: 'Central Diagnostic Complex, Khammam - 507001' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Audit Statement Meta',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Document Title', value: 'BILLS & COLLECTIONS DAYBOOK' },
                    statementPeriod: { id: 'statementPeriod', enabled: true, label: 'Filter Range', value: 'Today (All Modalities & Branches)' },
                    generatedAt: { id: 'generatedAt', enabled: true, label: 'Report Generated At', value: '14/10/2026 09:30 PM' },
                    branchName: { id: 'branchName', enabled: true, label: 'Branch', value: 'All Branches' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Bills Daybook Register Table',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    billNumber: { id: 'billNumber', enabled: true, label: 'Bill No' },
                    token: { id: 'token', enabled: true, label: 'Token' },
                    patientName: { id: 'patientName', enabled: true, label: 'Patient Name' },
                    department: { id: 'department', enabled: true, label: 'Dept' },
                    grossAmount: { id: 'grossAmount', enabled: true, label: 'Billed (₹)' },
                    received: { id: 'received', enabled: true, label: 'Collected (₹)' },
                    netDue: { id: 'netDue', enabled: true, label: 'Due (₹)' }
                },
                rows: [
                    { id: 'db-1', index: 1, billNumber: 'BILL-20261014-01', token: 'T-101', patientName: 'P. Suresh', department: 'Pathology', grossAmount: 1200, received: 1200, netDue: 0 },
                    { id: 'db-2', index: 2, billNumber: 'BILL-20261014-02', token: 'T-102', patientName: 'G. Lakshmi', department: 'Radiology', grossAmount: 2500, received: 2000, netDue: 500 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Daybook Totals',
                enabled: true,
                fields: {
                    totalBillsCount: { id: 'totalBillsCount', enabled: true, label: 'Total Visits / Bills', value: '2 Bills' },
                    totalBilled: { id: 'totalBilled', enabled: true, label: 'Gross Billed', value: '₹3,700.00' },
                    totalCollected: { id: 'totalCollected', enabled: true, label: 'Total Collections', value: '₹3,200.00' },
                    totalDue: { id: 'totalDue', enabled: true, label: 'Total Pending Due', value: '₹500.00' }
                },
                customLines: []
            },
            signatory: {
                id: 'signatory',
                name: 'Verification Signatory',
                enabled: true,
                title: 'Accounts Desk / Cashier',
                subtitle: 'Audited By Finance Head'
            }
        }
    },

    summary_doctor_dues: {
        slotId: 'summary_doctor_dues',
        title: 'Doctor Dues Summary (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Letterhead',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Legal Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Trade Tagline', value: 'Referring Doctors Ledger & Outstanding Summary' },
                    address: { id: 'address', enabled: true, label: 'Facility Address', value: 'Khammam, Telangana - 507001' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Statement Meta',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Document Title', value: 'DOCTOR DUES & COMMISSIONS SUMMARY' },
                    statementPeriod: { id: 'statementPeriod', enabled: true, label: 'Audit Period', value: 'Current Settlement Cycle' },
                    generatedAt: { id: 'generatedAt', enabled: true, label: 'Generated At', value: '14/10/2026' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Doctor Receivables & Payables Table',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    doctorName: { id: 'doctorName', enabled: true, label: 'Doctor / Clinic Name' },
                    visitsCount: { id: 'visitsCount', enabled: true, label: 'Visits' },
                    billedAmount: { id: 'billedAmount', enabled: true, label: 'Billed Amount (₹)' },
                    received: { id: 'received', enabled: true, label: 'Settled (₹)' },
                    netDue: { id: 'netDue', enabled: true, label: 'Balance Due (₹)' }
                },
                rows: [
                    { id: 'dr-1', index: 1, doctorName: 'Dr. Khaleeq Ur Rahman, MD', visitsCount: 14, billedAmount: 18500, received: 15000, netDue: 3500 },
                    { id: 'dr-2', index: 2, doctorName: 'Dr. S. K. Sharma (Sharma Nursing Home)', visitsCount: 8, billedAmount: 9200, received: 9200, netDue: 0 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Summary Totals',
                enabled: true,
                fields: {
                    totalBilled: { id: 'totalBilled', enabled: true, label: 'Total Diagnostic Volume', value: '₹27,700.00' },
                    totalDue: { id: 'totalDue', enabled: true, label: 'Total Doctor Balance Due', value: '₹3,500.00' }
                },
                customLines: []
            },
            signatory: {
                id: 'signatory',
                name: 'Accounts Signatory',
                enabled: true,
                title: 'Finance & Referral Desk',
                subtitle: 'Authorized Stamp'
            }
        }
    },

    summary_corporate: {
        slotId: 'summary_corporate',
        title: 'Corporate Summary (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Letterhead',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Legal Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Trade Tagline', value: 'Corporate B2B Tie-Ups & Executive Screening Summary' },
                    address: { id: 'address', enabled: true, label: 'Facility Address', value: 'Khammam, Telangana - 507001' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Statement Meta',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Document Title', value: 'CORPORATE B2B SUMMARY' },
                    statementPeriod: { id: 'statementPeriod', enabled: true, label: 'Billing Period', value: 'This Month' },
                    generatedAt: { id: 'generatedAt', enabled: true, label: 'Generated At', value: '14/10/2026' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Corporate Accounts Table',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    corporateName: { id: 'corporateName', enabled: true, label: 'Corporate Organization' },
                    employeesTested: { id: 'employeesTested', enabled: true, label: 'Employees' },
                    billedAmount: { id: 'billedAmount', enabled: true, label: 'Billed (₹)' },
                    received: { id: 'received', enabled: true, label: 'Settled (₹)' },
                    netDue: { id: 'netDue', enabled: true, label: 'Pending Due (₹)' }
                },
                rows: [
                    { id: 'c-1', index: 1, corporateName: 'Life Insurance Corporation (LIC)', employeesTested: 24, billedAmount: 36000, received: 0, netDue: 36000 },
                    { id: 'c-2', index: 2, corporateName: 'Singareni Collieries (SCCL)', employeesTested: 12, billedAmount: 18000, received: 18000, netDue: 0 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Summary Totals',
                enabled: true,
                fields: {
                    totalBilled: { id: 'totalBilled', enabled: true, label: 'Total B2B Billed', value: '₹54,000.00' },
                    totalDue: { id: 'totalDue', enabled: true, label: 'Total Corporate Receivables Due', value: '₹36,000.00' }
                },
                customLines: []
            },
            signatory: {
                id: 'signatory',
                name: 'Corporate Desk',
                enabled: true,
                title: 'Head of Corporate Accounts',
                subtitle: 'SynOS Diagnostics'
            }
        }
    },

    summary_insurance: {
        slotId: 'summary_insurance',
        title: 'Insurance Summary (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Letterhead',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Legal Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Trade Tagline', value: 'TPA & Cashless Claims Audit Summary' },
                    address: { id: 'address', enabled: true, label: 'Facility Address', value: 'Khammam, Telangana - 507001' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Statement Meta',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Document Title', value: 'INSURANCE & TPA SUMMARY' },
                    statementPeriod: { id: 'statementPeriod', enabled: true, label: 'Billing Period', value: 'All Time' },
                    generatedAt: { id: 'generatedAt', enabled: true, label: 'Generated At', value: '14/10/2026' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Insurance Claims Table',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    insuranceCompany: { id: 'insuranceCompany', enabled: true, label: 'Insurance Provider / TPA' },
                    claimsCount: { id: 'claimsCount', enabled: true, label: 'Claims' },
                    billedAmount: { id: 'billedAmount', enabled: true, label: 'Claimed (₹)' },
                    received: { id: 'received', enabled: true, label: 'Settled (₹)' },
                    netDue: { id: 'netDue', enabled: true, label: 'Balance Due (₹)' }
                },
                rows: [
                    { id: 'ins-s-1', index: 1, insuranceCompany: 'Star Health & Allied Insurance', claimsCount: 8, billedAmount: 32000, received: 24000, netDue: 8000 },
                    { id: 'ins-s-2', index: 2, insuranceCompany: 'HDFC ERGO General Insurance', claimsCount: 4, billedAmount: 18500, received: 18500, netDue: 0 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Summary Totals',
                enabled: true,
                fields: {
                    totalBilled: { id: 'totalBilled', enabled: true, label: 'Total Claims Filed', value: '₹50,500.00' },
                    totalDue: { id: 'totalDue', enabled: true, label: 'Pending Claim Realization', value: '₹8,000.00' }
                },
                customLines: []
            },
            signatory: {
                id: 'signatory',
                name: 'TPA Signatory',
                enabled: true,
                title: 'TPA Desk Incharge',
                subtitle: 'SynOS Diagnostics'
            }
        }
    },

    summary_outsource: {
        slotId: 'summary_outsource',
        title: 'Outsource Summary (A4)',
        boxes: {
            header: {
                id: 'header',
                name: 'Lab Letterhead',
                enabled: true,
                fields: {
                    legalName: { id: 'legalName', enabled: true, label: 'Legal Name', value: 'SynOS Diagnostic Centre & Laboratory' },
                    tagline: { id: 'tagline', enabled: true, label: 'Trade Tagline', value: 'Reference Labs Outsource Payable Summary' },
                    address: { id: 'address', enabled: true, label: 'Facility Address', value: 'Khammam, Telangana - 507001' }
                },
                customLines: []
            },
            docBadge: {
                id: 'docBadge',
                name: 'Statement Meta',
                enabled: true,
                fields: {
                    badgeTitle: { id: 'badgeTitle', enabled: true, label: 'Document Title', value: 'OUTSOURCED LABS SUMMARY' },
                    statementPeriod: { id: 'statementPeriod', enabled: true, label: 'Period', value: 'Current Month' },
                    generatedAt: { id: 'generatedAt', enabled: true, label: 'Generated At', value: '14/10/2026' }
                },
                customLines: []
            },
            itemsTable: {
                id: 'itemsTable',
                name: 'Outsource Worklist Table',
                enabled: true,
                columns: {
                    index: { id: 'index', enabled: true, label: '#' },
                    referenceLab: { id: 'referenceLab', enabled: true, label: 'Reference Lab' },
                    samplesCount: { id: 'samplesCount', enabled: true, label: 'Specimens' },
                    billedAmount: { id: 'billedAmount', enabled: true, label: 'Estimated Cost (₹)' },
                    received: { id: 'received', enabled: true, label: 'Paid (₹)' },
                    netDue: { id: 'netDue', enabled: true, label: 'Payable Due (₹)' }
                },
                rows: [
                    { id: 'os-1', index: 1, referenceLab: 'Thyrocare Technologies', samplesCount: 18, billedAmount: 22400, received: 15000, netDue: 7400 },
                    { id: 'os-2', index: 2, referenceLab: 'Metropolis Central Lab', samplesCount: 6, billedAmount: 9800, received: 9800, netDue: 0 }
                ]
            },
            financialSummary: {
                id: 'financialSummary',
                name: 'Summary Totals',
                enabled: true,
                fields: {
                    totalBilled: { id: 'totalBilled', enabled: true, label: 'Total B2B Outsource Cost', value: '₹32,200.00' },
                    totalDue: { id: 'totalDue', enabled: true, label: 'Total Payable Due to Labs', value: '₹7,400.00' }
                },
                customLines: []
            },
            signatory: {
                id: 'signatory',
                name: 'Lab Signatory',
                enabled: true,
                title: 'Laboratory Director',
                subtitle: 'Central Specimen Gateway'
            }
        }
    }
};
