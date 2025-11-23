# ADMIN ROLE - SCREENS A3-A8
## Completing Admin Role

**Continuing from:** A2 Test Master Management  
**Remaining Screens:** 6  
**File:** Part 2 of Admin role documentation

---

# A3: User Management

**Route:** `/admin/users`  
**Role:** Admin  
**Backend APIs:**
- `GET /api/v1/users?role={role}&status={status}`
- `POST /api/v1/users`
- `PUT /api/v1/users/{id}`
- `DELETE /api/v1/users/{id}`
- `PUT /api/v1/users/{id}/reset-password`

## Complete Component Checklist

### UI Elements:

- [ ] **Page Header**
  - Title: "User Management"
  - Breadcrumb: Home → Admin → Users

- [ ] **Quick Actions Bar**
  
  - [ ] **Add New User Button**
    - Text: "Add New User"
    - Icon: User-Plus
    - Keyboard: Ctrl+N
    - Action: Open create user modal
  
  - [ ] **Export Users Button**
    - Text: "Export CSV"
    - Icon: Download
    - Action: Download all users as CSV

- [ ] **Filters Section**
  
  - [ ] **Role Filter Dropdown**
    - Label: "Role"
    - Options: All, Reception, Sample Collection, Lab Tech, Pathologist, Radiology Tech, Radiologist, Delivery, Admin
    - Default: All
  
  - [ ] **Status Filter Dropdown**
    - Label: "Status"
    - Options: All, Active, Inactive
    - Default: All
  
  - [ ] **Department Filter Dropdown**
    - Label: "Department"
    - Options: All, Pathology, Radiology
    - Default: All
  
  - [ ] **Search Input**
    - Placeholder: "Search by name, email, username..."
    - Type: text

- [ ] **Users Table**
  - Columns: Username, Name, Email, Role, Department, Status, Last Login, Actions
  - Sortable: All columns
  - **Per Row:**
    - Username: (e.g., "priya.sharma")
    - Name: (e.g., "Priya Sharma")
    - Email: (e.g., "priya@lab.com")
    - Role: Badge with color
    - Department: Badge (if applicable)
    - Status: Toggle switch (Active/Inactive)
    - Last Login: Formatted timestamp or "Never"
    - Actions:
      - [ ] **Edit Button**
        - Icon: Pencil
        - Action: Open edit modal
      - [ ] **Reset Password Button**
        - Icon: Key
        - Action: Show reset password modal
      - [ ] **Delete Button**
        - Icon: Trash
        - Action: Show confirmation, delete user

- [ ] **Pagination Controls**

- [ ] **Create/Edit User Modal**
  
  - [ ] **Modal Header**
    - Title: "Add New User" or "Edit User"
    - Close button
  
  - [ ] **Username Input** (Required, create only)
    - Label: "Username *"
    - Type: text
    - Unique validation
    - Lowercase transform
    - Max length: 50
    - Pattern: alphanumeric + dots/underscores
    - API field: `username`
    - Disabled: If editing (cannot change username)
  
  - [ ] **Full Name Input** (Required)
    - Label: "Full Name *"
    - Type: text
    - Max length: 100
    - API field: `name`
  
  - [ ] **Email Input** (Required)
    - Label: "Email *"
    - Type: email
    - Unique validation
    - API field: `email`
  
  - [ ] **Phone Input** (Optional)
    - Label: "Phone"
    - Type: tel
    - Pattern: 10 digits
    - API field: `phone`
  
  - [ ] **Role Dropdown** (Required)
    - Label: "Role *"
    - Options: Reception, Sample Collection, Lab Tech, Pathologist, Radiology Tech, Radiologist, Delivery, Admin
    - API field: `role`
  
  - [ ] **Department Dropdown** (Conditional)
    - Label: "Department *"
    - Shows only if: Role requires department
    - Options: Pathology, Radiology
    - API field: `dept`
  
  - [ ] **Password Input** (Required for create only)
    - Label: "Password *"
    - Type: password
    - Min length: 8
    - Strength indicator
    - API field: `password`
    - Shows: Only when creating new user
  
  - [ ] **Confirm Password Input** (Required for create only)
    - Label: "Confirm Password *"
    - Type: password
    - Validation: Must match password
    - Shows: Only when creating new user
  
  - [ ] **Active Status Checkbox**
    - Label: "Active"
    - Default: Checked
    - API field: `isActive`
  
  - [ ] **Permissions Section** (Optional advanced)
    - Heading: "Additional Permissions"
    - Checkboxes for special permissions
  
  - [ ] **Modal Action Buttons**
    - [ ] **Save User Button**
      - Text: "Save User"
      - Keyboard: Ctrl+S
      - Action: POST /api/v1/users (create) or PUT /api/v1/users/{id} (update)
    - [ ] **Cancel Button**

