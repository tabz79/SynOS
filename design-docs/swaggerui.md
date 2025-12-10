Swagger UI
Select a definition

SynOS.Api v1
SynOS.Api
 1.0 
OAS3
http://127.0.0.1:59999/swagger/v1/swagger.json
Authorize
Appointments


POST
/api/v1/Appointments

Parameters
Try it out
Name	Description
Idempotency-Key
string
(header)
Idempotency-Key
Request body

application/json
Example Value
Schema
{
  "patientId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "scheduledFor": "2025-12-10T11:08:34.738Z",
  "department": "string",
  "notes": "string"
}
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/Appointments/{id}

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/Appointments/upcoming

Parameters
Try it out
Name	Description
department
string
(query)
department
date
string($date-time)
(query)
date
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/patients/{id}/same-day-visits

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
date
string($date-time)
(query)
date
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/Appointments/{id}/reschedule

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Request body

application/json
Example Value
Schema
{
  "newScheduledForUtc": "2025-12-10T11:08:34.942Z"
}
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/Appointments/{id}/cancel

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Request body

application/json
Example Value
Schema
{
  "reason": "string",
  "notes": "string",
  "cancelledByUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links
Auth


POST
/api/v1/Auth/login

Parameters
Cancel
Reset
No parameters

Request body

application/json
{
  "email": "admin@synos.com",
  "password": "admin123"
}
Execute
Clear
Responses
Curl

curl -X 'POST' \
  'http://127.0.0.1:59999/api/v1/Auth/login' \
  -H 'accept: */*' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "admin@synos.com",
  "password": "admin123"
}'
Request URL
http://127.0.0.1:59999/api/v1/Auth/login
Server response
Code	Details
200	
Response body
Download
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiI3MjE5ODVjNy1iYmFlLTQzNjgtYTk1OC04YjcyNDA4MmY1MzIiLCJlbWFpbCI6ImFkbWluQHN5bm9zLmNvbSIsInVuaXF1ZV9uYW1lIjoiU3lzdGVtIEFkbWluIiwicm9sZSI6IkFkbWluIiwibmJmIjoxNzY1MzU2ODYwLCJleHAiOjE3NjU0NDMyNjAsImlhdCI6MTc2NTM1Njg2MCwiaXNzIjoiU3luT1MuQXBpIiwiYXVkIjoiU3luT1MuQXBwIn0.KotRKhCzvKdQVDYf1kqrgUevpocahus3nV6zDrfUz1M",
  "refreshToken": "xFfCbCT96V7OpE0qDjDdR5XhPK5iQCB168R9YLnt65I36kZEdsRq0RimYyNNIbgPYJgn7wewJZCoUmrWqyLgCQ==",
  "expiresIn": 86400,
  "user": {
    "userId": "721985c7-bbae-4368-a958-8b724082f532",
    "email": "admin@synos.com",
    "name": "System Admin",
    "role": "Admin",
    "designation": null,
    "department": null,
    "isActive": true
  }
}
Response headers
 content-type: application/json; charset=utf-8 
 date: Wed,10 Dec 2025 08:54:20 GMT 
 server: Kestrel 
 transfer-encoding: chunked 
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/Auth/refresh

Parameters
Try it out
No parameters

Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/Auth/logout

Parameters
Try it out
No parameters

Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/Auth/dev-hash

Parameters
Try it out
Name	Description
password
string
(query)
password
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
string
No links
CriticalAlerts


GET
/api/v1/critical-alerts

Parameters
Try it out
Name	Description
status
string
(query)
Default value : Pending

Pending
limit
integer($int32)
(query)
Default value : 50

50
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/critical-alerts/{id}

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/critical-alerts/pending-acknowledgment

Parameters
Try it out
Name	Description
limit
integer($int32)
(query)
Default value : 50

50
Responses
Code	Description	Links
200	
Success

No links
Delivery


GET
/api/v1/delivery/queue

Parameters
Try it out
Name	Description
dept
string
(query)
dept
status
string
(query)
status
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
[
  {
    "reportId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "tokenNumber": "string",
    "patientName": "string",
    "age": 0,
    "sex": "string",
    "patientPhone": "string",
    "patientEmail": "string",
    "tests": [
      "string"
    ],
    "signedAt": "2025-12-10T11:08:35.286Z",
    "criticalCount": 0,
    "pdfUrl": "string",
    "lastDeliveryMethod": 0,
    "lastDeliveryStatus": 0
  }
]
No links
401	
Unauthorized

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links

POST
/api/v1/delivery/print

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "reportId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "logId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "string"
}
No links
400	
Bad Request

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
401	
Unauthorized

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
404	
Not Found

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links

POST
/api/v1/delivery/whatsapp

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "reportId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "phone": "string"
}
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "logId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "string",
  "link": "string",
  "token": "string",
  "expiresAt": "2025-12-10T11:08:35.503Z"
}
No links
400	
Bad Request

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
401	
Unauthorized

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
404	
Not Found

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links

POST
/api/v1/delivery/sms

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "reportId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "phone": "string"
}
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "logId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "string",
  "link": "string",
  "token": "string",
  "expiresAt": "2025-12-10T11:08:35.628Z"
}
No links
400	
Bad Request

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
401	
Unauthorized

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
404	
Not Found

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links

