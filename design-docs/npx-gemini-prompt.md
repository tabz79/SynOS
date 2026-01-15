## ✦ ANTI-GRAVITY FRONTEND PROMPT

### (Auth + Routing Only — Zero UI Rebuild)

### SYSTEM CONTEXT

* Project: **SynOS**
* Frontend stack already exists.
* **Reception UI is ALREADY BUILT** and currently renders at `/`.
* Backend is **strictly JWT-based**, role-aware, branch-aware.
* Roles exist in DB (Receptionist, Admin, etc.).
* Backend login endpoint:
  `POST /api/v1/auth/login`
* JWT contains:

  * `role`
  * `branch_id`
* Reception APIs require:

  * Valid JWT
  * Role = `Receptionist`

---

## 🔒 OBJECTIVE (NON-NEGOTIABLE)

**DO NOT redesign or rebuild any UI.**
**DO NOT touch visual layout, components, or styling.**

Your job is ONLY to:

1. Introduce **proper authentication flow**
2. Introduce **route-level protection**
3. Mount the **existing Reception UI at the correct route**

---

## ✅ REQUIRED ROUTING BEHAVIOR

### Routes to implement

| URL          | Behavior                          |
| ------------ | --------------------------------- |
| `/login`     | New Login screen (simple form)    |
| `/reception` | Existing Reception UI (UNCHANGED) |
| `/`          | Smart redirect only (no UI)       |

---

### `/login` behavior

* Show email + password fields
* On submit:

  * Call `POST /api/v1/auth/login`
  * On success:

    * Store JWT securely (localStorage or memory — choose one, be consistent)
    * Decode JWT
    * Read `role`
    * Redirect:

      * `Receptionist` → `/reception`
      * Other roles → show “Role not supported yet”
* On failure:

  * Show backend error message

---

### `/reception` behavior

* This route MUST be **protected**
* Rules:

  * If **no JWT** → redirect to `/login`
  * If JWT exists but `role !== Receptionist` → show “Unauthorized”
  * If valid → render the **existing Reception screen**
* All API calls from this screen MUST:

  * Attach `Authorization: Bearer <JWT>`

⚠️ **Do not modify the Reception UI component itself**
Only move where it is mounted.

---

### `/` (root) behavior

This route must NEVER render UI.

Logic:

```text
if no token → redirect /login
if token exists:
  if role == Receptionist → redirect /reception
  else → show “Role not supported yet”
```

---

## 🧠 AUTH STATE RULES

* Create a minimal `AuthContext` or equivalent
* Responsibilities:

  * Store JWT
  * Expose `isAuthenticated`
  * Expose `role`
  * Expose `logout()`
* Do NOT invent complex state machines
* Do NOT hardcode users or roles

---

## 🚫 HARD NOs (IMPORTANT)

* ❌ Do NOT create a new “Reception Layout”
* ❌ Do NOT duplicate the Reception UI
* ❌ Do NOT hardcode branch or role values
* ❌ Do NOT bypass backend auth
* ❌ Do NOT add mock tokens
* ❌ Do NOT redesign header/sidebar/etc.

---

## ✅ DELIVERABLES

You must provide:

1. Updated routing configuration
2. Login screen implementation
3. Auth guard / protected route logic
4. Confirmation that:

   * Reception UI code is untouched
   * Activity Stream now works due to JWT being present

---

## 🧭 MENTAL MODEL (IMPORTANT)

> The Reception UI is **not the app root**.
> It is a **post-login, role-protected destination**.

Treat it exactly like a real hospital system would.

---
