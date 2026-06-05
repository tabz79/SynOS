# Implementation Plan - Radiology Draft & Sign Flow Corrections and State-Driven Live Preview

This plan addresses the frontend API errors during save draft/sign operations and establishes a synchronized live preview and digital signature request workflow between the Radiologist and Typist terminals using the backend study status as the single source of truth.

## User Review Required

> [!IMPORTANT]
> - **Source of Truth**: The active screen layout (Editor vs. Live Preview) is driven entirely by the backend `RadiologyStudy` status (`AwaitingDictation`/`DictationSessionStarted` vs. `DraftReady`/`AwaitingSignature`/`Signed`).
> - **Signature Request Event**: Requesting a digital signature is a workflow event. We will introduce a backend status `AwaitingSignature` to persist this state. SignalR will only be used to broadcast a refresh trigger.
> - **Workflow Status Transitions**:
>   - `DictationSessionStarted` -> `DraftReady` is assigned in the backend method `RadiologyService.DraftReportAsync` when a draft is saved.
>   - `DraftReady` -> `AwaitingSignature` is assigned in the new backend method `RadiologyService.RequestSignatureAsync` when requested.
>   - `DraftReady` / `AwaitingSignature` -> `DictationSessionStarted` is assigned in the new backend method `RadiologyService.ResumeDictationAsync` when editing is resumed.
>   - `AwaitingSignature` / `DraftReady` -> `Signed` is assigned in the backend method `RadiologyService.SignReportAsync` when signed.

## Proposed Changes

---

### Backend Components

#### [MODIFY] [IRadiologyService.cs](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Services/IRadiologyService.cs)
- Declare the following methods:
  - `Task ResumeDictationAsync(Guid studyId, Guid userId)`
  - `Task RequestSignatureAsync(Guid studyId, Guid userId)`

#### [MODIFY] [RadiologyService.cs](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Services/RadiologyService.cs)
- In `DraftReportAsync`:
  - Continues to transition `study.Status` from `DictationSessionStarted` to `DraftReady`.
- Implement `ResumeDictationAsync(Guid studyId, Guid userId)`:
  - Find the study.
  - If status is `DraftReady` or `AwaitingSignature`, transition status back to `DictationSessionStarted`.
  - Save changes.
- Implement `RequestSignatureAsync(Guid studyId, Guid userId)`:
  - Find the study.
  - If status is `DraftReady`, transition status to `AwaitingSignature`.
  - Save changes.
- In `GetRadiologistWorklistAsync`:
  - Update query where clause to include `AwaitingSignature`:
    `where (study.Status == "AwaitingDictation" || study.Status == "DictationSessionStarted" || study.Status == "DraftReady" || study.Status == "AwaitingSignature") && !study.IsSoftDeleted`

#### [MODIFY] [RadiologyReportsController.cs](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Api/Controllers/RadiologyReportsController.cs)
- Add POST endpoint `[HttpPost("{studyId}/resume")]` to invoke `ResumeDictationAsync`.
- Add POST endpoint `[HttpPost("{studyId}/request-signature")]` to invoke `RequestSignatureAsync`.

#### [MODIFY] [RadiologyCollaborationHub.cs](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Api/Hubs/RadiologyCollaborationHub.cs)
- Add the following hub methods:
  - `SendDraftSaved(string studyId)`: Broadcasts `ReceiveDraftSaved()` to the session group.
  - `SendDraftResumed(string studyId)`: Broadcasts `ReceiveDraftResumed()` to the session group.
  - `SendSignRequest(string studyId)`: Broadcasts `ReceiveSignRequest()` to the session group.

---

### Frontend Components

#### [MODIFY] [ReportA4.jsx](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/documents/templates/ReportA4.jsx)
- Update `renderRichContent` to check if the content starts with `<` or contains typical HTML tags (like `<h3>`, `<p>`). If so, render it using `<div dangerouslySetInnerHTML={{ __html: resolvedStr }} />`.

#### [MODIFY] [RadiologistTerminal.jsx](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/radiology/RadiologistTerminal.jsx)
- Correct API routes:
  - Worklist fetch query: add `&status=AwaitingSignature` parameter to `/api/v1/radiology/studies/queue`.
  - Draft save: `/api/v1/radiology-reports/draft` -> `/api/v1/radiology/reports/draft`.
  - Digital sign: remove pathology `/submit` check and call `/api/v1/radiology/reports/sign` with `{ studyId }` body.
