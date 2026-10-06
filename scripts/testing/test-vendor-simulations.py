"""
Vendor Simulation Profiles Test Suite
Simulates typical protocol behaviors from major diagnostic modality vendors:
1. Siemens Healthineers (SOMATOM CT)
2. GE Healthcare (Revolution / Optima CT)
3. Philips Healthcare (Ingenuity CT)
4. Sysmex Corporation (XN-1000 Hematology)
5. Roche Diagnostics (Cobas c311 / 6000 Clinical Chemistry)
"""

import sys
import os
import time
import datetime
import requests
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, ImplicitVRLittleEndian, generate_uid
from pynetdicom import AE
from pynetdicom.sop_class import ModalityWorklistInformationFind, CTImageStorage

BASE_API = "http://localhost:59999"
DICOM_HOST = "127.0.0.1"
DICOM_PORT = 8899

ANALYZER_ID = "C0000000-0000-0000-0000-000000000001"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NDlGNEM0NS1EOTYwLTQ4QjMtOUIwMi0wRkEzNTA0NjdDRTUiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6Ijg0OUY0QzQ1LUQ5NjAtNDhCMy05QjAyLTBGQTM1MDQ2N0NFNSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6WyJBZG1pbiIsIlBhdGhvbG9naXN0IiwiTGFiVGVjaCJdLCJpc3MiOiJTeW5PUy5BcGkiLCJhdWQiOiJTeW5PUy5BcHAiLCJleHAiOjE3OTEyNTg5ODR9.GGZpCVXyT2KogeiBwJGoVFyHdr8haNKKcTBu-ivQlws"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def simulate_siemens_ct():
    print("\n--- [PROFILE 1] SIMULATED SIEMENS HEALTHINEERS (SOMATOM DEFINITION AS) ---")
    ae = AE(ae_title="SOMATOM_CT_01")
    ae.add_requested_context(ModalityWorklistInformationFind)
    ae.add_requested_context(CTImageStorage)

    # 1. MWL Query by Accession
    assoc = ae.associate(DICOM_HOST, DICOM_PORT, ae_title="SYNOS_PACS")
    if not assoc.is_established:
        print("[-] Siemens AE association failed.")
        return False

    q_ds = Dataset()
    q_ds.AccessionNumber = "ACC-MWL-TEST1"
    q_ds.Modality = "CT"
    q_ds.PatientName = ""
    q_ds.PatientID = ""
    q_ds.StudyInstanceUID = ""

    items = []
    responses = assoc.send_c_find(q_ds, ModalityWorklistInformationFind)
    for st, ident in responses:
        if ident:
            items.append(ident)
    
    if not items:
        print("[-] Siemens MWL query returned 0 items.")
        assoc.release()
        return False

    item = items[0]
    print(f"[+] Siemens MWL query matched: {item.PatientName} (MRN: {item.PatientID}, Acc: {item.AccessionNumber})")

    # 2. Siemens CT Image Push
    sop_uid = f"1.3.12.2.1107.5.1.4.{int(time.time())}.{int(time.time())%1000}"
    series_uid = f"1.3.12.2.1107.5.1.4.{int(time.time())}.1"
    study_uid = str(item.StudyInstanceUID)

    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = CTImageStorage
    file_meta.MediaStorageSOPInstanceUID = sop_uid
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    file_meta.ImplementationClassUID = "1.3.12.2.1107.5.1.4"
    file_meta.ImplementationVersionName = "SIEMENS_SYNGO"

    ds = Dataset()
    ds.file_meta = file_meta
    ds.is_little_endian = True
    ds.is_implicit_VR = False
    ds.SOPClassUID = CTImageStorage
    ds.SOPInstanceUID = sop_uid
    ds.StudyInstanceUID = study_uid
    ds.SeriesInstanceUID = series_uid
    ds.PatientID = str(item.PatientID)
    ds.PatientName = str(item.PatientName)
    ds.Modality = "CT"
    ds.Manufacturer = "SIEMENS"
    ds.ManufacturerModelName = "SOMATOM Definition AS"
    ds.AccessionNumber = str(item.AccessionNumber)
    ds.StudyDate = datetime.date.today().strftime("%Y%m%d")
    ds.Rows = 64
    ds.Columns = 64
    ds.BitsAllocated = 16
    ds.BitsStored = 12
    ds.HighBit = 11
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelData = b'\x30\x00' * (64 * 64)

    store_status = assoc.send_c_store(ds)
    assoc.release()

    if store_status and store_status.Status == 0x0000:
        print(f"[PASS] Siemens SOMATOM C-STORE succeeded! Remote Status: 0x0000")
        return True
    else:
        print(f"[-] Siemens C-STORE failed: {store_status}")
        return False

