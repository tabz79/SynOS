# SynOS - Synthesized Lab Intelligence Operating System

This is the monorepo for SynOS, a comprehensive Diagnostic Lab Operating System.

## Project Overview:
SynOS is designed to manage workflows for Pathology (Blood/Urine/Stool), Radiology (X-ray, MRI, CT), Billing, Delivery, and Administrative operations. It features a high-throughput, keyboard-centric user interface and a robust .NET 8 backend with SQL Server.

## Structure:
-   `SynOS.sln`: The main Visual Studio solution file.
-   `src/`: Contains all backend .NET projects (`SynOS.Api`, `SynOS.Models`, `SynOS.Services`, `SynOS.Data`).
-   `web/`: Contains the React + Vite frontend application.
-   `design-docs/`: Design specifications, ERDs, API specs, and build playbooks.
-   `tests/`: Placeholder for future test documentation and scripts.

## Getting Started (for PO):

### 1. Backend Setup:
Refer to `src/README-backend.md` for instructions on building and running the .NET API.
**Important:** Update the `ConnectionStrings:SynOS` and `Jwt:Secret` in `src/SynOS.Api/appsettings.json` before running.

### 2. Frontend Setup:
Refer to `web/README-frontend.md` for instructions on installing dependencies and starting the React development server.
**Important:** Ensure `web/.env` (or `VITE_API_BASE_URL` in `web/src/services/apiClient.ts`) points to your running backend API.

### 3. Database Setup:
Refer to `src/SynOS.Data/migrations/README.md` for instructions on setting up the SQL Server database and applying initial migrations.

### 4. Database Migrations and Seeding:
After setting up your SQL Server connection string in `src/SynOS.Api/appsettings.json`, you need to apply the database migrations and seed the initial data.

1.  **Navigate to the API project directory:**
    ```bash
    cd src/SynOS.Api
    ```
2.  **Apply Migrations:**
    ```bash
    dotnet ef database update
    ```
    This command will apply all pending migrations, creating the necessary tables for Users, Roles, RefreshTokens, and AuditLogs.
3.  **Seed Data:**
    The application is configured to automatically seed initial roles and test users when it starts for the first time (or if the database is empty).
    *   **Test Users:**
        *   `admin@lab.com` / `Admin`
        *   `reception@lab.com` / `Reception`
        *   `pathtech@lab.com` / `PathTech`
        *   `pathologist@lab.com` / `Pathologist`
        *   `radiologist@lab.com` / `Radiologist`

## PO Verification Checklist (Day 1):

-   [ ] `dotnet build` succeeds in the solution root.
-   [ ] `npm install` succeeds in the `web/` directory.
-   [ ] `npm run dev` starts the frontend on `http://localhost:5173`.
-   [ ] The backend API starts successfully (using `dotnet run --project src/SynOS.Api`).
-   [ ] The health endpoint `GET http://localhost:<api_port>/healthz` returns `200 OK` with "SynOS API is healthy."
-   [ ] The `appsettings.json` connection string is updated and SQL Server is reachable.

---
**Author:** Gemini
**Date:** 2025-11-13
