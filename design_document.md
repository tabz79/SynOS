**Design: Payroll Workflow Orchestration Service (Locked)**

This document specifies the official design for the `Payroll Workflow Orchestration Service`, the central state-transition authority for the Payroll Truth Engine.

### 1. Service Responsibility

*   **What this service owns:** This service exclusively owns the **state machine** of the `PayrollRun` and `PayrollPeriod` entities.
*   **What it is the only authority for:** It is the **only** component in the system authorized to transition a `PayrollRun` or `PayrollPeriod` from one status to another (e.g., from `Draft` to `Processing`, or from `Calculated` to `Finalized`).
*   **What it explicitly does NOT do:** It does not perform payroll calculations, create or modify master data (e.g., `PayStructureAssignment`), directly write `PayrollFact`s, or handle monetary payments.

### 2. Orchestrated Operations

*   **`CreatePayrollPeriod`**
    *   **Purpose:** To create a new, open period for future payroll processing.
    *   **Preconditions:** The command must originate from an authorized administrator.
    *   **Sequence:** The service validates that the new period's dates do not overlap with any existing period. It then instructs the persistence layer to create a `PayrollPeriod` record with `Status = Open`.
    *   **State Transitions:** Creates a new `PayrollPeriod` in `Open` state.
    *   **Failure Handling:** Rejects the command if the date range overlaps with an existing `PayrollPeriod`.

*   **`CreatePayrollRun`**
    *   **Purpose:** To create a draft placeholder for a payroll run within an open period.
    *   **Preconditions:** The target `PayrollPeriod` must exist and its status must be `Open`.
    *   **Sequence:** The service verifies the `PayrollPeriod` is `Open` and instructs the persistence layer to create a new `PayrollRun` record with `Status = Draft`.
    *   **State Transitions:** Creates a new `PayrollRun` in `Draft` state.
    *   **Failure Handling:** Rejects the command if the `PayrollPeriod` is not `Open`.

*   **`InitiatePayrollRun`**
    *   **Purpose:** To lock inputs and begin the payroll calculation process for a draft run.
    *   **Preconditions:** The `PayrollRun` must exist and its status must be `Draft`.
    *   **Sequence:** The service verifies the run's status, transitions it to `Processing`, and then asynchronously invokes the **Payroll Calculation Logic**, passing it the `PayrollRunId`.
    *   **State Transitions:** `PayrollRun.Status`: `Draft` → `Processing`.
    *   **Failure Handling:** Rejects the command if the run is not in `Draft` status.

*   **`CompleteCalculation` (System-Driven)**
    *   **Purpose:** A system-internal operation called by the Payroll Calculation Logic upon its completion.
    *   **Preconditions:** The `PayrollRun` must have a status of `Processing`.
    *   **Sequence:** The service accepts the provisional results (including any validation errors) from the calculation logic, stores them in a temporary, non-persistent location associated with the run, and transitions the `PayrollRun` status to `Calculated`.
    *   **State Transitions:** `PayrollRun.Status`: `Processing` → `Calculated`.
    *   **Failure Handling:** If the calculation logic reports a catastrophic failure, this orchestrator transitions the `PayrollRun` status to a `Failed` state.

*   **`FinalizePayrollRun`**
    *   **Purpose:** To approve a calculated run and commit its results as immutable truth.
    *   **Preconditions:** The `PayrollRun` status must be `Calculated`, it must have zero unresolved validation errors, and the parent `PayrollPeriod` must be `Open`.
    *   **Sequence:** The service validates preconditions, transitions both the `PayrollRun` and its parent `PayrollPeriod` to `Finalized`, and instructs a dedicated `PayrollFactWriter` service to atomically persist the provisional results as immutable `PayrollFact` records.
    *   **State Transitions:** `PayrollRun.Status`: `Calculated` → `Finalized`. `PayrollPeriod.Status`: `Open` → `Finalized`.
    *   **Failure Handling:** Rejects the command if preconditions are not met.

*   **`VoidPayrollRun`**
    *   **Purpose:** To cancel a calculated run that has not been finalized.
    *   **Preconditions:** The `PayrollRun` status must be `Calculated`.
    *   **Sequence:** The service verifies the run's status, transitions it to `Voided`, and discards all associated provisional results.
    *   **State Transitions:** `PayrollRun.Status`: `Calculated` → `Voided`.
    *   **Failure Handling:** Rejects the command if the run is not in `Calculated` status.

### 3. Interaction With Other Components

*   **Payroll Calculation Logic:** The orchestrator **invokes** the calculation logic but does not perform it. It provides the `PayrollRunId` and receives provisional results or a failure signal.
*   **Payroll Admin Services:** The orchestrator **does not interact** with these services. Its scope is limited to workflow, not master data management.
*   **Persistence Layer:** The orchestrator is responsible for **commanding** state changes to `PayrollRun` and `PayrollPeriod` entities and for commanding a `PayrollFactWriter` to persist facts.
*   **Read Models:** The orchestrator **reads** the status of `PayrollRun` and `PayrollPeriod` entities to validate preconditions for its commands.

### 4. Invariant Enforcement

This service is the sole enforcer of the following critical system invariants:
*   It guarantees that **only one `Finalized` run can exist per `PayrollPeriod`**.
*   It enforces the immutability of terminal states by rejecting any command on a `PayrollRun` that is already `Finalized` or `Voided`.
*   It enforces the input lock by preventing adjustments once a run is `Processing`.
*   It ensures facts are written **only at `Finalize`** by being the only component authorized to command the `PayrollFactWriter`.

### 5. Failure & Recovery Semantics

*   **Calculation Failure:** If the `Processing` step fails due to a system error (e.g., database connection loss), the orchestrator must transition the `PayrollRun` to a terminal `Failed` state.
*   **System State After Failure:** A `Failed` run is treated like a `Voided` run. No facts are written, and no provisional data is saved. The parent `PayrollPeriod` remains `Open`.
*   **Administrator Recovery Path:** An administrator cannot retry a `Failed` run. They must diagnose the root cause, potentially correct master data via the Admin Services, and then create a **new `PayrollRun`** within the still-`Open` period to attempt the calculation again. This ensures every run attempt has a clean, auditable history.