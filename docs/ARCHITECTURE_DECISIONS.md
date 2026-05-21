# SynOS Architecture Decisions

This document records the frozen architectural decisions that govern the SynOS platform. Future agents must not deviate from these established patterns.

## Identity & Access Management
* **Employee vs. User Distinction**: Employee onboarding and User provisioning are strictly separated. An employee exists in the system as a real-world staff member independent of whether they have login credentials (a User account) to the software.
* **Identity Lifecycle**: Payroll and role management are tied to the Employee identity, not the User account.

## HR, Payroll & Attendance
* **Exception-Based Attendance**: Do not store standard attendance logs for every day. **Present is the default attendance state**. The database only stores attendance exceptions (leaves, absences, late arrivals, half-days).
* **Payroll Integration**: Payroll is fundamentally integrated with the staff identity lifecycle. It computes off the exception-based attendance data.

## Catalog & Test Master
* **Profiles & Panels**: Profiles and Panels are not special distinct entities in the data architecture; they act purely as **containers of tests**. A profile aggregates multiple individual tests into a single billable or reportable unit.
* **Report Architecture**: Report configuration is localized. The Test Master acts as the configuration hub for how a specific test is presented on the final report. The UI must provide a live layout toggler to reflect presentation choices instantly, without needing a separate reporting engine module exposed to the user.

## Report Templates & Designer Layout
* **3-Column Canvas Grid**: The `ReportTemplatesScreen` must enforce a side-by-side 3-column builder layout spanning: Modality Templates List (col-span 3), Settings Tabs Workspace (col-span 5), and a permanently visible Live Report Preview Canvas (col-span 4).
* **Signature Constraints**: Signature slots are strictly limited to pathologists and radiologists. Only three specific presets are supported: `Default Pathologist (Lab Owner)` (required/mandatory, non-deletable, non-toggleable), `Additional Pathologist` (optional), and `Radiologist` (optional). No other roles (e.g. biochemist, technician) are permitted in templates, catalogs, seeds, or overrides.
* **Logo Management**: The clinic logo uploader must convert selected local image files (PNG/JPG) to Base64 data URLs in state and storage rather than accepting manually entered external URL text strings.
* **Dual Printing Modes**: Modality templates must support a toggle between physical `Preprinted` mode and `Digital PDF` mode. Physical mode suppresses digital branding, logo, and footer text rendering to prevent printing color overlays on preprinted letterhead, while respecting configurable top/bottom margins. Digital mode embeds the full color branding and Base64 logos for digital sharing (e.g., WhatsApp, Email).
* **Dynamic State Sanitization**: Frontend states loaded from local client storage must run runtime sanitizers (`sanitizeTemplates` / `sanitizeCatalogSigs`) to programmatically strip legacy roles or invalid values, enforcing strict schema compliance at the application boundary.


## Finance & Operations
* **Outsourcing Separation**: Outsource logistics, costs, and partner routing are strictly the domain of the Finance and Operations panels. Do not pollute the Test Master or Clinical catalog screens with B2B outsourcing configuration.
* **Currency**: The system uses the Indian Rupee (₹) as the primary currency symbol for financial data presentation.

