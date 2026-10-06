# SYNOS — REAL MACHINE INTEGRATION FORENSIC AUDIT REPORT
**Target Codebase**: `D:\Projects\SynOS-Synthesized-Lab-Intelligence`  
**Active Git Branch**: `testing`  
**Audit Date**: October 5, 2026  
**Auditor**: Senior Integration & Forensic Security Engineer  
**Status**: Authorized Forensic Analysis (Read-Only)

---

# MACHINE INTEGRATION VERDICT

🟡 **PARTIAL INTEGRATION — SOME REAL PROTOCOLS EXIST, SOME ARE MISSING**

> **Blunt Reality**:  
> If you put a physical CT, MRI, or X-Ray modality in front of SynOS tomorrow and pointed its DICOM Storage SCU at Port `104`, `8899`, or `10411`, **SynOS would genuinely accept the association, negotiate the transfer syntax, receive the C-STORE DICOM images over TCP, parse the tags, write `.dcm` files to disk (`C:\SynOS_Files\PACS`), record them in SQL Server (`RadiologyStudies`, `PacsSeries`, `PacsInstances`), and fire a real-time SignalR event to the frontend viewer.**  
>
> **HOWEVER:**  
> 1. **Modality Worklist (MWL / C-FIND SCP) is NOT implemented at the protocol level.** A real scanner console querying SynOS for today's scheduled patients would receive connection refused or failure. There is only a dummy mock HTTP JSON endpoint (`/api/v1/radiology/modalities/simulate-mwl`).  
> 2. **Lab Analyzers (ASTM / HL7) have real TCP and RS-232 socket listener background services and custom string parsers**, but the TCP listener service **starts up inert with zero ports open** because `appsettings.json` lacks an `AnalyzerIntegration:Listeners` section (it reads config only from JSON, ignoring the database configuration table). Furthermore, the ASTM/HL7 implementation is **strictly unidirectional receiver-only (no bidirectional query/order download, and no ACK/NAK packet handshaking over the wire).**

---

## 1. Executive Summary

This forensic investigation was conducted to determine whether SynOS can communicate with real physical medical diagnostic hardware at the transport and protocol levels, without relying on UI buttons or frontend mocks.

### The Reality Breakdown

| Domain | Interface | Protocol / Transport | Implementation Status | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Radiology** | Storage SCP (Push) | DICOM C-STORE / C-ECHO over TCP | **Real Protocol Implementation** (via `FellowOakDicom` / `fo-dicom` 5.2.5). Actively bound to Ports `104`, `8899`, `10411`. | 🟢 **REAL** |
| **Radiology** | Verification SCU (Ping) | DICOM C-ECHO over TCP | **Real Protocol Implementation** (via `DicomClientFactory`). Tested against remote modalities via API trigger. | 🟢 **REAL** |
| **Radiology** | Modality Worklist (MWL) | DICOM C-FIND over TCP | **Not Implemented** at protocol level. Only an HTTP endpoint returning hardcoded JSON exists (`/simulate-mwl`). | 🔴 **MISSING / FAKE API** |
| **Radiology** | Image Query/Retrieve | DICOM C-FIND / C-MOVE / C-GET | **Not Implemented**. Modalities or third-party PACS cannot query or pull studies from SynOS over DICOM. | 🔴 **NOT IMPLEMENTED** |
| **Radiology** | MPPS / Storage Commitment | DICOM N-ACTION / N-CREATE | **Not Implemented**. | 🔴 **NOT IMPLEMENTED** |
| **Pathology** | Analyzer TCP Receiver | ASTM / HL7 over TCP Socket | **Real Protocol Implementation with Configuration Decoupling Gap**. Code exists in `AnalyzerTcpListenerService`, but `appsettings.json` has no entries, so zero ports are opened on startup. | 🟡 **PARTIAL / DORMANT** |
| **Pathology** | Analyzer Serial Receiver | ASTM / HL7 over RS-232 Serial COM | **Real Protocol Implementation** in `SerialPortListenerService`. Actively synchronizes with SQL database `AnalyzerListeners` table every 10 seconds. | 🟢 **REAL** |
| **Pathology** | Analyzer Parsers | ASTM E1394 / HL7 v2.x OBX/PID | **Real Application Parser Implementation** in `AstmProtocolParser.cs` and `Hl7ProtocolParser.cs`. | 🟢 **REAL** |
| **Pathology** | Analyzer Bidirectional / Host Query | ASTM / HL7 Bidirectional | **Not Implemented**. Receives results only; cannot send orders/worklists to analyzers. | 🔴 **NOT IMPLEMENTED** |

