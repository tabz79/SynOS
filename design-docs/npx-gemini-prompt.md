## 1️⃣ Decision lock (this is now ground truth)

**Action Queue behavior is now FINAL:**

* Default view = **Today’s tasks**
* “Today” = lab business date
* If today has zero visits → queue is empty (this is correct, not an error)
* At the end of today’s list:

  * A clear, explicit control (button / trigger):
    **“Show last 7 days”**
* On user intent:

  * Load older visits (last N days, starting with 7)
  * Keep **today visually and logically separate**
  * Date separators are mandatory

**Key principle:**
👉 *Nothing older appears unless a human explicitly asks for it.*

This stays locked.

---

## 2️⃣ Non-obvious implications (this prevents future bugs)

These are not technical points — they’re **system behavior truths**.

### A. “Empty queue” is no longer a bug signal

It simply means:

> “No visits today yet.”

Your UI, backend, logs — all must treat this as **normal**.

---

### B. Action Queue is NOT a history tool

If someone wants:

* A specific old date
* An old invoice
* A patient from last month

👉 That is **not** Action Queue’s job.
That will be **Search’s job**, later.

This separation is what keeps the system sane.

---

### C. Time expansion must be reversible and obvious

When older days are shown:

* It must be visually clear the user is *no longer only in today*
* No silent blending
* No hidden state

This avoids:

* “Why is this patient still here?”
* “Was this today or yesterday?”

---

## 3️⃣ The ONE prompt for Gemini (backend only, Action Queue only)

Paste this **exactly as-is** into the Gemini backend agent.

---

### 🧠 SynOS Backend Prompt — Action Queue (Option 3, Locked)

**Context:**
SynOS is an OS-grade Diagnostic Lab Management System.
We are finalizing the behavior of the **Reception Action Queue**.

This task is **Action Queue only**.
Ignore system search for now.

---

### 🎯 Finalized Business Behavior (Do NOT reinterpret)

1. The Action Queue represents **operational work**, not history.

2. **Default behavior**

   * Show **only today’s business-day visits**
   * “Today” means the lab’s operational day
   * If there are no visits today, the queue must be empty (this is correct behavior)

3. **Explicit time expansion**

   * When explicitly requested by the receptionist, load **older visits**
   * Start with **last 7 business days**
   * Older visits must:

     * Appear **after today’s list**
     * Be **clearly grouped by date**
     * Never mix silently with today’s rows

4. Expansion must be:

   * Intent-driven (no auto-load)
   * Progressive (older data loads only when requested)

---

### 🕵️ Audit First (Read-Only)

Before proposing changes, audit and report:

1. How Action Queue data is currently filtered
2. How business date is calculated
3. Whether current projections already support date ranges
4. Any edge cases when today has zero visits

---

### 📄 Expected Output

Return only:

1. Short audit summary (what exists today)
2. Confirmation that this behavior fits cleanly
3. High-level backend approach (conceptual, minimal)
4. Risks or edge cases to be aware of

---

### ⛔ Constraints

* Do NOT auto-include history
* Do NOT weaken business-day semantics
* Do NOT redesign frontend responsibilities
* Clarity and predictability are more important than cleverness

---

## END PROMPT

