# Real-World Signing Model & Pre-Printed Letterhead Alignment

This plan realigns the Enterprise Document Engine with the ground reality of clinical workflows, moving from a system-driven verification model to a human-driven hybrid model.

## User Review Required

> [!IMPORTANT]
> **Branding Removal**: As per your requirement, all software-generated Lab logos, addresses, and names will be removed from the report to support **Pre-printed Letterheads**.
> **Baseline Identity**: The "Print" action will now **always** include the Lab Owner's digital signature as a baseline identity, even for Drafts.

## Proposed Changes

### 1. Document Renderer (`ReportA4.jsx`)
- **[MODIFY]** Remove the `<div id="report-header">` (or equivalent) that prints the lab's name/address.
- **[MODIFY]** Increase the top padding of the main container to `40mm` to ensure content begins below the pre-printed letterhead area.
- **[MODIFY]** Delete the `DRAFT` watermark logic entirely.

### 2. Typist Terminal (`TypistTerminal.jsx`)
- **[MODIFY]** Change the action button bar to a 3-button grid:
    1. **Save Draft**: Persists data only.
    2. **Print**: Opens the high-fidelity A4 preview for physical printing.
    3. **Submit for Review**: Submits the draft to the Pathologist.

### 3. Backend Logic (`ReportService.cs`)
- **[MODIFY]** Update `BuildReportDataModelV2Async` to enforce Rule #1: "No report leaves system without lab identity". 
- If no pathologist has signed yet, the system will inject the **Default Lab Owner** signature into the data contract.

## Verification Plan

### Automated Verification
- Verify that `GetReportData` returns at least one signature (the Lab Owner) for any draft.
- Verify that `ReportA4` renders with a blank top area (~40mm).

### Manual Verification
- **Test 1**: Typist clicks "Print" on a brand-new draft. Verify the A4 renderer shows content clearly below the header and includes the Director's signature.
- **Test 2**: Typist clicks "Submit for Review". Verify the status transitions correctly.
- **Test 3**: Pathologist verifies (Pen/Paper) -> System marked as `ManualVerified`. Verify edits are locked.
