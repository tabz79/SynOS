claude: Here's the full agent prompt:

---

**AGENT PROMPT — SynOS IMS: Opening Stock Onboarding Module (All 5 Methods)**

---

You are building the Opening Stock Onboarding module for SynOS IMS. This is a one-time (but reusable) flow that allows a lab to enter their existing inventory into the system cleanly before going live. It must support 5 input methods. Build them in sequence. Do not proceed to the next method until the current one is working end to end.

---

**BEFORE YOU START — Schema Changes Required**

These changes apply globally and must be done first before any method is built.

**1. Add `Barcode` field to `ImsConsumable`**
- Nullable string, max 100 chars
- Must be unique where not null
- Migration required

**2. Add `OpeningBalance` to `StockMovementType` enum**
- This is distinct from `Inbound` (GRN) — opening stock is what existed before the system, GRN is what arrives after go-live
- Every lot created through this onboarding module must log movement as `OpeningBalance`

**3. Create `ImsBarcodeMap` entity**
- Fields: `Id`, `Barcode` (string, unique), `ConsumableId` (FK to `ImsConsumables`), `CreatedAt`, `CreatedBy`
- This is the lab's own learned barcode library
- Migration required

Run migrations before proceeding.

---

**METHOD 1 — Manual Row-by-Row Entry**

Single item entry form. For labs adding a few items or filling gaps after bulk import.

Endpoint: `POST /api/v1/inventory/opening-stock/single`

Request body:
```json
{
  "consumableId": int,
  "branchId": int,
  "quantity": decimal,
  "batchNumber": "string (optional)",
  "expiryDate": "datetime (optional)",
  "notes": "string (optional)"
}
```

Logic:
- Create `ImsInventoryLot` with `IsActive = true`, `RemainingQuantity = quantity`
- Log `ImsStockMovement` with `MovementType = OpeningBalance`
- `CreatedBy` from JWT

Frontend:
- Simple form inside the Opening Stock screen
- Fields: Item (searchable dropdown from consumables), Branch, Quantity, Batch Number (optional), Expiry Date (optional), Notes (optional)
- On success: show confirmation, reset form, keep screen open for next entry
- Running list below the form showing what's been entered this session

Test: Enter one item manually. Confirm lot created, movement logged as OpeningBalance.

---

**METHOD 2 — Spreadsheet-Style Inline Table**

A grid on screen that behaves like a mini Excel. User types directly into rows. Good for 10-50 items without needing any file.

Frontend only — submits to the same `POST /api/v1/inventory/opening-stock/bulk` endpoint defined in Method 3 below. Build the endpoint in Method 3, build this UI now.

Frontend:
- A table with editable cells
- Columns: Item (searchable dropdown), Branch, Quantity, Batch Number, Expiry Date
- "Add Row" button adds a new empty row at the bottom
- Delete button on each row
- Tab key moves to next cell
- Paste from clipboard into a cell should fill that cell
- "Submit All" button at bottom — validates all rows (quantity must be positive, item must be selected, branch must be selected) then sends to bulk endpoint
- Show per-row validation errors inline (red highlight on invalid cell)
- On success: clear table, show summary "X items entered successfully"

Test: Enter 5 rows manually in the grid, submit. Confirm 5 lots created, 5 OpeningBalance movements logged.

---

**METHOD 3 — Copy-Paste from Excel**

User copies rows from their existing Excel sheet, pastes into a text area. System parses it, shows a preview table, user confirms.

Endpoint: `POST /api/v1/inventory/opening-stock/bulk`

Request body:
```json
{
  "entries": [
    {
      "consumableId": int,
      "branchId": int,
      "quantity": decimal,
      "batchNumber": "string (optional)",
      "expiryDate": "string (optional)"
    }
  ]
}
```

Logic:
- Loop through entries
- For each: create `ImsInventoryLot`, log `OpeningBalance` movement
- If any entry fails validation, skip it and include it in the error list in the response
- Return: `{ succeeded: int, failed: int, errors: [{ row: int, reason: string }] }`

Frontend:
- A large text area with placeholder: "Paste your Excel rows here"
- When user pastes, parse tab-separated or comma-separated values automatically
- Show a column mapping step: display detected columns, let user assign each column to a field using dropdowns (Item Name, Quantity, Batch, Expiry, Branch) — "We detected 4 columns. Tell us what each one is."
- After mapping, show a preview table with the parsed data
- Highlight rows with issues in yellow (e.g. item name not found in system, quantity missing)
- "Confirm and Submit" button sends mapped, validated data to bulk endpoint
- Show result summary after submission