POST
/api/v1/delivery/email

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "reportId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "string"
}
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "logId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "string"
}
No links
400	
Bad Request

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
401	
Unauthorized

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
404	
Not Found

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links

POST
/api/v1/delivery/handed-over

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "reportId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "logId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "string"
}
No links
401	
Unauthorized

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
404	
Not Found

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links

GET
/api/v1/delivery/reports/{reportId}/attempts

Parameters
Try it out
Name	Description
reportId *
string($uuid)
(path)
reportId
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
[
  {
    "method": 0,
    "recipient": "string",
    "attempt": 0,
    "sentAt": "2025-12-10T11:08:35.944Z",
    "status": 0,
    "errorMessage": "string",
    "retryCount": 0
  }
]
No links
401	
Unauthorized

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
404	
Not Found

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links

POST
/api/v1/delivery/reports/{reportId}/resend

Parameters
Try it out
Name	Description
reportId *
string($uuid)
(path)
reportId
method
integer($int32)
(query)
Available values : 0, 1, 2, 3, 4, 5


--
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "logId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "string"
}
No links
400	
Bad Request

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
401	
Unauthorized

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
404	
Not Found

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
EditLocks


POST
/api/v1/edit-locks/acquire

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "entityType": "string",
  "entityId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/edit-locks/release

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "lockId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/edit-locks/status

Parameters
Try it out
Name	Description
entityType
string
(query)
entityType
entityId
string($uuid)
(query)
entityId
Responses
Code	Description	Links
200	
Success

No links
Health


GET
/healthz

Parameters
Try it out
No parameters

Responses
Code	Description	Links
200	
Success

No links
Invoices


GET
/api/v1/invoices/{id}/print

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Responses
Code	Description	Links
200	
Success

No links
LabAnalyzerMappings


POST
/api/v1/lab/analyzers/{analyzerId}/mappings

Parameters
Try it out
Name	Description
analyzerId *
string($uuid)
(path)
analyzerId
Request body

application/json
Example Value
Schema
{
  "analyzerTestCode": "string",
  "synosTestCode": "string",
  "unitsOverride": "string",
  "refLowOverride": 0,
  "refHighOverride": 0
}
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "mappingId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "analyzerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "analyzerName": "string",
  "analyzerTestCode": "string",
  "synosTestCode": "string",
  "unitsOverride": "string",
  "refLowOverride": 0,
  "refHighOverride": 0,
  "isEnabled": true,
  "createdAt": "2025-12-10T11:08:36.348Z"
}
No links

GET
/api/v1/lab/analyzers/{analyzerId}/mappings

Parameters
Try it out
Name	Description
analyzerId *
string($uuid)
(path)
analyzerId
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
[
  {
    "mappingId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "analyzerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "analyzerName": "string",
    "analyzerTestCode": "string",
    "synosTestCode": "string",
    "unitsOverride": "string",
    "refLowOverride": 0,
    "refHighOverride": 0,
    "isEnabled": true,
    "createdAt": "2025-12-10T11:08:36.385Z"
  }
]
No links

PUT
/api/v1/lab/analyzers/{analyzerId}/mappings/{mappingId}

Parameters
Try it out
Name	Description
analyzerId *
string($uuid)
(path)
analyzerId
mappingId *
string($uuid)
(path)
mappingId
Request body

application/json
Example Value
Schema
{
  "analyzerTestCode": "string",
  "synosTestCode": "string",
  "unitsOverride": "string",
  "refLowOverride": 0,
  "refHighOverride": 0,
  "isEnabled": true
}
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "mappingId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "analyzerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "analyzerName": "string",
  "analyzerTestCode": "string",
  "synosTestCode": "string",
  "unitsOverride": "string",
  "refLowOverride": 0,
  "refHighOverride": 0,
  "isEnabled": true,
  "createdAt": "2025-12-10T11:08:36.491Z"
}
No links
LabAnalyzerResults


POST
/api/v1/lab/analyzers/{analyzerId}/results/manual

Parameters
Try it out
Name	Description
analyzerId *
string($uuid)
(path)
analyzerId
Request body

application/json
Example Value
Schema
{
  "rawMessage": "string",
  "patientIdentifier": "string",
  "analyzerTestCode": "string",
  "resultValue": "string",
  "units": "string",
  "flags": "string",
  "measuredAt": "2025-12-10T11:08:36.554Z"
}
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "inboxId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "analyzerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "string",
  "patientIdentifier": "string",
  "analyzerTestCode": "string",
  "resultValue": "string",
  "units": "string"
}
No links

POST
/api/v1/lab/analyzers/{analyzerId}/results/raw

Parameters
Try it out
Name	Description
analyzerId *
string($uuid)
(path)
analyzerId
Request body

application/json
Example Value
Schema
{
  "protocol": "string",
  "rawMessage": "string"
}
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "inboxId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "analyzerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "string",
  "patientIdentifier": "string",
  "analyzerTestCode": "string",
  "resultValue": "string",
  "units": "string"
}
No links

