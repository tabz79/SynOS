You are a senior .NET 8 backend engineer building a Diagnostic Lab Management System (SynOS).  
Your task for Day 15 is to implement the entire Test Master + Parameter + Range + PriceConfig + CSV Import/Export + User Management backend.

FRONTEND IS NOT PART OF THIS TASK.
Return only backend code, migrations, and API endpoints.

------------------------------------------------------------
DAY 15 OBJECTIVES
------------------------------------------------------------
1. Implement full Test Master CRUD (Tests table)
2. Implement Parameters + Reference Ranges for each Test
3. Implement PriceConfig table (discounts, referrer %, effective dates)
4. Implement user management CRUD
5. Implement CSV IMPORT (strict template)
6. Implement CSV TEMPLATE DOWNLOAD endpoint
7. Implement CSV EXPORT
8. Everything must be audited
9. All logic must be transactional and validated

------------------------------------------------------------
DATABASE SCHEMA (CREATE ALL TABLES)
------------------------------------------------------------

1) Tests
(
  TestId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  TestCode VARCHAR(50) NOT NULL UNIQUE,
  TestName VARCHAR(200) NOT NULL,
  Department VARCHAR(50) NOT NULL,  -- Pathology | Radiology
  Category VARCHAR(100),
  BasePrice DECIMAL(10,2) NOT NULL,
  TAT_Hours INT NOT NULL DEFAULT 24,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

2) Parameters
(
  ParameterId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  TestId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Tests(TestId),
  ParameterCode VARCHAR(50) NOT NULL,
  ParameterName VARCHAR(200) NOT NULL,
  Unit VARCHAR(50),
  DataType VARCHAR(20) NOT NULL DEFAULT 'Numeric',
  SortOrder INT NOT NULL DEFAULT 1,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_Parameters_TestCode UNIQUE (TestId, ParameterCode)
)

3) ReferenceRanges
(
  RangeId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  ParameterId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Parameters(ParameterId),
  AgeGroup VARCHAR(50) NOT NULL DEFAULT 'ALL',
  AgeMin INT NULL,
  AgeMax INT NULL,
  Sex VARCHAR(10) NOT NULL DEFAULT 'ALL',
  RefLow DECIMAL(18,4) NULL,
  RefHigh DECIMAL(18,4) NULL,
  CriticalLow DECIMAL(18,4) NULL,
  CriticalHigh DECIMAL(18,4) NULL,
  TextRange NVARCHAR(200) NULL,
  EffectiveFrom DATE NOT NULL,
  EffectiveTo DATE NULL,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

4) PriceConfig
(
  PriceId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  TestId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Tests(TestId),
  DiscountPercent DECIMAL(5,2) NULL DEFAULT 0,
  ReferrerRatePercent DECIMAL(5,2) NULL DEFAULT 100,
  EffectiveFrom DATE NOT NULL,
  EffectiveTo DATE NULL,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

5) DeptScopePolicies (for future RBAC)
(
  PolicyId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  RoleId INT NOT NULL,
  Dept VARCHAR(50) NOT NULL,
  CanSearchAll BIT NOT NULL DEFAULT 0,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

6) AuditLog (required)
(
  AuditId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  ActorUserId UNIQUEIDENTIFIER NULL,
  Action VARCHAR(100) NOT NULL,
  ResourceType VARCHAR(50) NOT NULL,
  ResourceId UNIQUEIDENTIFIER NULL,
  Payload NVARCHAR(MAX) NULL,
  CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
)

------------------------------------------------------------
STRICT CSV TEMPLATE (MANDATORY FORMAT)
------------------------------------------------------------
SynOS must generate and provide this exact template:

CSV HEADERS (IN EXACT ORDER — NO VARIATION ALLOWED)

TestCode,
TestName,
Department,
Category,
BasePrice,
ParameterCode,
ParameterName,
Unit,
DataType,
SortOrder,
RefLow,
RefHigh,
CriticalLow,
CriticalHigh,
AgeGroup,
AgeMin,
AgeMax,
Sex,
TextRange,
EffectiveFrom

CSV Template Example Row:

