# RECEPTION ROLE - SCREENS R8-R12
## Completing Reception Workflow

**Continuing from:** R7 New Visit Creation  
**Remaining Screens:** 5  
**File:** Part 2 of Reception role documentation

---

# R8: Visit Details

**Route:** `/reception/visits/{visitId}`  
**Role:** Reception  
**Backend APIs:**
- `GET /api/v1/visits/{id}`
- `PUT /api/v1/visits/{id}`
- `GET /api/v1/samples?visitId={id}`

## Complete Component Checklist

### UI Elements:

- [ ] **Page Header**
  - Visit token (large, prominent): "Visit #P-042"
  - Patient name + MRN: "Ramesh Sharma (A00123)"
  - Visit date badge
  - Status badge (Paid/Unpaid/Completed)
  - Breadcrumb: Home → Visits → {Token}

- [ ] **Quick Actions Bar**
  - [ ] **Edit Visit Button**
    - Text: "Edit Visit"
    - Icon: Pencil
    - Keyboard: Ctrl+E
    - Action: Navigate to edit mode or modal
  
  - [ ] **Add Payment Button** (only if status=Unpaid)
    - Text: "Add Payment"
    - Icon: Money
    - Keyboard: Ctrl+P
    - Navigate to: `/reception/payments/{visitId}`
  
  - [ ] **Print Token Button**
    - Text: "Print Token"
    - Icon: Printer
    - Keyboard: Ctrl+T
    - Navigate to: `/reception/visits/{visitId}/print`
  
  - [ ] **Print Invoice Button** (only if status=Paid)
    - Text: "Print Invoice"
    - Icon: Receipt
    - Keyboard: Ctrl+I
    - Navigate to: `/reception/visits/{visitId}/invoice`
  
  - [ ] **Collect Sample Button** (only if no samples collected)
    - Text: "Collect Sample"
    - Icon: Beaker
    - Navigate to: `/sample/collection?visitId={visitId}`

- [ ] **Patient Information Card**
  - Heading: "Patient Information"
  - MRN
  - Name
  - Age, Sex
  - Phone
  - [ ] **View Full Profile Button**
    - Text: "View Full Profile"
    - Navigate to: `/reception/patients/{patientId}`

- [ ] **Visit Information Card**
  - Heading: "Visit Details"
  - Visit Date
  - Token Number
  - Created By (user name)
  - Created At (timestamp)
  - Last Updated
  - Special Instructions (if any)

- [ ] **Tests Ordered Table**
  - Heading: "Tests Ordered (X tests)"
  - Columns: Test Code, Test Name, Price, Status, Sample Status
  - **Per Test Row:**
    - Test Code
    - Test Name
    - Price (formatted)
    - Status badge: Pending / In Progress / Completed
    - Sample Status badge: Not Collected / Collected / Rejected
  - Total row at bottom with sum

- [ ] **Sample Collection Status Section** (if samples exist)
  - API: `GET /api/v1/samples?visitId={visitId}`
  - **Per Sample:**
    - Barcode
    - Tube Type
    - Collection Time
    - Collected By
    - Status (Collected / Rejected / Recollected)
    - [ ] **View Barcode Button**
      - Text: "View"
      - Shows barcode in modal/popup

- [ ] **Payment Details Card**
  - Heading: "Payment Information"
  - Total Amount
  - Discount (if any): Type, Value, Reason
  - Final Amount (after discount)
  - Payment Status badge
  - Payment Method (if paid)
  - Transaction ID (if applicable)
  - Insurance Provider + Policy (if applicable)
  - Paid At (timestamp if paid)
  - Paid By (user name if paid)

- [ ] **Referral Information Card** (if applicable)
  - Heading: "Referral Details"
  - Referred By: Doctor name
  - Commission Rate: X%
  - Commission Amount: Calculated value
  - Commission Status: Pending / Paid

- [ ] **Timeline/Audit Log** (Collapsible)
  - Heading: "Activity Timeline"
  - API: Included in visit details or separate `GET /api/v1/visits/{id}/audit-log`
  - **Per Event:**
    - Timestamp
    - Event type (Created, Payment Added, Sample Collected, etc.)
    - User name
    - Details

- [ ] **Action Buttons Section**
  
  - [ ] **Cancel Visit Button** (only if status=Unpaid and no samples)
    - Text: "Cancel Visit"
    - Color: Red (destructive)
    - Shows confirmation dialog
    - API: `DELETE /api/v1/visits/{id}` or `PUT /api/v1/visits/{id}/cancel`
  
  - [ ] **Back Button**
    - Text: "Back to Dashboard"
    - Keyboard: Esc
    - Navigate to: `/reception/dashboard`