GET
/api/v1/lab/analyzers/{analyzerId}/results/inbox

Parameters
Try it out
Name	Description
analyzerId *
string($uuid)
(path)
analyzerId
limit
integer($int32)
(query)
Default value : 50

50
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
[
  {
    "inboxId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "analyzerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "status": "string",
    "patientIdentifier": "string",
    "analyzerTestCode": "string",
    "resultValue": "string",
    "units": "string"
  }
]
No links

POST
/api/v1/lab/analyzers/{analyzerId}/results/{inboxId}/auto-match

Parameters
Try it out
Name	Description
analyzerId *
string($uuid)
(path)
analyzerId
inboxId *
string($uuid)
(path)
inboxId
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "inboxId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "analyzerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "string",
  "patientIdentifier": "string",
  "analyzerTestCode": "string",
  "resultValue": "string",
  "units": "string"
}
No links

POST
/api/v1/lab/analyzers/{analyzerId}/results/auto-match-all

Parameters
Try it out
Name	Description
analyzerId *
string($uuid)
(path)
analyzerId
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
0
No links

POST
/api/v1/lab/analyzers/{analyzerId}/results/{inboxId}/import-to-order

Parameters
Try it out
Name	Description
analyzerId *
string($uuid)
(path)
analyzerId
inboxId *
string($uuid)
(path)
inboxId
submitForVerification
boolean
(query)
Default value : true


true
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "inboxId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "analyzerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "orderId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "parameterCode": "string",
  "resultId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "string",
  "message": "string"
}
No links

POST
/api/v1/lab/analyzers/{analyzerId}/results/import-all-matched

Parameters
Try it out
Name	Description
analyzerId *
string($uuid)
(path)
analyzerId
submitForVerification
boolean
(query)
Default value : true


true
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "additionalProp1": 0,
  "additionalProp2": 0,
  "additionalProp3": 0
}
No links
LabAnalyzers


POST
/api/v1/lab/analyzers

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "name": "string",
  "model": "string",
  "manufacturer": "string",
  "connectionType": "string",
  "notes": "string",
  "orgId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "analyzerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "string",
  "model": "string",
  "manufacturer": "string",
  "connectionType": "string",
  "isEnabled": true,
  "notes": "string"
}
No links

GET
/api/v1/lab/analyzers

Parameters
Try it out
No parameters

Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
[
  {
    "analyzerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "string",
    "model": "string",
    "manufacturer": "string",
    "connectionType": "string",
    "isEnabled": true,
    "notes": "string"
  }
]
No links

PUT
/api/v1/lab/analyzers/{analyzerId}

Parameters
Try it out
Name	Description
analyzerId *
string($uuid)
(path)
analyzerId
Request body

application/json
Example Value
Schema
{
  "name": "string",
  "model": "string",
  "manufacturer": "string",
  "connectionType": "string",
  "notes": "string",
  "isEnabled": true
}
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "analyzerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "string",
  "model": "string",
  "manufacturer": "string",
  "connectionType": "string",
  "isEnabled": true,
  "notes": "string"
}
No links

GET
/api/v1/lab/analyzers/{analyzerId}

Parameters
Try it out
Name	Description
analyzerId *
string($uuid)
(path)
analyzerId
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "analyzerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "string",
  "model": "string",
  "manufacturer": "string",
  "connectionType": "string",
  "isEnabled": true,
  "notes": "string"
}
No links
Pacs


POST
/api/v1/radiology/pacs/{radiologyStudyId}/upload

Parameters
Try it out
Name	Description
radiologyStudyId *
string($uuid)
(path)
radiologyStudyId
Request body

multipart/form-data
files
array
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/radiology/pacs/instances/{instanceId}/file

Parameters
Try it out
Name	Description
instanceId *
string($uuid)
(path)
instanceId
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/radiology/pacs/{radiologyStudyId}/reindex

Parameters
Try it out
Name	Description
radiologyStudyId *
string($uuid)
(path)
radiologyStudyId
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/radiology/pacs/studies/{radiologyStudyId}/series-tree

Parameters
Try it out
Name	Description
radiologyStudyId *
string($uuid)
(path)
radiologyStudyId
Responses
Code	Description	Links
200	
Success

No links
PacsAdmin


GET
/api/v1/radiology/pacs/admin/orphans

Parameters
Try it out
No parameters

Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/radiology/pacs/admin/orphans/cleanup

Parameters
Try it out
No parameters

Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/radiology/pacs/admin/storage-stats

Parameters
Try it out
No parameters

Responses
Code	Description	Links
200	
Success

No links
Patients


POST
/api/v1/Patients

Parameters
Try it out
Name	Description
Idempotency-Key
string
(header)
Idempotency-Key
Request body

application/json
Example Value
Schema
{
  "firstName": "string",
  "lastName": "string",
  "dateOfBirth": "2025-12-10T11:08:37.371Z",
  "gender": "string",
  "currentPhoneNumber": "string"
}
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/Patients

Parameters
Try it out
Name	Description
q
string
(query)
q
limit
integer($int32)
(query)
Default value : 20

20
offset
integer($int32)
(query)
Default value : 0

