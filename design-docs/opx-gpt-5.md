# Identity-Workforce Governance Architecture (SynOS)

This document formalizes the architectural relationship between **Identity (User)** and **Employment (Staff)** within SynOS, transitioning from a role-based login system to organizational identity infrastructure.

## 1. Core Distinction

| Layer | Entity | Authority | Purpose |
| :--- | :--- | :--- | :--- |
| **Workforce** | `Employee` | HR / Management | Salary, Leave, Attendance, Organizational Truth |
| **Identity** | `User` | IT / Admin | Login, Credentials, Auth, Technical Access |
| **Permissions** | `Role` | Operations | Operational Capabilities & Limits |

## 2. The Production Lifecycle (HR-First)

The standard organizational workflow follows a two-stage process:

### Stage 1: Workforce Onboarding (HR)
- **Action**: HR/Management creates an `Employee` record.
- **Data**: Legal Name, Designation, Department, Salary, Joining Date.
- **State**: The person exists operationally and financially, but has **no digital access** yet.

### Stage 2: Access Provisioning (Admin)
- **Action**: Admin views the **"Pending Access Provisioning"** queue.
- **Decision**: Select an Employee and click "Grant System Access".
- **Result**: `User` account is created and linked via `Employee.UserId`.
- **Note**: Not all employees (e.g., cleaners, temporary staff) require this stage.

## 3. Development Shortcut (Seeding)

To maintain development velocity and ensure functional dashboards (Burn charts, Headcount), the system uses an automated seeding strategy:

- **Logic**: During `DbInitializer.Initialize`, all seeded operational users are automatically provisioned as `Employee` records.
- **Defaults**: Basic metadata (Name, Designation) is synced; financial data (Salary) defaults to 0.00 to indicate "Pending HR Finalization".

## 4. Governance Principles

- **Separation of Concerns**: Payroll history and audit trails reside in the `Employee` layer.
- **Persistence**: Deactivating a `User` (Identity) must **never** delete the `Employee` record. The employment history must remain for compliance and audit.
- **Mapping**: `Employee.UserId` is the primary bridge. One `Employee` record should correspond to exactly one `User` record (where applicable).
- **Naming**: Use `DisplayName` as the source of truth to accommodate varied naming formats (single names, initials) common in diverse laboratory environments.

## 5. Implementation Roadmap (Phase 9)

1. **Backend Integration**: Implement `SyncStaffFromUsersAsync` for development seeding.
2. **Provisioning API**: Create endpoints to list "Employees without Access" and "Users without Staff Profiles".
3. **Frontend Dashboard**: Add the **Identity Provisioning** tab to the Workforce Management module.
4. **Lifecycle Hooks**: Ensure user deactivation triggers a check on employment status.