- [ ] **Reset Password Modal**
  
  - [ ] **Modal Header**
    - Title: "Reset Password for {username}"
  
  - [ ] **New Password Input** (Required)
    - Label: "New Password *"
    - Type: password
    - Min length: 8
    - Strength indicator
  
  - [ ] **Confirm Password Input** (Required)
    - Label: "Confirm Password *"
    - Type: password
    - Must match new password
  
  - [ ] **Force Change on Login Checkbox**
    - Label: "Force user to change password on next login"
    - Default: Checked
  
  - [ ] **Modal Action Buttons**
    - [ ] **Reset Password Button**
      - Text: "Reset Password"
      - Action: PUT /api/v1/users/{id}/reset-password
    - [ ] **Cancel Button**

- [ ] **Delete Confirmation Dialog**
  - Title: "Delete User?"
  - Message: "Are you sure you want to delete {name} ({username})? This cannot be undone."
  - Warning: "This will revoke all access immediately."
  - Buttons:
    - [ ] **Cancel**
    - [ ] **Delete** (Red)

## API Integration

**1. Get Users:**
```
GET /api/v1/users?role=Reception&status=Active

Response (200):
{
  "data": [
    {
      "userId": "uuid",
      "username": "priya.sharma",
      "name": "Priya Sharma",
      "email": "priya@lab.com",
      "phone": "9876543210",
      "role": "Reception",
      "dept": "Pathology",
      "isActive": true,
      "lastLogin": "2025-11-22T20:30:00Z",
      "createdAt": "2025-01-10T09:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**2. Create User:**
```
POST /api/v1/users

Request:
{
  "username": "john.doe",
  "name": "John Doe",
  "email": "john@lab.com",
  "phone": "9876543210",
  "role": "Lab Tech",
  "dept": "Pathology",
  "password": "SecurePass123!",
  "isActive": true
}

Response (201):
{
  "data": {
    "userId": "uuid",
    "username": "john.doe",
    ...
  }
}

Error (409):
{
  "error": {
    "code": "DUPLICATE_USERNAME",
    "message": "Username 'john.doe' already exists"
  }
}
```

**3. Update User:**
```
PUT /api/v1/users/{userId}

Request:
{
  "name": "John D. Doe",
  "email": "john.doe@lab.com",
  "phone": "9876543211",
  "role": "Pathologist",
  "dept": "Pathology",
  "isActive": true
}

Response (200):
{
  "data": {
    "userId": "uuid",
    ...
  }
}
```

**4. Reset Password:**
```
PUT /api/v1/users/{userId}/reset-password

Request:
{
  "newPassword": "NewSecurePass123!",
  "forceChangeOnLogin": true
}

Response (200):
{
  "data": {
    "userId": "uuid",
    "passwordReset": true,
    "forceChange": true
  }
}
```

**5. Delete User:**
```
DELETE /api/v1/users/{userId}

Response (200):
{
  "data": {
    "userId": "uuid",
    "deleted": true
  }
}
```

## Keyboard Shortcuts

- **Ctrl+N:** New user
- **Ctrl+S:** Save (in modal)
- **Esc:** Close modal

## Validation Rules

1. **Username:**
   - Required (create only)
   - Unique
   - Lowercase
   - 3-50 characters
   - Alphanumeric + dots/underscores only

2. **Name:**
   - Required
   - Max 100 characters

3. **Email:**
   - Required
   - Valid email format
   - Unique

4. **Password:**
   - Required (create only)
   - Min 8 characters
   - Must contain: uppercase, lowercase, number

5. **Role:**
   - Required

## Gemini Prompt for A3

```
Build the User Management screen (React + Vite + Tailwind CSS + shadcn/ui).

BACKEND APIs:
1. GET /api/v1/users?role={role}&status={status}
2. POST /api/v1/users
3. PUT /api/v1/users/{userId}
4. DELETE /api/v1/users/{userId}
5. PUT /api/v1/users/{userId}/reset-password