0
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/Patients/{id}

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/Patients/{id}/phone-history

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/Patients/{id}/possible-duplicates

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/Patients/merge-preview

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "targetId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "sourceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/Patients/merge

Parameters
Try it out
Name	Description
Idempotency-Key
string
(header)
Idempotency-Key
Request body

application/json
Example Value
Schema
{
  "targetId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "sourceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links
Radiology


POST
/api/v1/radiology/studies/create-for-visit

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "visitId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/radiology/studies/queue

Parameters
Try it out
Name	Description
status
array[string]
(query)
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/radiology/studies/assign

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "studyId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/radiology/studies/{studyId}/attachments

Parameters
Try it out
Name	Description
studyId *
string($uuid)
(path)
studyId
Request body

multipart/form-data
file
string($binary)
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/radiology/studies/set-external-mapping

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "studyId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "systemName": "string",
  "accessionNumber": "string",
  "viewerUrl": "string"
}
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/radiology/studies/mark-imaging-completed

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "studyId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links
RadiologyReports


GET
/api/v1/radiology/reports/worklist

Parameters
Try it out
No parameters

Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/radiology/reports/{studyId}

Parameters
Try it out
Name	Description
studyId *
string($uuid)
(path)
studyId
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/radiology/reports/draft

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "studyId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "findings": "string",
  "impression": "string",
  "additionalNotes": "string"
}
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/radiology/reports/sign

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "studyId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links
Reception


POST
/api/v1/reception/start-visit

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "patientId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "dept": "string",
  "testCodes": [
    "string"
  ],
  "referrerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "appointmentId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "discountAmount": 0,
  "discountPercent": 0,
  "taxPercent": 0,
  "notes": "string",
  "combinedBillingGroupId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/reception/complete-payment

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "visitId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "amount": 0,
  "method": "string",
  "receiptNo": "string",
  "notes": "string"
}
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/reception/visit-summary/{visitId}

Parameters
Try it out
Name	Description
visitId *
string($uuid)
(path)
visitId
Responses
Code	Description	Links
200	
Success

No links
Reports


POST
/api/v1/reports/{reportId}/sign

Parameters
Try it out
Name	Description
reportId *
string($uuid)
(path)
reportId
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/reports/{orderId}/results

Parameters
Try it out
Name	Description
orderId *
string($uuid)
(path)
orderId
Request body

application/json
Example Value
Schema
{
  "results": [
    {
      "parameterCode": "string",
      "value": "string",
      "remarks": "string"
    }
  ]
}
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/reports/{orderId}

Parameters
Cancel
Name	Description
orderId *
string($uuid)
(path)
5b6a7804-a686-4ffd-8e15-6afcffde2803
Execute
Clear
Responses
Curl

curl -X 'GET' \
  'http://127.0.0.1:59999/api/v1/reports/5b6a7804-a686-4ffd-8e15-6afcffde2803' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiI3MjE5ODVjNy1iYmFlLTQzNjgtYTk1OC04YjcyNDA4MmY1MzIiLCJlbWFpbCI6ImFkbWluQHN5bm9zLmNvbSIsInVuaXF1ZV9uYW1lIjoiU3lzdGVtIEFkbWluIiwicm9sZSI6IkFkbWluIiwibmJmIjoxNzY1MzU2ODYwLCJleHAiOjE3NjU0NDMyNjAsImlhdCI6MTc2NTM1Njg2MCwiaXNzIjoiU3luT1MuQXBpIiwiYXVkIjoiU3luT1MuQXBwIn0.KotRKhCzvKdQVDYf1kqrgUevpocahus3nV6zDrfUz1M'
Request URL
http://127.0.0.1:59999/api/v1/reports/5b6a7804-a686-4ffd-8e15-6afcffde2803
Server response
Code	Details
200	
Response body
Download
{
  "reportId": "941e3475-c9a4-4d11-872c-59a728f9b940",
  "orderId": "5b6a7804-a686-4ffd-8e15-6afcffde2803",
  "patient": {
    "patientId": "a327dabf-bdc6-4383-a553-a98997a9641d",
    "mrn": "A00016",
    "name": "Lab AutoMatch Test1",
    "sex": "",
    "age": 0
  },
  "visit": {
    "id": "f5995fc5-93a8-4559-95f0-64d48de6ca48",
    "token": "AP-001"
  },
  "status": "ReadyForSignature",
  "signedAt": null,
  "delivered": false,
  "deliveredAt": null,
  "pathologistComments": null,
  "interpretation": null,
  "recommendations": null,
  "testResults": [
    {
      "testCode": "CBC",
      "testName": "Complete Blood Count",
      "parameters": [
        {
          "parameterCode": "CBC",
          "parameterName": "CBC",
          "value": "14.0",
          "unit": null,
          "referenceRange": null,
          "remarks": "Imported from analyzer Demo CBC Analyzer (InboxId=8c0f01bc-b52f-455e-9fbb-6ca238ce4e62)",
          "flag": null
        }
      ]
    }
  ]
}
Response headers
 content-type: application/json; charset=utf-8 
 date: Wed,10 Dec 2025 09:06:37 GMT 
 server: Kestrel 
 transfer-encoding: chunked 
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/reports/{orderId}/delivered

