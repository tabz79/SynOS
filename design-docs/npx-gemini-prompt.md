## **Day 14.8 — Analyzer Test Code Mapping + Auto-Matching Foundations (Backend Only)**

**Title:**
Day 14.8 — Analyzer Test Mapping + Result Matching Prep (Backend Only)

**Context:**
You are continuing Analyzer / Lab Machine Integration for **SynOS** after Day 14.7.

What is already done (Day 14.7):

* Tables + APIs for LabAnalyzer and ResultInbox
* Manual ingestion of analyzer values into ResultInbox
* Status = `"Pending"`

What must happen now:

* Match incoming machine result to the correct **SynOS TestCode**
* Identify correct **Visit + Order** from patient/sample info
* Update inbox rows as `"Matched"` when auto-match succeeds

Still **no** ASTM/HL7 stream yet — that will be Day 14.9.

---

# 🎯 Goal of Day 14.8

Add:
1️⃣ Machine → SynOS Test Code Mapping
2️⃣ Auto-match logic for queued inbox results
3️⃣ APIs for:

* Creating mappings
* Triggering matching process
* Viewing match status

---

## **1) New Entity: LabAnalyzerTestMapping**

Add entity:

```csharp
public class LabAnalyzerTestMapping
{
    public Guid MappingId { get; set; }

    public Guid AnalyzerId { get; set; }
    public LabAnalyzer Analyzer { get; set; }

    public string AnalyzerTestCode { get; set; }  // e.g., "HGB", "WBC"
    public string SynosTestCode { get; set; }     // e.g., "HGB", "WBC" (from TestMaster)

    public string? UnitsOverride { get; set; }    // optional
    public decimal? RefLowOverride { get; set; }  // optional
    public decimal? RefHighOverride { get; set; } // optional

    public bool IsEnabled { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public Guid CreatedBy { get; set; }
}
```

➡️ Add `DbSet<LabAnalyzerTestMapping>`
➡️ Add EF config + indexes:

* `AnalyzerId`, `AnalyzerTestCode`, `SynosTestCode`, `IsEnabled`

Migration + apply.

---

## **2) Matching Logic (Service Layer)**

Update the service or create a new scoped service:

### `IAnalyzerResultMatcherService`

```csharp
public interface IAnalyzerResultMatcherService
{
    Task<LabAnalyzerResultInbox> AutoMatchAsync(Guid inboxId, Guid currentUserId);
    Task<int> AutoMatchAllPendingAsync(Guid analyzerId, Guid currentUserId);
}
```

### Matching Rules (simple v1 logic)

Given a ResultInbox row:

1️⃣ Use `AnalyzerTestCode`
→ lookup mapping in `LabAnalyzerTestMapping`
If not found → stay `"Pending"`

2️⃣ Use `PatientIdentifier`
Match to either:

* MRN → find recent **Paid** Visit
* Sample Barcode (if exists later)
  If not found → stay `"Pending"`

3️⃣ From Visit → find matching **Order** with same SynosTestCode
If found → assign:

```
SynosTestCode
VisitId
OrderId
Status = "Matched"
ReviewedBy = null
ReviewedAt = null
```

4️⃣ Save changes

---

## **3) Updated Inbox Status Values**

Introduce enum/string:

* `Pending` (Waiting for auto-match)
* `Matched` (Ready for review in future Day 14.10)
* `Rejected` (Manual decision later)
* `Imported` (After review)

Day 14.8 uses only: **Pending / Matched**

---

## **4) API Endpoints**

Controller:
`/api/v1/lab/analyzers/{analyzerId}/mappings`

Required endpoints (Admin-only):

| Action                | Method | Route                                                     |
| --------------------- | ------ | --------------------------------------------------------- |
| Add mapping           | POST   | `/api/v1/lab/analyzers/{analyzerId}/mappings`             |
| List mappings         | GET    | `/api/v1/lab/analyzers/{analyzerId}/mappings`             |
| Toggle/Update mapping | PUT    | `/api/v1/lab/analyzers/{analyzerId}/mappings/{mappingId}` |

DTOs:

```csharp
public class CreateAnalyzerTestMappingDto
{
    public string AnalyzerTestCode { get; set; }
    public string SynosTestCode { get; set; }
    public string? UnitsOverride { get; set; }
    public decimal? RefLowOverride { get; set; }
    public decimal? RefHighOverride { get; set; }
}
```

---

Controller:
`/api/v1/lab/analyzers/{analyzerId}/results`

Add matching endpoints:

1️⃣ Auto-match a specific inbox entry
→ `POST /{analyzerId}/results/{inboxId}/auto-match`

2️⃣ Auto-match all pending
→ `POST /{analyzerId}/results/auto-match-all`

Authorization:

* `[Authorize(Roles="Admin,LabTech,Pathologist")]`

Return updated row count or DTO.

---

## **5) Logging + Error Handling**

Log when:

* Mapping created/updated
* Match succeeded
* Match failure reason (missing mapping or visit)

Bad cases:

* Return 404 if analyzer/mapping/inbox not found
* Return 400 if mapping exists for same analyzer+testcode

---

## **6) Acceptance Criteria — Day 14.8 Done When**

✔ Entities + Migration applied
✔ Analyzer-Test Mapping CRUD working
✔ Auto-match logic implemented
✔ Manual test via Swagger:

### Test Scenario

1. Create Analyzer (from Day 14.7)
2. Create Patient → Start Visit → Complete Payment → Order CBC
3. Add mapping:

```
AnalyzerTestCode = "HGB"
SynosTestCode = "HGB"
```

4. Manual ingest:

```
PatientIdentifier = MRN (e.g. A00017)
AnalyzerTestCode = "HGB"
ResultValue = "13.4"
```

5. POST auto-match-all
   ➡ Expect `status = "Matched"`
   ➡ Verify VisitId + OrderId populated

Everything else (review UI, result import, HL7) *later*.

---

## TLDR for Gemini Output

* New table: LabAnalyzerTestMapping
* New service: Auto-match to Visit + Order
* New APIs: create mapping + auto-match endpoints
* Update ResultInbox status to “Matched” when mapped
* No UI yet, backend only

---