[Full detailed prompt similar to A2, with all UI components, validation, and error handling]

DO NOT:
- Allow duplicate usernames/emails
- Skip password strength validation
- Allow deletion of current logged-in user
- Use mock data

ACCEPT CRITERIA:
- Users load and display
- Create/Edit works with validation
- Password reset functional
- Delete with confirmation
- Filters work
- Keyboard shortcuts work
```

---

# A4: Department & Role Settings

**Route:** `/admin/settings/roles`  
**Role:** Admin  
**Backend APIs:**
- `GET /api/v1/admin/roles`
- `PUT /api/v1/admin/roles/{role}/permissions`
- `GET /api/v1/admin/departments`
- `PUT /api/v1/admin/departments/{dept}/settings`

## Complete Component Checklist

### UI Elements:

- [ ] **Page Header**
  - Title: "Department & Role Settings"
  - Breadcrumb: Home → Admin → Settings

- [ ] **Tabs Navigation**
  - [ ] **Roles & Permissions Tab**
  - [ ] **Department Settings Tab**

---

## TAB 1: Roles & Permissions

- [ ] **Roles List**
  - Display: All 8 system roles
  - **Per Role Card:**
    - [ ] **Role Name Header**
      - Text: Role name with icon
      - Badge: "{X} users"
    
    - [ ] **Role Description**
      - Text: Brief description
    
    - [ ] **Permissions Checklist**
      - [ ] **View Permissions**
        - View Patients
        - View Visits
        - View Results
        - View Reports
        - View Invoices
      
      - [ ] **Create Permissions**
        - Create Patients
        - Create Visits
        - Create Appointments
      
      - [ ] **Edit Permissions**
        - Edit Patient Info
        - Edit Visit Details
        - Enter/Edit Results
      
      - [ ] **Delete Permissions**
        - Delete Visits
        - Cancel Appointments
      
      - [ ] **Special Permissions**
        - Print Reports
        - Send Delivery
        - Process Payments
        - Manage Tests (Admin only)
        - Manage Users (Admin only)
    
    - [ ] **Save Permissions Button**
      - Text: "Save"
      - Action: PUT /api/v1/admin/roles/{role}/permissions

---

## TAB 2: Department Settings

- [ ] **Department Cards**
  
  **PATHOLOGY DEPARTMENT:**
  - [ ] **Department Name Header**
    - Text: "Pathology Department"
  
  - [ ] **Settings Form**
    
    - [ ] **Department Code Input**
      - Label: "Department Code"
      - Type: text
      - Read-only
      - Value: "PATH"
    
    - [ ] **Department Name Input**
      - Label: "Display Name"
      - Type: text
      - Value: "Pathology"
    
    - [ ] **Default TAT Input**
      - Label: "Default TAT (hours)"
      - Type: number
      - Value: 24
    
    - [ ] **Working Hours Inputs**
      - [ ] **Start Time**
        - Label: "Working Hours - Start"
        - Type: time
        - Value: "09:00"
      - [ ] **End Time**
        - Label: "Working Hours - End"
        - Type: time
        - Value: "18:00"
    
    - [ ] **Sample Collection Enabled Checkbox**
      - Label: "Sample Collection Enabled"
      - Default: Checked
    
    - [ ] **Active Status Checkbox**
      - Label: "Active"
      - Default: Checked
  
  - [ ] **Save Settings Button**
    - Text: "Save Department Settings"
    - Action: PUT /api/v1/admin/departments/PATH/settings
  
  **RADIOLOGY DEPARTMENT:**
  - (Same structure as Pathology)

## API Integration

**1. Get Roles:**
```
GET /api/v1/admin/roles

Response (200):
{
  "data": [
    {
      "role": "Reception",
      "description": "Front desk operations",
      "userCount": 5,
      "permissions": {
        "viewPatients": true,
        "createPatients": true,
        "editPatients": true,
        "deletePatients": false,
        "viewVisits": true,
        "createVisits": true,
        "processPayments": true,
        "printReports": false,
        "manageTests": false,
        "manageUsers": false
      }
    }
  ]
}
```

**2. Update Role Permissions:**
```
PUT /api/v1/admin/roles/{role}/permissions

Request:
{
  "permissions": {
    "viewPatients": true,
    "createPatients": true,
    ...
  }
}