---

## 2. Actual Machine Integration Architecture

```
                       ┌────────────────────────────────────────────────────────┐
                       │                     PHYSICAL WORLD                     │
                       └────────────────────────────────────────────────────────┘
                                     │                                  │
         DICOM Images (C-STORE)     │                                  │ Serial RS-232 / TCP Sockets
         C-ECHO Verification         │                                  │ (ASTM / HL7 Raw Streams)
                                     ▼                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ SYNOS BACKEND RUNTIME (SynOS.Api.exe)                                                        │
│                                                                                              │
│  ┌───────────────────────────────┐                  ┌─────────────────────────────────────┐  │
│  │ DicomCStoreScpService         │                  │ AnalyzerTcpListenerService          │  │
│  │ - Bound: 0.0.0.0:104          │                  │ - Listens on TCP Ports (if in JSON) │  │
│  │ - Bound: 0.0.0.0:8899         │                  ├─────────────────────────────────────┤  │
│  │ - Bound: 0.0.0.0:10411        │                  │ SerialPortListenerService           │  │
│  │ - AE Title: SYNOS_PACS        │                  │ - Scans DB AnalyzerListeners        │  │
│  │ - fo-dicom 5.2.5              │                  │ - Opens COM1..COMn (RS-232)         │  │
│  └──────────────┬────────────────┘                  └──────────────────┬──────────────────┘  │
│                 │                                                      │                     │
│                 ▼                                                      ▼                     │
│  ┌───────────────────────────────┐                  ┌─────────────────────────────────────┐  │
│  │ DicomCStoreProvider           │                  │ AstmProtocolParser /                │  │
│  │ - C-ECHO -> Success (0x0000)  │                  │ Hl7ProtocolParser                   │  │
│  │ - C-STORE -> Saves .dcm file  │                  │ - Extracts PID/MRN, Test, Value     │  │
│  │ - Creates Study/Series/Inst   │                  └──────────────────┬──────────────────┘  │
│  └──────────────┬────────────────┘                                     │                     │
│                 │                                                      ▼                     │
│                 │                                   ┌─────────────────────────────────────┐  │
│                 │                                   │ LabAnalyzerResultInbox              │  │
│                 │                                   │ - Status: Pending                   │  │
│                 │                                   ├─────────────────────────────────────┤  │
│                 │                                   │ AnalyzerResultMatcherService        │  │
│                 │                                   │ - Matches MRN + TestCode to Order   │  │
│                 │                                   ├─────────────────────────────────────┤  │
│                 │                                   │ AnalyzerResultImportService         │  │
│                 │                                   │ - Pushes to Lab Result Verification │  │
│                 │                                   └─────────────────────────────────────┘  │
│                 ▼                                                                            │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Storage & Persistence Layer                                                            │  │
│  │ - Filesystem: C:\SynOS_Files\PACS\{StudyUid}\{SeriesUid}\{SopUid}.dcm                  │  │
│  │ - SQL Database: RadiologyStudies, PacsSeries, PacsInstances, LabAnalyzerResultInbox    │  │
│  │ - Real-Time Broadcast: BranchOperationsHub.Clients.All.SendAsync("StudyAcquired", ...)  │  │
│  └────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Radiology & PACS Integration (Forensic Proof)

### 3.1 DICOM C-STORE SCP Listener

* **Source File**: `src/SynOS.Api/BackgroundServices/DicomCStoreScpService.cs`
* **Library**: `FellowOakDicom` (fo-dicom) version `5.2.5`
* **Service Lifetime**: Registered as a hosted service in `Program.cs` (lines 597):
  ```csharp
  builder.Services.AddHostedService<DicomCStoreScpService>();
  ```
* **Active Runtime Verification**:
  Verified running right now on the testing host (PID `3288`):
  ```text
  LocalAddress  LocalPort  State   OwningProcess
  ------------  ---------  -----   -------------
  0.0.0.0       104        Listen  3288
  0.0.0.0       8899       Listen  3288
  0.0.0.0       10411      Listen  3288
  ```
* **Listener Configuration Details**:
  * **Protocol**: DICOM Upper Layer Protocol over TCP/IP
  * **Transport**: TCP
  * **Host / Binding**: `0.0.0.0` (all IPv4 interfaces)
  * **Ports**: `104` (standard DICOM privileged port), `8899` (SynOS alternative), `10411` (PACS high port)
  * **Called AE Title**: Accepts associations; configured default is `SYNOS_PACS`
  * **Calling AE Title**: Accepts `ANY` calling AE (logs `Association.CallingAE`)
  * **Supported Presentation Contexts & Transfer Syntaxes** (lines 73-81):
    - `ExplicitVRLittleEndian` (1.2.840.10008.1.2.1)
    - `ImplicitVRLittleEndian` (1.2.840.10008.1.2)
    - `ExplicitVRBigEndian` (1.2.840.10008.1.2.2)
    - `JPEGLSLossless` (1.2.840.10008.1.2.4.80)
    - `JPEG2000Lossless` (1.2.840.10008.1.2.4.90)
    - `RLELossless` (1.2.840.10008.1.2.5)

### 3.2 DICOM C-ECHO (Verification Service)
* **SCP (Inbound Ping)**: Implemented in `DicomCStoreScpService.cs` line 88 (`OnCEchoRequestAsync`). Returns `DicomStatus.Success (0x0000)`.
* **SCU (Outbound Ping)**: Implemented in `RadiologyModalitiesController.cs` line 294 using `DicomClientFactory.Create(host, port, false, "SYNOS_PACS", remoteAe)`. Sends `DicomCEchoRequest` to physical scanners to verify network reachability.

### 3.3 DICOM C-STORE Data Flow & Processing Chain

The real execution trace from network socket to disk and database:

1. **Network Ingestion**: Physical scanner initiates TCP 3-way handshake on port 104/8899/10411.
2. **Association Negotiation**: `DicomCStoreProvider.OnReceiveAssociationRequestAsync` accepts all presentation contexts matching the accepted transfer syntaxes.
3. **C-STORE Command Ingestion**: Scanner sends `C-STORE-RQ` with dataset.
4. **Extraction**: `DicomCStoreProvider.OnCStoreRequestAsync` extracts:
   - `StudyInstanceUID` (Tag `(0020,000D)`)
   - `SeriesInstanceUID` (Tag `(0020,000E)`)
   - `SOPInstanceUID` (Tag `(0008,0018)`)
   - `PatientID` (Tag `(0010,0020)`)
   - `PatientName` (Tag `(0010,0010)`)
   - `Modality` (Tag `(0008,0060)`)
   - `StudyDescription` (Tag `(0008,1030)`)
   - `SeriesDescription` (Tag `(0008,103E)`)
   - `InstanceNumber` (Tag `(0020,0013)`)
5. **Physical Disk Write**:
   - Directory: `C:\SynOS_Files\PACS\{studyUid}\{seriesUid}`
   - File: `{sopUid}.dcm`
   - File saved asynchronously via `await request.File.SaveAsync(filePath);`
6. **Database Ingestion (Scoped `SynOSDbContext`)**:
   - Queries `Patients` by `MRN == patientIdStr` or `DisplayName == patientNameStr`.
   - If not found: Automatically registers a new `Patient` entity.
   - Queries `RadiologyStudies` by `ExternalStudyInstanceUid == studyUid`.
   - If not found: Creates a `Visit`, an `Order`, and a `RadiologyStudy` record with status `"Acquired"`.
   - Queries `PacsSeries` by `SeriesInstanceUid`: Creates if missing.
   - Queries `PacsInstances` by `SopInstanceUid`: Inserts instance with relative path `PACS/{studyUid}/{seriesUid}/{sopUid}.dcm`, file size, and MIME type `application/dicom`.
7. **SignalR Real-Time Event**:
   - Broadcasts `StudyAcquired` over `BranchOperationsHub` to all connected browser clients.
8. **DICOM Response**: Returns `DicomCStoreResponse(request, DicomStatus.Success)` (Status code `0x0000`).

---

## 4. Patient & Study Matching Rules (Forensics)

### How does SynOS associate incoming DICOM data with existing orders?

* **Primary Key Match**: Tag `(0010,0020)` (`PatientID`) is matched against `Patient.MRN`.
* **Secondary Key Match**: Tag `(0010,0010)` (`PatientName`) is matched against `Patient.DisplayName`.
* **Study Key Match**: Tag `(0020,000D)` (`StudyInstanceUID`) is matched against `RadiologyStudies.ExternalStudyInstanceUid`.

### Edge Case Analysis (From Code Trace):

| Scenario | Behavior in Code | Forensic Finding |
| :--- | :--- | :--- |
| **Patient exists** | Reuses existing `Patient` entity. | ✅ Normal matching. |
| **Patient does not exist** | Automatically instantiates and saves a new `Patient` record with generated MRN and default DOB (lines 169-185). | ⚠️ **Auto-creation**: Never rejects images, but may cause unlinked duplicate patients if MRN doesn't match SynOS MRN format. |
| **Study arrives BEFORE Order** | Automatically generates a synthetic `Visit` (Status: `Completed`), `Order` (Status: `Active`), and `RadiologyStudy` (Status: `"Acquired"`) on the fly (lines 205-248). | ⚠️ **Self-healing / Over-accommodating**: Allows scanners to push unsolicited scans, but creates synthetic orders with Price = 0. |
| **Duplicate Study arrives** | Existing `RadiologyStudy` is located; its status is updated to `"Acquired"`. | ✅ Handled idempotently. |
| **Duplicate Instance (SOP UID) arrives** | `PacsInstances.FirstOrDefaultAsync(i => i.SopInstanceUid == sopUid)` detects existing instance; discards duplicate DB insert; overwrites disk file. | ✅ Safe / Idempotent. |
| **Accession Number mismatch** | Accession number in DICOM tag is **ignored during C-STORE matching**. SynOS generates its own `"ACC-" + DateTime.Now...` unless already populated. | ⚠️ **Gap**: Does NOT cross-match against scheduled Accession Numbers. |

---

## 5. Modality Worklist (MWL) Forensic Investigation

### Status: 🔴 **NOT IMPLEMENTED AT PROTOCOL LEVEL**

* **Codebase Search**:
  - `IDicomCFindProvider`: **0 occurrences**.
  - `DicomCFindRequest` handler: **0 occurrences**.
  - `OnCFindRequest`: **0 occurrences**.
* **What DOES exist**:
  - In `src/SynOS.Data/DbInitializer.cs`: Database columns `AllowMwl` on `RadiologyModalities` table.
  - In `src/SynOS.Api/Controllers/Radiology/RadiologyModalitiesController.cs` lines 532-550:
    ```csharp
    [HttpGet("simulate-mwl")]
    public async Task<IActionResult> SimulateMwlWorklistQuery()
    {
        var worklist = new[]
        {
            new { radiologyStudyId = Guid.NewGuid().ToString(), patientName = "Vasudeva Rao", modality = "MR", ... },
            new { radiologyStudyId = Guid.NewGuid().ToString(), patientName = "Ananya Sharma", modality = "CT", ... }
        };
        return Ok(new { Success = true, CallingAe = "GE_MRI_01", QueryType = "C-FIND (DICOM Modality Worklist)", ... });
    }
    ```
* **Forensic Answer to Rule 6**:
  > **Could a real CT/MRI/X-ray console query SynOS for today's scheduled patients?**  
  > **NO. ABSOLUTELY NOT.**  
  > A physical modality console uses standard DICOM C-FIND on TCP port 104/8899 to retrieve scheduled worklists. If it sends a C-FIND request to SynOS, fo-dicom will reject it with `DicomStatus.UnrecognizedOperation` because `DicomCStoreProvider` only implements `IDicomCStoreProvider` and `IDicomCEchoProvider`. The HTTP `/simulate-mwl` endpoint is an API mock for frontend testing only.

---

## 6. Laboratory Analyzer Integration (Forensic Proof)

### 6.1 Analyzer Interfaces Implemented

Two distinct background listener services exist in `SynOS.Api/BackgroundServices`:

#### 1. `AnalyzerTcpListenerService.cs` (ASTM / HL7 over TCP)
* **Protocol**: ASTM E1394-97 / HL7 v2.x
* **Transport**: Raw TCP socket (`System.Net.Sockets.TcpListener`)
* **Binding**: `IPAddress.Any`
* **Configuration Source**: `IOptions<AnalyzerIntegrationSettings>` from `appsettings.json`.
* **CRITICAL FINDING**: In `appsettings.json`, the section `AnalyzerIntegration` **does not exist**!
  As proven by the service startup logs:
  ```text
  [07:28:05 INF] Analyzer TCP Listener Service starting...
  [07:28:05 WRN] No analyzer TCP listeners configured in appsettings.json.
  ```
  Therefore, the TCP listener service boots up and immediately becomes dormant without binding to any port.

#### 2. `SerialPortListenerService.cs` (ASTM / HL7 over RS-232 COM)
* **Protocol**: ASTM / HL7
* **Transport**: RS-232 Serial Port (`System.IO.Ports.SerialPort`)
* **Configuration Source**: SQL Database table `AnalyzerListeners` (`ConnectionMode == "SerialCom"`).
* **Sync Loop**: Polls `AnalyzerListeners` every 10 seconds. When configured, opens physical COM ports (e.g. `COM1`, `COM2`) with baud rate (9600), parity, data bits (8), stop bits.
* **Framing**: Accumulates serial bytes until framing delimiters (`\r`, `\n`, `ETX` `0x03`, or `EOT` `0x04`) are received, then routes to parsers.

### 6.2 Protocol Parsers Implemented

Both parsers are concrete classes in `SynOS.Services/AnalyzerIntegration/`:

#### ASTM Protocol Parser (`AstmProtocolParser.cs`)
* Parses ASTM E1394 multi-line records delimited by `|`.
* Extracts Patient Identifier from `P|` segment (`pFields[2]` or `pFields[1]`).
* Extracts Test Code and Value from `R|` segment (`rFields[2]` for Test Code, `rFields[3]` for Value, `rFields[4]` for Units, `rFields[5]` for Flags).
* *Forensic Limitation*: Does NOT implement low-level ASTM E1381 transport framing (`<ENQ>`, `<ACK>`, `<STX>`, frame number, checksum `<ETX>`, `<EOT>`). It expects raw strings with `<CRLF>`.

#### HL7 Protocol Parser (`Hl7ProtocolParser.cs`)
* Parses HL7 v2.x pipe-delimited messages.
* Extracts Patient Identifier from `PID` segment (`pidFields[3]`).
* Extracts Test Code and Value from `OBX` segment (`obxFields[3]` for Test Code, `obxFields[5]` for Value, `obxFields[6]` for Units, `obxFields[8]` for Flags).
* *Forensic Limitation*: Does NOT implement MLLP framing (Minimal Lower Layer Protocol: `0x0B` header, `0x1C 0x0D` trailer). It reads raw TCP/Serial string buffers.

### 6.3 Analyzer Data Ingestion & Result Matching Pipeline

When a message is received (via TCP, Serial, or `/api/v1/lab/analyzers/{id}/results/raw`):
1. **Inbox Insertion**: Record created in `LabAnalyzerResultInbox` table with status `Pending`.
2. **Auto-Matching (`AnalyzerResultMatcherService.cs`)**:
   - Matches `inboxItem.AnalyzerTestCode` $\rightarrow$ `LabAnalyzerTestMappings.SynosTestCode`.
   - Matches `inboxItem.PatientIdentifier` $\rightarrow$ `Patients.MRN`.
   - Locates patient's most recent `Visit` with `Status == VisitStatus.FullPaid`.
   - Locates `Order` within visit where `Order.TestCode == mapping.SynosTestCode`.
   - Transitions `LabAnalyzerResultInbox.Status` to `Matched`.
3. **Clinical Import (`AnalyzerResultImportService.cs`)**:
   - Takes `Matched` item and calls `IResultService.EnterResultsAsync`.
   - Stores quantitative value, updates order result status, transitions inbox status to `Imported`.

---

## 7. Real vs. Simulated Classification Matrix

Applying the mandatory classification rules from Section 8:

| Integration Component | Classification | Forensic Justification |
| :--- | :--- | :--- |
| **DICOM C-STORE Receiver** | **A. REAL PROTOCOL IMPLEMENTATION** | Uses `fo-dicom` 5.2.5; actively listening on TCP ports `104`, `8899`, `10411`; saves `.dcm` files to disk; writes records to SQL database. |
| **DICOM C-ECHO Verification** | **A. REAL PROTOCOL IMPLEMENTATION** | Responds to inbound C-ECHO pings and sends outbound C-ECHO pings over real TCP sockets. |
| **DICOM Modality Worklist (MWL)** | **E. DOCUMENTATION / MOCK ONLY** | `simulate-mwl` is a fake HTTP endpoint returning static JSON. No DICOM C-FIND SCP server exists. |
| **DICOM Image Query/Retrieve (Q/R)** | **E. PLANNED FEATURE ONLY** | No C-FIND / C-MOVE SCP exists. Modalities cannot pull data from SynOS. |
| **Analyzer RS-232 Serial Ingest** | **A. REAL PROTOCOL IMPLEMENTATION** | Genuine `System.IO.Ports.SerialPort` driver background service reading raw bytes from COM ports. |
| **Analyzer TCP Socket Ingest** | **B. PARTIAL PROTOCOL IMPLEMENTATION** | TCP socket server code is real, but disabled in configuration (`appsettings.json` missing section); lacks MLLP/E1381 ACK handshakes. |
| **Analyzer Parsers (ASTM/HL7)** | **A. REAL PROTOCOL IMPLEMENTATION** | Custom line/pipe segment parser logic extracting PID/OBX/R segments into data structures. |
| **Analyzer Host Query / Bidirectional** | **D. DATA MODEL ONLY** | Enum `WorklistMode` ("BidirectionalHostQuery") exists in database columns, but zero communication code exists to query or send orders back to analyzers. |
| **Scanner Simulation API** | **C. APPLICATION-LEVEL SIMULATION** | `/api/v1/radiology/modalities/simulate-push` generates synthetic DICOM datasets internally and writes them to disk to simulate scanner pushes for UI demos. |

---

## 8. Machine-Facing Configuration & Dependencies

### Configuration Inventory

| Setting Key | Location | Current Value | Notes |
| :--- | :--- | :--- | :--- |
| **DICOM Root Path** | `appsettings.json` (`Pacs:RootPath`) | `C:\SynOS_Files\PACS` | Physical directory where DICOM files are saved. |
| **DICOM Listen Ports** | `DicomCStoreScpService.cs` line 27 | `104, 8899, 10411` | Hardcoded array in background service. |
| **DICOM AE Title** | `DicomCStoreScpService.cs` line 50 | `SYNOS_PACS` | Default AE title logged and expected. |
| **Analyzer TCP Settings** | `appsettings.json` (`AnalyzerIntegration`) | **MISSING** | Causes `AnalyzerTcpListenerService` to sleep on boot. |
| **Analyzer Serial Settings**| SQL Database `AnalyzerListeners` table | Dynamic per analyzer | Configurable via `/api/v1/lab/analyzers/{id}/listener`. |
| **Middleware Cloud URL** | `appsettings.json` (`Middleware:ApiUrl`) | `https://cloud.tbzlabs.in/api/events` | External cloud sync worker. |

