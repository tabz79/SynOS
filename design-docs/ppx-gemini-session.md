
## Day 14.5 Implementation Summary:
-----------------------------------
*   **What:** Implemented a new read-only API endpoint to fetch the complete PACS data for a given radiology study, structured as a "series tree".
*   **New Feature:** Added `GET /api/v1/radiology/pacs/studies/{radiologyStudyId}/series-tree` which returns a JSON object containing all series and instances for a study. Each instance includes a pre-built `wadouri` URL, ready for a DICOM viewer like Cornerstone3D.
*   **Files Affected:**
    *   Added: `src/SynOS.Models/DTOs/PACS/PacsSeriesTreeDto.cs`
    *   Modified: `src/SynOS.Services/IPacsService.cs` (added `GetSeriesTreeAsync`)
    *   Modified: `src/SynOS.Services/PacsService.cs` (implemented `GetSeriesTreeAsync`)
    *   Modified: `src/SynOS.Api/Controllers/Radiology/PacsController.cs` (added `GetSeriesTree` endpoint)
*   **Manual Steps:** No manual steps required. The build is complete and successful.

---

## Manual Testing Steps via Swagger:
-----------------------------------
**Prerequisite:** You need a `radiologyStudyId` that has at least one DICOM file uploaded to it from the Day 14.4 tests.

**Test 1: Verify the Series Tree Endpoint**

1.  Navigate to `GET /api/v1/radiology/pacs/studies/{radiologyStudyId}/series-tree` in Swagger.
2.  Provide the `radiologyStudyId` you used in the previous (Day 14.4) upload test.
3.  Execute the request.
4.  **Verification:**
    *   Expect a `200 OK` response.
    *   The response body should be a JSON object matching the `PacsSeriesTreeDto` structure.
    *   Verify that `studyInstanceUid` contains the real UID from your test DICOM file.
    *   Verify the `series` array contains one or more objects.
    *   For each series object, verify that `seriesInstanceUid`, `modality`, and `seriesNumber` match the data in your DICOM file.
    *   For each instance object within a series, verify the `sopInstanceUid` and `instanceNumber` are correct.
    *   **Crucially, verify that the `wadouri` property for each instance is a complete and correct URL**, formatted like: `wadouri:http://127.0.0.1:59999/api/v1/radiology/pacs/instances/{instanceId}/file`.

**Test 2: Verify the WADO URL**

1.  From the response body of Test 1, copy the entire `wadouri` value from one of the instances (e.g., `wadouri:http://.../file`).
2.  Remove the `wadouri:` prefix to get a standard URL.
3.  You can try to access this URL directly in your browser or use a tool like Postman/curl.
4.  **Verification:**
    *   You should receive a `200 OK` response, and the browser should prompt you to download the `.dcm` file. This confirms the generated URL is correct and functional.

**Test 3: Verify with an Invalid or Empty Study**

1.  Call the `GET /series-tree` endpoint again, but this time use a `radiologyStudyId` that has no files uploaded to it.
2.  **Verification:**
    *   Expect a `200 OK` response, but the `series` array in the response body should be empty.

The backend is now ready for testing Day 14.5 functionality.