Parameters
Try it out
Name	Description
orderId *
string($uuid)
(path)
orderId
Responses
Code	Description	Links
200	
Success

No links
ReportTemplate


POST
/api/v1/reports/templates

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "modality": "string",
  "name": "string",
  "description": "string",
  "templateJson": "string",
  "createdBy": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/reports/templates

Parameters
Try it out
Name	Description
modality
string
(query)
modality
includeDeleted
boolean
(query)
Default value : false


false
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/reports/templates/{id}

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Responses
Code	Description	Links
200	
Success

No links

PUT
/api/v1/reports/templates/{id}

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Request body

application/json
Example Value
Schema
{
  "modality": "string",
  "name": "string",
  "description": "string",
  "templateJson": "string",
  "isPublished": true,
  "isDefault": true
}
Responses
Code	Description	Links
200	
Success

No links

DELETE
/api/v1/reports/templates/{id}

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/reports/templates/{id}/publish

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/reports/templates/{id}/set-default

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/reports/templates/{id}/preview

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
visitId
string($uuid)
(query)
visitId
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/reports/templates/render

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "reportId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "templateId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links
Result


GET
/api/v1/results/orders/{orderId}

Parameters
Cancel
Name	Description
orderId *
string($uuid)
(path)
5b6a7804-a686-4ffd-8e15-6afcffde2803
Execute
Clear
Responses
Curl

curl -X 'GET' \
  'http://127.0.0.1:59999/api/v1/results/orders/5b6a7804-a686-4ffd-8e15-6afcffde2803' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiI3MjE5ODVjNy1iYmFlLTQzNjgtYTk1OC04YjcyNDA4MmY1MzIiLCJlbWFpbCI6ImFkbWluQHN5bm9zLmNvbSIsInVuaXF1ZV9uYW1lIjoiU3lzdGVtIEFkbWluIiwicm9sZSI6IkFkbWluIiwibmJmIjoxNzY1MzU2ODYwLCJleHAiOjE3NjU0NDMyNjAsImlhdCI6MTc2NTM1Njg2MCwiaXNzIjoiU3luT1MuQXBpIiwiYXVkIjoiU3luT1MuQXBwIn0.KotRKhCzvKdQVDYf1kqrgUevpocahus3nV6zDrfUz1M'
Request URL
http://127.0.0.1:59999/api/v1/results/orders/5b6a7804-a686-4ffd-8e15-6afcffde2803
Server response
Code	Details
200	
Response body
Download
[
  {
    "resultId": "bbe76a2b-4825-4141-aa20-83bd0bf389f9",
    "parameterCode": "CBC",
    "value": "14.0",
    "flag": null,
    "status": "PendingVerification"
  }
]
Response headers
 content-type: application/json; charset=utf-8 
 date: Wed,10 Dec 2025 09:05:32 GMT 
 server: Kestrel 
 transfer-encoding: chunked 
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/results

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "orderId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "results": [
    {
      "orderId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "parameterCode": "string",
      "value": "string",
      "techComments": "string"
    }
  ]
}
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/results/autosave

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "orderId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "draftJson": "string"
}
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/results/recover

Parameters
Try it out
Name	Description
orderId
string($uuid)
(query)
orderId
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/results/orders/{orderId}/submit

Parameters
Try it out
Name	Description
orderId *
string($uuid)
(path)
orderId
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/results/patient/{patientId}/history

Parameters
Try it out
Name	Description
patientId *
string($uuid)
(path)
patientId
parameterCode
string
(query)
parameterCode
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/results/{resultId}/modify

Parameters
Cancel
Reset
Name	Description
resultId *
string($uuid)
(path)
bbe76a2b-4825-4141-aa20-83bd0bf389f9
Request body

application/json
{
  "newValue": "14.0",
  "reason": "Correction after review — Day 14.11 test"
}

Execute
Clear
Responses
Curl

curl -X 'POST' \
  'http://127.0.0.1:59999/api/v1/results/bbe76a2b-4825-4141-aa20-83bd0bf389f9/modify' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiI3MjE5ODVjNy1iYmFlLTQzNjgtYTk1OC04YjcyNDA4MmY1MzIiLCJlbWFpbCI6ImFkbWluQHN5bm9zLmNvbSIsInVuaXF1ZV9uYW1lIjoiU3lzdGVtIEFkbWluIiwicm9sZSI6IkFkbWluIiwibmJmIjoxNzY1MzU2ODYwLCJleHAiOjE3NjU0NDMyNjAsImlhdCI6MTc2NTM1Njg2MCwiaXNzIjoiU3luT1MuQXBpIiwiYXVkIjoiU3luT1MuQXBwIn0.KotRKhCzvKdQVDYf1kqrgUevpocahus3nV6zDrfUz1M' \
  -H 'Content-Type: application/json' \
  -d '{
  "newValue": "14.0",
  "reason": "Correction after review — Day 14.11 test"
}
'
Request URL
http://127.0.0.1:59999/api/v1/results/bbe76a2b-4825-4141-aa20-83bd0bf389f9/modify
Server response
Code	Details
200	
Response body
Download
{
  "resultId": "bbe76a2b-4825-4141-aa20-83bd0bf389f9",
  "parameterCode": "CBC",
  "value": "14.0",
  "flag": null,
  "status": "PendingVerification"
}
Response headers
 content-type: application/json; charset=utf-8 
 date: Wed,10 Dec 2025 08:55:31 GMT 
 server: Kestrel 
 transfer-encoding: chunked 
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/results/{resultId}/audit

