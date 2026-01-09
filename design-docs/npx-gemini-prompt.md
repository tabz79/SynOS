✦ Micro-Correction Directive: EndAssignmentForEmployeeAsync Ordering Fix

There is one optional but recommended micro-correction to apply for clarity and correctness.
This is not a redesign and must not change any behavior or rules.

Required Adjustment

Refactor the order of validations inside EndAssignmentForEmployeeAsync as follows:

Current logical order (to be corrected):

Load assignment

Validate endDate rules

Load employee

Reject if employee inactive

End assignment

Corrected order (apply this):

Load assignment

Load employee

Reject if employee is inactive or missing

Validate endDate rules

End assignment and commit

Rationale (do not implement new logic)

Identity & eligibility checks must precede temporal/business rule checks.

Prevents misleading validation errors.

Improves audit clarity and aligns with regulated payroll standards.

Constraints

No new guards

No removed guards

No schema changes

No behavior change beyond ordering

Keep transactions exactly as implemented

Output

After applying this ordering change, respond only with:

"Micro-correction applied"

Proceed now.