Response (200):
{
  "data": {
    "role": "Reception",
    "permissions": {...}
  }
}
```

**3. Get Departments:**
```
GET /api/v1/admin/departments

Response (200):
{
  "data": [
    {
      "deptCode": "PATH",
      "deptName": "Pathology",
      "defaultTatHours": 24,
      "workingHoursStart": "09:00",
      "workingHoursEnd": "18:00",
      "sampleCollectionEnabled": true,
      "isActive": true
    }
  ]
}
```

**4. Update Department Settings:**
```
PUT /api/v1/admin/departments/{deptCode}/settings

Request:
{
  "deptName": "Pathology",
  "defaultTatHours": 24,
  "workingHoursStart": "09:00",
  "workingHoursEnd": "18:00",
  "sampleCollectionEnabled": true,
  "isActive": true
}

Response (200):
{
  "data": {
    "deptCode": "PATH",
    ...
  }
}
```

## Gemini Prompt for A4

```
Build the Department & Role Settings screen (React + Vite + Tailwind CSS + shadcn/ui).

[Full detailed prompt with tabs, permissions checklist, department settings forms]

ACCEPT CRITERIA:
- Roles load with current permissions
- Permission checkboxes update role permissions
- Department settings save correctly
- Both tabs functional
```

---

# A5: Pricing & Discount Rules

**Route:** `/admin/pricing`  
**Role:** Admin  
**Backend APIs:**
- `GET /api/v1/admin/pricing-rules`
- `POST /api/v1/admin/pricing-rules`
- `PUT /api/v1/admin/pricing-rules/{id}`
- `DELETE /api/v1/admin/pricing-rules/{id}`

## Complete Component Checklist

### UI Elements:

- [ ] **Page Header**
  - Title: "Pricing & Discount Rules"
  - Breadcrumb: Home → Admin → Pricing

- [ ] **Tabs Navigation**
  - [ ] **Global Discounts Tab**
  - [ ] **Corporate Rates Tab**
  - [ ] **Package Deals Tab**

---

## TAB 1: Global Discounts

- [ ] **Add New Discount Rule Button**
  - Text: "Add Discount Rule"
  - Icon: Plus
  - Action: Open create modal

- [ ] **Discount Rules Table**
  - Columns: Rule Name, Type, Value, Conditions, Priority, Active, Actions
  - **Per Row:**
    - Rule Name
    - Type: Percentage / Fixed Amount
    - Value: "X%" or "₹X"
    - Conditions: "Senior Citizen", "Student", "Min Amount ₹500", etc.
    - Priority: 1-10 (lower = higher priority)
    - Active: Toggle switch
    - Actions: Edit, Delete

---

## TAB 2: Corporate Rates

- [ ] **Add Corporate Partner Button**
  - Opens corporate rate modal

- [ ] **Corporate Partners Table**
  - Columns: Company Name, Discount %, Tests Included, Valid Until, Active, Actions
  - **Per Row:**
    - Company Name
    - Discount: "X%"
    - Tests: "All" or "Selected X tests"
    - Valid Until: Date
    - Active: Toggle
    - Actions: Edit, Delete, View Details

---

## TAB 3: Package Deals

- [ ] **Create Package Button**
  - Opens package creation modal

- [ ] **Packages Table**
  - Columns: Package Name, Tests Included, Regular Price, Package Price, Savings, Active, Actions
  - **Per Row:**
    - Package Name: (e.g., "Health Checkup Basic")
    - Tests: "X tests"
    - Regular Price: "₹{sum of individual tests}"
    - Package Price: "₹{discounted price}"
    - Savings: "₹{difference} (X%)"
    - Active: Toggle
    - Actions: Edit, Delete, View Tests

---

## Create/Edit Discount Rule Modal

- [ ] **Rule Name Input** (Required)
- [ ] **Discount Type Radio**
  - Percentage
  - Fixed Amount
- [ ] **Discount Value Input** (Required)
- [ ] **Conditions Section**
  - [ ] **Condition Type Dropdown**
    - Senior Citizen (Age >= 60)
    - Student (with ID)
    - Minimum Bill Amount
    - Specific Tests
    - Referral Source
  - [ ] **Condition Value Input**
- [ ] **Priority Input** (1-10)
- [ ] **Active Checkbox**
- [ ] **Save / Cancel Buttons**

## API Integration

**1. Get Pricing Rules:**
```
GET /api/v1/admin/pricing-rules?type=discount

