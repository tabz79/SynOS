# RECEPTION ROLE - FINAL SCREENS R11-R12
## Appointments Management

**Completing Reception Role**  
**Final Screens:** 2 (Appointments)  
**Total Reception Screens:** 12 complete

---

# R11: Appointments Calendar

**Route:** `/reception/appointments`  
**Role:** Reception  
**Backend APIs:**
- `GET /api/v1/appointments?date={date}`
- `GET /api/v1/appointments?month={YYYY-MM}`
- `PUT /api/v1/appointments/{id}/reschedule`
- `DELETE /api/v1/appointments/{id}`

## Complete Component Checklist

### UI Elements:

- [ ] **Page Header**
  - Title: "Appointments"
  - Breadcrumb: Home → Appointments

- [ ] **Quick Actions Bar**
  - [ ] **New Appointment Button**
    - Text: "New Appointment"
    - Icon: Plus + Calendar
    - Keyboard: Ctrl+N
    - Navigate to: `/reception/appointments/new`
  
  - [ ] **Today Button**
    - Text: "Today"
    - Keyboard: Ctrl+T
    - Action: Jump calendar to today's date
  
  - [ ] **View Toggle Buttons**
    - [ ] **Day View Button**
      - Text: "Day"
      - Action: Switch to day view
    - [ ] **Week View Button**
      - Text: "Week"
      - Action: Switch to week view
    - [ ] **Month View Button**
      - Text: "Month"
      - Action: Switch to month view
    - Default: Day view

- [ ] **Date Navigation**
  - [ ] **Previous Button**
    - Icon: Left arrow
    - Keyboard: Left arrow key
    - Action: Go to previous day/week/month
  
  - [ ] **Current Date Display**
    - Format: "DD MMM YYYY" (Day view)
    - Format: "DD - DD MMM YYYY" (Week view)
    - Format: "MMM YYYY" (Month view)
  
  - [ ] **Next Button**
    - Icon: Right arrow
    - Keyboard: Right arrow key
    - Action: Go to next day/week/month
  
  - [ ] **Date Picker Button**
    - Icon: Calendar
    - Action: Open date picker to jump to specific date

- [ ] **Filters Section** (Collapsible)
  - [ ] **Department Filter Dropdown**
    - Label: "Department"
    - Options: All, Pathology, Radiology, X-Ray, MRI, CT
    - Default: All
  
  - [ ] **Status Filter Dropdown**
    - Label: "Status"
    - Options: All, Scheduled, Confirmed, Cancelled, Completed
    - Default: All (except Cancelled)
  
  - [ ] **Search Appointments Input**
    - Placeholder: "Search by patient name, phone, MRN..."
    - Type: text
    - Real-time filter

- [ ] **Appointments List/Calendar View**

  **DAY VIEW (Default):**
  - [ ] **Time Slots (9 AM - 6 PM)**
    - 30-minute intervals
    - Scrollable timeline
    - **Per Slot:**
      - Time label (e.g., "10:00 AM")
      - Empty state: "No appointments"
      - Appointment card (if exists):
        - Patient name
        - MRN
        - Tests
        - Status badge
        - Department badge
        - [ ] **Quick Actions:**
          - [ ] **Check-in Button** (if status=Scheduled)
            - Icon: Check
            - Action: Create visit from appointment
          - [ ] **View Button**
            - Icon: Eye
            - Navigate to: Appointment details modal
          - [ ] **Reschedule Button**
            - Icon: Clock
            - Opens reschedule modal
          - [ ] **Cancel Button**
            - Icon: X
            - Shows confirmation, cancels appointment

  **WEEK VIEW:**
  - [ ] **7-Day Grid**
    - Columns: Mon-Sun
    - Rows: Time slots (9 AM - 6 PM)
    - Appointments displayed as colored blocks
    - Click appointment: Open details modal

  **MONTH VIEW:**
  - [ ] **Calendar Grid**
    - Days of month
    - Appointment count badge per day
    - Click day: Switch to day view for that date