Test: Copy 10 rows from a real or mock Excel sheet, paste, map columns, submit. Confirm lots and movements created correctly.

---

**METHOD 4 — CSV / Excel File Upload with Smart Column Mapping**

User uploads any CSV or Excel file. System reads it, shows column mapping UI, user confirms mapping, system imports.

Endpoint: `POST /api/v1/inventory/opening-stock/upload`
- Accepts multipart form data
- Supported formats: `.csv`, `.xlsx`, `.xls`
- Use `EPPlus` for Excel parsing (already likely in project, check before adding)
- For CSV use standard .NET `CsvHelper` or manual split

Logic:
- Parse file, extract rows and headers
- Return detected headers and first 5 rows as preview to frontend
- Frontend shows mapping UI
- User submits mapping config + file reference
- Backend applies mapping, creates lots and movements
- Same bulk insert logic as Method 3
- Same response format: `{ succeeded, failed, errors }`

Frontend:
- Drag and drop upload area (also supports click to browse)
- Accepted formats shown: .csv, .xlsx, .xls
- After upload, show column mapping screen — same as Method 3 mapping step
- Preview of first 5 rows under the mapping
- "Import" button triggers final submission
- Progress indicator for large files
- Result summary after completion

Test: Upload a CSV with 20 items, map columns, import. Confirm all lots created.

---

**METHOD 5 — Barcode Scanner**

USB barcode scanner inputs act as keyboard events — scanner reads a barcode and types the number into whatever input is focused. Build around this behavior.

**Part A — Barcode Lookup Endpoint**

`GET /api/v1/inventory/barcode/{code}`

Logic:
- Check `ImsBarcodeMap` for this barcode
- If found: return mapped consumable details `{ consumableId, consumableName, unit }`
- If not found: return 404 with `{ known: false, barcode: code }`

**Part B — Register New Barcode Mapping**

`POST /api/v1/inventory/barcode/map`

Request body:
```json
{
  "barcode": "string",
  "consumableId": int
}
```

Logic:
- Check barcode not already mapped
- Create `ImsBarcodeMap` record
- Return created mapping

**Part C — Frontend Scanner Flow**

- Dedicated "Scan Items" tab within the Opening Stock screen
- A barcode input field that is auto-focused when this tab is active
- When scanner fires (input receives value + Enter), immediately call barcode lookup
- **If known barcode**: auto-fill item name, show quantity input, user enters quantity, hits Enter or clicks Add — row added to session list
- **If unknown barcode**: show inline prompt "We don't recognise this barcode. What item is it?" — searchable dropdown of all consumables — user selects, system saves mapping via `POST /api/v1/inventory/barcode/map`, then continues to quantity entry as normal
- Running session list below showing all scanned items this session: Item, Quantity, Batch (optional), Expiry (optional)
- "Commit All" button at bottom — submits entire session to bulk endpoint
- Branch selector at top of screen (applies to all items in session)

Test:
- Scan a barcode that isn't mapped. Go through the mapping flow. Confirm `ImsBarcodeMap` record created.
- Scan the same barcode again. Confirm it auto-identifies without prompting.
- Add quantity. Commit. Confirm lot and OpeningBalance movement created.

---

**NAVIGATION / SCREEN STRUCTURE**

All 5 methods live under one screen: "Initialize Inventory" accessible from the Inventory Terminal sidebar. Role-restricted to `Admin` and `InventoryManager` only.

The screen has a method selector at the top — tabs or a prominent toggle:
- Manual Entry
- Quick Grid (inline table)
- Paste from Excel
- Upload File
- Scan Barcodes

Each method is a self-contained panel below the selector. Switching methods does not clear in-progress data without a confirmation prompt.

---

**AFTER ALL 5 METHODS ARE BUILT:**

Report back with:
- Confirmation each method works end to end
- Any schema deviations
- Any edge cases handled differently than specified
- Current state of the Opening Stock screen UI

Frontend polish and edge case hardening happens after all 5 are confirmed working.

---

That's the full prompt. Feed it as-is. The schema changes at the top are non-negotiable — agent must do those first before touching any method. When it's done, come back and we verify each one before moving anywhere else.

gpt5: Good. This is the first time you’re thinking like someone shipping a **product that survives real onboarding**, not just features.

I read your full spec .
Now I’m not going to argue with scope.

👉 You want **all 5 methods**
👉 You want **fast + stable**
👉 You’re using an agent

So my job = **execution control + risk containment**

---

