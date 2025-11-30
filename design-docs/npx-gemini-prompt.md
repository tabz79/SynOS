CONSTRAINTS (DO NOT VIOLATE)

- Project name: SynOS (Diagnostic Lab Management System).
- The current codebase on branch `day13-clean-reporting` BUILDS CLEAN. You must KEEP IT THAT WAY.

- Treat the following as FROZEN and read-only:
  - All existing entities in src/SynOS.Models/Entities (User, Patient, Visit, Order, Report, Result, etc.).
  - All existing services in src/SynOS.Services (VisitService, InvoiceService, ReceptionFlowService, ResultService, CriticalValueService, ReportService, AuthService, etc.).
  - Existing controllers and DTOs not related to report templates.
  - DbInitializer seeding except when adding the new report templates ONLY.

- You MUST NOT:
  - Rename, delete, or change types/nullability of ANY existing properties in ANY existing entities.
  - Add or remove navigation properties in existing entities.
  - Modify or refactor logic in existing services or controllers.
  - Change existing API contracts.
  - “Fix” nullability warnings by altering existing code outside the reporting module.

- You MAY:
  - Add NEW code for the report template engine ONLY:
    - New entity: ReportTemplate (minimal supporting properties only — do not modify other entities).
    - New JSON DSL models + DTOs under src/SynOS.Models/DTOs/ReportTemplateDsl and ReportTemplateDtos.
    - New service interface + implementation:
      - IReportTemplateService / ReportTemplateService
      - IReportPdfRenderer / QuestPdfReportRenderer
    - New controller:
      - ReportTemplateController
    - Update SynOSDbContext for:
      - DbSet<ReportTemplate>
      - Entity configuration ONLY for ReportTemplate
    - Update DI configuration to register the new services.
    - Add minimal seed data for report templates (3 initial templates).

- QuestPDF implementation constraints:
  - Use QuestPDF version already installed.
  - Must compile and return a valid PDF stream.
  - Implement minimal rendering for:
    - Header
    - Patient Info
    - Parameter table
    - Comments block
    - Signature placeholder
    - Footer
  - Conditional formatting + advanced positioning can be TODO for now.

- If ANY compile errors appear:
  - Fix ONLY inside reporting engine code (ReportTemplate*, renderer, DSL, controller, DbContext config).
  - NEVER modify existing unrelated entities/services/controllers.

- After you finish editing files:
  - Show a build result summary based on: dotnet build .\src\SynOS.Api\SynOS.Api.csproj
  - If errors: show FULL PATHS + LINE NUMBERS for each needed fix.

-------------------------------------------------------------------
DAY 13 – IMPLEMENT FLEXIBLE REPORT TEMPLATES + QUESTPDF RENDERING
-------------------------------------------------------------------

You are a senior .NET 8 backend engineer building SynOS — a Diagnostic Lab Management System.

STACK:
- .NET 8 Web API
- EF Core + SQL Server
- QuestPDF

SCOPE: Backend only (no UI), but APIs must allow a future drag/drop designer.

GOAL:
Implement a template-driven report engine:
- Admin-defined templates stored as JSON DSL
- QuestPDF renders PDFs using visit + patient + results data

------------------------------------------------
DATABASE – ReportTemplates table
------------------------------------------------

Name: ReportTemplates

Columns:
- TemplateId UNIQUEIDENTIFIER (PK, default NEWID())
- Modality VARCHAR(50) NOT NULL
- Name VARCHAR(200) NOT NULL UNIQUE
- Description NVARCHAR(500) NULL
- TemplateJson NVARCHAR(MAX) NOT NULL
- Version INT NOT NULL DEFAULT 1
- IsPublished BIT NOT NULL DEFAULT 0
- IsDefault BIT NOT NULL DEFAULT 0
- IsDeleted BIT NOT NULL DEFAULT 0
- CreatedBy UNIQUEIDENTIFIER NOT NULL  -- FK to Users(UserId)
- CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
- UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()

Indexes:
- IX_ReportTemplates_Modality
- IX_ReportTemplates_IsPublished
- IX_ReportTemplates_IsDefault (filtered WHERE IsDefault = 1)
- IX_ReportTemplates_NotDeleted (filtered WHERE IsDeleted = 0)

Rules:
- Soft delete only.
- Only 1 default per modality at a time.

------------------------------------------------
JSON DSL (source of truth for rendering)
------------------------------------------------

Implement CLR models for this structure:

{
  "meta": {
    "name": "Pathology_Standard_1Column",
    "modality": "Pathology",
    "layout": "oneColumn",
    "pageSize": "A4",
    "orientation": "Portrait"
  },
  "sections": [
    { "type": "Header", ... },
    { "type": "PatientInfo", ... },
    { "type": "ParameterTable", ... },
    { "type": "Comments", ... },
    { "type": "Interpretation", ... },
    { "type": "Recommendations", ... },
    { "type": "SignatureBlock", ... },
    { "type": "QRCode", ... },
    { "type": "Footer", ... }
  ]
}

Validate JSON before saving.

------------------------------------------------
SERVICES
------------------------------------------------

Create IReportTemplateService + implementation:

1) CreateTemplateAsync(...)
2) GetTemplatesAsync(...)
3) GetTemplateByIdAsync(...)
4) UpdateTemplateJsonAsync(...)
5) PublishTemplateAsync(...)
6) SetDefaultTemplateAsync(...)
7) SoftDeleteTemplateAsync(...)
8) RenderPdfAsync(reportId, templateId = null)

------------------------------------------------
QUESTPDF RENDERER
------------------------------------------------

Create interface IReportPdfRenderer + implementation QuestPdfReportRenderer:

- Task<byte[]> GeneratePdfAsync(ReportDataModel data, TemplateModel template)

Data source:
- Use existing report + results retrieval (read-only, no changes to ReportService).

------------------------------------------------
CONTROLLER – /api/v1/reports/templates
------------------------------------------------

Endpoints:
- POST /api/v1/reports/templates
- GET /api/v1/reports/templates
- GET /api/v1/reports/templates/{id}
- PUT /api/v1/reports/templates/{id}
- POST /api/v1/reports/templates/{id}/publish
- POST /api/v1/reports/templates/{id}/set-default
- DELETE /api/v1/reports/templates/{id}
- GET /api/v1/reports/templates/{id}/preview?visitId={visitId}
- POST /api/v1/reports/render

------------------------------------------------
SEED (DbInitializer)
------------------------------------------------

3 templates:
- Pathology_Standard_1Column (Published + Default)
- Pathology_Detailed_2Column (Unpublished)
- Radiology_Standard (Published + Default)

------------------------------------------------
ACCEPTANCE CRITERIA
------------------------------------------------

- Database supports template storage + soft delete
- JSON DSL validates correctly
- CRUD + publish + default-switch works
- Preview generates a valid PDF stream
- Render endpoint chooses correct template based on modality
- Code remains clean, layered and unit-testable

END PROMPT