- [ ] **Appointment Details Modal** (Triggered by View button)
  - [ ] **Modal Header**
    - Title: "Appointment Details"
    - Close button (X)
  
  - [ ] **Appointment Info Display**
    - Appointment ID
    - Scheduled Date/Time
    - Patient: Name, MRN, Phone
    - Department
    - Tests requested
    - Status badge
    - Notes (if any)
    - Created By + Created At
  
  - [ ] **Modal Action Buttons**
    - [ ] **Edit Appointment Button**
      - Navigate to: Edit appointment screen
    - [ ] **Reschedule Button**
      - Opens reschedule sub-modal
    - [ ] **Cancel Appointment Button**
      - Shows confirmation
      - API: `DELETE /api/v1/appointments/{id}`
    - [ ] **Check-in Button** (if status=Scheduled)
      - Creates visit
      - API: `POST /api/v1/visits` with appointmentId
    - [ ] **Close Button**
      - Closes modal

- [ ] **Reschedule Modal** (Triggered by Reschedule button)
  - [ ] **Modal Header**
    - Title: "Reschedule Appointment"
  
  - [ ] **New Date Picker**
    - Label: "New Date"
    - Type: date
    - Required: Yes
  
  - [ ] **New Time Picker**
    - Label: "New Time"
    - Type: time
    - Required: Yes
    - Validation: Check slot availability
  
  - [ ] **Reschedule Reason Textarea**
    - Label: "Reason for Rescheduling"
    - Optional
  
  - [ ] **Modal Action Buttons**
    - [ ] **Save Reschedule Button**
      - API: `PUT /api/v1/appointments/{id}/reschedule`
    - [ ] **Cancel Button**
      - Closes modal

- [ ] **Stats Summary Cards** (Top of page)
  - [ ] **Total Appointments Today Card**
    - Value: Count
    - Icon: Calendar
  
  - [ ] **Pending Check-ins Card**
    - Value: Count of Scheduled
    - Icon: Clock
    - Color: Orange
  
  - [ ] **Completed Today Card**
    - Value: Count of Completed
    - Icon: Check
    - Color: Green

- [ ] **Empty State** (if no appointments for selected date/period)
  - Message: "No appointments scheduled for {date}"
  - [ ] **Create Appointment Button**
    - Navigate to: `/reception/appointments/new`

- [ ] **Loading Spinner**
  - Shows: During API calls

## API Integration

**1. Get Appointments for Date:**
```
GET /api/v1/appointments?date=2025-11-22

Response (200):
{
  "data": [
    {
      "appointmentId": "uuid",
      "patient": {
        "patientId": "uuid",
        "mrn": "A00123",
        "name": "Ramesh Sharma",
        "phone": "9876543210"
      },
      "scheduledFor": "2025-11-22T10:30:00Z",
      "tests": ["CBC", "FBS"],
      "testNames": ["Complete Blood Count", "Fasting Blood Sugar"],
      "dept": "Pathology",
      "status": "Scheduled",
      "notes": "Fasting required",
      "createdBy": {
        "userId": "uuid",
        "name": "Priya Sharma"
      },
      "createdAt": "2025-11-20T15:00:00Z"
    }
  ]
}
```

**2. Get Appointments for Month:**
```
GET /api/v1/appointments?month=2025-11

Response (200):
{
  "data": [
    {
      "date": "2025-11-22",
      "count": 5,
      "appointments": [...]
    },
    {
      "date": "2025-11-23",
      "count": 3,
      "appointments": [...]
    }
  ]
}
```

**3. Reschedule Appointment:**
```
PUT /api/v1/appointments/{appointmentId}/reschedule

Request:
{
  "newDate": "2025-11-23",
  "newTime": "11:00",
  "reason": "Patient requested"
}

Response (200):
{
  "data": {
    "appointmentId": "uuid",
    "scheduledFor": "2025-11-23T11:00:00Z",
    "status": "Scheduled"
  }
}
```