## API Integration

**1. Get Visit Details:**
```
GET /api/v1/visits/{visitId}

Response (200):
{
  "data": {
    "visitId": "uuid",
    "token": "P-042",
    "visitDate": "2025-11-22",
    "patient": {
      "patientId": "uuid",
      "mrn": "A00123",
      "name": "Ramesh Sharma",
      "age": 45,
      "sex": "M",
      "phone": "9876543210"
    },
    "tests": [
      {
        "testId": "uuid",
        "testCode": "CBC",
        "testName": "Complete Blood Count",
        "price": 350.00,
        "status": "Pending",
        "sampleStatus": "Collected"
      }
    ],
    "totalAmount": 350.00,
    "discountType": "Percentage",
    "discountValue": 10.0,
    "discountReason": "Senior citizen",
    "discountAmount": 35.00,
    "finalAmount": 315.00,
    "paymentStatus": "Paid",
    "paymentMethod": "Cash",
    "transactionId": null,
    "insuranceProvider": null,
    "policyNumber": null,
    "paidAt": "2025-11-22T10:35:00Z",
    "paidBy": {
      "userId": "uuid",
      "name": "Priya Sharma"
    },
    "referral": {
      "doctorId": "uuid",
      "doctorName": "Dr. Anand Kumar",
      "commissionRate": 15.0,
      "commissionAmount": 47.25,
      "commissionStatus": "Pending"
    },
    "specialInstructions": "Fasting sample required",
    "createdBy": {
      "userId": "uuid",
      "name": "Priya Sharma"
    },
    "createdAt": "2025-11-22T10:30:00Z",
    "updatedAt": "2025-11-22T10:35:00Z"
  }
}
```

**2. Get Sample Details:**
```
GET /api/v1/samples?visitId={visitId}

Response (200):
{
  "data": [
    {
      "sampleId": "uuid",
      "barcode": "S-P042-001",
      "tubeType": "EDTA",
      "collectedAt": "2025-11-22T10:40:00Z",
      "collectedBy": {
        "userId": "uuid",
        "name": "Sample Tech"
      },
      "status": "Collected",
      "rejectionReason": null
    }
  ]
}
```

**3. Cancel Visit:**
```
PUT /api/v1/visits/{visitId}/cancel

Request: { "reason": "Patient cancelled" }

Response (200):
{
  "data": {
    "visitId": "uuid",
    "status": "Cancelled",
    "cancelledAt": "2025-11-22T11:00:00Z",
    "cancelledBy": "uuid"
  }
}
```

## Keyboard Shortcuts

- **Ctrl+E:** Edit visit
- **Ctrl+P:** Add payment (if unpaid)
- **Ctrl+T:** Print token
- **Ctrl+I:** Print invoice (if paid)
- **Esc:** Back to dashboard

## Gemini Prompt for R8