def simulate_ge_ct():
    print("\n--- [PROFILE 2] SIMULATED GE HEALTHCARE (REVOLUTION / OPTIMA CT) ---")
    ae = AE(ae_title="GECT01")
    ae.add_requested_context(ModalityWorklistInformationFind)
    ae.add_requested_context(CTImageStorage)

    assoc = ae.associate(DICOM_HOST, DICOM_PORT, ae_title="SYNOS_PACS")
    if not assoc.is_established:
        print("[-] GE AE association failed.")
        return False

    # GE typical MWL query using SPS sequence
    q_ds = Dataset()
    q_ds.PatientID = "A00001"
    q_ds.PatientName = ""
    sps = Dataset()
    sps.Modality = "CT"
    sps.ScheduledStationAETitle = "SYNOS_PACS"
    q_ds.ScheduledProcedureStepSequence = [sps]

    items = []
    responses = assoc.send_c_find(q_ds, ModalityWorklistInformationFind)
    for st, ident in responses:
        if ident:
            items.append(ident)

    if not items:
        print("[-] GE MWL query returned 0 items.")
        assoc.release()
        return False

    item = items[0]
    print(f"[+] GE MWL query matched: {item.PatientName} (MRN: {item.PatientID})")

    # GE Image Push with GE root UID
    sop_uid = f"1.2.840.113619.2.55.3.{int(time.time())}.{int(time.time())%1000}"
    series_uid = f"1.2.840.113619.2.55.3.{int(time.time())}.1"
    study_uid = str(item.StudyInstanceUID)

    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = CTImageStorage
    file_meta.MediaStorageSOPInstanceUID = sop_uid
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    file_meta.ImplementationClassUID = "1.2.840.113619.6.388"
    file_meta.ImplementationVersionName = "GE_ADVANTAGE"

    ds = Dataset()
    ds.file_meta = file_meta
    ds.is_little_endian = True
    ds.is_implicit_VR = False
    ds.SOPClassUID = CTImageStorage
    ds.SOPInstanceUID = sop_uid
    ds.StudyInstanceUID = study_uid
    ds.SeriesInstanceUID = series_uid
    ds.PatientID = str(item.PatientID)
    ds.PatientName = str(item.PatientName)
    ds.Modality = "CT"
    ds.Manufacturer = "GE Medical Systems"
    ds.ManufacturerModelName = "Revolution CT"
    ds.AccessionNumber = str(item.AccessionNumber)
    ds.StudyDate = datetime.date.today().strftime("%Y%m%d")
    ds.Rows = 64
    ds.Columns = 64
    ds.BitsAllocated = 16
    ds.BitsStored = 12
    ds.HighBit = 11
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelData = b'\x40\x00' * (64 * 64)

    store_status = assoc.send_c_store(ds)
    assoc.release()

    if store_status and store_status.Status == 0x0000:
        print(f"[PASS] GE Healthcare Revolution C-STORE succeeded! Remote Status: 0x0000")
        return True
    else:
        print(f"[-] GE C-STORE failed: {store_status}")
        return False

def simulate_philips_ct():
    print("\n--- [PROFILE 3] SIMULATED PHILIPS HEALTHCARE (INGENUITY CT) ---")
    ae = AE(ae_title="PHILIPS_ING_CT")
    ae.add_requested_context(ModalityWorklistInformationFind)
    ae.add_requested_context(CTImageStorage)

    assoc = ae.associate(DICOM_HOST, DICOM_PORT, ae_title="SYNOS_PACS")
    if not assoc.is_established:
        print("[-] Philips AE association failed.")
        return False

    # Philips broad query with station title
    q_ds = Dataset()
    q_ds.PatientID = ""
    q_ds.PatientName = ""
    sps = Dataset()
    sps.Modality = "CT"
    sps.ScheduledStationAETitle = "SYNOS_PACS"
    q_ds.ScheduledProcedureStepSequence = [sps]

    items = []
    responses = assoc.send_c_find(q_ds, ModalityWorklistInformationFind)
    for st, ident in responses:
        if ident:
            items.append(ident)

    if not items:
        print("[-] Philips MWL query returned 0 items.")
        assoc.release()
        return False

    item = items[0]
    print(f"[+] Philips MWL query matched: {item.PatientName}")

    # Philips Image Push with Philips root UID
    sop_uid = f"1.3.46.670589.11.0.0.11.{int(time.time())}"
    series_uid = f"1.3.46.670589.11.0.0.11.{int(time.time())}.1"
    study_uid = str(item.StudyInstanceUID)

    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = CTImageStorage
    file_meta.MediaStorageSOPInstanceUID = sop_uid
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    file_meta.ImplementationClassUID = "1.3.46.670589.11"
    file_meta.ImplementationVersionName = "PHILIPS_INTEL"

    ds = Dataset()
    ds.file_meta = file_meta
    ds.is_little_endian = True
    ds.is_implicit_VR = False
    ds.SOPClassUID = CTImageStorage
    ds.SOPInstanceUID = sop_uid
    ds.StudyInstanceUID = study_uid
    ds.SeriesInstanceUID = series_uid
    ds.PatientID = str(item.PatientID)
    ds.PatientName = str(item.PatientName)
    ds.Modality = "CT"
    ds.Manufacturer = "Philips"
    ds.ManufacturerModelName = "Ingenuity CT"
    ds.AccessionNumber = str(item.AccessionNumber)
    ds.StudyDate = datetime.date.today().strftime("%Y%m%d")
    ds.Rows = 64
    ds.Columns = 64
    ds.BitsAllocated = 16
    ds.BitsStored = 12
    ds.HighBit = 11
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelData = b'\x50\x00' * (64 * 64)

    store_status = assoc.send_c_store(ds)
    assoc.release()

    if store_status and store_status.Status == 0x0000:
        print(f"[PASS] Philips Ingenuity C-STORE succeeded! Remote Status: 0x0000")
        return True
    else:
        print(f"[-] Philips C-STORE failed: {store_status}")
        return False