### Dependencies Inventory (`SynOS.Services.csproj` & `SynOS.Api.csproj`)
- `fo-dicom` (v5.2.5): Fellow Oak DICOM library — **Actively used** for C-STORE, C-ECHO, and dataset parsing.
- `System.IO.Ports` (.NET 8 runtime): **Actively used** in `SerialPortListenerService`.
- `System.Net.Sockets` (.NET 8 runtime): **Actively used** in `AnalyzerTcpListenerService`.
- `NHapi` / `HL7-dotnetcore`: **NOT installed**. SynOS uses custom string splitting for HL7.

---

## 9. What Can Be Tested Right Now Without Physical Machines

We can perform 100% protocol-level testing without physical machines using real networking protocols right now:

| Target Integration | Protocol | Current Listener State | How to Test Right Now | Confidence |
| :--- | :--- | :--- | :--- | :--- |
| **CT / MRI / X-Ray Push** | DICOM C-STORE | **ACTIVE** (Port 104, 8899, 10411) | Send real `.dcm` files using standard DICOM tools (`storescu`, `fo-dicom`, or Python `pydicom`/`pynetdicom`) to `localhost:104` or `localhost:8899`. | **100% (Ready Now)** |
| **DICOM Verification** | DICOM C-ECHO | **ACTIVE** (Port 104, 8899, 10411) | Send `echoscu` ping from command line to `localhost:104` with AE Title `SYNOS_PACS`. | **100% (Ready Now)** |
| **Analyzer TCP Socket** | ASTM / HL7 | **DORMANT** (Needs config entry) | Add listener entry to `appsettings.json` (or test via virtual COM loopback) $\rightarrow$ send raw ASTM/HL7 TCP socket streams. | **90% (After Config)** |
| **Analyzer Serial COM** | ASTM / HL7 | **ACTIVE** (Scans DB) | Setup virtual null-modem pair (e.g. `com0com` on Windows or TCP-to-serial proxy) $\rightarrow$ emit RS-232 bytes. | **95% (Ready Now)** |
| **DICOM MWL** | DICOM C-FIND | **OFFLINE / MISSING** | Cannot test at protocol level; C-FIND handler does not exist. | **0% (Not Implemented)** |