```
Build the Visit Details screen (React + Vite + Tailwind CSS + shadcn/ui).

BACKEND APIs:
1. GET /api/v1/visits/{visitId}
   Response: { "data": { "visitId": "uuid", "token": "P-042", "visitDate": "YYYY-MM-DD", "patient": {...}, "tests": [{...}], "totalAmount": 350.00, "discountType": "Percentage", "discountValue": 10.0, "discountReason": "string", "discountAmount": 35.00, "finalAmount": 315.00, "paymentStatus": "Paid|Unpaid", "paymentMethod": "string", "paidAt": "ISO", "paidBy": {...}, "referral": {...}, "specialInstructions": "string", "createdBy": {...}, "createdAt": "ISO", "updatedAt": "ISO" } }

2. GET /api/v1/samples?visitId={visitId}
   Response: { "data": [{ "sampleId": "uuid", "barcode": "string", "tubeType": "string", "collectedAt": "ISO", "collectedBy": {...}, "status": "Collected|Rejected", "rejectionReason": "string" }] }

3. PUT /api/v1/visits/{visitId}/cancel
   Request: { "reason": "string" }
   Response (200): { "data": { "visitId": "uuid", "status": "Cancelled", ... } }

UI REQUIREMENTS:

PAGE HEADER:
1. Visit token (large): "Visit #{token}"
2. Patient info: "{patient.name} ({patient.mrn})"
3. Visit date badge: Format as "DD-MMM-YYYY"
4. Status badge: Color-coded (Paid=green, Unpaid=orange, Completed=blue)
5. Breadcrumb: Home → Visits → {token}

QUICK ACTIONS:
6. Edit Visit button
   - Icon: Pencil
   - Keyboard: Ctrl+E

7. Add Payment button (only if paymentStatus="Unpaid")
   - Text: "Add Payment"
   - Icon: Money
   - Keyboard: Ctrl+P
   - Navigate to: /reception/payments/{visitId}

8. Print Token button
   - Icon: Printer
   - Keyboard: Ctrl+T
   - Navigate to: /reception/visits/{visitId}/print

9. Print Invoice button (only if paymentStatus="Paid")
   - Icon: Receipt
   - Keyboard: Ctrl+I
   - Navigate to: /reception/visits/{visitId}/invoice

10. Collect Sample button (only if samples.length === 0)
    - Navigate to: /sample/collection?visitId={visitId}

PATIENT INFO CARD:
11. Heading: "Patient Information"
12. Display: MRN, Name, Age, Sex, Phone
13. View Full Profile button → /reception/patients/{patient.patientId}

VISIT INFO CARD:
14. Heading: "Visit Details"
15. Display:
    - Visit Date
    - Token Number
    - Created By: {createdBy.name}
    - Created At: Format timestamp
    - Last Updated: Format timestamp
    - Special Instructions: {specialInstructions} or "None"

TESTS TABLE:
16. Heading: "Tests Ordered (X tests)"
17. Columns: Test Code, Test Name, Price, Status, Sample Status
18. For each test:
    - testCode
    - testName
    - "₹{price}"
    - Status badge (Pending/In Progress/Completed)
    - Sample Status badge (Not Collected/Collected/Rejected)
19. Total row: Sum of all test prices

SAMPLE COLLECTION (if samples exist):
20. Section heading: "Sample Collection"
21. Load: GET /api/v1/samples?visitId={visitId}
22. For each sample:
    - Barcode
    - Tube Type
    - Collection Time: Format timestamp
    - Collected By: {collectedBy.name}
    - Status badge
    - View Barcode button: Shows barcode in modal

PAYMENT DETAILS CARD:
23. Heading: "Payment Information"
24. Display:
    - Total Amount: "₹{totalAmount}"
    - Discount (if any):
      * Type: {discountType}
      * Value: {discountValue}
      * Reason: {discountReason}
      * Amount: "₹{discountAmount}"
    - Final Amount: "₹{finalAmount}" (large, bold)
    - Payment Status: Badge
    - Payment Method: {paymentMethod} (if paid)
    - Transaction ID: {transactionId} (if applicable)
    - Insurance: {insuranceProvider} - {policyNumber} (if applicable)
    - Paid At: Format timestamp (if paid)
    - Paid By: {paidBy.name} (if paid)

REFERRAL INFO (if referral exists):
25. Heading: "Referral Details"
26. Display:
    - Referred By: {referral.doctorName}
    - Commission Rate: {referral.commissionRate}%
    - Commission Amount: "₹{referral.commissionAmount}"
    - Commission Status: Badge (Pending/Paid)

TIMELINE (Collapsible):
27. Heading: "Activity Timeline"
28. Collapsed by default
29. Display chronological events:
    - Timestamp
    - Event type
    - User name
    - Details

ACTION BUTTONS:
30. Cancel Visit button (only if paymentStatus="Unpaid" AND samples.length === 0)
    - Text: "Cancel Visit"
    - Color: Red
    - Shows confirmation dialog:
      * Title: "Cancel Visit?"
      * Message: "Are you sure? This cannot be undone."
      * Reason textarea (required)
      * Cancel / Confirm buttons
    - On confirm: Call PUT /api/v1/visits/{visitId}/cancel
    - On success: Navigate to /reception/dashboard

31. Back button
    - Text: "Back to Dashboard"
    - Keyboard: Esc
    - Navigate to: /reception/dashboard

KEYBOARD SHORTCUTS:
- Ctrl+E: Edit
- Ctrl+P: Payment (if unpaid)
- Ctrl+T: Print token
- Ctrl+I: Print invoice (if paid)
- Esc: Back

ERROR HANDLING:
- Show error toast if API fails
- Display "Visit not found" if 404

LOADING STATE:
- Show skeleton for all cards during initial load

DO NOT:
- Use mock data
- Show payment button if already paid
- Show collect sample button if samples exist
- Skip cancel confirmation

ACCEPT CRITERIA:
- Visit details load from API
- All cards display correctly
- Buttons show conditionally based on status
- Keyboard shortcuts work
- Cancel visit requires confirmation
- Sample info loads if available
```