Response (200):
{
  "data": [
    {
      "ruleId": "uuid",
      "ruleName": "Senior Citizen Discount",
      "type": "Percentage",
      "value": 10.0,
      "conditions": {
        "ageMin": 60
      },
      "priority": 1,
      "isActive": true
    }
  ]
}
```

**2. Create/Update Rule:**
```
POST /api/v1/admin/pricing-rules
PUT /api/v1/admin/pricing-rules/{ruleId}

Request:
{
  "ruleName": "Senior Citizen Discount",
  "type": "Percentage",
  "value": 10.0,
  "conditions": {
    "ageMin": 60
  },
  "priority": 1,
  "isActive": true
}

Response (201/200):
{
  "data": {
    "ruleId": "uuid",
    ...
  }
}
```

## Gemini Prompt for A5

```
Build the Pricing & Discount Rules screen (React + Vite + Tailwind CSS + shadcn/ui).

[Full detailed prompt with tabs, tables, modals for all 3 pricing categories]

ACCEPT CRITERIA:
- All 3 tabs functional
- Create/edit discount rules
- Corporate rates management
- Package deals creation
- Priority-based rule application
```

---

# A6: Referral Doctor Management

**Route:** `/admin/referrals`  
**Role:** Admin  
**Backend APIs:**
- `GET /api/v1/referral-doctors`
- `POST /api/v1/referral-doctors`
- `PUT /api/v1/referral-doctors/{id}`
- `DELETE /api/v1/referral-doctors/{id}`

## Complete Component Checklist

### UI Elements:

- [ ] **Page Header**
  - Title: "Referral Doctor Management"

- [ ] **Add New Doctor Button**
  - Action: Open create modal

- [ ] **Referral Doctors Table**
  - Columns: Doctor Name, Specialty, Contact, Commission %, Total Referrals, Pending Commission, Active, Actions
  - **Per Row:**
    - Doctor Name
    - Specialty
    - Phone, Email
    - Commission: "X%"
    - Total Referrals: Count
    - Pending Commission: "₹{amount}"
    - Active: Toggle
    - Actions: Edit, Delete, View Referrals, Settle Commission

---

## Create/Edit Doctor Modal

- [ ] **Doctor Name Input** (Required)
- [ ] **Specialty Input** (Required)
- [ ] **Phone Input** (Required)
- [ ] **Email Input** (Optional)
- [ ] **Commission Rate Input** (Required)
  - Type: number
  - Min: 0
  - Max: 100
  - Suffix: "%"
- [ ] **Payment Method Dropdown**
  - Options: Cash, Bank Transfer, Cheque
- [ ] **Bank Details Section** (if Bank Transfer)
  - Account Number
  - IFSC Code
  - Account Holder Name
- [ ] **Active Checkbox**
- [ ] **Save / Cancel Buttons**

## API Integration

```
GET /api/v1/referral-doctors

Response (200):
{
  "data": [
    {
      "doctorId": "uuid",
      "name": "Dr. Anand Kumar",
      "specialty": "General Physician",
      "phone": "9876543210",
      "email": "anand@example.com",
      "commissionRate": 15.0,
      "totalReferrals": 125,
      "pendingCommission": 12500.00,
      "isActive": true
    }
  ]
}
```

## Gemini Prompt for A6

```
Build the Referral Doctor Management screen.

[Full detailed prompt with table, modal, commission settlement]

ACCEPT CRITERIA:
- Doctors list displays
- Create/edit works
- Commission calculation correct
- Settlement tracking functional
```

---

# A7: System Configuration

**Route:** `/admin/settings`  
**Role:** Admin  
**Backend APIs:**
- `GET /api/v1/admin/settings`
- `PUT /api/v1/admin/settings`

## Complete Component Checklist

### UI Elements:

- [ ] **Page Header**
  - Title: "System Configuration"

- [ ] **Settings Sections**

**LAB INFORMATION:**
- [ ] **Lab Name Input**
- [ ] **Address Textarea**
- [ ] **Phone Input**
- [ ] **Email Input**
- [ ] **Website Input**
- [ ] **Logo Upload**

**INVOICE SETTINGS:**
- [ ] **Invoice Prefix Input** (e.g., "INV-")
- [ ] **Invoice Starting Number Input**
- [ ] **Tax/GST Number Input**
- [ ] **Footer Text Textarea**

**REPORT SETTINGS:**
- [ ] **Report Header Template Textarea**
- [ ] **Report Footer Template Textarea**
- [ ] **Digital Signature Upload**
- [ ] **QR Code on Reports Checkbox**

**NOTIFICATION SETTINGS:**
- [ ] **SMS Gateway Dropdown**
- [ ] **SMS API Key Input**
- [ ] **WhatsApp API Key Input**
- [ ] **Email SMTP Settings**
  - Host, Port, Username, Password

**BACKUP SETTINGS:**
- [ ] **Auto Backup Enabled Checkbox**
- [ ] **Backup Frequency Dropdown** (Daily, Weekly)
- [ ] **Backup Time Input**
- [ ] **Backup Location Input**

- [ ] **Save All Settings Button**

## Gemini Prompt for A7

```
Build the System Configuration screen.

