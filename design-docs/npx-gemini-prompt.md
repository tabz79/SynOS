✦ ENTER READ-ONLY AUDIT MODE.

You will NOT write code.
You will NOT suggest fixes.
You will ONLY report what exists and what does not exist in the current codebase.

Context:
This audit is for **Flow B – Partner Collects**, defined as:
- Patient pays at Hospital / Clinic / Doctor first
- Patient brings a paid slip to Lab
- Lab creates visit marked as Referral + Already Paid
- Lab performs tests
- Hospital/Clinic later settles money with Lab
- Referral commission is deducted during settlement

Your task:
Audit whether Flow B is actually supported anywhere in the current system.

---

### Audit Questions (answer explicitly YES / NO / PARTIAL)

1. **Reception Flow**
   - Does ReceptionFlowService support creating a visit marked as:
     - Paid externally?
     - PartnerCollects mode?
   - Is there any logic that distinguishes “Lab collected payment” vs “Partner collected payment”?

2. **Payment & Invoice Model**
   - Does the Invoice or Payment model support:
     - External payment reference (hospital slip)?
     - Payment source ≠ Lab?
   - Is there any persisted field indicating “money not yet received by lab”?

3. **Financial Truth Engines**
   - Is there any **Receivable / Money-to-Receive** fact written when PartnerCollects is used?
   - Are there any facts that represent:
     - “Hospital owes ₹X to Lab”?
   - Or is the system currently **expense-only** (money going out)?

4. **Referral Commission Logic**
   - Is commission recognition triggered when:
     - Lab does NOT collect money?
   - Or is commission logic strictly tied to lab-side payment events?

5. **Settlement & Reconciliation**
   - Is there any logic, entity, or workflow that supports:
     - Recording settlement received from hospital?
     - Reconciling settlement with performed tests?
   - Or is settlement entirely outside the system?

6. **Reports & Analytics**
   - Can the current system answer:
     - “How much money is pending from hospitals?”
     - “Which referrals are unpaid but tests are completed?”
   - If yes, identify exactly which facts enable this.
   - If no, say so clearly.

7. **Overall Conclusion**
   - Is Flow B:
     - Fully supported
     - Partially supported
     - Not supported
   - Justify the conclusion in 3–5 bullet points.

---

### Output Rules
- Do NOT propose future design.
- Do NOT suggest fixes.
- Do NOT rename Flow B.
- Be brutally factual.
- Prefer saying “does not exist” over speculation.

✦ END AUDIT.
