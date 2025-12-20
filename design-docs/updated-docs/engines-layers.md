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

