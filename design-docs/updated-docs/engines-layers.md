# 📘 PRD — SynOS Truth Engines & Intelligence Layers

## Document Purpose

This document defines the **canonical engines and read layers** used in SynOS for inventory, cost, spend, revenue, and analytics.

The goal is to ensure:

* Absolute separation between **truth recording** and **business interpretation**
* Immutable historical data
* Recomputable economics and profit without rewriting history
* Zero ambiguity for humans or LLMs reading or extending the system

This document is **authoritative**.
Anything not explicitly allowed here is **forbidden**.

---

## Core Architectural Principle

> **Truth is written once.
> Meaning is derived later.
> History is never corrected.**

---

## System Classification

SynOS is composed of:

* **4 Truth Engines** → write-only, immutable
* **2 Intelligence Layers** → read-only, opinionated, recomputable

Only engines are allowed to **persist facts**.
Layers are allowed to **calculate, aggregate, simulate, and forecast**, but never write back.

---

# 🧱 TRUTH ENGINES (WRITE-ONLY)

Truth engines represent **objective reality**.
They do not calculate totals, profits, or health metrics.

---

## 1️⃣ Inventory Engine

**Type:** Physical Truth Engine

### Purpose

To record **what physical items exist** and **how they move** within the system.

### Responsibilities

* Maintain consumable master data
* Track lots / batches
* Track expiry
* Record stock movement events (in, out, wastage, adjustment)

### Explicitly Does NOT

* Know test prices
* Know test costs
* Know salaries or expenses
* Know revenue
* Perform calculations beyond unit-level facts

### Guarantees

* Every stock movement is recorded as an immutable event
* Physical inventory history is reconstructable at any point in time

---

## 2️⃣ Cost Attribution Engine

**Type:** Resource Usage Truth Engine

### Purpose

To record **what resources were consumed** when operational events (e.g. tests) occurred.

### Responsibilities

* Record resource consumption per operational event
* Link consumption to:

  * Test / procedure
  * Item
  * Lot
  * Quantity used
* Optionally snapshot unit cost **at the moment of consumption**

### Explicitly Does NOT

* Calculate total test cost
* Aggregate multiple consumptions
* Decide whether a test is profitable
* Allocate overheads
* Apply assumptions

### Key Rule

> This engine records **ingredients**, not the final cost.

Any attempt to calculate “₹X per test” inside this engine is a **design violation**.

---

## 3️⃣ Spend Engine

**Type:** Financial Outflow Truth Engine

### Purpose

To record **where money left the business**.

### Responsibilities

* Record all outflows:

  * Salaries
  * Rent
  * Utilities
  * Reagent purchases (money side)
  * Subscriptions
  * Maintenance
  * Doctor commissions / referral payouts

### Explicitly Does NOT

* Attribute expenses to specific tests
* Decide profitability
* Perform allocations
* Infer cost per test

### Guarantees

* All monetary outflows are recorded independently of revenue and inventory
* Expense history is immutable and auditable

---

## 4️⃣ Revenue Engine

**Type:** Financial Inflow Truth Engine

### Purpose

To record **how money entered the business** due to lab work.

### Responsibilities

* Record billing events
* Record payment receipts
* Record discounts
* Record write-offs
* Record refunds
* Record referral deductions (if treated as revenue reduction)

### Explicitly Does NOT

* Calculate profit
* Perform analytics
* Decide financial health
* Infer margins

### Key Distinction

* **Billing ≠ Revenue**
* **Revenue ≠ Cash**
* **Cash ≠ Profit**

This engine records **what was charged and what was actually received or expected**.

---

# 🧠 INTELLIGENCE LAYERS (READ-ONLY)

Intelligence layers **interpret truth engines**.
They never write data back.

---

## 5️⃣ Economics Intelligence Layer

**Type:** Unit Economics / Cost Intelligence

### Purpose

To answer **“What does this work approximately cost?”**

### Reads From

* Cost Attribution Engine
* Spend Engine
* (Optionally) Revenue Engine

### Responsibilities

