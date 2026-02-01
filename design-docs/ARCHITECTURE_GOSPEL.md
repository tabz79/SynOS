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



Perfect. This is the **right moment** to write this down, because once a system grows, motion debt becomes impossible to clean up.

Below is a **clear, enforceable, OS-grade canon** — not vibes, not guidelines, but *law*. This is the document that future contributors either follow or don’t ship.

---

# 🧭 SynOS Motion Canon

**Version:** 1.0
**Status:** Non-Negotiable
**Applies To:** All UI, Panels, Overlays, Queues, Tiles, Chrome

---

## 0. Core Philosophy (Read This First)

> **Motion is not decoration. Motion is physics.**

SynOS is an **operating system**, not a SaaS dashboard.
Therefore, motion must:

* Obey consistent physical laws
* Convey mass, hierarchy, and intent
* Never feel passive, dragged, or accidental

If something moves, it **must know why**.

---

## 1. Single Physics Engine Rule

> **The entire system runs on one motion engine.**

SynOS SHALL NOT mix:

* CSS layout transitions for structure
* JS transform animations for content
* Different curves/durations for similar interactions

### ✅ Allowed

* Transform-based animation (`translate`, `scale`, `opacity`)
* FLIP (First–Last–Invert–Play) as the primary mechanism

### ❌ Forbidden

* Animating `height`, `width`, `top`, `left`, `grid-gap`, `flex`
* `transition: all`
* Letting layout reflow be the animation

If layout changes → **motion must be simulated**, not reflowed.

---

## 2. Motion Constants (Global Lock)

These values are **system-wide**.

### ⏱ Duration

```
STANDARD_MOTION_DURATION = 260ms
```

Acceptable range (only if justified):

* 240–280ms

Anything slower feels floaty.
Anything faster feels twitchy.

---

### 📈 Easing Curve (Primary)

```
STANDARD_EASING = cubic-bezier(0.22, 1, 0.36, 1)
```

**Meaning:**

* Fast acceleration (confident intent)
* Strong deceleration (physical stop)
* “Apple-like snap”, OS-grade

### ❌ Disallowed Curves

* `ease`
* `ease-in-out`
* Any custom bezier not matching the above family

---

## 3. Motion Ownership Law

> **Only one layer owns motion at a time.**

The system is divided into **three motion layers**.

---

### 3.1 Primary Mass (Structural Objects)

**Examples:**

* Reality Summary block
* Action Queue container
* Cockpit / Right-side panels
* Major screen regions

**Rules:**

* MUST animate as **rigid bodies**
* MUST use FLIP when their position changes
* MUST move intentionally, never passively

❌ They must NOT be “pushed” by other elements’ CSS transitions
❌ They must NOT animate layout properties

✅ When one Primary Mass moves, adjacent Primary Masses MUST be included in the same FLIP pass

---

### 3.2 Secondary Mass (Contained Objects)

**Examples:**

* Tiles
* Rows
* Cards
* Lists

**Rules:**

* MAY FLIP relative to their container
* MUST inherit duration & easing from the system
* MUST NOT cause parent movement via layout transitions

Secondary Mass moves **inside** a moving shell, never independently against it.

---

### 3.3 Micro Interactions (Local Feedback)

**Examples:**

* Button press
* Hover states
* Focus rings
* Small icon nudges

**Rules:**

* Shorter duration allowed (120–180ms)
* Same easing family (accelerated snap)
* Must never conflict with Primary/Secondary motion

Micro motion never competes with structural motion.

---

## 4. FLIP as the Default Mechanism

### When to Use FLIP

FLIP MUST be used when:

* An element changes position due to layout change
* An element is added/removed from a group
* Space is reclaimed or redistributed

**This includes:**

* Summary expand/collapse
* Action Queue repositioning
* Panel entry/exit
* Tile grid morphing

---

### FLIP Contract

Every FLIP animation must follow:

1. **First** – Measure current bounding rect
2. **Last** – Apply new layout instantly (no transition)
3. **Invert** – Apply transform to negate delta
4. **Play** – Animate transform → identity

No exceptions.

---

## 5. Layout Change Rule (Critical)

> **Layout changes are instant. Motion is simulated.**

* DOM structure updates immediately
* CSS layout recalculates immediately
* User NEVER sees the layout jump
* Motion exists only in transforms

If you see:

* Jitter
* Rubber-band movement
* Elements “dragging” others

👉 You violated this rule.

---

## 6. Vertical Motion Doctrine (Work Surfaces)

### Action Queues & Work Surfaces

* MUST feel **active**, not passive
* MUST glide into new positions
* MUST never be “pushed” by collapsing content above

If the Action Queue moves:

* It must FLIP
* It must respect the same duration & curve
* It must feel intentional

---

## 7. Text & Typography During Motion

### Rule

> **Text should not be scaled as text.**

* Typography class changes may snap
* Container transforms may mask the snap
* Avoid animating font-size directly

Blurred or stretched text during motion is acceptable **only if**:

* It is masked by container scale
* It resolves cleanly at rest

---

## 8. Panels & Overlays

* Panels are **Primary Mass**
* Entry/Exit must:

  * Translate (or FLIP)
  * Fade subtly
  * Use STANDARD duration & easing

❌ Animating `width` or `height` is forbidden
❌ Panels must not have independent easing laws

Panels must feel like **heavy OS objects**, not drawers.

---

## 9. Prohibited Patterns (Red Flags)

If you see any of the following, stop:

* `transition-all`
* Mixed durations for related elements
* One element finishing before another starts
* Layout reflow visible to the eye
* “Floating” or “dragging” artifacts

These indicate **fractured physics**.

---

## 10. Enforcement Principle

> **If motion feels wrong, assume the canon was violated.**

Debug order:

1. Check duration
2. Check easing
3. Check ownership
4. Check layout vs transform
5. Check synchronization

Do NOT “tweak until it feels right”.
**Fix the physics.**

---

### Final Statement

SynOS motion should feel:

* Confident
* Heavy
* Predictable
* Alive but never nervous

When motion disappears, the system should feel **stable**.
When motion appears, it should feel **inevitable**.

This is the standard.