**4. Cancel Appointment:**
```
DELETE /api/v1/appointments/{appointmentId}

OR

PUT /api/v1/appointments/{appointmentId}/cancel

Request:
{
  "reason": "Patient cancelled"
}

Response (200):
{
  "data": {
    "appointmentId": "uuid",
    "status": "Cancelled"
  }
}
```

**5. Check-in (Create Visit from Appointment):**
```
POST /api/v1/visits

Request:
{
  "appointmentId": "uuid",
  "patientId": "uuid",
  "visitDate": "2025-11-22",
  "tests": ["uuid1", "uuid2"]
}

Response (201):
{
  "data": {
    "visitId": "uuid",
    "token": "P-042"
  }
}
```

## Keyboard Shortcuts

- **Ctrl+N:** New appointment
- **Ctrl+T:** Jump to today
- **Left Arrow:** Previous day/week/month
- **Right Arrow:** Next day/week/month
- **Esc:** Close modal

## Gemini Prompt for R11

```
Build the Appointments Calendar screen (React + Vite + Tailwind CSS + shadcn/ui).

BACKEND APIs:
1. GET /api/v1/appointments?date=YYYY-MM-DD
   Response: { "data": [{ "appointmentId": "uuid", "patient": {...}, "scheduledFor": "ISO", "tests": ["CBC"], "testNames": ["Complete Blood Count"], "dept": "Pathology", "status": "Scheduled|Confirmed|Cancelled|Completed", "notes": "string", "createdBy": {...}, "createdAt": "ISO" }] }

2. GET /api/v1/appointments?month=YYYY-MM
   Response: { "data": [{ "date": "YYYY-MM-DD", "count": 5, "appointments": [...] }] }

3. PUT /api/v1/appointments/{appointmentId}/reschedule
   Request: { "newDate": "YYYY-MM-DD", "newTime": "HH:MM", "reason": "string" }
   Response (200): { "data": { "appointmentId": "uuid", "scheduledFor": "ISO", "status": "Scheduled" } }

4. DELETE /api/v1/appointments/{appointmentId} OR PUT /api/v1/appointments/{appointmentId}/cancel
   Response (200): { "data": { "appointmentId": "uuid", "status": "Cancelled" } }

5. POST /api/v1/visits (for check-in)
   Request: { "appointmentId": "uuid", "patientId": "uuid", "visitDate": "YYYY-MM-DD", "tests": ["uuid"] }
   Response (201): { "data": { "visitId": "uuid", "token": "P-042" } }

UI REQUIREMENTS:

PAGE HEADER:
1. Title: "Appointments"
2. Breadcrumb: Home → Appointments

QUICK ACTIONS:
3. New Appointment button
   - Keyboard: Ctrl+N
   - Navigate to: /reception/appointments/new

4. Today button
   - Keyboard: Ctrl+T
   - Action: Jump to today

5. View toggle buttons:
   - Day (default)
   - Week
   - Month

DATE NAVIGATION:
6. Previous button (left arrow)
   - Keyboard: Left arrow
   - Action: Previous day/week/month based on view

7. Current date display
   - Day: "DD MMM YYYY"
   - Week: "DD - DD MMM YYYY"
   - Month: "MMM YYYY"

8. Next button (right arrow)
   - Keyboard: Right arrow
   - Action: Next day/week/month

9. Date picker button
   - Opens calendar to jump to specific date

FILTERS:
10. Department filter:
    - Options: All, Pathology, Radiology, X-Ray, MRI, CT

11. Status filter:
    - Options: All, Scheduled, Confirmed, Cancelled, Completed
    - Default: All except Cancelled

12. Search input:
    - Placeholder: "Search by patient name, phone, MRN..."

DAY VIEW (Default):
13. Time slots (9 AM - 6 PM, 30-min intervals)
14. For each appointment:
    - Patient name
    - MRN
    - Tests
    - Status badge
    - Department badge
    - Quick action buttons:
      * Check-in (if Scheduled)
      * View
      * Reschedule
      * Cancel

WEEK VIEW:
15. 7-day grid (Mon-Sun columns, time rows)
16. Appointments as colored blocks
17. Click: Open details modal

MONTH VIEW:
18. Calendar grid (days of month)
19. Appointment count badge per day
20. Click day: Switch to day view

STATS CARDS:
21. Total Appointments Today
22. Pending Check-ins
23. Completed Today

APPOINTMENT DETAILS MODAL:
24. Triggered by: View button
25. Display:
    - Appointment ID
    - Scheduled Date/Time
    - Patient info
    - Department
    - Tests
    - Status
    - Notes
    - Created by/at

26. Modal actions:
    - Edit Appointment
    - Reschedule
    - Cancel
    - Check-in (if Scheduled)
    - Close

RESCHEDULE MODAL:
27. Triggered by: Reschedule button
28. New Date picker (required)
29. New Time picker (required)
30. Reason textarea (optional)
31. Save / Cancel buttons
32. On save: Call PUT /api/v1/appointments/{id}/reschedule

EMPTY STATE:
33. Message: "No appointments for {date}"
34. Create Appointment button

KEYBOARD SHORTCUTS:
- Ctrl+N: New appointment
- Ctrl+T: Today
- Left/Right arrows: Navigate dates
- Esc: Close modal

ERROR HANDLING:
- API errors in toast
- Validation errors in modals

LOADING STATE:
- Skeleton for calendar during load
- Spinner during reschedule/cancel

DO NOT:
- Use mock data
- Skip time slot validation
- Allow past-date appointments
- Skip confirmation for cancel

ACCEPT CRITERIA:
- Day/Week/Month views work
- Appointments load from API
- Filters work correctly
- Check-in creates visit
- Reschedule updates appointment
- Cancel marks as cancelled
- All modals function
- Keyboard shortcuts work
```