* Aggregate resource usage
* Apply allocation rules (e.g. salary spread, rent allocation)
* Generate:

  * Estimated cost per test
  * Cost ranges
  * Cost sensitivity by volume
  * Cost breakdowns by component

### Key Characteristics

* Entirely assumption-driven
* Fully recomputable
* Multiple models can coexist
* No single “correct” answer

### Explicitly Does NOT

* Write data
* Modify engine facts
* Claim absolute truth

---

## 6️⃣ Business Intelligence Layer

**Type:** Management & Decision Intelligence

### Purpose

To answer **“Is the business healthy?”**

### Reads From

* Revenue Engine
* Spend Engine
* Economics Intelligence outputs

### Responsibilities

* Compute profit / loss
* Track margins
* Analyze cash flow
* Forecast outcomes
* Simulate “what-if” scenarios
* Support owner-level decision making

### Key Characteristics

* Profit exists **only here**
* Results are time-bound and assumption-bound
* Numbers are expected to change as assumptions change

### Explicitly Does NOT

* Write facts
* Correct history
* Override truth engines

---

# 🔒 NON-NEGOTIABLE RULES

1. **No engine may calculate profit**
2. **No engine may aggregate costs**
3. **No engine may allocate overhead**
4. **No intelligence layer may write facts**
5. **History must never be rewritten**
6. **Assumptions must never pollute truth**

Violation of these rules **invalidates the architecture**.

---

# 🧠 Mental Model (for Humans & LLMs)

* Engines = **What happened**
* Intelligence = **What it means**
* Profit = **A conclusion, not a fact**
* Forecast = **A simulation, not reality**

---

## Final Canonical Summary

| Component               | Role                 |
| ----------------------- | -------------------- |
| Inventory Engine        | Physical truth       |
| Cost Attribution Engine | Resource usage truth |
| Spend Engine            | Money out truth      |
| Revenue Engine          | Money in truth       |
| Economics Intelligence  | Cost interpretation  |
| Business Intelligence   | Profit & decisions   |

---

**End of PRD**

---

# 📄 Spend Engine — Product Requirements Document (PRD)

## System: **SynOS**

## Component: **Spend Engine**

## Type: **Truth Engine (Write-Only Financial Ledger)**

---

## 1. Purpose

The Spend Engine is the **single source of truth for all money that leaves the system**.

It records **only completed outflows**, exactly as they occurred in the real world.

It exists to:

* prevent parallel financial pipes
* centralize cash outflow truth
* allow HR, Accounting, Procurement, Analytics to build **on top**, not sideways

This engine is **not** responsible for:

* approvals
* scheduling
* payroll logic
* accounting rules
* profitability
* forecasting

Those belong to **other layers**.

---

## 2. Core Principles (Non-Negotiable)

### 2.1 Truth-Only

A spend record exists **only if money has already left** the system.

No future spends.
No planned spends.
No assumptions.

---

### 2.2 Write-Only & Immutable

* Spend records cannot be edited or deleted
* Corrections happen via **new entries**
* Historical truth is preserved forever

---

### 2.3 Centralized Outflow

**All money outflows must pass through the Spend Engine.**

No other module (HR, Accounting, Procurement, Admin) is allowed to:

* record payments
* log expenses
* mark money as “paid”

They may **trigger** spends, never own them.

---

### 2.4 Zero Intelligence

The Spend Engine:

* does not explain revenue
* does not calculate margins
* does not allocate costs
* does not infer meaning

It records facts.
**Readers derive meaning later.**

---

## 3. What the Spend Engine Records

Each spend record answers one question:

> “Money left the system. What do we know for sure about that event?”

### Mandatory concepts (schema-agnostic)

* Amount
* Date
* FromAccount (source of money)
* ToChannel (destination category)
* Payee (entity receiving money)
* RecordedBy (human actor)
* RecordedAt (timestamp)

---

### Optional references (stored, never interpreted)

* employeeId
* supplierId
* invoiceId
* obligationId
* payrollRunId
* inventoryReferenceId

These exist **only for linkage**, not logic.

---

## 4. Accounts (Sources of Money)

