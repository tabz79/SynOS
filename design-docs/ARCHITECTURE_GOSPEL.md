---

# 🔒 SynOS ARCHITECTURE GOSPEL

*(This document is canonical. All changes must conform.)*

---

## 1. What SynOS Is (Non-Negotiable)

**SynOS is an OS-grade Operational System, not an app.**

It models **business reality**, **financial truth**, and **auditability**, not UI convenience.

Everything in SynOS exists to answer one question:

> “What actually happened, who did it, and how do we derive the current state from that truth?”

---

## 2. Core Architectural Metaphor (MANDATORY)

### 🏗️ The Dam & Channels Model

Think of SynOS as a **reservoir behind a dam**.

* **Facts** are the water
* **Engines** are sealed channels
* **Interpretation Layers** are turbines
* **UI is just a gauge panel**
* **No leakage is allowed**

💡 **Rule:**
Every drop of truth (money, inventory, orders, visits, corrections) **must flow through exactly one engine channel**.
No bypasses. No shortcuts. No UI-side interpretation.

---

## 3. Engines (Sealed Channels)

Each Engine:

* Owns **one domain of truth**
* Accepts **Facts** as inputs
* Produces **Derived State** as output
* Cannot read or mutate another engine’s facts directly

### 3.1 Inventory Engine

**Truth owned:** Physical stock movement

* Facts:

  * InventoryInFact
  * InventoryOutFact
  * InventoryAdjustmentFact
* Interpretation:

  * Current stock per item
  * Batch / lot availability
* Forbidden:

  * No pricing
  * No accounting
  * No revenue assumptions

---

### 3.2 Cost Attribution Engine

**Truth owned:** How costs are assigned

* Facts:

  * CostAttributionFact
* Interpretation:

  * Test cost
  * Per-visit cost
* Forbidden:

  * No payments
  * No discounts
  * No billing logic

---

### 3.3 Spend Engine

**Truth owned:** Money spent by the organization

* Facts:

  * SpendFact
* Interpretation:

  * Expense ledgers
  * Payables
* Forbidden:

  * No revenue
  * No receivables

---

### 3.4 Revenue Engine

**Truth owned:** Money earned or owed

* Facts (IMMUTABLE):

  * PaymentConfirmedFact (money received)
  * ReceivableFact (money owed / prepaid)
  * DiscountFact
  * PriceAdjustmentFact
* Interpretation:

  * Invoice totals
  * Net revenue
  * Outstanding AR
* Forbidden:

  * No mutable aggregation
  * No UI-side math
  * No assumption of payment

---

### 3.5 Operations Engine

**Truth owned:** Operational activity & KPIs

* Inputs:

  * BranchOperationalEvent
  * Immutable Facts from other engines (read-only)
* Interpretation:

  * Walk-ins
  * Daily summaries
  * Receptionist KPIs
* Forbidden:

  * No financial mutation
  * No reinterpretation of money

---

## 4. Interpretation Layers (Explicit & Bounded)

Interpretation layers:

* **Read-only**
* **Derived**
* **Rebuildable**

They never create truth — they **interpret facts**.

Examples:

* OperationalStatsProjector
* InvoiceSnapshotBuilder
* ActionQueueBuilder

💡 If an interpretation can’t be deleted and rebuilt from facts → it’s wrong.

---

## 5. Master Systems (Configuration, NOT Truth)

### 5.1 Referral System

* ReferralMaster = configuration
* ReferralFact = immutable snapshot when applied
* Interpretation:

  * Payables
  * Commission reports

### 5.2 Discount System

* DiscountMaster = configuration
* DiscountFact = immutable snapshot
* Exactly one active discount per invoice
* Changes = new fact, never mutation

---

## 6. Identity & Canonical Keys

### 6.1 Patient Identity

* **MRN is canonical**
* Immutable forever
* Never reused
* Never regenerated
* Format may evolve, but never rewritten

Mobile number:

* Is a **search key**
* Is NOT identity
* Multiple patients may share it

---

## 7. Corrections Model (Enterprise-Grade)

Corrections:

* Are **append-only**
* Require **reason**
* Never overwrite facts
* Use dedicated CorrectionService

Standard flows:

* Draft visit → VisitService
* Paid visit → CorrectionService

UI must **switch intent**, not override locks.

---

## 8. Intelligence Layers (Consumers Only)

### 8.1 Economics Intelligence