def simulate_sysmex_analyzer():
    print("\n--- [PROFILE 4] SIMULATED SYSMEX CORPORATION (XN-1000 HEMATOLOGY) ---")
    sample_id = f"SMP-SYS-{int(time.time())}"
    astm = (
        "H|\\^&|||Sysmex^XN-1000^00-15||||||||E1394-97\r"
        "P|1||A00001||Test Patient1\r"
        f"O|1|{sample_id}||^^^CBC+DIFF||||||||||||||||||||F\r"
        "R|1|^^^WBC|7.12|10^3/uL|4.0-11.0|N||F\r"
        "R|2|^^^RBC|4.78|10^6/uL|4.2-5.8|N||F\r"
        "R|3|^^^HGB|14.3|g/dL|12.0-16.0|N||F\r"
        "R|4|^^^HCT|42.1|%|37.0-48.0|N||F\r"
        "R|5|^^^PLT|240|10^3/uL|150-450|N||F\r"
        "R|6|^^^NEUT%|58.5|%|40.0-70.0|N||F\r"
        "R|7|^^^LYMPH%|31.2|%|20.0-40.0|N||F\r"
        "L|1|N\r"
    )

    url = f"{BASE_API}/api/v1/lab/analyzers/{ANALYZER_ID}/results/raw"
    resp = requests.post(url, headers=HEADERS, json={"rawMessage": astm, "protocol": "ASTM"}, timeout=10)
    if resp.status_code == 200:
        print(f"[PASS] Sysmex XN-1000 payload successfully accepted (Status: 200)")
        return True
    else:
        print(f"[-] Sysmex payload failed: {resp.status_code}")
        return False

def simulate_roche_analyzer():
    print("\n--- [PROFILE 5] SIMULATED ROCHE DIAGNOSTICS (COBAS C311 CHEMISTRY) ---")
    sample_id = f"SMP-ROC-{int(time.time())}"
    astm = (
        "H|\\^&|||Roche^Cobas-c311^V1.2||||||||E1394-97\r"
        "P|1||A00001||Test Patient1\r"
        f"O|1|{sample_id}||^^^CMP||||||||||||||||||||F\r"
        "R|1|^^^GLU|108|mg/dL|70-99|H||F\r"
        "R|2|^^^BUN|16|mg/dL|7-20|N||F\r"
        "R|3|^^^CREA|0.95|mg/dL|0.7-1.3|N||F\r"
        "R|4|^^^ALT|32|U/L|10-40|N||F\r"
        "R|5|^^^AST|28|U/L|10-35|N||F\r"
        "R|6|^^^K|4.3|mmol/L|3.5-5.1|N||F\r"
        "L|1|N\r"
    )

    url = f"{BASE_API}/api/v1/lab/analyzers/{ANALYZER_ID}/results/raw"
    resp = requests.post(url, headers=HEADERS, json={"rawMessage": astm, "protocol": "ASTM"}, timeout=10)
    if resp.status_code == 200:
        print(f"[PASS] Roche Cobas c311 payload successfully accepted (Status: 200)")
        return True
    else:
        print(f"[-] Roche Cobas payload failed: {resp.status_code}")
        return False

def run_vendor_simulations():
    print("="*70)
    print("STARTING COMPREHENSIVE VENDOR INTEROPERABILITY SIMULATION SUITE")
    print("="*70)

    p1 = simulate_siemens_ct()
    p2 = simulate_ge_ct()
    p3 = simulate_philips_ct()
    p4 = simulate_sysmex_analyzer()
    p5 = simulate_roche_analyzer()

    all_passed = p1 and p2 and p3 and p4 and p5
    print("\n" + "="*70)
    print(f"VENDOR SIMULATION RESULT: {'ALL 5 VENDOR PROFILES PASSED' if all_passed else 'FAILURES DETECTED'}")
    print("="*70)
    return all_passed

if __name__ == "__main__":
    ok = run_vendor_simulations()
    sys.exit(0 if ok else 1)