---

# R9: Payment Processing

**Route:** `/reception/payments/{visitId}`  
**Role:** Reception  
**Backend APIs:**
- `GET /api/v1/visits/{id}`
- `POST /api/v1/payments`

## Complete Component Checklist

### UI Elements:

- [ ] **Page Header**
  - Title: "Add Payment"
  - Visit info: "Visit #{token} - {patientName}"
  - Breadcrumb: Home → Visits → {Token} → Payment

- [ ] **Visit Summary Card** (Read-only)
  - Patient Name + MRN
  - Visit Date
  - Visit Token
  - Tests list (comma-separated)

- [ ] **Amount Breakdown Card** (Read-only)
  - Label: "Total Amount"
  - Tests total: "₹{totalAmount}"
  - Discount (if any): "- ₹{discountAmount}"
  - **Final Amount Due** (large, prominent)
    - "₹{finalAmount}"

- [ ] **Payment Method Section**
  
  - [ ] **Payment Method Radio Buttons** (Required)
    - Options: Cash, Card, UPI, Cheque
    - Required: Yes
    - API field: `paymentMethod`
  
  - [ ] **Amount Input** (Pre-filled)
    - Label: "Amount Received *"
    - Type: number
    - Default: {finalAmount}
    - Required: Yes
    - Validation: Must be >= finalAmount
    - API field: `amountReceived`
  
  - [ ] **Change to Return Display** (Auto-calculated)
    - Shows only if: amountReceived > finalAmount
    - Label: "Change to Return"
    - Value: amountReceived - finalAmount
    - Format: "₹{change}"
    - Color: Green
    - Large, prominent

- [ ] **Payment Details Section** (Conditional)
  
  **For Card Payment:**
  - [ ] **Card Type Dropdown**
    - Label: "Card Type"
    - Options: Credit Card, Debit Card
    - API field: `cardType`
  
  - [ ] **Card Last 4 Digits Input**
    - Label: "Last 4 Digits"
    - Type: text
    - Maxlength: 4
    - Pattern: [0-9]{4}
    - API field: `cardLast4`
  
  - [ ] **Transaction ID Input**
    - Label: "Transaction ID"
    - Type: text
    - Required: Yes
    - API field: `transactionId`
  
  **For UPI Payment:**
  - [ ] **UPI ID Input**
    - Label: "UPI ID"
    - Type: text
    - Pattern: UPI format validation
    - API field: `upiId`
  
  - [ ] **Transaction ID Input**
    - Label: "UPI Transaction ID"
    - Type: text
    - Required: Yes
    - API field: `transactionId`
  
  **For Cheque Payment:**
  - [ ] **Cheque Number Input**
    - Label: "Cheque Number"
    - Type: text
    - Required: Yes
    - API field: `chequeNumber`
  
  - [ ] **Bank Name Input**
    - Label: "Bank Name"
    - Type: text
    - Required: Yes
    - API field: `bankName`
  
  - [ ] **Cheque Date Picker**
    - Label: "Cheque Date"
    - Type: date
    - Required: Yes
    - Max: Today
    - API field: `chequeDate`

- [ ] **Payment Notes Textarea** (Optional)
  - Label: "Payment Notes (Optional)"
  - Rows: 3
  - Placeholder: "Any additional notes..."
  - API field: `notes`

- [ ] **Print Options Checkboxes**
  
  - [ ] **Print Invoice Checkbox**
    - Label: "Print Invoice after payment"
    - Default: Checked
    - Determines post-payment action
  
  - [ ] **Print Receipt Checkbox**
    - Label: "Print Payment Receipt"
    - Default: Checked
    - Determines post-payment action

- [ ] **Action Buttons**
  
  - [ ] **Process Payment Button** (Primary)
    - Text: "Process Payment"
    - Color: Primary (green)
    - Keyboard: Ctrl+S
    - Disabled: If amount < finalAmount OR required fields missing
    - Shows spinner during API call
    - Action:
      1. Validate all fields
      2. Call `POST /api/v1/payments`
      3. On success:
         - Show success toast: "Payment received successfully"
         - If Print Invoice checked: Navigate to invoice print
         - Else if Print Receipt checked: Navigate to receipt print
         - Else: Navigate to `/reception/visits/{visitId}`
  
  - [ ] **Cancel Button**
    - Text: "Cancel"
    - Keyboard: Esc
    - Action: Navigate back to `/reception/visits/{visitId}`