# 🧠 Reality first (important)

This is NOT one feature.

This is:

👉 **5 different input systems + schema changes + audit integrity**

If you let the agent “just build everything”:

👉 You will get:

* broken flows
* partial features
* silent data corruption

---

# 🔥 So here’s how we execute this PROPERLY

We don’t reduce scope.

👉 We **control sequencing + guardrails**

---

# 🚀 EXECUTION STRATEGY (this is your steering system)

## 🔒 RULE 1 — HARD LOCK

Agent must NOT jump ahead.

👉 One method = fully working → verified → THEN next

---

## 🔒 RULE 2 — SCHEMA FREEZE FIRST

Before ANY UI:

👉 All schema changes MUST be completed and verified

From your spec:

* Barcode in Consumable
* OpeningBalance enum
* BarcodeMap table

---

### ⚠️ You verify THIS before proceeding:

Ask agent:

> “Show migration diff + confirm DB updated”

---

# 🚀 PHASE BREAKDOWN (this is how you steer)

---

# 🥇 PHASE 0 — Schema (non-negotiable)

### Your instruction to agent (short version):

Execute ONLY schema changes.

Do NOT build any methods yet.

Tasks:

1. Add Barcode to ImsConsumable (nullable, unique)
2. Add OpeningBalance to MovementType
3. Create ImsBarcodeMap table

Run migrations and confirm:

* Tables updated
* Enum updated
* No runtime errors

Stop after this.

---

👉 You manually confirm DB is correct

---

# 🥇 PHASE 1 — METHOD 1 (Manual Entry)

Why first?

👉 It is the **simplest + baseline logic**

Everything else builds on this.

---

### You tell agent:

Proceed with Method 1 ONLY (Manual Entry).

Do NOT touch other methods.

Requirements:

* Endpoint: /opening-stock/single
* Create lot
* Log OpeningBalance movement

Frontend:

* Simple form
* Submit → creates entry
* Show success + reset form

Stop after this.

---

### You test:

* Add 1 item
* Check DB:

  * lot created
  * movement = OpeningBalance

---

👉 If this fails → EVERYTHING fails

---

# 🥈 PHASE 2 — METHOD 3 (Bulk API FIRST)

Skip Method 2 UI for now.

👉 Build **bulk API first**

Because:

👉 All other methods depend on it

---

### Instruction:

Build bulk endpoint ONLY:

POST /opening-stock/bulk

* Accept multiple entries
* Create lots
* Log OpeningBalance
* Return success + error summary

No UI yet.

---

Test with Postman:

* Send 5 items
* Verify DB

---

# 🥈 PHASE 3 — METHOD 2 (Grid UI)

Now connect UI to bulk API.

---

# 🥉 PHASE 4 — METHOD 3 (Paste)

Uses same bulk API.

---

# 🥉 PHASE 5 — METHOD 4 (Upload)

Uses same bulk API.

---

# 🥉 PHASE 6 — METHOD 5 (Barcode)

This is separate system → build last.

---

# 🔥 Why this order works

Because:

👉 You build **one solid pipeline**

Everything plugs into it.

---

# ⚠️ CRITICAL RISKS (you must watch)

---

## ⚠️ 1. Duplicate data

If user uploads twice:

👉 You will double inventory

---

👉 Add later (not now):

* soft warning
* or confirmation

---

## ⚠️ 2. Wrong item mapping

Excel / paste errors:

👉 Item not found

---

👉 Your spec already handles:

✔ error rows → good

---

## ⚠️ 3. Barcode mapping explosion

Bad mappings = permanent damage

---

👉 For now:

✔ allow mapping
❗ but don’t over-automate

---

## ⚠️ 4. Movement integrity

EVERY entry must log:

```text
OpeningBalance
```

👉 If even one misses → audit breaks

---

# 🧠 Brutal truth (you need to hear)

This module decides:

👉 Whether your system can be SOLD

Not:

* UI
* fancy features

---

# 🎯 Your role now (very important)

You are NOT coding.

You are:

👉 **System gatekeeper**

---

## Your job per phase:

* Don’t trust agent blindly
* Verify DB
* Verify movement logs
* Verify no silent failures

---

# 🎯 Immediate next step

Don’t dump full prompt.

Start controlled.

---

👉 Tell agent:

**“Start Phase 0 — Schema only”**

---

Then come back and say:

👉 “Schema done”

I’ll guide you through validation before you move forward.

---

We’re not slowing down.

We’re making sure you don’t build a system that collapses on day one.

---

Let’s do this properly.