---

# R12: New Appointment

**Route:** `/reception/appointments/new`  
**Role:** Reception  
**Backend APIs:**
- `GET /api/v1/patients?search={query}`
- `GET /api/v1/tests?dept={dept}`
- `GET /api/v1/appointments/available-slots?date={date}&dept={dept}`
- `POST /api/v1/appointments`

## Complete Component Checklist

### UI Elements:

- [ ] **Page Header**
  - Title: "New Appointment"
  - Breadcrumb: Home → Appointments → New

- [ ] **Patient Selection Section**
  
  - [ ] **Search Existing Patient Input**
    - Label: "Search Patient"
    - Placeholder: "Search by name, phone, or MRN"
    - Type: text with autocomplete
    - API: `GET /api/v1/patients?search={query}`
    - Shows dropdown with matching patients
    - On select: Fill patient details
  
  - [ ] **Or Create New Patient Button**
    - Text: "Create New Patient"
    - Navigate to: `/reception/patients/new?returnTo=/reception/appointments/new`

- [ ] **Selected Patient Display** (when patient selected)
  - MRN badge
  - Name
  - Age, Sex
  - Phone
  - [ ] **Change Patient Button**
    - Action: Clear selection, show search

- [ ] **Appointment Details Section**
  
  - [ ] **Department Selection** (Required)
    - Label: "Department *"
    - Type: Radio buttons or dropdown
    - Options: Pathology, Radiology, X-Ray, MRI, CT
    - Required: Yes
    - API field: `dept`
  
  - [ ] **Appointment Date Picker** (Required)
    - Label: "Appointment Date *"
    - Type: date
    - Min date: Today
    - Max date: 30 days from today (configurable)
    - Required: Yes
    - On change: Load available slots
    - API field: `appointmentDate`
  
  - [ ] **Available Time Slots Section**
    - Heading: "Available Time Slots"
    - Load: `GET /api/v1/appointments/available-slots?date={date}&dept={dept}`
    - Display: Grid of time slot buttons
    - **Per Slot Button:**
      - Text: Time (e.g., "10:00 AM")
      - Disabled: If slot already booked
      - Selected state: Highlight selected slot
      - On click: Select slot
    - Required: Must select one slot

