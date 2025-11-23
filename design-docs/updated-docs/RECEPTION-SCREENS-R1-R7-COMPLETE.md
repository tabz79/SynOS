# RECEPTION ROLE - COMPLETE 12 SCREENS GUIDE
## Every Button, Every Field, Every API Call Documented

**Role:** Reception (Pathology Department)  
**Total Screens:** 12  
**Route Prefix:** `/reception`  
**Backend:** All APIs tested and ready (Days 1-17 complete)

---

# TABLE OF CONTENTS - RECEPTION SCREENS

1. [R1: Login (Universal)](#r1-login-universal)
2. [R2: Reception Dashboard](#r2-reception-dashboard)
3. [R3: Patient Search Results](#r3-patient-search-results)
4. [R4: New Patient Registration](#r4-new-patient-registration)
5. [R5: Patient Details/Profile](#r5-patient-details-profile)
6. [R6: Patient Merge (Deduplication)](#r6-patient-merge-deduplication)
7. [R7: New Visit Creation](#r7-new-visit-creation)
8. [R8: Visit Details](#r8-visit-details)
9. [R9: Payment Processing](#r9-payment-processing)
10. [R10: Print Token/Invoice](#r10-print-token-invoice)
11. [R11: Appointments Calendar](#r11-appointments-calendar)
12. [R12: New Appointment](#r12-new-appointment)

---

# R1: Login (Universal)

**Already documented in master playbook - see Screen R1**

---

# R2: Reception Dashboard

**Already documented in master playbook - see Screen R2**

---

# R3: Patient Search Results

**Already documented in master playbook - see Screen R3**

---

# R4: New Patient Registration

**Already documented in master playbook - see Screen R4**

---

# R5: Patient Details/Profile

**Already documented in master playbook - see Screen R5**

---

# R6: Patient Merge (Deduplication)

**Route:** `/reception/patients/merge?source={sourceId}&target={targetId}`  
**Role:** Reception  
**Backend APIs:**
- `GET /api/v1/patients/{id}`
- `POST /api/v1/patients/merge`

## Complete Component Checklist

### UI Elements:

- [ ] **Page Header**
  - Title: "Merge Duplicate Patients"
  - Warning message: "⚠️ This action cannot be undone. Please verify carefully."
  - Breadcrumb: Home → Patients → Merge

- [ ] **Side-by-Side Comparison Cards**
  
  **LEFT CARD: Source Patient (To Be Deleted)**
  - [ ] Card header: "Source Patient (Will be deleted)"
  - [ ] Background color: Light red/pink (warning)
  - [ ] Patient details display:
    - MRN (large, prominent)
    - Name
    - DOB (with age)
    - Sex
    - Phone
    - Alternate Phone
    - Email
    - Address
    - Blood Group
    - Allergies
    - Medical History
    - Referred By
  - [ ] Visit count badge: "X visits will be transferred"
  - [ ] API: `GET /api/v1/patients/{sourceId}`
  
  **RIGHT CARD: Target Patient (To Be Kept)**
  - [ ] Card header: "Target Patient (Will be kept)"
  - [ ] Background color: Light green (success)
  - [ ] Patient details display: (same fields as source)
  - [ ] Visit count badge: "X existing visits + Y transferred = Z total"
  - [ ] API: `GET /api/v1/patients/{targetId}`

- [ ] **Merge Direction Indicator**
  - Large arrow icon between cards
  - Text: "All data from left will merge into right →"

- [ ] **Visit Transfer Preview Section**
  - Heading: "Visits to be Transferred"
  - Table showing source patient's visits
  - Columns: Date, Token, Tests, Status, Amount
  - API: `GET /api/v1/visits?patientId={sourceId}`

- [ ] **Conflict Resolution Section** (if any conflicts detected)
  - Heading: "Resolve Conflicts"
  - Shows when: Phone numbers different OR Email different
  
  **Phone Number Conflict:**
  - [ ] Label: "Phone Number (conflicting)"
  - [ ] Radio buttons:
    - Keep Target: {targetPhone}
    - Keep Source: {sourcePhone}
    - Keep Both (add source as alternate)
  - [ ] Default: Keep Target
  
  **Email Conflict:**
  - [ ] Label: "Email (conflicting)"
  - [ ] Radio buttons:
    - Keep Target: {targetEmail}
    - Keep Source: {sourceEmail}
  - [ ] Default: Keep Target
  
  **Medical History Conflict:**
  - [ ] Label: "Medical History (both have data)"
  - [ ] Radio buttons:
    - Keep Target only
    - Keep Source only
    - Merge Both (concatenate)
  - [ ] Default: Merge Both

- [ ] **Confirmation Checklist**
  - [ ] Checkbox: "I have verified that these are duplicate records of the same person"
    - Required: Must be checked to enable merge button
  
  - [ ] Checkbox: "I understand that {sourceMRN} will be permanently deleted"
    - Required: Must be checked to enable merge button
  
  - [ ] Checkbox: "I understand that all visits will be transferred to {targetMRN}"
    - Required: Must be checked to enable merge button

- [ ] **Final Confirmation Input**
  - Label: "Type 'MERGE' to confirm"
  - Type: text
  - Placeholder: "Type MERGE in uppercase"
  - Validation: Must exactly match "MERGE"
  - Required: Must match to enable merge button

- [ ] **Action Buttons**
  
  - [ ] **Cancel Button**
    - Text: "Cancel Merge"
    - Color: Secondary/gray
    - Keyboard: Esc
    - Action: Navigate back to `/reception/patients/{sourceId}`
  
  - [ ] **Merge Patients Button** (Primary, Destructive)
    - Text: "Merge Patients"
    - Color: Red (destructive action)
    - Keyboard: Ctrl+M
    - Disabled when:
      - Any confirmation checkbox unchecked
      - Confirmation input doesn't match "MERGE"
      - API call in progress
    - Shows: Confirmation dialog before merge
    - Action:
      1. Show final confirmation dialog
      2. Call `POST /api/v1/patients/merge`
      3. On success: Navigate to `/reception/patients/{targetId}` with success message
      4. On error: Show error message

- [ ] **Final Confirmation Dialog**
  - Triggered by: Merge button click
  - Title: "Final Confirmation"
  - Message: "You are about to merge {sourceMRN} into {targetMRN}. This cannot be undone. Are you absolutely sure?"
  - Buttons:
    - [ ] **Cancel**
      - Text: "Cancel"
      - Action: Close dialog
    - [ ] **Yes, Merge Now**
      - Text: "Yes, Merge Now"
      - Color: Red
      - Action: Proceed with API call

- [ ] **Error Display Area**
  - Position: Top of page
  - Shows: API errors or validation errors
  - Dismissible

- [ ] **Loading Spinner**
  - Shows: During merge API call
  - Overlay: Full page with message "Merging patients... Please wait"

## API Integration

**1. Get Source Patient:**
```
GET /api/v1/patients/{sourceId}

Response (200):
{
  "data": {
    "patientId": "uuid-source",
    "mrn": "A00012",
    "name": "Ramesh S",
    "dob": "1980-05-16",
    "age": 45,
    "sex": "M",
    "phone": "9876543210",
    "email": "ramesh.s@example.com",
    ...
  }
}
```

**2. Get Target Patient:**
```
GET /api/v1/patients/{targetId}

Response (200):
{
  "data": {
    "patientId": "uuid-target",
    "mrn": "A00001",
    "name": "Ramesh Sharma",
    "dob": "1980-05-15",
    "age": 45,
    "sex": "M",
    "phone": "9876543210",
    "email": "ramesh@example.com",
    ...
  }
}
```

**3. Get Source Visits:**
```
GET /api/v1/visits?patientId={sourceId}

Response (200):
{
  "data": [
    {
      "visitId": "uuid",
      "token": "P-025",
      "visitDate": "2025-11-15",
      "tests": [{"testCode": "CBC", "testName": "Complete Blood Count"}],
      "status": "Paid",
      "totalAmount": 800.00
    }
  ]
}
```

**4. Merge Patients:**
```
POST /api/v1/patients/merge

Request Body:
{
  "sourcePatientId": "uuid-source",
  "targetPatientId": "uuid-target",
  "conflicts": {
    "phone": "keepTarget|keepSource|keepBoth",
    "email": "keepTarget|keepSource",
    "medicalHistory": "keepTarget|keepSource|mergeBoth"
  }
}

Success Response (200):
{
  "data": {
    "mergedPatientId": "uuid-target",
    "mrn": "A00001",
    "deletedMrn": "A00012",
    "transferredVisits": 3,
    "message": "Successfully merged A00012 into A00001"
  }
}

Error Response (400):
{
  "error": {
    "code": "MERGE_FAILED",
    "message": "Cannot merge: Patients have different sex"
  }
}

Error Response (409):
{
  "error": {
    "code": "CONCURRENT_MODIFICATION",
    "message": "One of the patients was modified during merge. Please try again."
  }
}
```

## Keyboard Shortcuts

- **Esc:** Cancel merge
- **Ctrl+M:** Merge (if all confirmations checked)

## Validation Rules

1. **Source and Target must be different:**
   - Cannot merge patient into itself
   - Show error if sourceId === targetId

2. **Critical fields must match:**
   - Sex must match (cannot merge M into F)
   - DOB must be within 1 year (warn if different)

3. **All 3 confirmation checkboxes:**
   - Must be checked to enable merge button

4. **Confirmation text:**
   - Must exactly match "MERGE" (case-sensitive)

## Gemini Prompt for R6

```
Build the Patient Merge (Deduplication) screen (React + Vite + Tailwind CSS + shadcn/ui).

BACKEND APIs:
1. GET /api/v1/patients/{sourceId}
   Response: { "data": { "patientId": "uuid", "mrn": "A00012", "name": "Ramesh S", "dob": "YYYY-MM-DD", "age": 45, "sex": "M", "phone": "string", "email": "string", ... } }

2. GET /api/v1/patients/{targetId}
   Response: (same structure)

3. GET /api/v1/visits?patientId={sourceId}
   Response: { "data": [{ "visitId": "uuid", "token": "P-025", "visitDate": "YYYY-MM-DD", "tests": [...], "status": "string", "totalAmount": 800.00 }] }

4. POST /api/v1/patients/merge
   Request: { "sourcePatientId": "uuid", "targetPatientId": "uuid", "conflicts": { "phone": "keepTarget|keepSource|keepBoth", "email": "keepTarget|keepSource", "medicalHistory": "keepTarget|keepSource|mergeBoth" } }
   Success (200): { "data": { "mergedPatientId": "uuid", "mrn": "A00001", "deletedMrn": "A00012", "transferredVisits": 3, "message": "string" } }
   Error (400): { "error": { "code": "MERGE_FAILED", "message": "string" } }

UI REQUIREMENTS:

PAGE HEADER:
1. Title: "Merge Duplicate Patients"
2. Warning message: "⚠️ This action cannot be undone. Please verify carefully."
3. Breadcrumb: Home → Patients → Merge

SIDE-BY-SIDE COMPARISON:
4. LEFT CARD: Source Patient (To Be Deleted)
   - Header: "Source Patient (Will be deleted)"
   - Background: Light red/pink
   - Display all patient fields from GET /api/v1/patients/{sourceId}
   - Visit count badge: "X visits will be transferred"

5. RIGHT CARD: Target Patient (To Be Kept)
   - Header: "Target Patient (Will be kept)"
   - Background: Light green
   - Display all patient fields from GET /api/v1/patients/{targetId}
   - Visit count badge: "X existing visits + Y transferred = Z total"

6. Merge direction indicator
   - Large arrow icon between cards: →
   - Text: "All data from left will merge into right →"

VISIT TRANSFER PREVIEW:
7. Section heading: "Visits to be Transferred"
8. Table with source patient's visits from GET /api/v1/visits?patientId={sourceId}
9. Columns: Date, Token, Tests, Status, Amount

CONFLICT RESOLUTION:
10. Section heading: "Resolve Conflicts" (show if any conflicts detected)

11. Phone conflict (if different):
    - Label: "Phone Number (conflicting)"
    - Radio buttons:
      * Keep Target: {target.phone}
      * Keep Source: {source.phone}
      * Keep Both (add source as alternate)
    - Default: Keep Target

12. Email conflict (if different):
    - Label: "Email (conflicting)"
    - Radio buttons:
      * Keep Target: {target.email}
      * Keep Source: {source.email}
    - Default: Keep Target

13. Medical History conflict (if both non-empty):
    - Label: "Medical History (both have data)"
    - Radio buttons:
      * Keep Target only
      * Keep Source only
      * Merge Both (concatenate with separator)
    - Default: Merge Both

CONFIRMATION CHECKLIST:
14. Checkbox 1: "I have verified that these are duplicate records of the same person"
    - Required to enable merge button

15. Checkbox 2: "I understand that {source.mrn} will be permanently deleted"
    - Required to enable merge button

16. Checkbox 3: "I understand that all visits will be transferred to {target.mrn}"
    - Required to enable merge button

17. Confirmation text input
    - Label: "Type 'MERGE' to confirm"
    - Placeholder: "Type MERGE in uppercase"
    - Validation: Must exactly match "MERGE"
    - Required to enable merge button

ACTION BUTTONS:
18. Cancel button
    - Text: "Cancel Merge"
    - Color: Secondary
    - Keyboard: Esc
    - Navigate to: /reception/patients/{sourceId}

19. Merge Patients button
    - Text: "Merge Patients"
    - Color: Red (destructive)
    - Keyboard: Ctrl+M
    - Disabled if:
      * Any checkbox unchecked
      * Confirmation text !== "MERGE"
      * API call in progress
    - On click: Show final confirmation dialog

FINAL CONFIRMATION DIALOG:
20. Triggered by: Merge button click
21. Title: "Final Confirmation"
22. Message: "You are about to merge {source.mrn} into {target.mrn}. This cannot be undone. Are you absolutely sure?"
23. Cancel button: Close dialog
24. Yes, Merge Now button:
    - Color: Red
    - Action:
      1. Call POST /api/v1/patients/merge
      2. On success (200):
         - Show success toast: "Successfully merged {deletedMrn} into {mrn}. {transferredVisits} visits transferred."
         - Navigate to: /reception/patients/{mergedPatientId}
      3. On error (400):
         - Show error message: error.message
         - Keep on same page
      4. On error (409):
         - Show error: "Data changed during merge. Please refresh and try again."

ERROR HANDLING:
25. Show error banner at top if:
    - Source and target are same patient
    - Sex doesn't match
    - DOB differs by > 1 year (warn only)
    - API call fails

LOADING STATE:
26. Full-page overlay with spinner during merge
27. Message: "Merging patients... Please wait"
28. Disable all buttons and inputs

VALIDATION:
- On page load: Verify sourceId !== targetId
- Compare sex: Must match
- Compare DOB: Warn if > 1 year difference
- All 3 checkboxes must be checked
- Confirmation text must match "MERGE" exactly

KEYBOARD SHORTCUTS:
- Esc: Cancel
- Ctrl+M: Merge (if enabled)

DO NOT:
- Allow merge if source === target
- Allow merge if sex doesn't match
- Skip conflict resolution
- Skip confirmation checks
- Use mock data

ACCEPT CRITERIA:
- Both patients load and display side-by-side
- Visit transfer preview shows correct count
- Conflict resolution shows for differing fields
- All 3 checkboxes + confirmation text required
- Final confirmation dialog shows
- Merge API call works
- Success navigates to merged patient
- Error handling shows appropriate messages
- Cannot merge if critical validations fail
```

---

# R7: New Visit Creation

**Route:** `/reception/visits/new?patientId={patientId}`  
**Role:** Reception  
**Backend APIs:**
- `GET /api/v1/patients/{id}`
- `GET /api/v1/tests?dept=Pathology`
- `POST /api/v1/visits`

## Complete Component Checklist

### UI Elements:

- [ ] **Page Header**
  - Title: "Create New Visit"
  - Patient info banner: "{MRN} - {Name} ({Age} years, {Sex})"
  - Breadcrumb: Home → Visits → New Visit

- [ ] **Patient Selection Section** (if no patientId in URL)
  
  - [ ] **Search Patient Input**
    - Label: "Search Patient"
    - Placeholder: "Search by name, phone, or MRN"
    - Type: text with autocomplete
    - API: `GET /api/v1/patients?search={query}`
    - Shows dropdown with matching patients
    - On select: Fill patientId and show patient banner
  
  - [ ] **Or Create New Patient Button**
    - Text: "Create New Patient"
    - Navigate to: `/reception/patients/new`

- [ ] **Patient Info Display** (when patient selected)
  - MRN badge
  - Name
  - Age, Sex
  - Phone
  - Last visit date (if any)
  - [ ] **Change Patient Button**
    - Text: "Change Patient"
    - Action: Clear patient selection, show search again

- [ ] **Visit Date Selector**
  - Label: "Visit Date *"
  - Type: Date picker
  - Default: Today
  - Max: Today (cannot future-date)
  - Required: Yes
  - API field: `visitDate`

- [ ] **Test Selection Section**
  - Heading: "Select Tests *"
  - Load: `GET /api/v1/tests?dept=Pathology` on page load
  
  - [ ] **Search/Filter Tests Input**
    - Placeholder: "Search tests..."
    - Type: text
    - Filters: Test list in real-time
  
  - [ ] **Test Category Tabs** (optional, for easier navigation)
    - All Tests
    - Hematology (CBC, ESR, etc.)
    - Biochemistry (FBS, RFT, LFT, etc.)
    - Serology
    - Microbiology
  
  - [ ] **Test List (Checkboxes)**
    - For each test:
      - [ ] **Test Checkbox**
        - Label: Test name (e.g., "Complete Blood Count (CBC)")
        - Sub-label: Test code + Price (e.g., "CBC - ₹350")
        - On check: Add to selected tests, update total
        - On uncheck: Remove from selected tests, update total
  
  - [ ] **Selected Tests Count**
    - Display: "X tests selected"
    - Updates in real-time

- [ ] **Selected Tests Summary Panel**
  - Position: Sticky sidebar or bottom panel
  - Heading: "Selected Tests (X)"
  
  - [ ] **Per Selected Test:**
    - Test name
    - Test code
    - Price
    - [ ] **Remove Button** (X icon)
      - Action: Remove test from selection
  
  - [ ] **Total Amount Display**
    - Label: "Total Amount"
    - Value: Sum of all selected test prices
    - Format: "₹{total}"
    - Font: Large, prominent

- [ ] **Discount Section**
  
  - [ ] **Discount Type Radio Buttons**
    - Options: None, Percentage, Fixed Amount
    - Default: None
  
  - [ ] **Discount Value Input** (shows when type selected)
    - Label: "Discount Value"
    - Type: number
    - Placeholder: "Enter discount"
    - Validation:
      - If Percentage: 0-100
      - If Fixed: 0 to total amount
  
  - [ ] **Discount Reason Textarea**
    - Label: "Reason (required for discounts > 10%)"
    - Required: If discount > 10%
    - API field: `discountReason`
  
  - [ ] **Discounted Total Display**
    - Shows: When discount applied
    - Label: "After Discount"
    - Value: Total - discount
    - Format: "₹{discountedTotal}"

- [ ] **Payment Status Section**
  
  - [ ] **Payment Status Radio Buttons**
    - Options: Paid, Unpaid, Insurance
    - Default: Unpaid
    - API field: `paymentStatus`
  
  - [ ] **Payment Method Dropdown** (shows when Paid selected)
    - Label: "Payment Method"
    - Options: Cash, Card, UPI, Cheque
    - API field: `paymentMethod`
  
  - [ ] **Transaction ID Input** (shows when Card/UPI/Cheque selected)
    - Label: "Transaction ID / Cheque Number"
    - Type: text
    - API field: `transactionId`
  
  - [ ] **Insurance Provider Input** (shows when Insurance selected)
    - Label: "Insurance Provider"
    - Type: text
    - Required: When Insurance selected
    - API field: `insuranceProvider`
  
  - [ ] **Policy Number Input** (shows when Insurance selected)
    - Label: "Policy Number"
    - Type: text
    - Required: When Insurance selected
    - API field: `policyNumber`

- [ ] **Special Instructions Textarea** (Optional)
  - Label: "Special Instructions / Notes"
  - Rows: 3
  - Placeholder: "Any special handling, fasting status, etc."
  - API field: `specialInstructions`

- [ ] **Referral Information** (if patient has referredBy)
  - Display: "Referred by: {doctor name}"
  - Commission badge: "Commission: {rate}%"
  - Read-only

- [ ] **Action Buttons**
  
  - [ ] **Save & Print Token Button** (Primary)
    - Text: "Save & Print Token"
    - Color: Primary
    - Keyboard: Ctrl+S
    - Disabled: If no tests selected OR patient not selected
    - Action:
      1. Validate all fields
      2. Call `POST /api/v1/visits`
      3. On success: Navigate to `/reception/visits/{visitId}/print`
  
  - [ ] **Save & Collect Sample Button** (Secondary)
    - Text: "Save & Collect Sample"
    - Color: Secondary
    - Action:
      1. Same as Save & Print Token
      2. On success: Navigate to `/sample/collection?visitId={visitId}`
  
  - [ ] **Save Only Button**
    - Text: "Save Visit"
    - Color: Outline
    - Action:
      1. Same validation
      2. On success: Navigate to `/reception/visits/{visitId}`
  
  - [ ] **Cancel Button**
    - Text: "Cancel"
    - Keyboard: Esc
    - Action: Navigate to `/reception/dashboard`

- [ ] **Validation Summary** (if errors)
  - Position: Top of form
  - Shows: List of validation errors
  - Color: Red banner

- [ ] **Loading Spinner**
  - Shows: During API call
  - Disables: All form elements

## API Integration

**1. Get Patient Details:**
```
GET /api/v1/patients/{patientId}

Response (200):
{
  "data": {
    "patientId": "uuid",
    "mrn": "A00123",
    "name": "Ramesh Sharma",
    "dob": "1980-05-15",
    "age": 45,
    "sex": "M",
    "phone": "9876543210",
    "referredBy": {
      "doctorId": "uuid",
      "name": "Dr. Anand Kumar",
      "commissionRate": 15.0
    },
    "lastVisitDate": "2025-11-20"
  }
}
```

**2. Get Available Tests:**
```
GET /api/v1/tests?dept=Pathology

Response (200):
{
  "data": [
    {
      "testId": "uuid",
      "testCode": "CBC",
      "testName": "Complete Blood Count",
      "category": "Hematology",
      "price": 350.00,
      "tat": 24,
      "requiresFasting": false
    },
    {
      "testId": "uuid",
      "testCode": "FBS",
      "testName": "Fasting Blood Sugar",
      "category": "Biochemistry",
      "price": 120.00,
      "tat": 12,
      "requiresFasting": true
    },
    // ... more tests
  ]
}
```

**3. Create Visit:**
```
POST /api/v1/visits

Request Body:
{
  "patientId": "uuid",
  "visitDate": "2025-11-22",
  "tests": ["test-uuid-1", "test-uuid-2"],
  "discountType": "Percentage|FixedAmount|None",
  "discountValue": 10.0,
  "discountReason": "Senior citizen discount",
  "paymentStatus": "Paid|Unpaid|Insurance",
  "paymentMethod": "Cash|Card|UPI|Cheque",
  "transactionId": "TXN123456",
  "insuranceProvider": "ABC Insurance",
  "policyNumber": "POL123456",
  "specialInstructions": "Fasting sample",
  "referralCommissionApplicable": true
}

Success Response (201):
{
  "data": {
    "visitId": "uuid",
    "token": "P-042",
    "patientId": "uuid",
    "visitDate": "2025-11-22",
    "tests": [
      {
        "testId": "uuid",
        "testCode": "CBC",
        "testName": "Complete Blood Count",
        "price": 350.00
      }
    ],
    "totalAmount": 350.00,
    "discountAmount": 35.00,
    "finalAmount": 315.00,
    "paymentStatus": "Paid",
    "token": "P-042",
    "createdAt": "2025-11-22T10:30:00Z"
  }
}

Error Response (400):
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "tests", "message": "At least one test is required" },
      { "field": "discountReason", "message": "Discount reason required for discounts > 10%" }
    ]
  }
}

Error Response (409):
{
  "error": {
    "code": "DUPLICATE_VISIT",
    "message": "Patient already has a visit today with pending tests"
  }
}
```

## Keyboard Shortcuts

- **Ctrl+S:** Save & Print Token
- **Esc:** Cancel
- **Ctrl+F:** Focus test search

## Validation Rules

1. **Patient:**
   - Required
   - Must be selected before proceeding

2. **Visit Date:**
   - Required
   - Cannot be future date
   - Cannot be > 30 days in past (warn only)

3. **Tests:**
   - Required
   - At least 1 test must be selected
   - Max 20 tests per visit (warn if > 20)

4. **Discount:**
   - If Percentage: 0-100
   - If Fixed: 0 to total amount
   - Reason required if > 10%

5. **Payment:**
   - Transaction ID required if method = Card/UPI/Cheque
   - Insurance provider + policy required if status = Insurance

## Gemini Prompt for R7

```
Build the New Visit Creation screen (React + Vite + Tailwind CSS + shadcn/ui).

BACKEND APIs:
1. GET /api/v1/patients/{patientId}
   Response: { "data": { "patientId": "uuid", "mrn": "A00123", "name": "Ramesh Sharma", "dob": "YYYY-MM-DD", "age": 45, "sex": "M", "phone": "string", "referredBy": { "doctorId": "uuid", "name": "Dr. Name", "commissionRate": 15.0 }, "lastVisitDate": "YYYY-MM-DD" } }

2. GET /api/v1/tests?dept=Pathology
   Response: { "data": [{ "testId": "uuid", "testCode": "CBC", "testName": "Complete Blood Count", "category": "Hematology", "price": 350.00, "tat": 24, "requiresFasting": false }] }

3. POST /api/v1/visits
   Request: { "patientId": "uuid", "visitDate": "YYYY-MM-DD", "tests": ["uuid"], "discountType": "Percentage|FixedAmount|None", "discountValue": 10.0, "discountReason": "string", "paymentStatus": "Paid|Unpaid|Insurance", "paymentMethod": "Cash|Card|UPI|Cheque", "transactionId": "string", "insuranceProvider": "string", "policyNumber": "string", "specialInstructions": "string", "referralCommissionApplicable": boolean }
   Success (201): { "data": { "visitId": "uuid", "token": "P-042", "tests": [...], "totalAmount": 350.00, "discountAmount": 35.00, "finalAmount": 315.00, "paymentStatus": "string", "createdAt": "ISO" } }
   Error (400): { "error": { "code": "VALIDATION_ERROR", "message": "string", "details": [...] } }

UI REQUIREMENTS:

PAGE HEADER:
1. Title: "Create New Visit"
2. Breadcrumb: Home → Visits → New Visit

PATIENT SELECTION (if no patientId in URL):
3. Search patient input
   - Placeholder: "Search by name, phone, or MRN"
   - Autocomplete: Call GET /api/v1/patients?search={query}
   - On select: Fill patient info banner

4. Or Create New Patient button
   - Navigate to: /reception/patients/new

PATIENT INFO DISPLAY (when selected):
5. Patient banner:
   - MRN badge
   - Name (large)
   - "{age} years, {sex}"
   - Phone
   - Last visit: {lastVisitDate} or "First visit"

6. Change Patient button
   - Action: Clear selection, show search again

VISIT DATE:
7. Visit Date picker *
   - Label: "Visit Date *"
   - Default: Today
   - Max: Today
   - Required
   - API field: visitDate

TEST SELECTION:
8. Section heading: "Select Tests *"
9. Load tests: GET /api/v1/tests?dept=Pathology on page load

10. Search tests input
    - Placeholder: "Search tests..."
    - Filters list in real-time

11. Test list (checkboxes):
    - For each test:
      * Checkbox
      * Label: "{testName} ({testCode})"
      * Sub-label: "₹{price}"
      * On check: Add to selection, update total
      * On uncheck: Remove, update total

12. Selected tests count: "X tests selected"

SELECTED TESTS SUMMARY (Sticky sidebar/panel):
13. Heading: "Selected Tests (X)"
14. For each selected test:
    - Test name
    - Test code
    - Price
    - Remove button (X icon)

15. Total Amount display:
    - Label: "Total Amount"
    - Value: Sum of prices
    - Format: "₹{total}"
    - Font: Large, bold

DISCOUNT SECTION:
16. Discount type radio buttons:
    - None (default)
    - Percentage
    - Fixed Amount

17. Discount value input (shows when type selected):
    - Label: "Discount Value"
    - Type: number
    - Validation: Percentage (0-100), Fixed (0 to total)

18. Discount reason textarea:
    - Label: "Reason (required if > 10%)"
    - Required: If discount > 10%

19. Discounted total display (if discount applied):
    - Label: "After Discount"
    - Value: total - discount
    - Format: "₹{discountedTotal}"

PAYMENT STATUS:
20. Payment status radio buttons:
    - Unpaid (default)
    - Paid
    - Insurance

21. Payment method dropdown (shows if Paid):
    - Options: Cash, Card, UPI, Cheque

22. Transaction ID input (shows if Card/UPI/Cheque):
    - Label: "Transaction ID / Cheque Number"
    - Required: If method selected

23. Insurance provider input (shows if Insurance):
    - Label: "Insurance Provider"
    - Required

24. Policy number input (shows if Insurance):
    - Label: "Policy Number"
    - Required

SPECIAL INSTRUCTIONS:
25. Textarea (optional)
    - Label: "Special Instructions / Notes"
    - Rows: 3
    - Placeholder: "Fasting status, special handling, etc."

REFERRAL INFO (if applicable):
26. Display: "Referred by: {referredBy.name}"
27. Commission badge: "Commission: {commissionRate}%"

ACTION BUTTONS:
28. Save & Print Token button (primary)
    - Text: "Save & Print Token"
    - Color: Primary
    - Keyboard: Ctrl+S
    - Disabled: If no tests OR no patient
    - Action:
      1. Validate
      2. Call POST /api/v1/visits
      3. On success: Navigate to /reception/visits/{visitId}/print

29. Save & Collect Sample button (secondary)
    - Text: "Save & Collect Sample"
    - Action:
      1. Same as above
      2. On success: Navigate to /sample/collection?visitId={visitId}

30. Save Only button
    - Text: "Save Visit"
    - Action:
      1. Same validation
      2. On success: Navigate to /reception/visits/{visitId}

31. Cancel button
    - Text: "Cancel"
    - Keyboard: Esc
    - Navigate to: /reception/dashboard

VALIDATION:
- Patient: Required
- Visit date: Required, not future, not > 30 days old
- Tests: At least 1 required, max 20
- Discount: 0-100 if %, 0-total if fixed, reason required if > 10%
- Payment: Transaction ID required if Card/UPI/Cheque
- Insurance: Provider + policy required if Insurance selected

ERROR HANDLING:
- Show validation summary at top
- Show field-level errors below each field
- On API error: Display error.message

LOADING STATE:
- Show spinner during POST
- Disable all inputs and buttons

KEYBOARD SHORTCUTS:
- Ctrl+S: Save & Print
- Ctrl+F: Focus test search
- Esc: Cancel

DO NOT:
- Use mock data
- Skip test selection validation
- Allow saving without patient
- Skip discount validation

ACCEPT CRITERIA:
- Patient search/select works
- Test list loads from API
- Test selection updates total in real-time
- Discount calculates correctly
- Payment options show conditionally
- All validations work
- Save creates visit via API
- Success navigates correctly
- Keyboard shortcuts work
```

---

**Continuing with R8-R12... Ready?** 

Each remaining screen will have same detail level. Should I continue generating all 5 remaining Reception screens now?