- [ ] **Validation Summary** (if errors)
  - Position: Top of form
  - Shows: List of validation errors
  - Color: Red banner

- [ ] **Loading Spinner**
  - Shows: During payment processing
  - Overlay: Semi-transparent
  - Message: "Processing payment..."

## API Integration

**1. Get Visit for Payment:**
```
GET /api/v1/visits/{visitId}

Response (200):
{
  "data": {
    "visitId": "uuid",
    "token": "P-042",
    "patient": {
      "name": "Ramesh Sharma",
      "mrn": "A00123"
    },
    "visitDate": "2025-11-22",
    "tests": [
      { "testName": "Complete Blood Count" }
    ],
    "totalAmount": 350.00,
    "discountAmount": 35.00,
    "finalAmount": 315.00,
    "paymentStatus": "Unpaid"
  }
}
```

**2. Process Payment:**
```
POST /api/v1/payments

Request Body:
{
  "visitId": "uuid",
  "paymentMethod": "Cash|Card|UPI|Cheque",
  "amountReceived": 500.00,
  "changeReturned": 185.00,
  "cardType": "Credit Card|Debit Card",
  "cardLast4": "1234",
  "transactionId": "TXN123456",
  "upiId": "user@paytm",
  "chequeNumber": "CHQ123456",
  "bankName": "HDFC Bank",
  "chequeDate": "2025-11-22",
  "notes": "Partial payment"
}

Success Response (201):
{
  "data": {
    "paymentId": "uuid",
    "visitId": "uuid",
    "token": "P-042",
    "amountReceived": 500.00,
    "changeReturned": 185.00,
    "paymentMethod": "Cash",
    "paidAt": "2025-11-22T10:45:00Z",
    "paidBy": {
      "userId": "uuid",
      "name": "Priya Sharma"
    },
    "receiptNumber": "RCP-042"
  }
}

Error Response (400):
{
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Amount received is less than amount due"
  }
}

Error Response (409):
{
  "error": {
    "code": "ALREADY_PAID",
    "message": "Payment already recorded for this visit"
  }
}
```

## Keyboard Shortcuts

- **Ctrl+S:** Process payment
- **Esc:** Cancel

## Validation Rules

1. **Payment Method:**
   - Required
   - One of: Cash, Card, UPI, Cheque

2. **Amount Received:**
   - Required
   - Must be >= finalAmount
   - Positive number

3. **Transaction ID:**
   - Required if: Card or UPI
   - Min 6 characters

4. **Cheque Details:**
   - All required if: Cheque selected
   - Cheque number, bank name, date

## Gemini Prompt for R9

