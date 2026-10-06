"""
Exhaustive DICOM Modality Worklist (MWL / C-FIND) Real-World Scenario Suite
Tests the exact query behaviors real CT / MRI / X-ray machines use.
"""

import sys
import time
from pydicom.dataset import Dataset
from pynetdicom import AE
from pynetdicom.sop_class import ModalityWorklistInformationFind

DICOM_HOST = "127.0.0.1"
DICOM_PORT = 8899

def query_mwl(query_dict, sps_dict=None, calling_ae="REAL_MODALITY"):
    ae = AE(ae_title=calling_ae)
    ae.add_requested_context(ModalityWorklistInformationFind)
    
    assoc = ae.associate(DICOM_HOST, DICOM_PORT, ae_title="SYNOS_PACS")
    if not assoc.is_established:
        return False, "Association failed", []

    query_ds = Dataset()
    query_ds.SpecificCharacterSet = "ISO_IR 100"
    query_ds.PatientName = query_dict.get("PatientName", "")
    query_ds.PatientID = query_dict.get("PatientID", "")
    query_ds.AccessionNumber = query_dict.get("AccessionNumber", "")
    query_ds.StudyInstanceUID = ""
    
    if "Modality" in query_dict:
        query_ds.Modality = query_dict["Modality"]

    if sps_dict is not None or "Modality" not in query_dict:
        sps_item = Dataset()
        sps_item.Modality = sps_dict.get("Modality", "") if sps_dict else ""
        sps_item.ScheduledStationAETitle = sps_dict.get("ScheduledStationAETitle", "") if sps_dict else ""
        sps_item.ScheduledProcedureStepStartDate = sps_dict.get("ScheduledProcedureStepStartDate", "") if sps_dict else ""
        sps_item.ScheduledProcedureStepStartTime = ""
        sps_item.ScheduledProcedureStepID = ""
        sps_item.ScheduledProcedureStepDescription = ""
        query_ds.ScheduledProcedureStepSequence = [sps_item]

    items = []
    final_status = None
    try:
        responses = assoc.send_c_find(query_ds, ModalityWorklistInformationFind)
        for status, identifier in responses:
            final_status = status.Status if status else None
            if identifier:
                items.append(identifier)
    except Exception as ex:
        assoc.release()
        return False, f"Exception: {ex}", []

    assoc.release()
    return True, final_status, items

def run_all_tests():
    print("="*70)
    print("STARTING EXHAUSTIVE DICOM MODALITY WORKLIST (MWL) REAL-WORLD MATRIX")
    print("="*70)

    test_cases = [
        ("MWL-01: Modality CT Filter (Root)", {"Modality": "CT"}, None, lambda c: c >= 1),
        ("MWL-02: Modality CT Filter (in SPS Sequence)", {}, {"Modality": "CT"}, lambda c: c >= 1),
        ("MWL-03: Modality MR Filter (Empty match expected)", {"Modality": "MR"}, None, lambda c: c == 0),
        ("MWL-04: Modality CR/DX Filter (Empty match expected)", {"Modality": "CR"}, None, lambda c: c == 0),
        ("MWL-05: Exact Patient ID Query ('A00001')", {"PatientID": "A00001"}, None, lambda c: c >= 1),
        ("MWL-06: Wildcard Patient ID ('A000*')", {"PatientID": "A000*"}, None, lambda c: c >= 1),
        ("MWL-07: Wildcard Patient Name ('*Patient*')", {"PatientName": "*Patient*"}, None, lambda c: c >= 1),
        ("MWL-08: Exact Accession Number ('ACC-MWL-TEST1')", {"AccessionNumber": "ACC-MWL-TEST1"}, None, lambda c: c >= 1),
        ("MWL-09: Wildcard Accession Number ('ACC*')", {"AccessionNumber": "ACC*"}, None, lambda c: c >= 1),
        ("MWL-10: Broad Query (No filters, empty fields)", {}, {}, lambda c: c >= 1),
        ("MWL-11: Non-existent Patient ID ('NO_SUCH_PATIENT_999')", {"PatientID": "NO_SUCH_PATIENT_999"}, None, lambda c: c == 0),
        ("MWL-12: Non-existent Accession ('NO_SUCH_ACC_999')", {"AccessionNumber": "NO_SUCH_ACC_999"}, None, lambda c: c == 0),
        ("MWL-13: Scheduled Station AE Title in SPS ('SYNOS_PACS')", {}, {"ScheduledStationAETitle": "SYNOS_PACS", "Modality": "CT"}, lambda c: c >= 1),
        ("MWL-14: Multi-Field Combined Filter (MRN A00001 + Modality CT)", {"PatientID": "A00001", "Modality": "CT"}, None, lambda c: c >= 1),
        ("MWL-15: Conflicting Filter (MRN A00001 + Modality MR)", {"PatientID": "A00001", "Modality": "MR"}, None, lambda c: c == 0)
    ]

    all_passed = True
    for name, q_dict, sps_dict, check_fn in test_cases:
        ok, status, items = query_mwl(q_dict, sps_dict)
        matched = check_fn(len(items))
        if ok and matched and status == 0x0000:
            print(f"[PASS] {name} -> Status: 0x0000 (Success), Results Returned: {len(items)}")
        else:
            print(f"[FAIL] {name} -> Success={ok}, Status={status}, Items={len(items)}")
            all_passed = False

    print("\n" + "="*70)
    print(f"MWL EXHAUSTIVE SUITE RESULT: {'ALL PASSED' if all_passed else 'FAILURES DETECTED'}")
    print("="*70)
    return all_passed

if __name__ == "__main__":
    passed = run_all_tests()
    sys.exit(0 if passed else 1)