- [ ] **Tests Selection Section** (Optional for appointment)
  
  - [ ] **Search Tests Input**
    - Label: "Select Tests (Optional)"
    - Placeholder: "Search tests..."
    - Filters test list
  
  - [ ] **Test List (Checkboxes)**
    - Load: `GET /api/v1/tests?dept={selectedDept}`
    - For each test:
      - [ ] **Test Checkbox**
        - Label: Test name
        - Sub-label: Test code
        - On check: Add to selected tests
  
  - [ ] **Selected Tests Summary**
    - Display: Comma-separated selected test names
    - Count: "X tests selected"

- [ ] **Additional Information Section**
  
  - [ ] **Appointment Notes Textarea** (Optional)
    - Label: "Notes / Special Instructions"
    - Rows: 3
    - Placeholder: "Fasting required, special handling, etc."
    - API field: `notes`
  
  - [ ] **Contact Number Input** (Optional)
    - Label: "Contact Number (if different from patient record)"
    - Type: tel
    - Placeholder: "Alternate contact for this appointment"
    - Validation: 10 digits if provided
    - API field: `contactNumber`
  
  - [ ] **Send Confirmation Checkbox**
    - Label: "Send confirmation SMS/WhatsApp"
    - Default: Checked
    - API field: `sendConfirmation`

- [ ] **Action Buttons**
  
  - [ ] **Book Appointment Button** (Primary)
    - Text: "Book Appointment"
    - Color: Primary
    - Keyboard: Ctrl+S
    - Disabled: If patient not selected OR date not selected OR slot not selected
    - Action:
      1. Validate required fields
      2. Call `POST /api/v1/appointments`
      3. On success: Navigate to `/reception/appointments` with success message
  
  - [ ] **Book & Check-in Button** (Secondary)
    - Text: "Book & Check-in Now"
    - Color: Secondary
    - Shows only if: Date selected is today
    - Action:
      1. Same as Book Appointment
      2. On success: Navigate to `/reception/visits/new?patientId={patientId}&appointmentId={appointmentId}`
  
  - [ ] **Cancel Button**
    - Text: "Cancel"
    - Keyboard: Esc
    - Action: Navigate to `/reception/appointments`

- [ ] **Validation Summary** (if errors)
  - Position: Top of form
  - Shows: List of validation errors
  - Color: Red banner

- [ ] **Loading Spinner**
  - Shows: During API calls
  - Disables: All form elements

## API Integration

**1. Search Patients:**
```
GET /api/v1/patients?search=ramesh

Response (200):
{
  "data": [
    {
      "patientId": "uuid",
      "mrn": "A00123",
      "name": "Ramesh Sharma",
      "phone": "9876543210",
      "age": 45,
      "sex": "M"
    }
  ]
}
```

**2. Get Available Slots:**
```
GET /api/v1/appointments/available-slots?date=2025-11-23&dept=Pathology

Response (200):
{
  "data": {
    "date": "2025-11-23",
    "dept": "Pathology",
    "slots": [
      {
        "time": "09:00",
        "available": true
      },
      {
        "time": "09:30",
        "available": true
      },
      {
        "time": "10:00",
        "available": false
      },
      {
        "time": "10:30",
        "available": true
      }
      // ... more slots
    ]
  }
}
```

**3. Get Tests for Department:**
```
GET /api/v1/tests?dept=Pathology

Response (200):
{
  "data": [
    {
      "testId": "uuid",
      "testCode": "CBC",
      "testName": "Complete Blood Count",
      "category": "Hematology"
    }
  ]
}
```

