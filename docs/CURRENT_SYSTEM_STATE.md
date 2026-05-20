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

### 1. Test Master (Admin)
* **Status**: Highly functional operational workspace (Frontend).
* **Key Implementations**:
  * Uses `localStorage` to persist catalog additions and the currently selected test across browser reloads.
  * Parameters are edited via a high-speed, spreadsheet-style inline grid.
  * A unified "Settings" cog button contextually opens either formula/calculation configurations or reference range overrides depending on the parameter's state.
  * Real-time Report Layout preview that collapses the settings panel when active, expanding to 100% width when disabled.

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
* **Test Master -> Report Engine**: Test Master dictates the visual presentation constraints (Layout Style, Narrative Commentaries, Signature Slots). The report engine strictly consumes these parameters to generate the final PDF/HTML.
* **Identity -> Payroll**: The central Employee identity record acts as the source of truth for all payroll calculations.
* **Finance -> Catalog**: The clinical catalog defines Base Prices, but the Finance module orchestrates B2B routing, wholesale discounts, and partner ledger reconciliation.