---

## 10. Minimum Real Protocol-Level Tests

### Minimum DICOM Test:
1. **Verification**: Execute `echoscu -v -aet VIRTUAL_CT -aec SYNOS_PACS localhost 8899`. Must receive `0000:0000 Success`.
2. **Storage**: Execute `storescu -v -aet VIRTUAL_CT -aec SYNOS_PACS localhost 8899 sample_ct.dcm`. Must receive `0000:0000 Success`, write file to `C:\SynOS_Files\PACS`, and create database rows in `RadiologyStudies`.

### Minimum Analyzer Test:
1. Push a raw ASTM E1394 packet over TCP or Serial:
   ```text
   H|\^&|||Sysmex^XN-550||||||P|1|20261005
   P|1||MRN001||Test^Patient||M
   O|1|BAR12345||^^^HGB|R
   R|1|^^^HGB|14.2|g/dL|12.0-16.0|N||F
   L|1|N
   ```
2. Verify `LabAnalyzerResultInbox` receives the packet, parses `HGB` = `14.2`, and sets status to `Pending` / `Matched`.

---

## 11. Proposed Virtual Device Laboratory Design

> **Guiding Principle**: Do NOT create a fake UI. Build a standalone, protocol-level test harness that speaks raw binary/text protocols across TCP sockets.