**4. Create Appointment:**
```
POST /api/v1/appointments

Request:
{
  "patientId": "uuid",
  "dept": "Pathology",
  "appointmentDate": "2025-11-23",
  "appointmentTime": "10:30",
  "tests": ["test-uuid-1", "test-uuid-2"],
  "notes": "Fasting required",
  "contactNumber": "9876543210",
  "sendConfirmation": true
}

Success Response (201):
{
  "data": {
    "appointmentId": "uuid",
    "patient": {
      "name": "Ramesh Sharma",
      "mrn": "A00123"
    },
    "scheduledFor": "2025-11-23T10:30:00Z",
    "dept": "Pathology",
    "tests": ["CBC", "FBS"],
    "status": "Scheduled",
    "confirmationSent": true,
    "createdAt": "2025-11-22T15:00:00Z"
  }
}

Error Response (400):
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "appointmentTime", "message": "Slot not available" }
    ]
  }
}

Error Response (409):
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "Selected time slot is no longer available"
  }
}
```

## Keyboard Shortcuts

- **Ctrl+S:** Book appointment
- **Esc:** Cancel

## Validation Rules

1. **Patient:**
   - Required
   - Must be selected

2. **Department:**
   - Required
   - One of: Pathology, Radiology, X-Ray, MRI, CT

3. **Date:**
   - Required
   - Not past date
   - Within next 30 days

4. **Time Slot:**
   - Required
   - Must be available (not already booked)

5. **Tests:**
   - Optional
   - If selected, must be valid for department

6. **Contact Number:**
   - Optional
   - 10 digits if provided

## Gemini Prompt for R12

```
Build the New Appointment screen (React + Vite + Tailwind CSS + shadcn/ui).

BACKEND APIs:
1. GET /api/v1/patients?search={query}
   Response: { "data": [{ "patientId": "uuid", "mrn": "A00123", "name": "Ramesh Sharma", "phone": "string", "age": 45, "sex": "M" }] }

2. GET /api/v1/appointments/available-slots?date=YYYY-MM-DD&dept=Pathology
   Response: { "data": { "date": "YYYY-MM-DD", "dept": "string", "slots": [{ "time": "HH:MM", "available": boolean }] } }

3. GET /api/v1/tests?dept={dept}
   Response: { "data": [{ "testId": "uuid", "testCode": "CBC", "testName": "Complete Blood Count", "category": "string" }] }

4. POST /api/v1/appointments
   Request: { "patientId": "uuid", "dept": "Pathology|Radiology|X-Ray|MRI|CT", "appointmentDate": "YYYY-MM-DD", "appointmentTime": "HH:MM", "tests": ["uuid"], "notes": "string", "contactNumber": "string", "sendConfirmation": boolean }
   Success (201): { "data": { "appointmentId": "uuid", "patient": {...}, "scheduledFor": "ISO", "dept": "string", "tests": [...], "status": "Scheduled", "confirmationSent": boolean, "createdAt": "ISO" } }
   Error (400): { "error": { "code": "VALIDATION_ERROR", "message": "string", "details": [...] } }
   Error (409): { "error": { "code": "SLOT_UNAVAILABLE", "message": "string" } }

UI REQUIREMENTS:

PAGE HEADER:
1. Title: "New Appointment"
2. Breadcrumb: Home → Appointments → New

PATIENT SELECTION:
3. Search patient input:
   - Placeholder: "Search by name, phone, or MRN"
   - Autocomplete: Call GET /api/v1/patients?search={query}
   - On select: Fill patient info

4. Or Create New Patient button:
   - Navigate to: /reception/patients/new?returnTo=/reception/appointments/new

SELECTED PATIENT DISPLAY (when selected):
5. Patient banner:
   - MRN badge
   - Name (large)
   - "{age} years, {sex}"
   - Phone

6. Change Patient button:
   - Action: Clear selection, show search

APPOINTMENT DETAILS:
7. Department selection * (required):
   - Radio buttons or dropdown
   - Options: Pathology, Radiology, X-Ray, MRI, CT

8. Appointment Date picker * (required):
   - Min: Today
   - Max: 30 days from today
   - On change: Load available slots

AVAILABLE TIME SLOTS:
9. Heading: "Available Time Slots"
10. Load: GET /api/v1/appointments/available-slots?date={date}&dept={dept}
11. Display: Grid of time slot buttons
12. For each slot:
    - Button text: "{time}" (e.g., "10:00 AM")
    - Disabled: If slot.available === false
    - Selected state: Highlight if selected
    - On click: Select this slot
    - Required: Must select one

TESTS SELECTION:
13. Search tests input (optional):
    - Placeholder: "Search tests..."

14. Load: GET /api/v1/tests?dept={selectedDept}
15. Test list (checkboxes):
    - For each test:
      * Label: {testName}
      * Sub-label: {testCode}

16. Selected tests summary:
    - Display: Comma-separated names
    - Count: "X tests selected"

ADDITIONAL INFO:
17. Appointment Notes textarea (optional):
    - Label: "Notes / Special Instructions"
    - Rows: 3

18. Contact Number input (optional):
    - Label: "Contact Number (if different)"
    - Validation: 10 digits if provided

19. Send Confirmation checkbox:
    - Label: "Send confirmation SMS/WhatsApp"
    - Default: Checked

ACTION BUTTONS:
20. Book Appointment button (primary):
    - Text: "Book Appointment"
    - Color: Green
    - Keyboard: Ctrl+S
    - Disabled: If patient OR date OR slot not selected
    - Action:
      1. Validate
      2. Call POST /api/v1/appointments
      3. On success (201):
         - Toast: "Appointment booked for {date} at {time}"
         - Navigate to: /reception/appointments
      4. On error (400):
         - Display validation errors
      5. On error (409):
         - Toast: "Slot no longer available. Please select another."
         - Reload slots

21. Book & Check-in button (secondary, only if date=today):
    - Text: "Book & Check-in Now"
    - Action:
      1. Same as Book Appointment
      2. On success: Navigate to /reception/visits/new?patientId={patientId}&appointmentId={appointmentId}

22. Cancel button:
    - Keyboard: Esc
    - Navigate to: /reception/appointments

VALIDATION:
- Patient: Required
- Department: Required
- Date: Required, not past, within 30 days
- Time slot: Required, must be available
- Contact number: 10 digits if provided

ERROR HANDLING:
- Validation summary at top
- Field-level errors below fields
- Slot unavailable: Reload slots and show message

LOADING STATE:
- Show skeleton during slot load
- Disable buttons during booking

KEYBOARD SHORTCUTS:
- Ctrl+S: Book
- Esc: Cancel

DO NOT:
- Use mock data
- Allow past dates
- Allow booking unavailable slots
- Skip slot availability check

ACCEPT CRITERIA:
- Patient search works
- Available slots load for date+dept
- Unavailable slots disabled
- Tests load for department
- Book creates appointment
- Success navigates to appointments
- Book & Check-in navigates to visit creation
- Keyboard shortcuts work
- Error handling shows appropriate messages
```

