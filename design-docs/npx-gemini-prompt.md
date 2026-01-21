## 📌 BACKEND EXECUTION PROMPT (USE VERBATIM)

### ✦ Phase 6.3: Referral Capture Moulding (Free-Text + Partner)

You have full access to the SynOS backend codebase.

### CONTEXT (LOCKED)

* ReferralPartnerId is the **only economic trigger**
* Commission & flow logic already depend on ReferralPartnerId
* We must support **free-text referrer capture** for real receptionist workflows
* Free-text must NOT affect financial behavior

---

### 🎯 OBJECTIVE

Extend the backend to support **free-text referrer capture** that coexists safely with the existing ReferralPartnerId-based referral system.

---

### 🔒 HARD RULES (NON-NEGOTIABLE)

* ❌ Free-text referrer must NEVER:

  * trigger commission
  * change PaymentCollectionModel
  * affect billing or kernel logic
* ✅ Only ReferralPartnerId drives economics
* ❌ No fuzzy matching
* ❌ No auto-conversion of text → partner
* ❌ No frontend assumptions

---

### REQUIRED CHANGES

#### 1️⃣ Data Model

* Add nullable field to `Visit`:

  ```
  ReferrerText : string?
  ```
* Purpose: Store exactly what receptionist types
* No validation beyond basic length/safety

---

#### 2️⃣ CreateVisitAsync

* Accept optional `referrerText`
* Logic:

  * If ReferralPartnerId provided → normal referral behavior
  * Else if referrerText provided → store text only
  * Both may coexist (partner takes precedence)

---

#### 3️⃣ SetVisitReferralAsync

* When setting ReferralPartnerId:

  * DO NOT delete or overwrite ReferrerText
  * Allow audit visibility (what was typed vs selected)

---

#### 4️⃣ RemoveVisitReferralAsync

* Clear ReferralPartnerId
* Reset PaymentCollectionModel (existing behavior)
* KEEP ReferrerText intact

---

#### 5️⃣ Snapshot Enrichment

Extend snapshot to expose:

```json
referral: {
  partner: { id, displayName, collectionLabel } | null,
  referrerText: string | null
}
```

* No derivation
* No fallback logic
* Snapshot reflects stored state only

---

### ❌ OUT OF SCOPE

* UI changes
* Matching logic
* Analytics
* Partner creation
* Commission changes

---

### 📦 EXPECTED OUTPUT

1. Model changes summary
2. DTO changes (if any)
3. Service changes summary
4. Snapshot changes summary
5. Build status

End of task.

---