```
┌────────────────────────────────────────────────────────┐
│ STANDALONE VIRTUAL DEVICE HARNESS                      │
│ (Python / pynetdicom / asyncio socket daemon)          │
│                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────┐  │
│  │ Virtual CT/MRI Modality │  │ Virtual Hematology  │  │
│  │ (pynetdicom SCU)        │  │ Analyzer (ASTM/HL7) │  │
│  └───────────┬─────────────┘  └──────────┬──────────┘  │
└──────────────┼───────────────────────────┼─────────────┘
               │ DICOM C-STORE / C-ECHO    │ Raw TCP / Serial Socket
               │ (TCP Port 8899 / 104)     │ (TCP Port 5000 / Virtual COM)
               ▼                           ▼
┌────────────────────────────────────────────────────────┐
│ REAL SYNOS BACKEND LISTENER SERVICES                   │
│ - DicomCStoreScpService (fo-dicom)                     │
│ - AnalyzerTcpListenerService / SerialPortListener      │
│ - SynOSDbContext / SQL Server                          │
└────────────────────────────────────────────────────────┘
```

---

## 12. Future Chaos & Adversarial Test Plan

When the virtual device lab is authorized to execute, it will systematically attack the integration boundaries across the following dimensions:

### DICOM Chaos Vectors:
1. **AE Title Spoofing**: Send associations with invalid/mismatched Called AE titles.
2. **Transfer Syntax Fuzzing**: Send unsupported compressed syntaxes (e.g. JPEG Lossy, Deflated).
3. **Malformed Header Injection**: Truncate SOP Instance UID mid-stream; send corrupt preamble.
4. **Patient ID Collision & Path Traversal**: Send `PatientID` containing `../../Windows/System32` or path traversal characters to test file storage security.
5. **High-Concurrence Flood**: Push 500 CT slices simultaneously across 10 concurrent TCP associations to evaluate connection pool limits in `fo-dicom`.
6. **Zero-Byte / Massive DICOM**: Push 0-byte `.dcm` files and multi-gigabyte 3D volumetric datasets.