---

# 🎉 RECEPTION ROLE COMPLETE!

**All 12 Reception screens fully documented:**

✅ R1: Login (Universal)  
✅ R2: Reception Dashboard  
✅ R3: Patient Search Results  
✅ R4: New Patient Registration  
✅ R5: Patient Details/Profile  
✅ R6: Patient Merge (Deduplication)  
✅ R7: New Visit Creation  
✅ R8: Visit Details  
✅ R9: Payment Processing  
✅ R10: Print Token/Invoice  
✅ R11: Appointments Calendar  
✅ R12: New Appointment  

**Every screen includes:**
- Complete component checklist (every button, field, element)
- Full API integration details (endpoints, request/response)
- Keyboard shortcuts
- Validation rules
- Complete Gemini prompt (ready to copy-paste)

**Total Reception Screens:** 12  
**Total Buttons/Components Documented:** ~250+  
**Total API Endpoints Covered:** ~30+

---

## Next Steps

**Ready to move to the next role?**

Choose from:
- **Sample Collection** (4 screens)
- **Lab Technician** (5 screens)
- **Pathologist** (6 screens)
- **Radiology Technician** (4 screens)
- **Radiologist** (5 screens)
- **Delivery Desk** (5 screens)
- **Admin** (8 screens)

**Which role should I document next?**