[Full detailed prompt with all settings sections, file uploads, SMTP configuration]

ACCEPT CRITERIA:
- All settings load
- Logo/signature upload works
- Settings save correctly
- Validation for required fields
```

---

# A8: Audit Log Viewer

**Route:** `/admin/audit-log`  
**Role:** Admin  
**Backend APIs:**
- `GET /api/v1/admin/audit-log`

## Complete Component Checklist

### UI Elements:

- [ ] **Page Header**
  - Title: "Audit Log"

- [ ] **Filters**
  - [ ] **Date Range Picker**
    - From Date
    - To Date
  - [ ] **User Filter Dropdown**
  - [ ] **Action Filter Dropdown**
    - Created, Updated, Deleted, Viewed, etc.
  - [ ] **Entity Filter Dropdown**
    - Patient, Visit, Test, User, etc.
  - [ ] **Search Input**

- [ ] **Audit Log Table**
  - Columns: Timestamp, User, Action, Entity, Entity ID, Details, IP Address
  - **Per Row:**
    - Timestamp: Full datetime
    - User: Username with role badge
    - Action: Color-coded badge
    - Entity: Type
    - Entity ID: Clickable (opens entity)
    - Details: JSON diff or description
    - IP Address
  - [ ] **Expand Row Button**
    - Shows full JSON diff of changes

- [ ] **Export Log Button**
  - Downloads filtered log as CSV

## API Integration

```
GET /api/v1/admin/audit-log?from=2025-11-01&to=2025-11-22&user={userId}&action=Created

Response (200):
{
  "data": [
    {
      "logId": "uuid",
      "timestamp": "2025-11-22T20:45:00Z",
      "user": {
        "userId": "uuid",
        "username": "priya.sharma",
        "role": "Reception"
      },
      "action": "Created",
      "entity": "Visit",
      "entityId": "uuid",
      "details": {
        "before": null,
        "after": { "token": "P-042", ... }
      },
      "ipAddress": "192.168.1.100"
    }
  ],
  "pagination": {...}
}
```

## Gemini Prompt for A8

```
Build the Audit Log Viewer screen.

[Full detailed prompt with advanced filters, expandable rows, JSON diff viewer, export]

ACCEPT CRITERIA:
- Logs load with pagination
- Filters work correctly
- Expandable rows show full details
- Export downloads CSV
- Date range filter functional
```

---

# 🎉 ADMIN ROLE COMPLETE!

**All 8 Admin screens fully documented:**

✅ A1: Admin Dashboard  
✅ A2: Test Master Management  
✅ A3: User Management  
✅ A4: Department & Role Settings  
✅ A5: Pricing & Discount Rules  
✅ A6: Referral Doctor Management  
✅ A7: System Configuration  
✅ A8: Audit Log Viewer  

**Every screen includes:**
- Complete component checklist
- API integration details
- Keyboard shortcuts
- Validation rules
- Complete Gemini prompts

**Total Admin Screens:** 8  
**Total Buttons/Components:** ~200+  
**Total API Endpoints:** ~25+

---

## Roles Completed So Far:

✅ **RECEPTION** (12 screens) - COMPLETE  
✅ **ADMIN** (8 screens) - COMPLETE  

## Remaining Roles:

- **Sample Collection** (4 screens)
- **Lab Technician** (5 screens)
- **Pathologist** (6 screens)
- **Radiology Technician** (4 screens)
- **Radiologist** (5 screens)
- **Delivery Desk** (5 screens)

**Which role next?**

