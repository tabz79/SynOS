# SynOS Current System State

This document outlines the current implementation status, architecture stack, and module relationships for SynOS.

## Technology Stack
* **Frontend**: React + Vite
* **Styling**: TailwindCSS (customized with premium tokens, glassmorphism, dark mode)
* **Icons**: Lucide React
* **Backend**: .NET / C# (API Layer)

## Frontend Architecture & Structure
* The application is modularized within `src/features/`.
* **Key Workspaces**:
  * `admin/TestMasterScreen.jsx`: The primary operational hub for configuring diagnostic tests.
  * `pathology/PathologistTerminal.jsx`: Workspace for pathologists to review and verify reports.
  * `typing/TypistTerminal.jsx`: Workspace for data entry and transcription.
* **Global Components**: Contextual sliding drawers are used consistently across terminals (e.g., positioned `top-12 bottom-0 z-[100]`) to ensure they layer correctly beneath global headers but above workspace content.

## State of Modules

### 1. Test Master (Admin) & Report Templates Designer
* **Status**: Fully implemented, modernized administrative workspaces (Frontend).
* **Key Implementations**:
  * **Unified Layout Width**: Both `TestMasterScreen.jsx` and `ReportTemplatesScreen.jsx` utilize full-width viewports (`w-full px-6 py-6 space-y-6`) to accommodate dense control panels and live builders on wide screens.
  * **Report Templates Split-Layout**: Restructured as a side-by-side 3-column builder: Left Modality templates list (col-span 3), Center Settings tabs workspace (col-span 5), and a permanently visible Right Live Report Preview canvas (col-span 4).
  * **Local Base64 Logo Uploader**: The clinic logo settings tab has been upgraded to convert uploaded PNG/image files into Base64 data URLs rather than text-based URL fields, complete with a preview display and quick clear action.
  * **Locked Presets Signature System**: Cleaned up legacy signature designations to strictly enforce pathologist/radiologist-only roles: `Default Pathologist (Lab Owner)` (required, non-deletable, non-toggleable checkbox), `Additional Pathologist` (optional), and `Radiologist` (optional). State layers in both screens run automatic sanitization helpers (`sanitizeTemplates` / `sanitizeCatalogSigs`) to filter out biochemists, lab technicians, or other roles.
  * **Dual Printing Modes & Margin Guides**: Live visual templates toggle between physical 'Preprinted' paper mode and 'Digital PDF' mode. In preprinted mode, digital branding elements are hidden to avoid double-printing, while customizable top/bottom margins are preserved (shown in the live preview canvas as dotted guide exclusion zones). In digital mode, full colored headers and Base64 logos are loaded.
  * **Contrast & Navigation Polish**: Enhanced system-wide text legibility in `AdminLayout.jsx` and `index.css` by upgrading standard `zinc-500` labels, metadata, and section headers to higher-contrast `zinc-600` (light mode) and `zinc-400` (dark mode) tokens. Active sidebar navigations now render with high-contrast colored text and icons.
  * **Light-Theme Column Designer**: The interactive Table Column Designer uses a light-mode styling (`bg-zinc-50 border-zinc-200 text-zinc-700`) with high-contrast active cell rings (`bg-synos-primary/10 text-synos-primary ring-2 ring-synos-primary/30 ring-inset`) for real-time header editing.
  * **Test Master Parameters**: Param table values are edited via a high-speed, spreadsheet-style inline grid, with a contextual "Settings" cog opening calculations or age/gender overrides in sliding drawers.


### 2. HR, Payroll & Attendance
* **Status**: Architecture frozen.
* **Implementation Details**:
  * Identity is separated into Employee vs. User.
  * Attendance relies strictly on an exception-based model (Present is default).
  * Payroll logic is integrated with the Employee identity lifecycle.

### 3. Finance & Outsourcing
* **Status**: Architecture frozen.
* **Implementation Details**:
  * Outsource configuration has been permanently stripped from clinical configuration screens (like Test Master).
  * All B2B referral tracking, partner pricing, and outsource logistics are routed through the upcoming Finance module.

## Module Relationships
* **Test Master -> Report Engine / Templates**: Test Master dictates the visual presentation constraints (Layout Style, Narrative Commentaries, Signature Slots). The report templates system consumes these configurations, matching modality templates case-insensitively, to render high-fidelity WYSIWYG digital and physical pre-printed layouts.
* **Identity -> Payroll**: The central Employee identity record acts as the source of truth for all payroll calculations.
* **Finance -> Catalog**: The clinical catalog defines Base Prices, but the Finance module orchestrates B2B routing, wholesale discounts, and partner ledger reconciliation.