- Add local state:
  - `isPreviewMode` (boolean derived from study status: `true` if status is `"DraftReady"`, `"AwaitingSignature"`, or `"Signed"`, otherwise `false`).
  - `reportData` (object, stores data for `<ReportA4>`).
  - `previewLoading` (boolean).
- Bind SignalR listeners:
  - `ReceiveDraftSaved` -> re-fetches study details.
  - `ReceiveDraftResumed` -> re-fetches study details.
  - `ReceiveSignRequest` -> re-fetches study details (updating status to `AwaitingSignature` and showing signature request banner).
- When study status is `DraftReady`, `AwaitingSignature`, or `Signed`, fetch report preview data using `ReportsApi.getReportData(reportId, true)`.
- Right-side panel display:
  - If `isPreviewMode` is active:
    - Display header ribbon:
      - If status is `DraftReady` or `AwaitingSignature`:
        - "Edit Draft" button (sends POST `/api/v1/radiology/reports/{studyId}/resume`, broadcasts `SendDraftResumed` over SignalR on success).
        - "Digital Sign" button (invokes `/api/v1/radiology/reports/sign`, shows pulsing green highlight/badge if status is `AwaitingSignature`).
      - If status is `Signed`:
        - Show "Report Signed & Finalized" read-only badge.
    - If status is `AwaitingSignature`, show banner: "Typist has requested digital signature review".
    - Render `<ReportA4 reportData={reportData} />` inside a styled scrollable viewport.
  - If `isPreviewMode` is false:
    - Render normal Rich Text editors and controls.

#### [MODIFY] [RadiologyTypistTerminal.jsx](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/radiology/RadiologyTypistTerminal.jsx)
- Correct API routes:
  - Dictation queue query: add `&status=AwaitingSignature` parameter to `/api/v1/radiology/studies/queue`.
  - Draft save: `/api/v1/radiology-reports/draft` -> `/api/v1/radiology/reports/draft`.
  - Accept call study details: `/api/v1/radiology/studies/${studyId}` -> `/api/v1/radiology/reports/${studyId}`.
- Add local state:
  - `isPreviewMode` (derived from study status: `true` if status is `"DraftReady"`, `"AwaitingSignature"`, or `"Signed"`, otherwise `false`).
  - `reportData` (object, stores data for `<ReportA4>`).
  - `previewLoading` (boolean).
- Bind SignalR listeners:
  - `ReceiveDraftSaved` -> re-fetches study details.
  - `ReceiveDraftResumed` -> re-fetches study details.
  - `ReceiveSignRequest` -> re-fetches study details (updates status to `AwaitingSignature`).
- When study status is `DraftReady`, `AwaitingSignature`, or `Signed`, fetch report preview data.
- Right-side panel display:
  - If `isPreviewMode` is active:
    - Display header ribbon:
      - If status is `DraftReady`:
        - "Edit Draft" button (sends POST `/api/v1/radiology/reports/{studyId}/resume`, broadcasts `SendDraftResumed` over SignalR on success).
        - "Print Out" button (opens `/print/report/${reportId}?forceLive=true` in new tab).
        - "Request Digital Sign" button (sends POST `/api/v1/radiology/reports/{studyId}/request-signature`, broadcasts `SendSignRequest` over SignalR on success).
      - If status is `AwaitingSignature`:
        - "Edit Draft" button.
        - "Print Out" button.
        - "Digital Signature Requested..." disabled badge.
      - If status is `Signed`:
        - "Print Out" button.
        - "Report Signed & Finalized" read-only badge.
    - Render `<ReportA4 reportData={reportData} />`.
  - If `isPreviewMode` is false:
    - Render collaborative editors.

## Verification Plan

### Automated Tests
- Build project: Run `npm run build` from the frontend directory to verify compilation.

### Manual Verification
- Log in as Radiologist in one browser window and Typist in another.
- Connect via call and type findings.
- Click "Save Live Draft" on either console.
- Verify both screens immediately transition to Live Preview mode (A4 report) based on study status changing to `DraftReady`.
- Verify Typist has options: "Print Out" and "Request Digital Sign".
- Click "Request Digital Sign" on Typist screen, verify status becomes `AwaitingSignature`, and Radiologist console re-fetches, displaying the signature request banner.
- Click "Edit Draft" on either screen and verify status becomes `DictationSessionStarted`, transitioning both screens back to editable editors.
- Click "Digital Sign" on Radiologist screen and verify status updates to `Signed` and report is completed.