Parameters
Cancel
Name	Description
resultId *
string($uuid)
(path)
bbe76a2b-4825-4141-aa20-83bd0bf389f9
Execute
Clear
Responses
Curl

curl -X 'GET' \
  'http://127.0.0.1:59999/api/v1/results/bbe76a2b-4825-4141-aa20-83bd0bf389f9/audit' \
  -H 'accept: text/plain' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiI3MjE5ODVjNy1iYmFlLTQzNjgtYTk1OC04YjcyNDA4MmY1MzIiLCJlbWFpbCI6ImFkbWluQHN5bm9zLmNvbSIsInVuaXF1ZV9uYW1lIjoiU3lzdGVtIEFkbWluIiwicm9sZSI6IkFkbWluIiwibmJmIjoxNzY1MzU2ODYwLCJleHAiOjE3NjU0NDMyNjAsImlhdCI6MTc2NTM1Njg2MCwiaXNzIjoiU3luT1MuQXBpIiwiYXVkIjoiU3luT1MuQXBwIn0.KotRKhCzvKdQVDYf1kqrgUevpocahus3nV6zDrfUz1M'
Request URL
http://127.0.0.1:59999/api/v1/results/bbe76a2b-4825-4141-aa20-83bd0bf389f9/audit
Server response
Code	Details
200	
Response body
Download
[
  {
    "auditId": "c83b3e90-36e0-42a6-8a95-df68297fe296",
    "oldValue": "13.5",
    "newValue": "14.0",
    "reason": "Correction after review — Day 14.11 test",
    "changedByUserId": "721985c7-bbae-4368-a958-8b724082f532",
    "changedByName": "System Admin",
    "changedAt": "2025-12-10T08:55:31.6239933+00:00",
    "source": "Modify"
  }
]
Response headers
 content-type: application/json; charset=utf-8 
 date: Wed,10 Dec 2025 09:04:25 GMT 
 server: Kestrel 
 transfer-encoding: chunked 
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
[
  {
    "auditId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "oldValue": "string",
    "newValue": "string",
    "reason": "string",
    "changedByUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "changedByName": "string",
    "changedAt": "2025-12-10T11:08:39.084Z",
    "source": "string"
  }
]
No links
Samples


POST
/api/v1/samples/create-for-visit

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "visitId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/samples/{id}/collect

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Request body

application/json
Example Value
Schema
{
  "collectedByUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/samples/{id}/reject

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Request body

application/json
Example Value
Schema
{
  "rejectedByUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "reason": "string",
  "requiresRecollection": true
}
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/samples/worklist

Parameters
Try it out
Name	Description
status
integer($int32)
(query)
Available values : 0, 1, 2, 3


--
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/samples/{id}

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/samples/{id}/barcode

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Responses
Code	Description	Links
200	
Success

No links
SecureDownload


GET
/api/v1/public/reports/verify/{token}

Parameters
Try it out
Name	Description
token *
string
(path)
token
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
{
  "valid": true,
  "patientName": "string",
  "tests": [
    "string"
  ],
  "expiresAt": "2025-12-10T11:08:39.420Z",
  "downloadsRemaining": 0
}
No links
401	
Unauthorized

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
404	
Not Found

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links

GET
/api/v1/public/reports/download/{token}

Parameters
Try it out
Name	Description
token *
string
(path)
token
phone
string
(query)
phone
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
string
No links
401	
Unauthorized

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
404	
Not Found

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links

GET
/api/v1/public/reports/download-package/{token}

Parameters
Try it out
Name	Description
token *
string
(path)
token
phone
string
(query)
phone
Responses
Code	Description	Links
200	
Success

Media type

text/plain
Controls Accept header.
Example Value
Schema
string
No links
401	
Unauthorized

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
404	
Not Found

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
Users


POST
/api/v1/users/{userId}/signature

Parameters
Try it out
Name	Description
userId *
string($uuid)
(path)
userId
Request body

multipart/form-data
file
string($binary)
Responses
Code	Description	Links
200	
Success

No links
400	
Bad Request

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
401	
Unauthorized

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
403	
Forbidden

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
404	
Not Found

Media type

text/plain
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
No links
Visits


POST
/api/v1/Visits

Parameters
Try it out
Name	Description
Idempotency-Key
string
(header)
Idempotency-Key
Request body

application/json
Example Value
Schema
{
  "patientId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "department": "string",
  "referrerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "testCodes": [
    "string"
  ]
}
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/Visits

Parameters
Try it out
Name	Description
dept
string
(query)
dept
status
string
(query)
status
limit
integer($int32)
(query)
Default value : 50

50
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/Visits/{id}

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/Visits/{id}/payment

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Request body

