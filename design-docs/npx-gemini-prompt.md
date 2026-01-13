

## 🔒 GEMINI PROMPT — SynOS Frontend Architecture (OS-Grade, 2026+)

> You have **full access to the SynOS codebase**.
>
> SynOS is a **Healthcare Operations & Finance Operating System**, not an app.
> It coordinates diagnostics operations, money, inventory, workforce, compliance, and intelligence using immutable fact engines and strict architectural discipline.
>
> ### NON-NEGOTIABLE BACKEND LAWS
>
> * Truth engines write **append-only, immutable facts**
> * Interpretation layers explain facts, never mutate them
> * Intelligence layers analyze facts, never resummarize truth
> * UI **never** decides eligibility, workflow, or calculations
> * Liability ≠ Cash
> * Accrual ≠ Settlement
> * No module computes another module’s truth
>
> The backend is **sealed and correct**.
> You must design the frontend to **respect and preserve this architecture**.
>
> ---
>
> ### YOUR ROLE
>
> Act as a **Senior OS-grade Frontend Architect (2026+)** designing professional, long-session, high-stakes software (healthcare + finance).
>
> This is **not** a consumer app, admin panel, or marketing UI.
>
> ---
>
> ### YOUR TASK
>
> Propose a **Frontend Architecture Blueprint** (not implementation) for SynOS.
>
> The frontend is **role-specific**, but roles **do NOT own workflows**.
> Roles only:
>
> * Observe truth
> * See queues derived from facts
> * Emit single, atomic user intents
>
> ---
>
> ### REQUIRED OUTPUT (MANDATORY)
>
> **1️⃣ Frontend Architectural Layers**
>
> * Logical layers (NOT framework-specific yet)
> * Responsibilities and boundaries of each layer
>
> **2️⃣ Role-Based UI Philosophy**
> Address these roles explicitly:
>
> * Receptionist
> * Phlebotomist
> * Pathologist
> * Radiologist
> * X-Ray Technician
> * MRI Technician
> * Delivery Desk
> * Inventory Manager
> * HR Manager
> * Accounts / Finance
> * System Admin
>
> Explain how the *same truth* is surfaced differently per role **without duplicating logic**.
>
> **3️⃣ Queue-Driven Interface Design**
>
> * How queues are derived purely from backend facts
> * How queue visibility differs by role
> * How queues drive attention without frontend workflows
>
> **4️⃣ OS-Grade UX Principles (2026+)**
>
> * Information density vs calm
> * Time as a first-class UI dimension
> * Fatigue-aware UI design
> * Error, latency, and failure visibility
> * Accessibility and long-hour usage
>
> **5️⃣ Interaction & Navigation Model**
>
> * How navigation responds to backend state changes
> * Why wizards, step-flows, and optimistic UI are dangerous here
> * How user intent is captured safely
>
> **6️⃣ Visual & Design System Philosophy**
>
> * Color semantics (status-driven, not decorative)
> * Typography hierarchy
> * Motion rules (when allowed, when forbidden)
> * What makes it “futuristic” without being flashy
>
> **7️⃣ Explicit Anti-Patterns to Avoid**
>
> * UI-side computations
> * Frontend state ownership
> * Role-owned workflows
> * Cross-engine summaries in UI
>
> ---
>
> ### STRICT RULES
>
> * Do NOT invent backend logic
> * Do NOT propose frontend workflow engines
> * Do NOT calculate money, inventory, or eligibility in UI
> * Do NOT suggest optimistic UI for financial or clinical actions
> * Do NOT produce wireframes or React code
>
> Output a **serious design document**, not a blog post.
>
> Assume this frontend will be **audited**.
>
> ---

