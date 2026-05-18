The payroll engine itself is not broken. The current 400 errors are expected state and duplicate protection behavior, so stop spending time deep-debugging them.

We are now in the payroll data-completion and hardening phase, not architecture debugging phase.

Please stop over-investigating:

* SignalR warnings
* duplicate payroll period protections
* recalculation state guards

Those protections are working correctly.

Current priority is to operationalize Payroll Phase 1 cleanly and fast.

Proceed with this implementation order ONLY:

1. Complete Employee Payroll Fields
   Inside Employee/Staff Registry add and properly wire:

* BaseSalary
* JoiningDate
* EmploymentStatus
* PFEnabled
* PFPercentage (default 12%, editable)
* ESIEnabled
* ESIPercentage (default standard %, editable)
* TDSEnabled
* TDSMode (Fixed / Percentage)
* TDSValue
* BankName
* AccountNumber
* IFSC

Keep Aadhaar/PAN optional and nullable.

2. Attendance → Payroll Interpretation
   Ensure payroll correctly interprets:

* Absent
* UnpaidLeave
* HalfDay

Present remains virtual default.

HalfDay must deduct 0.5 day proportionally.

3. Remove Dependency on PayStructure System
   Bypass/deprecate PayStructure logic safely.
   Payroll Phase 1 should calculate directly from:
   Employee.BaseSalary

Do NOT build HRA/basic/conveyance component systems now.

4. Payroll Lifecycle
   Maintain clean states:

* Draft
* Calculated
* Finalized
* Paid

Once finalized:

* attendance freezes
* leave edits freeze
* payroll recalculation freezes

5. Historical Snapshotting
   When payroll is processed, snapshot:

* salary used
* PF %
* ESI %
* TDS
* LOP days
* deductions

Future employee edits must NEVER alter finalized payroll history.

6. Payroll Formula
   Phase 1 formula:

Base Salary

* LOP deductions
* advances
* manual deductions

- bonuses/manual additions

* PF
* ESI
* TDS
  = Net Payable

7. Keep Payroll Simple
   Do NOT drift into:

* enterprise payroll engines
* formula builders
* dynamic salary component systems
* complex compliance abstractions

We are building a practical healthcare payroll system first.

8. Next Milestone
   After the above is complete:
   run ONE clean real payroll scenario end-to-end:

* one employee
* one leave
* one PF deduction
* one adjustment
* finalize payroll
* mark salary paid

That becomes the Payroll Phase 1 operational validation.