CBC,Complete Blood Count,Pathology,Hematology,300,WBC,White Blood Cell Count,10^3/uL,Numeric,1,4.5,11.0,2.0,30.0,ADULT,, ,ALL,,2025-01-01

RULES:
- SynOS must validate column headers EXACTLY.
- If headers mismatch → reject import with error: ERR_INVALID_TEMPLATE_HEADERS
- AgeMin/AgeMax required only for AgeGroup=CUSTOM
- Either numeric range (RefLow/RefHigh) OR TextRange required.

------------------------------------------------------------
CSV ENDPOINTS
------------------------------------------------------------

1) DOWNLOAD TEMPLATE  
GET /api/v1/admin/tests/template-csv  
Return CSV with only headers + optional sample row.

2) IMPORT CSV  
POST /api/v1/admin/tests/import-csv (multipart/form-data)

Behavior:
- Validate headers EXACTLY
- Validate every row
- If ANY row invalid → DO NOT COMMIT ANYTHING (transaction rollback)
- If all rows valid → Upsert Tests, Parameters, Ranges
- Respond:
  { successCount, errorCount, errors[] }

3) EXPORT CSV  
GET /api/v1/admin/tests/export-csv  
Return all test master data in exact template format.

------------------------------------------------------------
TEST MASTER ENDPOINTS
------------------------------------------------------------

POST /api/v1/admin/tests  
GET /api/v1/admin/tests  
GET /api/v1/admin/tests/{id}  
PUT /api/v1/admin/tests/{id}  
DELETE /api/v1/admin/tests/{id}  (soft delete)

PARAMETERS:
POST /api/v1/admin/tests/{testId}/parameters  
GET /api/v1/admin/tests/{testId}/parameters  
PUT /api/v1/admin/tests/{testId}/parameters/{paramId}  
DELETE /api/v1/admin/tests/{testId}/parameters/{paramId}

REFERENCE RANGES:
POST /api/v1/admin/tests/{testId}/parameters/{paramId}/ranges  
GET  /api/v1/admin/tests/{testId}/parameters/{paramId}/ranges  
PUT  /api/v1/admin/tests/{testId}/parameters/{paramId}/ranges/{rangeId}  
DELETE ...

PRICE CONFIG:
GET  /api/v1/admin/tests/{testId}/price-config  
POST /api/v1/admin/tests/{testId}/price-config

------------------------------------------------------------
USER MANAGEMENT ENDPOINTS (BACKEND ONLY)
------------------------------------------------------------

POST /api/v1/admin/users  
GET /api/v1/admin/users  
PUT /api/v1/admin/users/{id}  
POST /api/v1/admin/users/{id}/reset-password  
DELETE /api/v1/admin/users/{id}

------------------------------------------------------------
VALIDATION RULES (CRITICAL)
------------------------------------------------------------
- TestCode required, <=50 chars, unique
- BasePrice > 0
- ParameterCode required, unique per test
- ReferenceRange: refLow < refHigh unless TextRange used
- CriticalLow < refLow < refHigh < CriticalHigh
- CSV must have EXACT headers
- AgeGroup VALID: ALL, PEDIATRIC, ADULT, GERIATRIC, CUSTOM
- CUSTOM requires AgeMin and AgeMax
- All endpoints must write AuditLog entries

------------------------------------------------------------
ACCEPTANCE CRITERIA
------------------------------------------------------------
✔ Create test → persists in DB  
✔ Add parameter → linked correctly  
✔ Add reference range → valid and searchable  
✔ CSV import works (transactional, strict header check)  
✔ CSV export matches template exactly  
✔ Template CSV downloads correctly  
✔ User management works  
✔ All changes logged in AuditLog  
✔ Error codes consistent and predictable  

------------------------------------------------------------
OUTPUT REQUIRED FROM MODEL
------------------------------------------------------------
- Migrations for all tables
- Controllers + Services for all endpoints
- Input/output DTOs
- Validation logic
- CSV import parser + strict header validation + transactional upsert
- CSV template generation
- CSV export generator
- Audit logging integration
- Error codes and exception handling
- Sample requests/responses
- Postman collection snippets

AVOID FRONTEND CODE COMPLETELY.
