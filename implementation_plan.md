# Implementation Plan - Report Template Persistence Refactoring

This plan migrates report template configurations (including layout coordinates, margins, branding, columns, and signature slots) from browser-local `localStorage` to database persistence. This ensures that the same report renders identically across all workstations, browsers, incognito windows, and PDF/print outputs.

## User Review Required

> [!IMPORTANT]
> - **Pure Renderer**: `ReportA4.jsx` will be refactored into a pure presentation component, accepting only `reportData` and `template` props. All template fetching, DSL mapping, and caching responsibilities will be moved to a dedicated frontend service.
> - **Dedicated Service**: We will introduce a new module `ReportTemplateService.js` to manage backend template API consumption, local caching/state hooks, and translation mappings to/from the backend `TemplateModel` DSL.
> - **Global Adoption**: All terminals (Radiologist, Typist, Pathologist, Delivery, and Printer) will use the new `ReportTemplateService` to fetch and resolve templates before passing them to `ReportA4`.

## Proposed Changes

---

### Frontend Components

#### [MODIFY] [reports.js](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/api/reports.js)
- Expose the following backend `/api/v1/reports/templates` endpoints on `ReportsApi`:
  - `getTemplates(modality)`: Fetch templates from backend, optionally filtering by modality.
  - `createTemplate(dto)`: Create a template (requires admin).
  - `updateTemplate(id, dto)`: Update a template's JSON (requires admin).
  - `setDefaultTemplate(id)`: Mark template as default (requires admin).
  - `publishTemplate(id)`: Mark template as published (requires admin).
  - `deleteTemplate(id)`: Soft-delete a template (requires admin).

#### [NEW] [ReportTemplateService.js](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/documents/templates/ReportTemplateService.js)
- Implement frontend mappers:
  - `mapTemplateToBackendDsl(t)`: Serializes a flat template object into the `TemplateModel` DSL schema containing `meta` and `sections`.
  - `mapBackendDslToTemplate(dsl, templateId, isDefault, isPublished)`: Maps a `TemplateModel` DSL object back to the flat template structure with coordinates, default columns, and slots.
- Implement React Hooks:
  - `useTemplateForReport(reportData)`: Fetches templates from the backend for the modality, maps them, resolves the active template based on visit test code or default flags, and handles loading states.
  - `useTemplatesList()`: Fetches all templates from the backend, maps them, and exposes CRUD utilities (create, update, delete, set-default).

#### [MODIFY] [ReportA4.jsx](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/documents/templates/ReportA4.jsx)
- Remove `getTemplate()`, `useEffect`, `DEFAULT_TEMPLATES` imports, and mapping logic.
- Change component definition to accept `reportData` and `template` directly:
  `export const ReportA4 = ({ reportData, template }) => {`
- Ensure all positioning layout references access the `template` prop.

#### [MODIFY] [ReportTemplatesScreen.jsx](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/admin/ReportTemplatesScreen.jsx)
- Import and consume `useTemplatesList` hook from `ReportTemplateService`.
- Replace local state modifications of `localStorage` with API calls:
  - Fetch templates on load from backend database.
  - Call API when creating a template or saving coordinate modifications.

#### [MODIFY] [TestMasterScreen.jsx](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/admin/TestMasterScreen.jsx)
- Consume `ReportsApi` and `ReportTemplateService` mapping helpers.
- Fetch templates from the backend on mount/tab change and update drag coordinate mutations to save to the database.

#### [MODIFY] [RadiologistTerminal.jsx](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/radiology/RadiologistTerminal.jsx)
- Import `useTemplateForReport`.
- Resolve active template using hook and render preview:
  `<ReportA4 reportData={reportData} template={template} />`

#### [MODIFY] [RadiologyTypistTerminal.jsx](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/radiology/RadiologyTypistTerminal.jsx)
- Import `useTemplateForReport`.
- Resolve active template using hook and render preview.

#### [MODIFY] [PathologistTerminal.jsx](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/pathology/PathologistTerminal.jsx)
- Import `useTemplateForReport`.
- Resolve active template using hook and render preview.

#### [MODIFY] [TypistTerminal.jsx](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/typing/TypistTerminal.jsx)
- Import `useTemplateForReport`.
- Resolve active template using hook and render preview.

#### [MODIFY] [DeliveryTerminal.jsx](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/delivery/DeliveryTerminal.jsx)
- Import `useTemplateForReport`.
- Resolve active template using hook and render preview.

#### [MODIFY] [DocumentPrinter.jsx](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/documents/DocumentPrinter.jsx)
- Import `useTemplateForReport`.
- Resolve active template using hook and render preview.

---

## Verification Plan

### Automated Tests
- Verify frontend compiles successfully:
  ```bash
  npm run build
  ```

### Manual Verification
- Log in as Admin:
  - Go to **Report Templates** configuration screen.
  - Create a new template and modify coordinates (e.g. drag patient block or change footer branding text).
  - Save changes.
  - Verify that the layout settings are persisted in the database.
- Log in as Radiologist & Typist:
  - Open a study and save draft / preview report.
  - Verify that both terminals show identical layout coordinates, margins, and branding.
  - Verify that Incognito windows do not fall back to generic templates and show the correct database template.