```
Build the Payment Processing screen (React + Vite + Tailwind CSS + shadcn/ui).

BACKEND APIs:
1. GET /api/v1/visits/{visitId}
   Response: { "data": { "visitId": "uuid", "token": "P-042", "patient": { "name": "string", "mrn": "string" }, "visitDate": "YYYY-MM-DD", "tests": [{...}], "totalAmount": 350.00, "discountAmount": 35.00, "finalAmount": 315.00, "paymentStatus": "Unpaid" } }

2. POST /api/v1/payments
   Request: { "visitId": "uuid", "paymentMethod": "Cash|Card|UPI|Cheque", "amountReceived": 500.00, "changeReturned": 185.00, "cardType": "string", "cardLast4": "string", "transactionId": "string", "upiId": "string", "chequeNumber": "string", "bankName": "string", "chequeDate": "YYYY-MM-DD", "notes": "string" }
   Success (201): { "data": { "paymentId": "uuid", "visitId": "uuid", "token": "P-042", "amountReceived": 500.00, "changeReturned": 185.00, "paymentMethod": "string", "paidAt": "ISO", "paidBy": {...}, "receiptNumber": "RCP-042" } }
   Error (400): { "error": { "code": "INVALID_AMOUNT", "message": "string" } }

UI REQUIREMENTS:

PAGE HEADER:
1. Title: "Add Payment"
2. Visit info: "Visit #{token} - {patient.name}"
3. Breadcrumb: Home → Visits → {token} → Payment

VISIT SUMMARY (Read-only):
4. Card heading: "Visit Summary"
5. Display:
   - Patient: {name} ({mrn})
   - Visit Date: Format as "DD-MMM-YYYY"
   - Token: {token}
   - Tests: Comma-separated list

AMOUNT BREAKDOWN (Read-only):
6. Card heading: "Amount Breakdown"
7. Display:
   - Total: "₹{totalAmount}"
   - Discount: "- ₹{discountAmount}" (if any)
   - Final Amount Due: "₹{finalAmount}" (large, bold, green)

PAYMENT METHOD:
8. Radio buttons (required):
   - Cash
   - Card
   - UPI
   - Cheque

9. Amount Received input *
   - Label: "Amount Received *"
   - Type: number
   - Default: {finalAmount}
   - Required: Yes
   - Validation: Must be >= finalAmount
   - On change: Auto-calculate change

10. Change to Return display (if amountReceived > finalAmount):
    - Label: "Change to Return"
    - Value: amountReceived - finalAmount
    - Format: "₹{change}"
    - Color: Green, large font

PAYMENT DETAILS (Conditional):

FOR CARD:
11. Card Type dropdown:
    - Options: Credit Card, Debit Card

12. Last 4 Digits input:
    - Maxlength: 4
    - Pattern: [0-9]{4}

13. Transaction ID input (required):
    - Min 6 characters

FOR UPI:
14. UPI ID input:
    - Pattern: UPI format (email@bank)

15. UPI Transaction ID input (required):
    - Min 6 characters

FOR CHEQUE:
16. Cheque Number input (required)

17. Bank Name input (required)

18. Cheque Date picker (required):
    - Max: Today

PAYMENT NOTES:
19. Textarea (optional):
    - Rows: 3
    - Placeholder: "Any additional notes..."

PRINT OPTIONS:
20. Print Invoice checkbox:
    - Label: "Print Invoice after payment"
    - Default: Checked

21. Print Receipt checkbox:
    - Label: "Print Payment Receipt"
    - Default: Checked

ACTION BUTTONS:
22. Process Payment button (primary):
    - Text: "Process Payment"
    - Color: Green
    - Keyboard: Ctrl+S
    - Disabled if: amountReceived < finalAmount OR required fields missing
    - Action:
      1. Validate
      2. Call POST /api/v1/payments
      3. On success:
         - Toast: "Payment received successfully"
         - If printInvoice: Navigate to /reception/visits/{visitId}/invoice
         - Else if printReceipt: Navigate to /reception/visits/{visitId}/receipt
         - Else: Navigate to /reception/visits/{visitId}
      4. On error (400):
         - Display error.message
      5. On error (409):
         - Show "Already paid" error

23. Cancel button:
    - Keyboard: Esc
    - Navigate to: /reception/visits/{visitId}

VALIDATION:
- Payment method: Required
- Amount received: Required, >= finalAmount
- Transaction ID: Required if Card or UPI
- Cheque details: All required if Cheque

ERROR HANDLING:
- Show validation summary at top
- Field-level errors below each field
- API errors in toast

LOADING STATE:
- Overlay with spinner during processing
- Message: "Processing payment..."
- Disable all inputs and buttons

KEYBOARD SHORTCUTS:
- Ctrl+S: Process payment
- Esc: Cancel

DO NOT:
- Allow amount < finalAmount
- Skip transaction ID for Card/UPI
- Skip cheque details for Cheque
- Use mock data

ACCEPT CRITERIA:
- Visit loads correctly
- Amount breakdown displays
- Change calculates automatically
- Conditional fields show based on payment method
- Payment processes via API
- Success navigates based on print checkboxes
- Error handling works
- Keyboard shortcuts work
```

---

# R10: Print Token/Invoice

**Route:** `/reception/visits/{visitId}/print`  
**Role:** Reception  
**Backend APIs:**
- `GET /api/v1/visits/{id}`
- `GET /api/v1/visits/{id}/print-data`

## Complete Component Checklist

### UI Elements:

- [ ] **Print Preview Container**
  - Full-page layout
  - Print-optimized styles
  - Shows thermal receipt format (58mm or 80mm width)