### Analyzer Chaos Vectors:
1. **Framing Attacks**: Send ASTM lines without `\r\n` or with embedded null bytes `0x00`.
2. **Missing Segments**: Send `R|` result segments without preceding `P|` patient or `O|` order segments.
3. **Extreme Numeric Values**: Transmit Hemoglobin value of `99999999` or `-42.5` or non-numeric strings (`"NaN"`, `"ERROR"`).
4. **State Machine Bypasses**: Push results for an order that has already been verified and locked by a Pathologist.
5. **Unsolicited Barcode Injection**: Stream thousands of results with unassigned barcodes to assess inbox saturation.

---

## 13. Summary & Recommended Next Steps

1. **Keep SynOS Application Code Untouched**: Retain the current read-only forensic posture.
2. **Build the Standalone Virtual Modality Harness**: Implement a lightweight Python script (`virtual-modality-runner.py`) using `pynetdicom` to test the already-active Port `8899` DICOM C-STORE SCP service.
3. **Verify Physical C-STORE Ingestion**: Run a non-destructive C-ECHO and single-slice C-STORE push through the virtual modality to establish the baseline performance and error handling of the real DICOM listener.
4. **Address the MWL Gap**: Acknowledge that real clinical deployment will require implementing a real `IDicomCFindProvider` in SynOS before modality consoles can query scheduled patients over DICOM.
