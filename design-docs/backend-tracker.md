Yeah, you can confidently say:

> **“Radiology PACS + DICOM viewer backend plumbing is fully done (v1).”**

Now here’s your **updated end-to-end flow** including all the new PACS + viewer bits.

---

## Radiology + PACS + Viewer Backend Flow (v1)

1. **Patient Registration**
   **POST** `/api/v1/patients`
   **Input:** name, DOB, gender, phone
   **Output:** `patientId`, `mrn` (e.g., `A00015`)

---

2. **Reception – Start Visit (Radiology)**
   **POST** `/api/v1/reception/start-visit`
   **Input:**

   * `patientId`
   * `dept = "Radiology"`
   * `testCodes = ["XRAY_CHEST"]` (must exist in Test Master)
   * discounts / tax / notes
     **Output:**
   * `visitId`
   * `token` (e.g., `AX-008`)
   * `orders[]` (e.g., `XRAY_CHEST`, price 300)
   * `invoice` (gross 300, tax 15, total 315, status `PendingPayment`)

---

3. **Reception – Complete Payment**
   **POST** `/api/v1/reception/complete-payment`
   **Input:**

   * `visitId`
   * `amount` (e.g., 4999 → capped internally to 315)
   * `method`, `receiptNo`, `notes`
     **Output:**
   * `visitId`
   * `invoiceId`
   * `invoiceStatus = "Paid"`
   * `paidAmount = 315`, `pendingAmount = 0`
   * `visitStatus = "Paid"`

---

4. **Radiology – Create Study for Visit**
   **POST** `/api/v1/radiology/studies/create-for-visit`
   **Input:**

   * `visitId`
     **Logic:**
   * Looks at radiology orders on that visit.
   * For each radiology order → creates a `RadiologyStudy`.
     **Output:**

   ```json
   [
     {
       "radiologyStudyId": "...",
       "visitId": "...",
       "orderId": "...",
       "testName": "X-Ray Chest",
       "modality": "Unknown" / "XRay",
       "status": "PendingImaging"
     }
   ]
   ```

---

5. **PACS – Upload Imaging for Study (with real DICOM metadata)**
   **POST** `/api/v1/radiology/pacs/{radiologyStudyId}/upload`
   **Input:**

   * `radiologyStudyId` (from step 4)
   * `files[]` = one or more real `.dcm` files
     **Logic:**
   * Uses DICOM parser to read metadata from each file:

     * `StudyInstanceUid`, `SeriesInstanceUid`, `SopInstanceUid`
     * `Modality`, `SeriesNumber`, `InstanceNumber`, `FrameCount`, etc.
   * Creates / updates one `PacsSeries` row per series.
   * Creates `PacsInstances` rows for each file.
   * Saves files to:

     * `PacsRoot/{radiologyStudyId}/{seriesId}/{instanceId}.dcm`
       **Output:**

   ```json
   {
     "radiologyStudyId": "...",
     "seriesId": "...",
     "instancesCreated": 1,
     "instanceIds": ["..."]
   }
   ```

   **Headers:**

   * `Location: /api/v1/radiology/pacs/instances/{firstInstanceId}/file`

---

6. **PACS – Download DICOM (raw file access)**
   **GET** `/api/v1/radiology/pacs/instances/{instanceId}/file`
   **Input:**

   * `instanceId` (from `instanceIds[]` or `Location` header)
     **Logic:**
   * Checks access (Org/Branch + role).
   * Finds `PacsInstance` by id.
   * Reads file from disk.
     **Output:**
   * `200 OK`
   * `content-type: application/octet-stream`
   * `content-disposition: attachment; filename={instanceId}.dcm`
   * Binary DICOM stream (opens in any DICOM viewer)

---

7. **PACS – Series Tree for DICOM Viewer (Cornerstone-ready)**
   **GET** `/api/v1/radiology/pacs/studies/{radiologyStudyId}/series-tree`
   **Input:**

   * `radiologyStudyId`
     **Logic:**
   * Enforces access guard (Org/Branch + RBAC).
   * Loads all `PacsSeries` + `PacsInstances` for that study.
   * Sorts by `SeriesNumber` and `InstanceNumber`.
   * Builds viewer-ready JSON, including `wadouri` URLs for each instance.
     **Output (shape):**

   ```json
   {
     "radiologyStudyId": "...",
     "studyInstanceUid": "...",
     "series": [
       {
         "seriesId": "...",
         "seriesInstanceUid": "...",
         "modality": "CT",
         "description": null,
         "seriesNumber": 1,
         "instanceCount": 1,
         "instances": [
           {
             "instanceId": "...",
             "sopInstanceUid": "...",
             "instanceNumber": 2,
             "frameCount": null,
             "wadouri": "wadouri:http://127.0.0.1:59999/api/v1/radiology/pacs/instances/{instanceId}/file"
           }
         ]
       }
     ]
   }
   ```

   This is what the future DICOM viewer will consume directly.

---

8. **PACS – Reindex Study Metadata (fix old / dirty data)**
   **POST** `/api/v1/radiology/pacs/{radiologyStudyId}/reindex`
   **Input:**

   * `radiologyStudyId` (can be from older Day 14.3 uploads)
     **Logic:**
   * Re-scans all files on disk for that study.
   * Re-parses DICOM tags.
   * Updates `PacsSeries` & `PacsInstances` rows with correct UIDs and metadata.
     **Output:**

   ```json
   {
     "radiologyStudyId": "...",
     "seriesUpdated": 1,
     "instancesUpdated": 1,
     "instancesFailed": 0
   }
   ```

---

9. **PACS Admin – Orphans & Storage Stats (maintenance)**
   **GET** `/api/v1/radiology/pacs/admin/orphans`
   **Output:** counts of:

   * `instancesMissingFiles`
   * `instancesWithMissingStudy`
   * `seriesWithNoInstances`

   **POST** `/api/v1/radiology/pacs/admin/orphans/cleanup`

   * Soft-deletes clearly broken PACS rows (`IsDeleted`, `DeletedAt`, `DeletedBy`).

   **GET** `/api/v1/radiology/pacs/admin/storage-stats`
   **Output:**

   * `totalBytes`, `totalStudies`, `totalSeries`, `totalInstances`
   * `byOrgBranch[]` for usage per org/branch

All admin endpoints are **Admin-only** and purely backend maintenance.

---

If you want, next we can:

* Turn **step 7** into an explicit **“Day 15 – PACS Viewer (Cornerstone) contract”** for the frontend,
  or
* Close Radiology here and jump to **Sample Collection Queue / DLMS flow**.