- [ ] **Token Print Layout** (if status=Unpaid or just created)
  
  **Header Section:**
  - [ ] Lab Name
    - Text: "XYZ Diagnostics" (from config)
    - Font: Large, bold
  
  - [ ] Lab Address
    - Text: Full address
    - Font: Small
  
  - [ ] Contact Info
    - Phone, Email
  
  **Token Section:**
  - [ ] Token Number
    - Text: "TOKEN: P-042"
    - Font: Very large, bold
    - Centered
  
  - [ ] Visit Date
    - Format: "DD-MMM-YYYY HH:MM"
  
  **Patient Section:**
  - [ ] Patient Name
    - Text: {name}
  
  - [ ] MRN
    - Text: "MRN: {mrn}"
  
  - [ ] Age/Sex
    - Text: "{age} yrs / {sex}"
  
  **Tests Section:**
  - [ ] Tests Ordered
    - Heading: "Tests:"
    - List of test names (one per line)
  
  **Instructions Section:**
  - [ ] Special Instructions
    - Text: {specialInstructions}
    - Example: "Fasting required - 12 hours"
  
  **Footer:**
  - [ ] Collection Info
    - Text: "Please proceed to Sample Collection"
  
  - [ ] Barcode (if available)
    - Display visit barcode for tracking

- [ ] **Invoice Print Layout** (if status=Paid)
  
  **Header Section:** (same as token)
  
  **Invoice Details:**
  - [ ] Invoice Number
    - Text: "INVOICE: INV-042"
  
  - [ ] Invoice Date
    - Format: "DD-MMM-YYYY"
  
  **Patient Section:** (same as token)
  
  **Tests Table:**
  - [ ] Table Header
    - Columns: S.No, Test Name, Price
  
  - [ ] **Per Test Row:**
    - Serial number
    - Test name
    - Price (right-aligned)
  
  - [ ] **Subtotal Row**
    - Label: "Subtotal"
    - Value: "₹{totalAmount}"
  
  - [ ] **Discount Row** (if any)
    - Label: "Discount ({type} {value})"
    - Value: "- ₹{discountAmount}"
  
  - [ ] **Grand Total Row**
    - Label: "GRAND TOTAL"
    - Value: "₹{finalAmount}"
    - Font: Large, bold
  
  **Payment Details:**
  - [ ] Payment Method
    - Text: "Paid by: {paymentMethod}"
  
  - [ ] Transaction ID (if applicable)
    - Text: "Transaction: {transactionId}"
  
  - [ ] Amount Received
    - Text: "Received: ₹{amountReceived}"
  
  - [ ] Change Returned (if any)
    - Text: "Change: ₹{changeReturned}"
  
  **Footer:**
  - [ ] Thank You Message
    - Text: "Thank you for choosing us!"
  
  - [ ] Terms & Conditions
    - Text: "Reports available in {tat} hours"
  
  - [ ] QR Code (optional)
    - For digital receipt/tracking

- [ ] **Action Buttons** (On-screen, hidden in print)
  
  - [ ] **Print Button**
    - Text: "Print"
    - Icon: Printer
    - Keyboard: Ctrl+P
    - Action: window.print()
  
  - [ ] **Download PDF Button**
    - Text: "Download as PDF"
    - Icon: Download
    - Action: Generate and download PDF
  
  - [ ] **Done Button**
    - Text: "Done"
    - Action: Navigate to `/reception/visits/{visitId}`
  
  - [ ] **Print Another Button**
    - Text: "Print Another Copy"
    - Action: Trigger print again

## API Integration

**1. Get Visit for Printing:**
```
GET /api/v1/visits/{visitId}/print-data

Response (200):
{
  "data": {
    "printType": "Token|Invoice",
    "labInfo": {
      "name": "XYZ Diagnostics",
      "address": "123, MG Road, Bangalore",
      "phone": "080-12345678",
      "email": "contact@xyzlab.com"
    },
    "visit": {
      "visitId": "uuid",
      "token": "P-042",
      "invoiceNumber": "INV-042",
      "visitDate": "2025-11-22T10:30:00Z"
    },
    "patient": {
      "name": "Ramesh Sharma",
      "mrn": "A00123",
      "age": 45,
      "sex": "M",
      "phone": "9876543210"
    },
    "tests": [
      {
        "serialNo": 1,
        "testName": "Complete Blood Count",
        "price": 350.00
      }
    ],
    "amounts": {
      "totalAmount": 350.00,
      "discountType": "Percentage",
      "discountValue": 10.0,
      "discountAmount": 35.00,
      "finalAmount": 315.00
    },
    "payment": {
      "paymentMethod": "Cash",
      "transactionId": null,
      "amountReceived": 500.00,
      "changeReturned": 185.00,
      "paidAt": "2025-11-22T10:45:00Z"
    },
    "specialInstructions": "Fasting required - 12 hours",
    "barcode": "P042-20251122",
    "qrCode": "https://lab.com/track/P042"
  }
}
```