application/json
Example Value
Schema
{
  "amount": 0,
  "method": "string",
  "receiptNo": "string",
  "receivedByUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links

POST
/api/v1/Visits/{id}/cancel

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Request body

application/json
Example Value
Schema
{
  "reason": "string",
  "notes": "string",
  "cancelledByUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
Responses
Code	Description	Links
200	
Success

No links

GET
/api/v1/Visits/{id}/token

Parameters
Try it out
Name	Description
id *
string($uuid)
(path)
id
Responses
Code	Description	Links
200	
Success

No links

Schemas
AcquireLockRequestDto{
entityType*	string
minLength: 1
entityId*	string($uuid)
}
AnalyzerImportResultDto{
inboxId	string($uuid)
analyzerId	string($uuid)
orderId	string($uuid)
nullable: true
parameterCode	string
nullable: true
resultId	string($uuid)
nullable: true
status	string
nullable: true
message	string
nullable: true
}
AnalyzerTestMappingSummaryDto{
mappingId	string($uuid)
analyzerId	string($uuid)
analyzerName	string
nullable: true
analyzerTestCode	string
nullable: true
synosTestCode	string
nullable: true
unitsOverride	string
nullable: true
refLowOverride	number($double)
nullable: true
refHighOverride	number($double)
nullable: true
isEnabled	boolean
createdAt	string($date-time)
}
AppointmentCreateDto{
patientId*	string($uuid)
scheduledFor*	string($date-time)
department*	string
minLength: 1
notes	string
nullable: true
}
AssignStudyRequestDto{
studyId*	string($uuid)
}
AutosaveRequestDto{
orderId	string($uuid)
draftJson	string
nullable: true
}
CancelRequestDto{
reason*	string
minLength: 1
notes	string
nullable: true
cancelledByUserId*	string($uuid)
}
CollectSampleRequestDto{
collectedByUserId*	string($uuid)
}
CreateAnalyzerTestMappingDto{
analyzerTestCode*	string
maxLength: 50
minLength: 1
synosTestCode*	string
maxLength: 50
minLength: 1
unitsOverride	string
maxLength: 20
nullable: true
refLowOverride	number($double)
nullable: true
refHighOverride	number($double)
nullable: true
}
CreateLabAnalyzerDto{
name*	string
maxLength: 100
minLength: 1
model*	string
maxLength: 50
minLength: 1
manufacturer*	string
maxLength: 50
minLength: 1
connectionType*	string
maxLength: 20
minLength: 1
notes	string
maxLength: 500
nullable: true
orgId	string($uuid)
branchId	string($uuid)
}
CreateRadiologyStudiesRequestDto{
visitId*	string($uuid)
}
CreateReportTemplateDto{
modality*	string
maxLength: 50
minLength: 1
name*	string
maxLength: 200
minLength: 3
description	string
maxLength: 500
minLength: 0
nullable: true
templateJson*	string
minLength: 1
createdBy*	string($uuid)
}
CreateSamplesRequestDto{
visitId*	string($uuid)
}
DeliveryAttemptDto{
method	DeliveryMethodinteger($int32)
Enum:
Array [ 6 ]
recipient	string
nullable: true
attempt	integer($int32)
sentAt	string($date-time)
status	NotificationStatusinteger($int32)
Enum:
Array [ 4 ]
errorMessage	string
nullable: true
retryCount	integer($int32)
}
DeliveryMethodinteger($int32)
Enum:
Array [ 6 ]
DeliveryQueueItemDto{
reportId	string($uuid)
tokenNumber	string
nullable: true
patientName	string
nullable: true
age	integer($int32)
sex	string
nullable: true
patientPhone	string
nullable: true
patientEmail	string
nullable: true
tests	[...]
signedAt	string($date-time)
criticalCount	integer($int32)
pdfUrl	string
nullable: true
lastDeliveryMethod	DeliveryMethodinteger($int32)
Enum:
Array [ 6 ]
lastDeliveryStatus	DeliveryStatusinteger($int32)
Enum:
Array [ 4 ]
}
DeliveryRequestDto{
reportId	string($uuid)
}
DeliveryResultDto{
logId	string($uuid)
status	string
nullable: true
}
DeliveryResultWithLinkDto{
logId	string($uuid)
status	string
nullable: true
link	string
nullable: true
token	string
nullable: true
expiresAt	string($date-time)
}
DeliveryStatusinteger($int32)
Enum:
Array [ 4 ]
DeliveryWithEmailRequestDto{
reportId	string($uuid)
email	string
nullable: true
}
DeliveryWithPhoneRequestDto{
reportId	string($uuid)
phone	string
nullable: true
}
FinalResultDto{
parameterCode	string
nullable: true
value	string
nullable: true
remarks	string
nullable: true
}
LabAnalyzerSummaryDto{
analyzerId	string($uuid)
name	string
nullable: true
model	string
nullable: true
manufacturer	string
nullable: true
connectionType	string
nullable: true
isEnabled	boolean
notes	string
nullable: true
}
LoginRequest{
email*	string($email)
minLength: 1
password*	string
minLength: 1
}
ManualAnalyzerResultDto{
rawMessage	string
nullable: true
patientIdentifier	string
maxLength: 100
nullable: true
analyzerTestCode	string
maxLength: 50
nullable: true
resultValue	string
nullable: true
units	string
maxLength: 20
nullable: true
flags	string
maxLength: 50
nullable: true
measuredAt	string($date-time)
nullable: true
}
ManualResultEnqueueResponseDto{
inboxId	string($uuid)
analyzerId	string($uuid)
status	string
nullable: true
patientIdentifier	string
nullable: true
analyzerTestCode	string
nullable: true
resultValue	string
nullable: true
units	string
nullable: true
}
MergeRequestDto{
targetId	string($uuid)
sourceId	string($uuid)
}
ModifyResultRequestDto{
newValue	string
nullable: true
reason	string
nullable: true
}
NotificationStatusinteger($int32)
Enum:
[ 0, 1, 2, 3 ]
ParameterResultDto{
orderId	string($uuid)
parameterCode	string
nullable: true
value	string
nullable: true
techComments	string
nullable: true
}
PatientCreateDto{
firstName*	string
minLength: 1
lastName*	string
minLength: 1
dateOfBirth*	string($date-time)
gender*	string
minLength: 1
currentPhoneNumber	string
nullable: true
}
PaymentRequestDto{
amount*	number($double)
method*	string
minLength: 1
receiptNo*	string
minLength: 1
receivedByUserId*	string($uuid)
}
ProblemDetails{
type	string
nullable: true
title	string
nullable: true
status	integer($int32)
nullable: true
detail	string
nullable: true
instance	string
nullable: true
}
RadiologyReportDraftDto{
studyId*	string($uuid)
findings*	string
minLength: 1
impression*	string
minLength: 1
additionalNotes	string
nullable: true
}
RadiologyStudyExternalMappingDto{
studyId*	string($uuid)
systemName	string
maxLength: 100
minLength: 0
nullable: true
accessionNumber	string
maxLength: 100
minLength: 0
nullable: true
viewerUrl	string
nullable: true
}
RawMessageIngestDto{
protocol*	string
minLength: 1
rawMessage*	string
minLength: 1
}
ReceptionCompletePaymentRequest{
visitId	string($uuid)
amount	number($double)
method	string
nullable: true
receiptNo	string
nullable: true
notes	string
nullable: true
}
ReceptionStartVisitRequest{
patientId	string($uuid)
dept	string
nullable: true
testCodes	[...]
referrerId	string($uuid)
nullable: true
appointmentId	string($uuid)
nullable: true
discountAmount	number($double)
nullable: true
discountPercent	number($double)
nullable: true
taxPercent	number($double)
nullable: true
notes	string
nullable: true
combinedBillingGroupId	string($uuid)
nullable: true
}
RejectSampleRequestDto{
rejectedByUserId*	string($uuid)
reason*	string
maxLength: 500
minLength: 1
requiresRecollection	boolean
}
ReleaseLockRequestDto{
lockId*	string($uuid)
}
RenderReportPdfDto{
reportId*	string($uuid)
templateId	string($uuid)
nullable: true
}
RescheduleRequestDto{
newScheduledForUtc	string($date-time)
}
ResultChangeAuditDto{
auditId	string($uuid)
oldValue	string
nullable: true
newValue	string
nullable: true
reason	string
nullable: true
changedByUserId	string($uuid)
changedByName	string
nullable: true
changedAt	string($date-time)
source	string
nullable: true
}
ResultEntryRequestDto{
orderId	string($uuid)
results	[...]
}
SampleStatusinteger($int32)
Enum:
Array [ 4 ]
SaveFinalResultsRequestDto{
results	[...]
}
SecureLinkVerificationDto{
valid	boolean
patientName	string
nullable: true
tests	[...]
expiresAt	string($date-time)
downloadsRemaining	integer($int32)
}
SignRadiologyReportRequestDto{
studyId*	string($uuid)
}
UpdateAnalyzerTestMappingDto{
analyzerTestCode*	string
maxLength: 50
minLength: 1
synosTestCode*	string
maxLength: 50
minLength: 1
unitsOverride	string
maxLength: 20
nullable: true
refLowOverride	number($double)
nullable: true
refHighOverride	number($double)
nullable: true
isEnabled	boolean
}
UpdateLabAnalyzerDto{
name*	string
maxLength: 100
minLength: 1
model*	string
maxLength: 50
minLength: 1
manufacturer*	string
maxLength: 50
minLength: 1
connectionType*	string
maxLength: 20
minLength: 1
notes	string
maxLength: 500
nullable: true
isEnabled	boolean
}
UpdateReportTemplateDto{
modality*	string
maxLength: 50
minLength: 1
name*	string
maxLength: 200
minLength: 3
description	string
maxLength: 500
minLength: 0
nullable: true
templateJson*	string
minLength: 1
isPublished	boolean
nullable: true
isDefault	boolean
nullable: true
}
VisitCreateDto{
patientId*	string($uuid)
department*	string
minLength: 1
referrerId	string($uuid)
nullable: true
testCodes*	[...]
}