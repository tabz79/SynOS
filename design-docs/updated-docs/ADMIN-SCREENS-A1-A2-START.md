# ADMIN ROLE - COMPLETE 8 SCREENS GUIDE
## Every Button, Every Field, Every API Call Documented

**Role:** Admin (System Administrator)  
**Total Screens:** 8  
**Route Prefix:** `/admin`  
**Backend:** All APIs tested and ready (Days 1-17 complete)

---

# TABLE OF CONTENTS - ADMIN SCREENS

1. [A1: Admin Dashboard](#a1-admin-dashboard)
2. [A2: Test Master Management](#a2-test-master-management)
3. [A3: User Management](#a3-user-management)
4. [A4: Department & Role Settings](#a4-department--role-settings)
5. [A5: Pricing & Discount Rules](#a5-pricing--discount-rules)
6. [A6: Referral Doctor Management](#a6-referral-doctor-management)
7. [A7: System Configuration](#a7-system-configuration)
8. [A8: Audit Log Viewer](#a8-audit-log-viewer)

---

# A1: Admin Dashboard

**Route:** `/admin/dashboard`  
**Role:** Admin  
**Backend APIs:**
- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/recent-activities`
- `GET /api/v1/admin/system-health`

## Complete Component Checklist

### UI Elements:

- [ ] **Page Header**
  - Title: "Admin Dashboard"
  - Current user badge: "Admin - {userName}"
  - Breadcrumb: Home

- [ ] **Quick Actions Grid**
  
  - [ ] **Test Master Button**
    - Text: "Test Master"
    - Icon: Flask/Beaker
    - Keyboard: Ctrl+T
    - Navigate to: `/admin/tests`
  
  - [ ] **User Management Button**
    - Text: "Users"
    - Icon: Users
    - Keyboard: Ctrl+U
    - Navigate to: `/admin/users`
  
  - [ ] **Pricing Button**
    - Text: "Pricing & Discounts"
    - Icon: Tag
    - Keyboard: Ctrl+P
    - Navigate to: `/admin/pricing`
  
  - [ ] **Referrals Button**
    - Text: "Referral Doctors"
    - Icon: User-Check
    - Navigate to: `/admin/referrals`
  
  - [ ] **System Settings Button**
    - Text: "System Settings"
    - Icon: Settings
    - Navigate to: `/admin/settings`
  
  - [ ] **Audit Log Button**
    - Text: "Audit Log"
    - Icon: List
    - Navigate to: `/admin/audit-log`

- [ ] **System Statistics Cards**
  
  - [ ] **Total Users Card**
    - Label: "Total Users"
    - Value: Count from API
    - Icon: Users
    - Color: Blue
    - Sub-text: "Active: X, Inactive: Y"
  
  - [ ] **Total Tests Card**
    - Label: "Total Tests"
    - Value: Count from API
    - Icon: Flask
    - Color: Green
    - Sub-text: "Pathology: X, Radiology: Y"
  
  - [ ] **Active Referrals Card**
    - Label: "Active Referral Doctors"
    - Value: Count from API
    - Icon: User-Check
    - Color: Purple
  
  - [ ] **System Status Card**
    - Label: "System Health"
    - Value: "Healthy" or "Issues Detected"
    - Icon: Activity
    - Color: Green (healthy) or Red (issues)
    - Sub-text: "Last checked: {timestamp}"

- [ ] **Recent Activities Table**
  - Heading: "Recent System Activities (Last 50)"
  - Columns: Timestamp, User, Action, Entity, Details
  - API: `GET /api/v1/admin/recent-activities?limit=50`
  - **Per Row:**
    - Timestamp: Formatted as "DD-MMM HH:MM"
    - User: Username with role badge
    - Action: Created, Updated, Deleted, etc.
    - Entity: Test, User, Patient, Visit, etc.
    - Details: Brief description
  - [ ] **View Full Log Button**
    - Navigate to: `/admin/audit-log`

- [ ] **System Health Status Section**
  - Heading: "System Health"
  - API: `GET /api/v1/admin/system-health`
  
  - [ ] **Database Status Indicator**
    - Label: "Database"
    - Status: Connected / Disconnected
    - Color: Green / Red
    - Response time: "{ms}ms"
  
  - [ ] **Storage Status Indicator**
    - Label: "File Storage"
    - Status: Available / Full
    - Color: Green / Orange / Red
    - Used: "X GB / Y GB (Z%)"
  
  - [ ] **API Status Indicator**
    - Label: "API Services"
    - Status: Running / Down
    - Color: Green / Red
  
  - [ ] **Backup Status Indicator**
    - Label: "Last Backup"
    - Status: Success / Failed
    - Timestamp: "DD-MMM HH:MM"
    - [ ] **Run Backup Now Button**
      - Text: "Backup Now"
      - Action: Trigger manual backup

- [ ] **Usage Statistics Cards** (Optional)
  
  - [ ] **Today's Visits Card**
    - Value: Count
    - Comparison: "+X% from yesterday"
  
  - [ ] **Today's Revenue Card**
    - Value: "₹{amount}"
    - Comparison: "+X% from yesterday"

- [ ] **Refresh Data Button**
  - Text: "Refresh"
  - Icon: Refresh
  - Keyboard: Ctrl+R
  - Action: Reload all dashboard data

## API Integration

**1. Get Admin Stats:**
```
GET /api/v1/admin/stats

Response (200):
{
  "data": {
    "users": {
      "total": 25,
      "active": 22,
      "inactive": 3
    },
    "tests": {
      "total": 150,
      "pathology": 120,
      "radiology": 30
    },
    "referralDoctors": {
      "active": 15
    },
    "systemHealth": "Healthy",
    "lastHealthCheck": "2025-11-22T20:50:00Z",
    "todayStats": {
      "visits": 42,
      "revenue": 125000.00,
      "visitsChange": "+12%",
      "revenueChange": "+8%"
    }
  }
}
```

**2. Get Recent Activities:**
```
GET /api/v1/admin/recent-activities?limit=50

Response (200):
{
  "data": [
    {
      "activityId": "uuid",
      "timestamp": "2025-11-22T20:45:00Z",
      "user": {
        "userId": "uuid",
        "username": "priya.sharma",
        "role": "Reception"
      },
      "action": "Created",
      "entity": "Visit",
      "entityId": "uuid",
      "details": "Created visit P-042 for patient A00123"
    },
    // ... more activities
  ]
}
```

**3. Get System Health:**
```
GET /api/v1/admin/system-health

Response (200):
{
  "data": {
    "database": {
      "status": "Connected",
      "responseTime": 15
    },
    "storage": {
      "status": "Available",
      "usedGB": 250,
      "totalGB": 500,
      "usedPercent": 50
    },
    "api": {
      "status": "Running"
    },
    "backup": {
      "status": "Success",
      "lastBackup": "2025-11-22T03:00:00Z",
      "nextScheduled": "2025-11-23T03:00:00Z"
    }
  }
}
```

## Keyboard Shortcuts

- **Ctrl+T:** Test Master
- **Ctrl+U:** User Management
- **Ctrl+P:** Pricing
- **Ctrl+R:** Refresh dashboard

## Gemini Prompt for A1

```
Build the Admin Dashboard screen (React + Vite + Tailwind CSS + shadcn/ui).

BACKEND APIs:
1. GET /api/v1/admin/stats
   Response: { "data": { "users": { "total": 25, "active": 22, "inactive": 3 }, "tests": { "total": 150, "pathology": 120, "radiology": 30 }, "referralDoctors": { "active": 15 }, "systemHealth": "Healthy", "lastHealthCheck": "ISO", "todayStats": { "visits": 42, "revenue": 125000.00, "visitsChange": "+12%", "revenueChange": "+8%" } } }

2. GET /api/v1/admin/recent-activities?limit=50
   Response: { "data": [{ "activityId": "uuid", "timestamp": "ISO", "user": { "userId": "uuid", "username": "string", "role": "string" }, "action": "Created|Updated|Deleted", "entity": "Test|User|Patient|Visit", "entityId": "uuid", "details": "string" }] }

3. GET /api/v1/admin/system-health
   Response: { "data": { "database": { "status": "Connected|Disconnected", "responseTime": 15 }, "storage": { "status": "Available|Full", "usedGB": 250, "totalGB": 500, "usedPercent": 50 }, "api": { "status": "Running|Down" }, "backup": { "status": "Success|Failed", "lastBackup": "ISO", "nextScheduled": "ISO" } } }

UI REQUIREMENTS:

PAGE HEADER:
1. Title: "Admin Dashboard"
2. Current user badge: "Admin - {userName}"
3. Breadcrumb: Home

QUICK ACTIONS GRID (6 buttons):
4. Test Master button
   - Icon: Flask
   - Keyboard: Ctrl+T
   - Navigate to: /admin/tests

5. User Management button
   - Icon: Users
   - Keyboard: Ctrl+U
   - Navigate to: /admin/users

6. Pricing & Discounts button
   - Icon: Tag
   - Keyboard: Ctrl+P
   - Navigate to: /admin/pricing

7. Referral Doctors button
   - Icon: User-Check
   - Navigate to: /admin/referrals

8. System Settings button
   - Icon: Settings
   - Navigate to: /admin/settings

9. Audit Log button
   - Icon: List
   - Navigate to: /admin/audit-log

STATS CARDS (4 cards):
10. Total Users card
    - Label: "Total Users"
    - Value: stats.users.total
    - Icon: Users
    - Color: Blue
    - Sub-text: "Active: {active}, Inactive: {inactive}"

11. Total Tests card
    - Label: "Total Tests"
    - Value: stats.tests.total
    - Icon: Flask
    - Color: Green
    - Sub-text: "Pathology: {pathology}, Radiology: {radiology}"

12. Active Referral Doctors card
    - Label: "Active Referral Doctors"
    - Value: stats.referralDoctors.active
    - Icon: User-Check
    - Color: Purple

13. System Health card
    - Label: "System Health"
    - Value: stats.systemHealth
    - Icon: Activity
    - Color: Green (if "Healthy") or Red (if issues)
    - Sub-text: "Last checked: {format lastHealthCheck}"

RECENT ACTIVITIES TABLE:
14. Heading: "Recent System Activities (Last 50)"
15. Columns: Timestamp, User, Action, Entity, Details
16. Load: GET /api/v1/admin/recent-activities?limit=50
17. For each activity:
    - Timestamp: Format as "DD-MMM HH:MM"
    - User: {username} with role badge
    - Action: {action} (color-coded: Created=green, Updated=blue, Deleted=red)
    - Entity: {entity}
    - Details: {details}

18. View Full Log button
    - Navigate to: /admin/audit-log

SYSTEM HEALTH SECTION:
19. Heading: "System Health"
20. Load: GET /api/v1/admin/system-health

21. Database status:
    - Label: "Database"
    - Status: {database.status}
    - Color: Green (Connected) / Red (Disconnected)
    - Response time: "{database.responseTime}ms"

22. Storage status:
    - Label: "File Storage"
    - Status: {storage.status}
    - Color: Green (<70%), Orange (70-90%), Red (>90%)
    - Used: "{storage.usedGB} GB / {storage.totalGB} GB ({storage.usedPercent}%)"

23. API status:
    - Label: "API Services"
    - Status: {api.status}
    - Color: Green (Running) / Red (Down)

24. Backup status:
    - Label: "Last Backup"
    - Status: {backup.status}
    - Timestamp: Format {backup.lastBackup} as "DD-MMM HH:MM"
    - Next scheduled: {backup.nextScheduled}

25. Run Backup Now button:
    - Text: "Backup Now"
    - Action: POST /api/v1/admin/backup/trigger

USAGE STATS (Optional):
26. Today's Visits card:
    - Value: {todayStats.visits}
    - Comparison: {todayStats.visitsChange}

27. Today's Revenue card:
    - Value: "₹{todayStats.revenue}"
    - Comparison: {todayStats.revenueChange}

REFRESH:
28. Refresh button
    - Icon: Refresh
    - Keyboard: Ctrl+R
    - Action: Reload all 3 APIs

KEYBOARD SHORTCUTS:
- Ctrl+T: Test Master
- Ctrl+U: Users
- Ctrl+P: Pricing
- Ctrl+R: Refresh

ERROR HANDLING:
- Show error toast if any API fails
- Display "Data unavailable" for failed sections

LOADING STATE:
- Show skeleton for all cards/tables during load

DO NOT:
- Use mock data
- Skip system health indicators
- Skip recent activities

ACCEPT CRITERIA:
- All stats load from APIs
- Quick actions navigate correctly
- System health displays all indicators
- Recent activities table shows latest 50
- Keyboard shortcuts work
- Refresh reloads all data
```

---

# A2: Test Master Management

**Route:** `/admin/tests`  
**Role:** Admin  
**Backend APIs:**
- `GET /api/v1/tests?dept={dept}&category={category}`
- `POST /api/v1/tests`
- `PUT /api/v1/tests/{id}`
- `DELETE /api/v1/tests/{id}`
- `POST /api/v1/tests/import-csv`

## Complete Component Checklist

### UI Elements:

- [ ] **Page Header**
  - Title: "Test Master Management"
  - Breadcrumb: Home → Admin → Tests

- [ ] **Quick Actions Bar**
  
  - [ ] **Add New Test Button**
    - Text: "Add New Test"
    - Icon: Plus
    - Keyboard: Ctrl+N
    - Action: Open create test modal
  
  - [ ] **Import from CSV Button**
    - Text: "Import CSV"
    - Icon: Upload
    - Action: Open CSV import modal
  
  - [ ] **Export to CSV Button**
    - Text: "Export CSV"
    - Icon: Download
    - Action: Download all tests as CSV
  
  - [ ] **Bulk Edit Button**
    - Text: "Bulk Edit"
    - Action: Enable multi-select mode

- [ ] **Filters Section**
  
  - [ ] **Department Filter Dropdown**
    - Label: "Department"
    - Options: All, Pathology, Radiology, X-Ray, MRI, CT
    - Default: All
  
  - [ ] **Category Filter Dropdown**
    - Label: "Category"
    - Options: All, Hematology, Biochemistry, Serology, Microbiology, etc.
    - Default: All
  
  - [ ] **Status Filter Dropdown**
    - Label: "Status"
    - Options: All, Active, Inactive
    - Default: Active only
  
  - [ ] **Search Input**
    - Placeholder: "Search by test code, name..."
    - Type: text
    - Real-time filter

- [ ] **Tests Table**
  - Columns: Test Code, Test Name, Department, Category, Price, TAT (hrs), Sample Type, Status, Actions
  - Sortable: All columns
  - **Per Row:**
    - Test Code: (e.g., "CBC")
    - Test Name: (e.g., "Complete Blood Count")
    - Department: Badge
    - Category: (e.g., "Hematology")
    - Price: "₹{price}"
    - TAT: "{hours} hrs"
    - Sample Type: (e.g., "Blood - EDTA")
    - Status: Toggle switch (Active/Inactive)
    - Actions:
      - [ ] **Edit Button**
        - Icon: Pencil
        - Action: Open edit modal
      - [ ] **Delete Button**
        - Icon: Trash
        - Action: Show confirmation, delete test
      - [ ] **Duplicate Button**
        - Icon: Copy
        - Action: Open create modal with pre-filled data

- [ ] **Pagination Controls**
  - Previous button
  - Page number display
  - Next button
  - Items per page dropdown: 25, 50, 100

- [ ] **Create/Edit Test Modal**
  
  - [ ] **Modal Header**
    - Title: "Add New Test" or "Edit Test"
    - Close button (X)
  
  - [ ] **Test Code Input** (Required)
    - Label: "Test Code *"
    - Type: text
    - Uppercase transform
    - Unique validation
    - Max length: 20
    - API field: `testCode`
  
  - [ ] **Test Name Input** (Required)
    - Label: "Test Name *"
    - Type: text
    - Max length: 200
    - API field: `testName`
  
  - [ ] **Department Dropdown** (Required)
    - Label: "Department *"
    - Options: Pathology, Radiology, X-Ray, MRI, CT
    - API field: `dept`
  
  - [ ] **Category Dropdown** (Required)
    - Label: "Category *"
    - Options: Hematology, Biochemistry, Serology, Microbiology, etc.
    - API field: `category`
  
  - [ ] **Price Input** (Required)
    - Label: "Price (₹) *"
    - Type: number
    - Min: 0
    - Step: 0.01
    - API field: `price`
  
  - [ ] **TAT Input** (Required)
    - Label: "Turnaround Time (hours) *"
    - Type: number
    - Min: 1
    - API field: `tatHours`
  
  - [ ] **Sample Type Input** (Required)
    - Label: "Sample Type *"
    - Type: text
    - Example: "Blood - EDTA", "Urine", "Serum"
    - API field: `sampleType`
  
  - [ ] **Sample Volume Input** (Optional)
    - Label: "Sample Volume"
    - Type: text
    - Example: "2 ml", "5 ml"
    - API field: `sampleVolume`
  
  - [ ] **Fasting Required Checkbox**
    - Label: "Fasting Required"
    - Default: Unchecked
    - API field: `requiresFasting`
  
  - [ ] **Special Instructions Textarea** (Optional)
    - Label: "Special Instructions"
    - Rows: 3
    - Placeholder: "Patient preparation, handling instructions..."
    - API field: `specialInstructions`
  
  - [ ] **Active Status Checkbox**
    - Label: "Active"
    - Default: Checked
    - API field: `isActive`
  
  - [ ] **Parameters Section** (For pathology tests)
    - Heading: "Test Parameters"
    - [ ] **Add Parameter Button**
      - Opens parameter input rows
    - **Per Parameter Row:**
      - [ ] **Parameter Name Input**
        - Placeholder: "Hemoglobin"
      - [ ] **Unit Input**
        - Placeholder: "g/dL"
      - [ ] **Normal Range Min Input**
        - Placeholder: "12.0"
      - [ ] **Normal Range Max Input**
        - Placeholder: "16.0"
      - [ ] **Remove Button**
        - Icon: X
  
  - [ ] **Modal Action Buttons**
    - [ ] **Save Test Button**
      - Text: "Save Test"
      - Keyboard: Ctrl+S
      - Action: POST /api/v1/tests (create) or PUT /api/v1/tests/{id} (update)
    - [ ] **Cancel Button**
      - Text: "Cancel"
      - Keyboard: Esc

- [ ] **CSV Import Modal**
  
  - [ ] **Modal Header**
    - Title: "Import Tests from CSV"
  
  - [ ] **Download Template Button**
    - Text: "Download CSV Template"
    - Action: Download sample CSV with headers
  
  - [ ] **File Upload Input**
    - Label: "Select CSV File"
    - Type: file
    - Accept: .csv
  
  - [ ] **Preview Table** (after file selected)
    - Shows first 10 rows from CSV
    - Validation indicators (valid/invalid per row)
  
  - [ ] **Import Options Checkboxes**
    - [ ] **Skip Duplicates Checkbox**
      - Label: "Skip duplicate test codes"
      - Default: Checked
    - [ ] **Update Existing Checkbox**
      - Label: "Update existing tests"
      - Default: Unchecked
  
  - [ ] **Modal Action Buttons**
    - [ ] **Import Button**
      - Text: "Import Tests"
      - Disabled: If no file selected OR validation errors
      - Action: POST /api/v1/tests/import-csv
    - [ ] **Cancel Button**

- [ ] **Delete Confirmation Dialog**
  - Title: "Delete Test?"
  - Message: "Are you sure you want to delete {testName} ({testCode})? This cannot be undone."
  - Warning: Shows if test has been used in visits
  - Buttons:
    - [ ] **Cancel**
    - [ ] **Delete** (Red, destructive)

## API Integration

**1. Get Tests:**
```
GET /api/v1/tests?dept=Pathology&category=Hematology&status=Active

Response (200):
{
  "data": [
    {
      "testId": "uuid",
      "testCode": "CBC",
      "testName": "Complete Blood Count",
      "dept": "Pathology",
      "category": "Hematology",
      "price": 350.00,
      "tatHours": 24,
      "sampleType": "Blood - EDTA",
      "sampleVolume": "2 ml",
      "requiresFasting": false,
      "specialInstructions": null,
      "isActive": true,
      "parameters": [
        {
          "parameterId": "uuid",
          "name": "Hemoglobin",
          "unit": "g/dL",
          "normalRangeMin": 12.0,
          "normalRangeMax": 16.0
        }
      ],
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-11-20T15:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 25,
    "offset": 0
  }
}
```

**2. Create Test:**
```
POST /api/v1/tests

Request:
{
  "testCode": "FBS",
  "testName": "Fasting Blood Sugar",
  "dept": "Pathology",
  "category": "Biochemistry",
  "price": 120.00,
  "tatHours": 12,
  "sampleType": "Blood - Fluoride",
  "sampleVolume": "2 ml",
  "requiresFasting": true,
  "specialInstructions": "Patient must fast for 8-12 hours",
  "isActive": true,
  "parameters": [
    {
      "name": "Glucose",
      "unit": "mg/dL",
      "normalRangeMin": 70,
      "normalRangeMax": 100
    }
  ]
}

Response (201):
{
  "data": {
    "testId": "uuid",
    "testCode": "FBS",
    ...
  }
}

Error (409):
{
  "error": {
    "code": "DUPLICATE_TEST_CODE",
    "message": "Test code 'FBS' already exists"
  }
}
```

**3. Update Test:**
```
PUT /api/v1/tests/{testId}

Request: (same as create)

Response (200):
{
  "data": {
    "testId": "uuid",
    ...
  }
}
```

**4. Delete Test:**
```
DELETE /api/v1/tests/{testId}

Response (200):
{
  "data": {
    "testId": "uuid",
    "deleted": true
  }
}

Error (409):
{
  "error": {
    "code": "TEST_IN_USE",
    "message": "Cannot delete test. It has been used in 25 visits."
  }
}
```

**5. Import CSV:**
```
POST /api/v1/tests/import-csv

Request (multipart/form-data):
- file: CSV file
- skipDuplicates: boolean
- updateExisting: boolean

Response (200):
{
  "data": {
    "imported": 120,
    "skipped": 5,
    "errors": 2,
    "details": [
      {
        "row": 3,
        "testCode": "INVALID",
        "error": "Invalid department"
      }
    ]
  }
}
```

## Keyboard Shortcuts

- **Ctrl+N:** New test
- **Ctrl+S:** Save (in modal)
- **Esc:** Close modal

## Validation Rules

1. **Test Code:**
   - Required
   - Unique
   - Uppercase
   - Max 20 characters
   - No special characters except hyphen

2. **Test Name:**
   - Required
   - Max 200 characters

3. **Department:**
   - Required
   - Must be valid option

4. **Category:**
   - Required

5. **Price:**
   - Required
   - >= 0

6. **TAT:**
   - Required
   - >= 1 hour

## Gemini Prompt for A2

```
Build the Test Master Management screen (React + Vite + Tailwind CSS + shadcn/ui).

BACKEND APIs:
1. GET /api/v1/tests?dept={dept}&category={category}&status={status}
   Response: { "data": [{ "testId": "uuid", "testCode": "CBC", "testName": "Complete Blood Count", "dept": "Pathology", "category": "Hematology", "price": 350.00, "tatHours": 24, "sampleType": "Blood - EDTA", "sampleVolume": "2 ml", "requiresFasting": false, "specialInstructions": "string", "isActive": true, "parameters": [{...}], "createdAt": "ISO", "updatedAt": "ISO" }], "pagination": {...} }

2. POST /api/v1/tests
   Request: { "testCode": "string", "testName": "string", "dept": "string", "category": "string", "price": 120.00, "tatHours": 12, "sampleType": "string", "sampleVolume": "string", "requiresFasting": boolean, "specialInstructions": "string", "isActive": boolean, "parameters": [{...}] }
   Success (201): { "data": { "testId": "uuid", ... } }
   Error (409): { "error": { "code": "DUPLICATE_TEST_CODE", "message": "string" } }

3. PUT /api/v1/tests/{testId}
   Request/Response: Same as POST

4. DELETE /api/v1/tests/{testId}
   Success (200): { "data": { "testId": "uuid", "deleted": true } }
   Error (409): { "error": { "code": "TEST_IN_USE", "message": "string" } }

5. POST /api/v1/tests/import-csv (multipart/form-data)
   Response (200): { "data": { "imported": 120, "skipped": 5, "errors": 2, "details": [...] } }

UI REQUIREMENTS:

PAGE HEADER:
1. Title: "Test Master Management"
2. Breadcrumb: Home → Admin → Tests

QUICK ACTIONS:
3. Add New Test button
   - Keyboard: Ctrl+N
   - Opens create modal

4. Import CSV button
   - Opens CSV import modal

5. Export CSV button
   - Downloads all tests as CSV

6. Bulk Edit button
   - Enables multi-select mode

FILTERS:
7. Department dropdown
8. Category dropdown
9. Status dropdown (All, Active, Inactive)
10. Search input

TESTS TABLE:
11. Columns: Test Code, Test Name, Department, Category, Price, TAT, Sample Type, Status, Actions
12. Sortable columns
13. For each test:
    - Test Code
    - Test Name
    - Department (badge)
    - Category
    - Price: "₹{price}"
    - TAT: "{tatHours} hrs"
    - Sample Type
    - Status: Active/Inactive toggle switch
    - Actions: Edit, Delete, Duplicate buttons

14. Pagination: Previous, Page, Next, Items per page

CREATE/EDIT MODAL:
15. Title: "Add New Test" or "Edit Test"
16. Test Code input * (uppercase, unique)
17. Test Name input *
18. Department dropdown *
19. Category dropdown *
20. Price input *
21. TAT (hours) input *
22. Sample Type input *
23. Sample Volume input
24. Fasting Required checkbox
25. Special Instructions textarea
26. Active checkbox

27. Parameters section (for pathology):
    - Add Parameter button
    - Per parameter:
      * Name input
      * Unit input
      * Normal Range Min input
      * Normal Range Max input
      * Remove button

28. Save Test button (Ctrl+S)
29. Cancel button (Esc)

CSV IMPORT MODAL:
30. Title: "Import Tests from CSV"
31. Download Template button
32. File upload input (.csv)
33. Preview table (first 10 rows)
34. Skip Duplicates checkbox
35. Update Existing checkbox
36. Import button
37. Cancel button

DELETE CONFIRMATION:
38. Title: "Delete Test?"
39. Message with test name
40. Warning if test in use
41. Cancel / Delete buttons

KEYBOARD SHORTCUTS:
- Ctrl+N: New test
- Ctrl+S: Save (in modal)
- Esc: Close modal

VALIDATION:
- Test Code: Required, unique, uppercase, max 20 chars
- Test Name: Required, max 200 chars
- Department, Category, Price, TAT: All required
- Price: >= 0
- TAT: >= 1

ERROR HANDLING:
- Duplicate test code: Show error
- Test in use: Prevent deletion
- CSV import errors: Show per-row details

LOADING STATE:
- Table skeleton during load
- Spinner during save/delete

DO NOT:
- Allow duplicate test codes
- Delete tests in use
- Skip CSV validation
- Use mock data

ACCEPT CRITERIA:
- Tests load and display
- Create/Edit works
- Delete with confirmation
- CSV import/export works
- Filters work correctly
- Keyboard shortcuts functional
```

---

**Continue with A3-A8 (remaining 6 Admin screens)?** Ready to complete Admin role now?