## Print Styles

```css
@media print {
  /* Hide on-screen buttons */
  .no-print {
    display: none !important;
  }
  
  /* Thermal receipt width */
  @page {
    size: 80mm auto;
    margin: 5mm;
  }
  
  body {
    width: 80mm;
    font-size: 10pt;
  }
  
  /* Token number large */
  .token-number {
    font-size: 24pt;
    font-weight: bold;
  }
  
  /* Grand total large */
  .grand-total {
    font-size: 14pt;
    font-weight: bold;
  }
}
```

## Keyboard Shortcuts

- **Ctrl+P:** Print
- **Esc:** Done

## Gemini Prompt for R10

```
Build the Print Token/Invoice screen (React + Vite + Tailwind CSS + shadcn/ui).

BACKEND API:
1. GET /api/v1/visits/{visitId}/print-data
   Response: { "data": { "printType": "Token|Invoice", "labInfo": {...}, "visit": {...}, "patient": {...}, "tests": [{...}], "amounts": {...}, "payment": {...}, "specialInstructions": "string", "barcode": "string", "qrCode": "string" } }

UI REQUIREMENTS:

THERMAL RECEIPT FORMAT (58mm or 80mm width):

HEADER (both token and invoice):
1. Lab name (large, bold, centered)
2. Lab address (small, centered)
3. Contact: Phone + Email

FOR TOKEN PRINT (if printType="Token"):
4. Token number (very large, bold, centered)
   - "TOKEN: {token}"
   
5. Visit date/time (centered)
   - Format: "DD-MMM-YYYY HH:MM"

6. Patient info:
   - Name
   - MRN: {mrn}
   - {age} yrs / {sex}

7. Tests ordered:
   - Heading: "Tests:"
   - List each test name (one per line)

8. Special instructions (if any):
   - {specialInstructions}

9. Footer:
   - "Please proceed to Sample Collection"
   - Barcode (if available)

FOR INVOICE PRINT (if printType="Invoice"):
10. Invoice number + date:
    - "INVOICE: {invoiceNumber}"
    - Date: "DD-MMM-YYYY"

11. Patient info: (same as token)

12. Tests table:
    - Columns: S.No | Test Name | Price
    - For each test:
      * Serial number
      * Test name
      * "₹{price}" (right-aligned)

13. Amounts:
    - Subtotal: "₹{totalAmount}"
    - Discount (if any): "Discount ({discountType} {discountValue}%) - ₹{discountAmount}"
    - GRAND TOTAL: "₹{finalAmount}" (large, bold)

14. Payment details:
    - Paid by: {paymentMethod}
    - Transaction ID: {transactionId} (if applicable)
    - Amount Received: "₹{amountReceived}"
    - Change Returned: "₹{changeReturned}" (if any)

15. Footer:
    - "Thank you for choosing us!"
    - "Reports available in {tat} hours"
    - QR code (if available)

ON-SCREEN BUTTONS (hidden in print with .no-print class):
16. Print button:
    - Text: "Print"
    - Icon: Printer
    - Keyboard: Ctrl+P
    - Action: window.print()

17. Download PDF button:
    - Text: "Download as PDF"
    - Action: Generate PDF using html2pdf or similar

18. Done button:
    - Text: "Done"
    - Navigate to: /reception/visits/{visitId}

19. Print Another Copy button:
    - Text: "Print Another Copy"
    - Action: Trigger print again

PRINT STYLES:
Use @media print to:
- Hide .no-print elements
- Set page size to 80mm width
- Increase token number and grand total font sizes
- Center align key elements
- Use monospace font for amounts

KEYBOARD SHORTCUTS:
- Ctrl+P: Print
- Esc: Done

ERROR HANDLING:
- If API fails: Show error toast, back button only

LOADING STATE:
- Show skeleton during data load

DO NOT:
- Use mock data
- Skip print styles
- Forget to hide on-screen buttons in print

ACCEPT CRITERIA:
- Print data loads from API
- Token layout shows for unpaid visits
- Invoice layout shows for paid visits
- Print button triggers browser print dialog
- Print styles applied correctly (80mm width)
- Token number and grand total are prominent
- On-screen buttons hidden in print
- Keyboard shortcuts work
```

---

**Continue with R11 & R12 (Appointments)?** These are the final 2 Reception screens. Ready to complete Reception role now?

