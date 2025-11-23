# SynOS Frontend Build Playbook - Complete Role-by-Role Screen Guide
## Every Screen, Every Button, Every Field Documented

**Last Updated:** November 22, 2025, 3:55 PM IST  
**Status:** ✅ BACKEND COMPLETE (Days 1-17) - READY FOR FRONTEND  
**For:** Solo Developer Building Frontend Screen-by-Screen  
**Timeline:** Days 18-20 (can extend to 25+ days if building carefully)  
**Total Screens:** 52 screens across 8 roles + 1 public screen

---

# TABLE OF CONTENTS

- [How to Use This Playbook](#how-to-use-this-playbook)
- [ROLE 1: RECEPTION (12 Screens)](#role-1-reception-12-screens)
- [ROLE 2: SAMPLE COLLECTION (4 Screens)](#role-2-sample-collection-4-screens)
- [ROLE 3: LAB TECHNICIAN (5 Screens)](#role-3-lab-technician-5-screens)
- [ROLE 4: PATHOLOGIST (6 Screens)](#role-4-pathologist-6-screens)
- [ROLE 5: RADIOLOGY TECHNICIAN (4 Screens)](#role-5-radiology-technician-4-screens)
- [ROLE 6: RADIOLOGIST (5 Screens)](#role-6-radiologist-5-screens)
- [ROLE 7: DELIVERY DESK (5 Screens)](#role-7-delivery-desk-5-screens)
- [ROLE 8: ADMIN (8 Screens)](#role-8-admin-8-screens)
- [PUBLIC SCREEN (1 Screen)](#public-screen-1-screen)
- [SHARED COMPONENTS](#shared-components)
- [Build Order Recommendation](#build-order-recommendation)

---

# HOW TO USE THIS PLAYBOOK

## Your Backend is 100% Ready

✅ All 70+ database tables created  
✅ All 60+ API endpoints tested via Postman  
✅ Zero mocks, zero placeholders  
✅ Business logic complete

## How to Build Each Screen

For every screen in this document:

1. **Read the complete button checklist** - Every single UI element listed
2. **Copy the Gemini prompt** - Paste into Gemini/Claude/GPT
3. **Review generated code** - Check for hallucinations
4. **Test immediately** - Against your real backend
5. **Move to next screen** - Don't skip any screen

## Build Order Strategy

**Option 1: Role-by-Role (Recommended)**
- Build all 12 Reception screens first
- Test complete Reception workflow
- Move to Sample Collection (4 screens)
- Continue role-by-role

**Option 2: Critical Path First**
- Build Login + Reception Dashboard first
- Build Patient Search + New Patient
- Build Visit Creation + Payment
- Build Sample Collection
- Build Results Entry
- Build Delivery
- Fill remaining screens

## Key Principles

- **Every button documented** - Nothing missing
- **Real API endpoints** - No mocks
- **Keyboard shortcuts** - Every screen
- **Error handling** - Every API call
- **Loading states** - Every async action

---

# ROLE 1: RECEPTION (12 Screens)

## Reception Workflow Overview

Reception handles:
- Patient registration
- Visit creation
- Test selection
- Payment collection
- Token printing
- Appointment booking

**Route prefix:** `/reception`

---

## Screen R1: Login (Universal)

**Route:** `/login`  
**Access:** All roles  
**Backend API:** `POST /api/v1/auth/login`

### Complete Component Checklist

#### UI Elements:

- [ ] **App Logo/Title**
  - Text: "SynOS - Diagnostic Lab System"
  - Position: Top center

- [ ] **Email Input Field**
  - Type: `email`
  - Placeholder: "Enter your email"
  - Required: Yes
  - Validation: Email format
  - API field: `email`
  - Auto-focus on load

- [ ] **Password Input Field**
  - Type: `password`
  - Placeholder: "Enter your password"
  - Required: Yes
  - Validation: Min 8 characters
  - API field: `password`
  - Show/Hide password toggle icon

- [ ] **Remember Me Checkbox**
  - Label: "Keep me logged in"
  - Optional
  - Stores JWT in localStorage (if checked) vs sessionStorage

- [ ] **Login Button**
  - Text: "Login" or "Sign In"
  - Disabled when: Email or password empty OR API call in progress
  - Shows spinner when: API call in progress
  - Action: `POST /api/v1/auth/login`
  - Keyboard: Enter key (when form valid)

- [ ] **Forgot Password Link**
  - Text: "Forgot password?"
  - Action: Navigate to `/reset-password` (future feature)

- [ ] **Error Message Area**
  - Shows: API error messages
  - Examples: "Invalid email or password", "Account locked", "Too many attempts"
  - Color: Red text
  - Dismissible: Clear on new input

- [ ] **Loading Spinner**
  - Shows: During API call
  - Hides: After response (success or error)
  - Overlay: Disable form during loading

### API Integration:

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```json
{
  "email": "reception@lab.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpc2lzYXJlZnJlc2h0b2tlbg...",
    "expiresAt": "2025-11-23T15:00:00Z",
    "user": {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "reception@lab.com",
      "name": "Priya Sharma",
      "role": "Reception",
      "dept": "Pathology"
    }
  }
}
```

**Error Response (401):**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

### Redirect Logic:

```javascript
// After successful login, redirect based on role:
const roleRoutes = {
  'Reception': '/reception/dashboard',
  'Sample Collection': '/sample/collection',
  'Lab Tech': '/lab/worklist',
  'Pathologist': '/pathologist/review-queue',
  'Radiology Tech': '/radiology/worklist',
  'Radiologist': '/radiologist/review-queue',
  'Delivery': '/delivery/queue',
  'Admin': '/admin/dashboard'
};
```

### Keyboard Shortcuts:

- **Enter:** Submit login (if form valid)
- **Tab:** Navigate between fields
- **Shift+Tab:** Navigate backwards

### Gemini Prompt for Screen R1:

```
Build the SynOS Login screen (React + Vite + Tailwind CSS + shadcn/ui).

BACKEND API:
- Endpoint: POST /api/v1/auth/login
- Request: { "email": "string", "password": "string" }
- Success Response (200): { "data": { "accessToken": "string", "refreshToken": "string", "expiresAt": "ISO8601", "user": { "userId": "uuid", "email": "string", "name": "string", "role": "string", "dept": "string" } } }
- Error Response (401): { "error": { "code": "string", "message": "string" } }

UI REQUIREMENTS:

HEADER:
1. App Logo/Title: "SynOS - Diagnostic Lab System" (centered, top)

FORM FIELDS:
2. Email input field
   - Type: email
   - Placeholder: "Enter your email"
   - Required: Yes
   - Validation: Email format
   - Error message: "Please enter a valid email"
   - Auto-focus on page load

3. Password input field
   - Type: password
   - Placeholder: "Enter your password"
   - Required: Yes
   - Validation: Min 8 characters
   - Show/Hide password toggle icon (eye icon)
   - Error message: "Password must be at least 8 characters"

4. Remember Me checkbox
   - Label: "Keep me logged in"
   - Optional
   - If checked: Store JWT in localStorage
   - If unchecked: Store JWT in sessionStorage

ACTIONS:
5. Login button
   - Text: "Login"
   - Disabled: If email OR password empty OR validation errors OR API call in progress
   - Shows spinner: During API call (replace text with spinner)
   - Keyboard: Enter key submits form (if valid)
   - On click:
     * Call POST /api/v1/auth/login
     * On success (200):
       - Store accessToken and refreshToken (localStorage or sessionStorage based on Remember Me)
       - Store user object
       - Redirect based on role:
         * Reception → /reception/dashboard
         * Sample Collection → /sample/collection
         * Lab Tech → /lab/worklist
         * Pathologist → /pathologist/review-queue
         * Radiology Tech → /radiology/worklist
         * Radiologist → /radiologist/review-queue
         * Delivery → /delivery/queue
         * Admin → /admin/dashboard
     * On error (401 or other):
       - Display error.message in error area (red text)
       - Clear password field
       - Re-focus email field

6. Forgot Password link
   - Text: "Forgot password?"
   - Position: Below login button
   - Action: Navigate to /reset-password (future feature, just show placeholder message for now)

ERROR HANDLING:
7. Error message display area
   - Position: Below login button
   - Color: Red text
   - Shows: error.message from API response
   - Dismisses: Automatically when user starts typing in email or password
   - Examples: "Invalid email or password", "Account locked", "Too many login attempts"

8. Loading spinner overlay
   - Shows: During API call
   - Prevents: Multiple form submissions
   - Disables: All form fields during loading

VALIDATION:
- Real-time validation on blur
- Email format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
- Password min length: 8 characters
- Show error messages below each field
- Disable login button if any validation error

KEYBOARD SHORTCUTS:
- Enter: Submit form (if valid)
- Tab: Navigate forward between fields
- Shift+Tab: Navigate backward

STYLING:
- Dark mode by default
- Clean, minimal design
- Large, readable input fields
- Clear focus states (blue outline)
- Accessible color contrast (WCAG AA)

AXIOS SETUP:
- Create axios instance in src/services/apiClient.ts
- Base URL: http://localhost:5000/api/v1
- Content-Type: application/json

DO NOT:
- Use mock data or hardcoded tokens
- Skip error handling
- Skip loading states
- Use placeholder APIs
- Skip keyboard shortcuts

ACCEPT CRITERIA:
- Login with valid credentials works for all 8 roles
- JWT stored correctly (localStorage or sessionStorage)
- Redirect to correct dashboard per role
- Error messages display for invalid credentials
- Loading spinner shows during API call
- Keyboard shortcuts work (Enter to submit)
- Form validation prevents invalid submission
- Remember Me checkbox controls storage location
```

---

## Screen R2: Reception Dashboard (Home)

**Route:** `/reception/dashboard`  
**Role:** Reception  
**Backend APIs:**
- `GET /api/v1/visits?dept=Pathology&status=Registered&limit=10`
- `GET /api/v1/appointments?date=2025-11-22`
- `GET /api/v1/patients?search={query}`

### Complete Component Checklist

#### UI Elements:

- [ ] **Navigation Header**
  - App logo: "SynOS"
  - Current role display: "Reception - Pathology Dept"
  - Current user name: "Priya Sharma"
  - Logout button (top right)

- [ ] **Global Search Bar**
  - Placeholder: "Search patient by name, phone, MRN... (Press / to focus)"
  - Type: text
  - Keyboard shortcut: `/` (focus search)
  - Auto-complete dropdown: Shows matching patients as user types
  - API: `GET /api/v1/patients?search={query}&limit=10`
  - Action: On Enter or select from dropdown, navigate to patient details

- [ ] **Quick Action Buttons**
  - **New Patient Button**
    - Text: "New Patient"
    - Icon: User plus icon
    - Keyboard: Ctrl+N
    - Navigate to: `/reception/patients/new`
  
  - **New Visit Button**
    - Text: "New Visit"
    - Icon: Clipboard plus icon
    - Keyboard: Ctrl+V
    - Navigate to: `/reception/visits/new`
  
  - **Appointments Button**
    - Text: "Appointments"
    - Icon: Calendar icon
    - Keyboard: Ctrl+A
    - Navigate to: `/reception/appointments`

- [ ] **Today's Stats Cards**
  - **Total Visits Card**
    - Label: "Total Visits Today"
    - Value: Count from API (e.g., "42")
    - Icon: Users icon
    - Color: Blue
  
  - **Pending Payment Card**
    - Label: "Pending Payment"
    - Value: Count of visits with status="Unpaid" (e.g., "8")
    - Icon: Money icon
    - Color: Orange
  
  - **Completed Card**
    - Label: "Completed Today"
    - Value: Count of visits with status="Paid" (e.g., "34")
    - Icon: Check circle icon
    - Color: Green

- [ ] **Recent Visits Table**
  - Label: "Recent Visits (Last 10)"
  - Columns: Token, Patient Name, Tests, Status, Amount, Action
  - Rows: 10 most recent visits from API
  - **Per Row:**
    - Token: (e.g., "P-042")
    - Patient Name: (e.g., "Ramesh Sharma")
    - Tests: Comma-separated test names (e.g., "CBC, FBS")
    - Status: Badge with color (Paid=green, Unpaid=orange)
    - Amount: Currency formatted (e.g., "₹1,250")
    - Action buttons:
      - **View Button** (always visible)
        - Text: "View"
        - Navigate to: `/reception/visits/{visitId}`
      - **Payment Button** (only if status="Unpaid")
        - Text: "Payment"
        - Navigate to: `/reception/payments/{visitId}`

- [ ] **Upcoming Appointments Table**
  - Label: "Upcoming Appointments (Today)"
  - Columns: Time, Patient Name, Tests, Dept, Action
  - Rows: All appointments for today from API
  - **Per Row:**
    - Time: Formatted time (e.g., "10:30 AM")
    - Patient Name: (e.g., "Anand Kumar")
    - Tests: Test names
    - Dept: Department name
    - Action button:
      - **Check-in Button**
        - Text: "Check-in"
        - Action: Create visit from appointment, navigate to visit screen
        - API: `POST /api/v1/visits` (with appointmentId)

- [ ] **Refresh Data Button**
  - Text: "Refresh"
  - Icon: Refresh icon
  - Keyboard: Ctrl+R
  - Action: Reload all API data

### API Integration:

**1. Recent Visits API:**
```
GET /api/v1/visits?dept=Pathology&status=Registered&limit=10

Response (200):
{
  "data": [
    {
      "visitId": "uuid",
      "token": "P-042",
      "patient": {
        "patientId": "uuid",
        "mrn": "A00001",
        "name": "Ramesh Sharma"
      },
      "tests": [
        { "testCode": "CBC", "testName": "Complete Blood Count" },
        { "testCode": "FBS", "testName": "Fasting Blood Sugar" }
      ],
      "status": "Paid",
      "totalAmount": 1250.00,
      "createdAt": "2025-11-22T09:30:00Z"
    },
    // ... 9 more
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0
  }
}
```

**2. Appointments API:**
```
GET /api/v1/appointments?date=2025-11-22

Response (200):
{
  "data": [
    {
      "appointmentId": "uuid",
      "patient": {
        "patientId": "uuid",
        "name": "Anand Kumar"
      },
      "scheduledFor": "2025-11-22T10:30:00Z",
      "tests": ["CBC", "FBS"],
      "dept": "Pathology",
      "status": "Scheduled"
    },
    // ... more
  ]
}
```

**3. Patient Search API:**
```
GET /api/v1/patients?search=ramesh&limit=10

Response (200):
{
  "data": [
    {
      "patientId": "uuid",
      "mrn": "A00001",
      "name": "Ramesh Sharma",
      "phone": "9876543210",
      "age": 45
    },
    // ... more
  ]
}
```

### Keyboard Shortcuts:

- **/:** Focus search bar
- **Ctrl+N:** New patient
- **Ctrl+V:** New visit
- **Ctrl+A:** Appointments
- **Ctrl+R:** Refresh data
- **Ctrl+H:** Home (this screen)

### Gemini Prompt for Screen R2:

```
Build the Reception Dashboard screen (React + Vite + Tailwind CSS + shadcn/ui).

BACKEND APIs:
1. GET /api/v1/visits?dept=Pathology&status=Registered&limit=10
   Response: { "data": [{ "visitId": "uuid", "token": "P-042", "patient": { "patientId": "uuid", "mrn": "A00001", "name": "Ramesh Sharma" }, "tests": [{ "testCode": "CBC", "testName": "Complete Blood Count" }], "status": "Paid|Unpaid", "totalAmount": 1250.00, "createdAt": "ISO" }], "pagination": {...} }

2. GET /api/v1/appointments?date=2025-11-22
   Response: { "data": [{ "appointmentId": "uuid", "patient": { "patientId": "uuid", "name": "Anand Kumar" }, "scheduledFor": "ISO", "tests": ["CBC", "FBS"], "dept": "Pathology", "status": "Scheduled" }] }

3. GET /api/v1/patients?search={query}&limit=10
   Response: { "data": [{ "patientId": "uuid", "mrn": "A00001", "name": "Ramesh Sharma", "phone": "9876543210", "age": 45 }] }

UI REQUIREMENTS:

NAVIGATION HEADER:
1. App logo: "SynOS" (left)
2. Current role display: "Reception - Pathology Dept"
3. Current user name: "Priya Sharma" (from JWT user object)
4. Logout button (top right)
   - Action: Clear localStorage/sessionStorage, navigate to /login

GLOBAL SEARCH:
5. Search bar
   - Placeholder: "Search patient by name, phone, MRN... (Press / to focus)"
   - Keyboard shortcut: / (focus input)
   - Auto-complete dropdown:
     * Call GET /api/v1/patients?search={query}&limit=10 on every keystroke (debounce 300ms)
     * Show dropdown with matching patients (MRN, Name, Phone, Age)
     * On select or Enter: Navigate to /reception/patients/{patientId}

QUICK ACTIONS:
6. New Patient button
   - Text: "New Patient"
   - Icon: User plus
   - Keyboard: Ctrl+N
   - Navigate to: /reception/patients/new

7. New Visit button
   - Text: "New Visit"
   - Icon: Clipboard plus
   - Keyboard: Ctrl+V
   - Navigate to: /reception/visits/new

8. Appointments button
   - Text: "Appointments"
   - Icon: Calendar
   - Keyboard: Ctrl+A
   - Navigate to: /reception/appointments

TODAY'S STATS (3 Cards):
9. Total Visits Card
   - Label: "Total Visits Today"
   - Value: pagination.total from visits API
   - Icon: Users
   - Color: Blue

10. Pending Payment Card
    - Label: "Pending Payment"
    - Value: Count of visits with status="Unpaid"
    - Icon: Money
    - Color: Orange

11. Completed Card
    - Label: "Completed Today"
    - Value: Count of visits with status="Paid"
    - Icon: Check circle
    - Color: Green

RECENT VISITS TABLE:
12. Table header: "Recent Visits (Last 10)"
13. Columns: Token, Patient Name, Tests, Status, Amount, Action
14. For each row:
    - Token: visit.token (e.g., "P-042")
    - Patient Name: visit.patient.name
    - Tests: Comma-separated visit.tests.map(t => t.testName).join(", ")
    - Status: Badge with color (Paid=green, Unpaid=orange)
    - Amount: Currency formatted "₹" + visit.totalAmount
    - Action column:
      * View button (always visible)
        - Text: "View"
        - Navigate to: /reception/visits/{visit.visitId}
      * Payment button (only if status="Unpaid")
        - Text: "Payment"
        - Navigate to: /reception/payments/{visit.visitId}

APPOINTMENTS TABLE:
15. Table header: "Upcoming Appointments (Today)"
16. Columns: Time, Patient Name, Tests, Dept, Action
17. For each row:
    - Time: Format appointment.scheduledFor as "10:30 AM"
    - Patient Name: appointment.patient.name
    - Tests: appointment.tests.join(", ")
    - Dept: appointment.dept
    - Action column:
      * Check-in button
        - Text: "Check-in"
        - Action:
          1. Call POST /api/v1/visits with { "appointmentId": appointment.appointmentId }
          2. On success: Navigate to /reception/visits/{newVisitId}

REFRESH:
18. Refresh button
    - Text: "Refresh"
    - Icon: Refresh icon
    - Keyboard: Ctrl+R
    - Action: Reload all 3 APIs (visits, appointments, search results if any)

KEYBOARD SHORTCUTS:
- /: Focus search bar
- Ctrl+N: New patient
- Ctrl+V: New visit
- Ctrl+A: Appointments
- Ctrl+R: Refresh data
- Ctrl+H: Home (reload this screen)

ERROR HANDLING:
- Show error toast if any API call fails
- Display "No data available" if tables are empty
- Show loading skeleton while fetching data

LOADING STATES:
- Show skeleton loaders for stats cards, tables during initial load
- Show spinner on refresh button during reload

DO NOT:
- Use mock data
- Skip any button or table
- Skip keyboard shortcuts
- Skip auto-complete search
- Use placeholder APIs

ACCEPT CRITERIA:
- All 18 components present and functional
- All buttons navigate correctly
- API data displayed in tables
- Keyboard shortcuts work
- Loading states show during API calls
- Error handling displays appropriate messages
- Auto-complete search works with debounce
- Stats cards calculate correctly
```

---

## Screen R3: Patient Search Results

**Route:** `/reception/patients/search?q={query}`  
**Role:** Reception  
**Backend APIs:**
- `GET /api/v1/patients?search={query}&limit=50`
- `GET /api/v1/patients/{id}/possible-duplicates`

### Complete Component Checklist

#### UI Elements:

- [ ] **Navigation Breadcrumb**
  - Home → Patient Search
  - Home link navigates to `/reception/dashboard`

- [ ] **Search Bar**
  - Prefilled with URL query param `q`
  - Placeholder: "Search by name, phone, MRN..."
  - Keyboard: Ctrl+F (focus)
  - Search button
  - Action: Reload page with new query

- [ ] **Result Count Display**
  - Text: "X results found for 'query'" (e.g., "12 results found for 'Ramesh'")
  - Show count from API pagination.total

- [ ] **Patient Results Table**
  - Columns: MRN, Name, DOB, Age, Phone, Last Visit, Action
  - **Per Row:**
    - MRN: (e.g., "A00001")
    - Name: (e.g., "Ramesh Sharma")
    - DOB: Formatted date (e.g., "15-May-1980")
    - Age: Calculated from DOB (e.g., "45 years")
    - Phone: (e.g., "9876543210")
    - Last Visit: Date of last visit or "Never" if null
    - Action button:
      - **Select Button**
        - Text: "Select"
        - Navigate to: `/reception/patients/{patientId}`

- [ ] **Create New Patient Button**
  - Text: "Create New Patient"
  - Keyboard: Ctrl+N
  - Navigate to: `/reception/patients/new`
  - Position: Above table, prominent

- [ ] **Duplicate Detection Warning (Conditional)**
  - Shows only if: API detects possible duplicates (matchScore > 85%)
  - Warning message: "⚠️ Possible duplicates detected"
  - List of duplicate pairs:
    - "A00001 (Ramesh Sharma) and A00012 (Ramesh S) may be the same person (95% match)"
  - **Merge Patients Button** (per duplicate pair)
    - Text: "Merge Patients"
    - Navigate to: `/reception/patients/merge?source={id1}&target={id2}`

- [ ] **Empty State** (if no results)
  - Message: "No patients found matching 'query'"
  - Suggestion: "Try searching with phone number or MRN"
  - Create New Patient button (prominent)

- [ ] **Pagination Controls** (if results > 50)
  - Previous button
  - Page number display (e.g., "Page 1 of 3")
  - Next button
  - Items per page: 50

### API Integration:

**1. Patient Search API:**
```
GET /api/v1/patients?search=ramesh&limit=50&offset=0

Response (200):
{
  "data": [
    {
      "patientId": "uuid",
      "mrn": "A00001",
      "name": "Ramesh Sharma",
      "dob": "1980-05-15",
      "age": 45,
      "sex": "M",
      "phone": "9876543210",
      "lastVisitDate": "2025-11-20"
    },
    {
      "patientId": "uuid",
      "mrn": "A00012",
      "name": "Ramesh S",
      "dob": "1980-05-16",
      "age": 45,
      "sex": "M",
      "phone": "9876543210",
      "lastVisitDate": "2025-11-15"
    },
    // ... more
  ],
  "pagination": {
    "total": 12,
    "limit": 50,
    "offset": 0
  }
}
```

**2. Duplicate Detection API:**
```
GET /api/v1/patients/{firstResultId}/possible-duplicates

Response (200):
{
  "data": [
    {
      "patientId": "uuid-of-A00012",
      "mrn": "A00012",
      "name": "Ramesh S",
      "matchScore": 95,
      "matchReason": "Exact phone match + 80% name similarity"
    }
  ]
}
```

### Keyboard Shortcuts:

- **Ctrl+F:** Focus search bar
- **Ctrl+N:** Create new patient
- **Esc:** Go back to dashboard

### Gemini Prompt for Screen R3:

```
Build the Patient Search Results screen (React + Vite + Tailwind CSS + shadcn/ui).

BACKEND APIs:
1. GET /api/v1/patients?search={query}&limit=50&offset=0
   Response: { "data": [{ "patientId": "uuid", "mrn": "A00001", "name": "Ramesh Sharma", "dob": "1980-05-15", "age": 45, "sex": "M", "phone": "9876543210", "lastVisitDate": "2025-11-20" }], "pagination": { "total": 12, "limit": 50, "offset": 0 } }

2. GET /api/v1/patients/{id}/possible-duplicates
   Response: { "data": [{ "patientId": "uuid", "mrn": "A00012", "name": "Ramesh S", "matchScore": 95, "matchReason": "Exact phone match + 80% name similarity" }] }

UI REQUIREMENTS:

NAVIGATION:
1. Breadcrumb: Home → Patient Search
   - Home link navigates to /reception/dashboard

SEARCH BAR:
2. Search input
   - Prefilled with URL query param "q"
   - Placeholder: "Search by name, phone, MRN..."
   - Keyboard: Ctrl+F (focus)

3. Search button
   - Text: "Search"
   - Action: Reload page with new query parameter

RESULT COUNT:
4. Display text: "X results found for 'query'"
   - Use pagination.total from API
   - Example: "12 results found for 'Ramesh'"

PATIENT TABLE:
5. Table columns: MRN, Name, DOB, Age, Phone, Last Visit, Action
6. For each patient in data array:
   - MRN: patient.mrn
   - Name: patient.name
   - DOB: Format patient.dob as "DD-MMM-YYYY" (e.g., "15-May-1980")
   - Age: patient.age + " years"
   - Phone: patient.phone
   - Last Visit: Format patient.lastVisitDate as "DD-MMM-YYYY" or "Never" if null
   - Action:
     * Select button
       - Text: "Select"
       - Navigate to: /reception/patients/{patient.patientId}

CREATE NEW:
7. Create New Patient button
   - Text: "Create New Patient"
   - Position: Above table (prominent, green color)
   - Keyboard: Ctrl+N
   - Navigate to: /reception/patients/new

DUPLICATE DETECTION:
8. After loading search results, call GET /api/v1/patients/{firstPatientId}/possible-duplicates
9. If duplicates found (matchScore > 85):
   - Show warning banner: "⚠️ Possible duplicates detected"
   - List each duplicate pair:
     * "{mrn1} ({name1}) and {mrn2} ({name2}) may be the same person ({matchScore}% match)"
   
10. Merge Patients button (for each duplicate pair)
    - Text: "Merge Patients"
    - Navigate to: /reception/patients/merge?source={id1}&target={id2}

EMPTY STATE:
11. If pagination.total === 0:
    - Message: "No patients found matching '{query}'"
    - Suggestion: "Try searching with phone number or MRN"
    - Show Create New Patient button (large, prominent)

PAGINATION:
12. If pagination.total > 50:
    - Previous button (disabled if offset=0)
    - Page number: "Page X of Y"
    - Next button (disabled if offset + limit >= total)
    - Action: Reload with new offset parameter

KEYBOARD SHORTCUTS:
- Ctrl+F: Focus search
- Ctrl+N: New patient
- Esc: Back to dashboard

ERROR HANDLING:
- If API fails: Show error toast "Failed to search patients. Please try again."
- Retry button in error state

LOADING STATE:
- Show table skeleton during API call
- Show spinner on search button during search

DO NOT:
- Skip duplicate detection
- Use mock data
- Skip merge button when duplicates exist
- Skip empty state handling

ACCEPT CRITERIA:
- Search returns real results from API
- Duplicate detection triggers for matching patients
- All buttons functional
- Keyboard shortcuts work
- Pagination works (if > 50 results)
- Empty state displays correctly
- Error handling shows appropriate messages
```

---

**[Due to length constraints, I'll continue with remaining screens in the same detailed format. Each screen will have:]**

- Complete component checklist (every button, field, element)
- API integration details (endpoints, request/response)
- Keyboard shortcuts
- Complete Gemini prompt

**Would you like me to:**

1. **Continue generating ALL 52 screens in this format** (will be a very long document, 200+ pages)
2. **Generate as separate role-specific files** (8 files, one per role)
3. **Prioritize specific roles first** (which role should I complete first?)

**I recommend option 2: Generate 8 separate files, one per role, so you can:**
- Build one complete role at a time
- Test each role's workflow end-to-end
- Keep focused on one user journey

Let me know which approach you prefer, and I'll generate the complete documentation!