Accounts represent **where money came from**, not bank integrations.

They are **labels**, not live connections.

### Initial system accounts

* Cash
* Bank

(Admin may later add named bank accounts, still as labels.)

The engine does **not** enforce balances at this stage.

---

## 5. Channels (Destinations of Money)

### 5.1 Channel Philosophy

Channels are:

* **system-owned**
* **immutable**
* **finite**
* **destination-based**

They represent **irreducible financial endpoints**, not business intent.

Admins:

* ❌ cannot create channels
* ❌ cannot rename channels
* ❌ cannot delete channels

Admins **only create pipes under these channels**.

---

### 5.2 Final Locked Channel Set

These channels are sufficient to model **all financial outflows of a diagnostics lab**, now and in the future.

### ✅ SYSTEM CHANNELS (LOCKED)

1. **Salary Payable**
   → All employees, contractors, staff

2. **Supplier Payable**
   → Reagents, consumables, equipment, AMC, services, marketing vendors

3. **Rent & Lease**
   → Building rent, equipment lease, long-term infra leases

4. **Utilities**
   → Electricity, water, internet, phone, cloud infrastructure

5. **Referral / Commission Payable**
   → Doctors, agents, partners, referral programs

6. **Taxes & Statutory Payable**
   → GST, TDS, professional tax, regulatory dues

7. **Owner Draw / Capital Outflow**
   → Owner withdrawals, partner drawings, capital return
   *(Not an expense; structurally distinct)*

8. **Misc Expense**
   → One-off, uncategorized spends
   → **Approval-gated**
   → Never a bypass

---

### 5.3 Channel Rule (Critical)

> **If a spend does not clearly fit any channel, it MUST go through `Misc Expense`.**

No silent exceptions.
No hidden pipes.

---

## 6. Admin Configurability (What Is Allowed)

Admins **do not control structure**, only instances.

### Admin MAY configure:

* Payees (employees, suppliers, vendors, doctors)
* Accounts (cash, named banks)
* Descriptions / reasons
* Tags / labels (e.g., Marketing, IT, Branding)
* Attach references (invoice numbers, notes)
* Trigger spend entries (subject to policy)

---

### Admin MAY NOT:

* Create new channels
* Change channel meanings
* Bypass Spend Engine
* Edit historical spends

---

## 7. Relationship to Other Engines

### 7.1 Revenue Engine

* Revenue Engine records **money entering**
* Spend Engine records **money leaving**
* No direct linkage
* Both reference accounts
* Correlation happens only in read layers (time-based)

---

### 7.2 Inventory Engine

* Inventory tracks physical movement
* Spend tracks cash movement
* Payment may occur days/weeks later
* Optional linking allowed, never enforced

---

### 7.3 Cost Attribution Engine

* Cost attribution tracks consumption
* Spend tracks payment
* No assumption of alignment

---

## 8. Obligation Layer (Adjacent, Future)

The Spend Engine is **obligation-aware but obligation-agnostic**.

* Obligation Layer answers: *“What do we owe?”*
* Spend Engine answers: *“What did we pay?”*

Spend may reference an obligation.
Obligations never move money.

---

## 9. Roles & Workflows (Explicitly Deferred)

The Spend Engine:

* assumes a human actor
* does not encode roles
* does not encode approvals
* does not encode scheduling

Roles, approvals, and workflows belong to **policy layers**, not truth engines.

---

## 10. What This Engine Will NEVER Do

❌ No approvals
❌ No scheduling
❌ No alerts
❌ No payroll math
❌ No accounting rules
❌ No GST calculations
❌ No P&L
❌ No dashboards

All of the above live **above** this engine.

---

## 11. Success Criteria

The Spend Engine is correct if:

* Every rupee leaving the system is recorded once
* No module invents its own expense records
* Historical spend data is immutable
* HR, Accounting, Analytics can be built later **without refactoring**

---

## 12. One-Line Definition (Lock This)

> **The Spend Engine is the kernel-level ledger of cash outflow —
> dumb, disciplined, immutable, and absolutely trusted.**

---