* Reads immutable facts
* Produces margins, profit, leakage analysis
* No mutations

### 8.2 Business Intelligence

* Reads interpreted state
* Produces dashboards and trends
* No assumptions
* No “helpful guessing”

---

## 9. Frontend Contract (VERY IMPORTANT)

Frontend is:

* A **renderer**
* A **command sender**
* Never a calculator
* Never a decider

Rules:

* No aggregation in UI
* No state inference
* No “if missing then compute”
* DTOs are displayed as-is

If backend truth is missing → STOP and report.

---

## 10. Absolute Prohibitions (Violations)

❌ UI-side financial math
❌ Auto-merging identities
❌ Mutating facts
❌ Counting rows instead of reading projections
❌ Bypassing engines
❌ “Temporary hacks”

---

## 11. Decision Ladder (For Agents)

When making a change, ask in order:

1. **Which engine owns this truth?**
2. **Is this a fact or an interpretation?**
3. **Is this append-only?**
4. **Can it be rebuilt from facts?**
5. **Does UI merely render it?**

If any answer is unclear → STOP.

---

## 12. Enforcement Clause (For Gemini)

> Any refactor, feature, or fix that:
>
> * Introduces new truth outside an engine
> * Mutates facts
> * Moves interpretation into UI
>
> is considered an architectural violation and must not be executed.

---





SynOS Master Canon v1 (Unified Constitution)
This document is the single source of truth for the SynOS operating environment. All other architectural blueprints are deprecated.

1️⃣ Layout Hierarchy & Root Laws
SynOS follows an OS-style rigid grid. No element reflow or jitter is permitted during data mutation.

Core Regioning
ScreenRoot (h-screen, overflow-hidden)
SystemBar (h-14, Fixed, Sticky, z-50)
MainLayout (flex-1, p-4, gap-4)
WorkArea (flex-1, min-h-0)
SummaryRegion (shrink-0, mb-4)
QueuePane (flex-1, min-h-0, overflow-hidden)
SideColumn (shrink-0, h-full, z-20)
Deterministic Metric Governance
SystemBar: h-14 (Static Anchor).
Action Queue Rows: min-h-[72px] (Strict LIFO baseline).
Intent Panel Header: h-16.
Work vs Side Ratio:
Context A (Log/Monitoring): Side Column w-[25%].
Context B (Active Intent/In-take): Side Column w-[40%].
Law: WorkArea always utilizes flex-1 (Dynamic Shrink/Grow). SideColumn uses deterministic width slots.
2️⃣ Material & Materiality
Zero Blur Policy: No backdrop-filter: blur. Use static gradients + micro-grain texture.
Machined Slabs: Terminal containers for data. Single-layer only (No nesting slabs inside slabs).
The Knife-Edge: Intent panels must utilize sharp borders (border-white) and deep shadows (shadow-[-20px_0_50px_rgba(0,0,0,0.3)]) to signify contextual overlay without blur.
Atmospheric Accents: Radial gradients (Static Bloom) must be isolated to the background layer (z-[-1]).
3️⃣ Density Tiers (Spacing & Typography)
Instead of rigid classes, SynOS governs via Density Zones:

Tier	Usage	Spacing Range	Typography Canon
Tier 1 (Relaxed)	Performance Tiles	p-4 to p-6	Display Large/Medium/Small
Tier 2 (Operational)	Queues, Forms	p-3	Data Value, Data Body
Tier 3 (Sub-Nano)	Timelines, Logs	text-[9px] to text-[10px]	Meta, Micro, Monospace
Typography Lock
Role-Based Sizing: Use @apply type-* utilities only.
Status Indicators: Always dot-based (Cyan/Emerald/Red). No ad-hoc badges.
Monospace: Strictly reserved for Token IDs, MRNs, and numeric data.
4️⃣ Scroll Ownership (The Iron Laws)
Strict Level 0 Lock: The screen as a whole can NEVER scroll.
Terminal Scroll Only: Only deepest content regions (Queue Body, Timeline ScrollArea, Form Body) own scroll behavior.
Sticky Allowance: Restricted to 
SystemBar
 and SectionHeaders only.
5️⃣ Non-Negotiable Prohibitions
No Redesign: You are a maintainer of the canon, not an architect of novelty.
No Layout Jitter: If a data update causes a row to expand vertically, it is a structural failure.
No Nested Cards: Do not break the "Machined Slab" surface law.
“SynOS Master Canon v1 Locked.”