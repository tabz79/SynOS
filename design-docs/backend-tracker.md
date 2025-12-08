1) Patient Registration
   Endpoint: POST /api/v1/Patients
   Input : name, DOB, gender, phone
   Output: patientId, MRN (A00014, etc.)

      ↓

2) Reception – Start Visit (Radiology)
   Endpoint: POST /api/v1/reception/start-visit
   Input :
     - patientId
     - dept = "Radiology"
     - testCodes = ["XRAY_CHEST"]   ← must exist in Test Master
     - discounts/tax/notes
   Output:
     - visitId
     - token (e.g., AX-007)
     - orders[]   (e.g., XRAY_CHEST, price 300)
     - invoice    (gross 300, tax 15, total 315, status PendingPayment)

      ↓

3) Reception – Complete Payment
   Endpoint: POST /api/v1/reception/complete-payment
   Input :
     - visitId
     - amount (e.g., 4999 → capped to 315 internally)
     - method, receiptNo, notes
   Output:
     - visitId
     - invoiceId
     - invoiceStatus = "Paid"
     - paidAmount = 315, pending = 0
     - visitStatus = "Paid"

      ↓

4) Radiology – Create Study for Visit
   Endpoint: POST /api/v1/radiology/studies/create-for-visit
   Input :
     - visitId
   Logic:
     - Looks at orders on that visit (XRAY_CHEST).
     - For each radiology order → creates a RadiologyStudy.
   Output:
     - [ { radiologyStudyId, visitId, orderId, testName = "X-Ray Chest",
           modality = "Unknown"/"XRay", status = "PendingImaging" } ]

      ↓

5) PACS – Upload Imaging for Study (Mini PACS)
   Endpoint: POST /api/v1/radiology/pacs/{radiologyStudyId}/upload
   Input :
     - radiologyStudyId (from step 4)
     - files[] = one or more DICOMs
   Logic:
     - Create PacsSeries row.
     - Create PacsInstances rows for each file.
     - Save files to:
       PacsRoot/{radiologyStudyId}/{seriesId}/{instanceId}.dcm
   Output:
     - JSON: radiologyStudyId, seriesId, instancesCreated, instanceIds[]
     - Header Location:
       /api/v1/radiology/pacs/instances/{firstInstanceId}/file

      ↓

6) PACS – Download DICOM
   Endpoint: GET /api/v1/radiology/pacs/instances/{instanceId}/file
   Input :
     - instanceId (from instanceIds[] or Location header)
   Logic:
     - Find instance by id.
     - Read file from disk.
   Output:
     - 200 OK
     - content-type: application/octet-stream
     - content-disposition: attachment; filename={instanceId}.dcm
     - Binary DICOM stream (correct size, opens in viewer)
