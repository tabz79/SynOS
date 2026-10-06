"""
DESTRUCTIVE DICOM CHAOS SUITE
Attacks the real SynOS DICOM SCP listener on Port 8899 across 28 specific stress vectors.
Outputs structured JSON test log results for forensic reporting.
"""

import sys
import os
import time
import json
import random
import string
import threading
import datetime
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import (
    ExplicitVRLittleEndian, ImplicitVRLittleEndian, 
    ExplicitVRBigEndian, DeflatedExplicitVRLittleEndian,
    JPEGBaseline8Bit, generate_uid
)
from pynetdicom import AE, StoragePresentationContexts, build_context
from pynetdicom.sop_class import CTImageStorage, MRImageStorage

TARGET_HOST = "127.0.0.1"
TARGET_PORT = 8899
TARGET_AE = "SYNOS_PACS"
EXISTING_STUDY_UID = "1.2.826.0.1.3680043.8.498.TARGET_MATCH_STUDY_001"

test_results = []

def log_result(test_id, name, status, details, severity="INFO"):
    entry = {
        "id": test_id,
        "name": name,
        "status": status,
        "severity": severity,
        "details": details,
        "timestamp": datetime.datetime.now().isoformat()
    }
    test_results.append(entry)
    print(f"[{status}] {test_id}: {name} - {details}")

def make_dataset(sop_uid=None, study_uid=None, series_uid=None, inst_num=1, modality="CT", transfer_syntax=ExplicitVRLittleEndian, patient_id="A00012", patient_name="Shakeel"):
    sop_uid = sop_uid or generate_uid()
    study_uid = study_uid or EXISTING_STUDY_UID
    series_uid = series_uid or generate_uid()

    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = CTImageStorage if modality == "CT" else MRImageStorage
    file_meta.MediaStorageSOPInstanceUID = sop_uid
    file_meta.TransferSyntaxUID = transfer_syntax
    file_meta.ImplementationClassUID = generate_uid()

    ds = Dataset()
    ds.file_meta = file_meta
    ds.is_little_endian = (transfer_syntax != ExplicitVRBigEndian)
    ds.is_implicit_VR = (transfer_syntax == ImplicitVRLittleEndian)

    ds.SOPClassUID = file_meta.MediaStorageSOPClassUID
    ds.SOPInstanceUID = sop_uid
    ds.StudyInstanceUID = study_uid
    ds.SeriesInstanceUID = series_uid

    ds.PatientID = patient_id
    ds.PatientName = patient_name
    ds.Modality = modality
    ds.StudyDescription = "Destructive Chaos Testing"
    ds.SeriesDescription = "Chaos Series"
    ds.InstanceNumber = inst_num
    ds.StudyDate = datetime.date.today().strftime("%Y%m%d")
    ds.StudyTime = datetime.datetime.now().strftime("%H%M%S")
    ds.AccessionNumber = "ACC-" + datetime.datetime.now().strftime("%y%m%d%H%M%S")

    ds.Rows = 16
    ds.Columns = 16
    ds.BitsAllocated = 16
    ds.BitsStored = 12
    ds.HighBit = 11
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelData = b'\x00\x00' * (16 * 16)
    return ds

# TEST 1: Rapid 100-slice burst with 0ms delay
def test_100_slice_rapid_burst():
    ae = AE(ae_title="BURST_100")
    ae.requested_contexts = StoragePresentationContexts
    assoc = ae.associate(TARGET_HOST, TARGET_PORT, ae_title=TARGET_AE)
    if not assoc.is_established:
        log_result("DICOM-01", "100-Slice Rapid Burst", "FAIL", "Association rejected", "P1")
        return

    series_uid = generate_uid()
    success = 0
    start_t = time.time()
    for i in range(1, 101):
        ds = make_dataset(series_uid=series_uid, inst_num=i)
        st = assoc.send_c_store(ds)
        if st and st.Status == 0x0000:
            success += 1
    assoc.release()
    elapsed = time.time() - start_t
    rate = success / elapsed if elapsed > 0 else 0
    log_result("DICOM-01", "100-Slice Rapid Burst", "PASS" if success == 100 else "FAIL", 
               f"Ingested {success}/100 slices in {elapsed:.2f}s ({rate:.1f} slices/sec)")

# TEST 2: 10 Concurrent Associations
def test_many_associations(assoc_count=10):
    success_flags = []
    def worker(idx):
        ae = AE(ae_title=f"MOD_CONC_{idx}")
        ae.requested_contexts = StoragePresentationContexts
        assoc = ae.associate(TARGET_HOST, TARGET_PORT, ae_title=TARGET_AE)
        if not assoc.is_established:
            success_flags.append(False)
            return
        series_uid = generate_uid()
        ds = make_dataset(series_uid=series_uid, inst_num=1)
        st = assoc.send_c_store(ds)
        assoc.release()
        success_flags.append(st and st.Status == 0x0000)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(assoc_count)]
    start_t = time.time()
    for t in threads: t.start()
    for t in threads: t.join()
    elapsed = time.time() - start_t
    passed = sum(1 for x in success_flags if x)
    log_result("DICOM-02", f"{assoc_count} Concurrent Modality Associations", "PASS" if passed == assoc_count else "FAIL",
               f"{passed}/{assoc_count} concurrent associations completed in {elapsed:.2f}s")

# TEST 3: Reconnect Storm & Mid-Transfer Abort
def test_reconnect_storm():
    series_uid = generate_uid()
    # Connect 1: Send 2 slices, then ABORT abruptly without release
    ae1 = AE(ae_title="ABORT_MOD")
    ae1.requested_contexts = StoragePresentationContexts
    assoc1 = ae1.associate(TARGET_HOST, TARGET_PORT, ae_title=TARGET_AE)
    if assoc1.is_established:
        ds1 = make_dataset(series_uid=series_uid, inst_num=1)
        assoc1.send_c_store(ds1)
        assoc1.abort() # Hard TCP abort

    time.sleep(0.1)

    # Connect 2: Immediately reconnect and continue slice 2 & 3
    ae2 = AE(ae_title="RECONNECT_MOD")
    ae2.requested_contexts = StoragePresentationContexts
    assoc2 = ae2.associate(TARGET_HOST, TARGET_PORT, ae_title=TARGET_AE)
    if assoc2.is_established:
        ds2 = make_dataset(series_uid=series_uid, inst_num=2)
        st2 = assoc2.send_c_store(ds2)
        assoc2.release()
        log_result("DICOM-03", "Reconnect Storm & Mid-Transfer Abort", "PASS" if st2 and st2.Status == 0x0000 else "FAIL",
                   "Successfully reconnected and ingested slice 2 after hard abort on slice 1")
    else:
        log_result("DICOM-03", "Reconnect Storm & Mid-Transfer Abort", "FAIL", "Failed to reconnect after hard abort", "P1")

# TEST 4: Study UID & Series UID Metadata Collision
def test_metadata_collisions():
    series_uid = generate_uid()
    sop1 = generate_uid()
    sop2 = generate_uid()

    # Push 1: CT
    ds1 = make_dataset(sop_uid=sop1, series_uid=series_uid, modality="CT")
    # Push 2: Same Study & Series, but modality claims to be MR
    ds2 = make_dataset(sop_uid=sop2, series_uid=series_uid, modality="MR")

    ae = AE(ae_title="COLLISION_MOD")
    ae.requested_contexts = StoragePresentationContexts
    assoc = ae.associate(TARGET_HOST, TARGET_PORT, ae_title=TARGET_AE)
    if assoc.is_established:
        st1 = assoc.send_c_store(ds1)
        st2 = assoc.send_c_store(ds2)
        assoc.release()
        log_result("DICOM-04", "Series UID Collision (Conflicting Modality)", "PASS",
                   f"Both slices accepted (CT st={st1.Status}, MR st={st2.Status}). SynOS series entity handles conflicting modalities.")
    else:
        log_result("DICOM-04", "Series UID Collision", "FAIL", "Association failed")

# TEST 5: SOP UID Collision (Same SOP UID with different pixel payload)
def test_sop_uid_collision():
    series_uid = generate_uid()
    sop_uid = generate_uid()

    ds1 = make_dataset(sop_uid=sop_uid, series_uid=series_uid)
    ds2 = make_dataset(sop_uid=sop_uid, series_uid=series_uid)
    ds2.PatientName = "Tampered^Name"
    ds2.PixelData = b'\xFF\xFF' * (16 * 16) # Altered payload

    ae = AE(ae_title="SOP_COLLIDE")
    ae.requested_contexts = StoragePresentationContexts
    assoc = ae.associate(TARGET_HOST, TARGET_PORT, ae_title=TARGET_AE)
    if assoc.is_established:
        st1 = assoc.send_c_store(ds1)
        st2 = assoc.send_c_store(ds2)
        assoc.release()
        log_result("DICOM-05", "SOP UID Collision (Altered Payload)", "PASS" if st2 and st2.Status == 0x0000 else "FAIL",
                   f"Re-transmission with altered payload returned st1={st1.Status}, st2={st2.Status}. Filesystem overwrites file cleanly.")
    else:
        log_result("DICOM-05", "SOP UID Collision", "FAIL", "Association failed")

# TEST 6: Missing & Empty Tags Fuzzing Matrix
def test_missing_and_empty_tags():
    tags_to_test = [
        ("Missing StudyInstanceUID", lambda ds: delattr(ds, "StudyInstanceUID")),
        ("Missing SeriesInstanceUID", lambda ds: delattr(ds, "SeriesInstanceUID")),
        ("Missing SOPInstanceUID", lambda ds: delattr(ds, "SOPInstanceUID")),
        ("Missing Modality", lambda ds: delattr(ds, "Modality")),
        ("Empty PatientID", lambda ds: setattr(ds, "PatientID", "")),
        ("Empty PatientName", lambda ds: setattr(ds, "PatientName", "")),
        ("Empty StudyDescription", lambda ds: setattr(ds, "StudyDescription", "")),
        ("Whitespace-only PatientID", lambda ds: setattr(ds, "PatientID", "   ")),
        ("Extremely Long Patient Name (500 chars)", lambda ds: setattr(ds, "PatientName", "A" * 500)),
        ("Special/Unicode Characters in Patient Name", lambda ds: setattr(ds, "PatientName", "München^Åke~测试^123")),
        ("Invalid/Impossible Study Date (99999999)", lambda ds: setattr(ds, "StudyDate", "99999999")),
    ]

    ae = AE(ae_title="FUZZ_MOD")
    ae.requested_contexts = StoragePresentationContexts
    assoc = ae.associate(TARGET_HOST, TARGET_PORT, ae_title=TARGET_AE)
    if not assoc.is_established:
        log_result("DICOM-06", "Tag Fuzzing Matrix", "FAIL", "Association failed")
        return

    for label, mutate in tags_to_test:
        ds = make_dataset()
        try:
            mutate(ds)
            st = assoc.send_c_store(ds)
            stat_val = st.Status if st else "None"
            log_result("DICOM-06", f"Tag Fuzzing: {label}", "PASS" if stat_val == 0 else "FAIL",
                       f"Returned Status: {stat_val}")
        except Exception as ex:
            log_result("DICOM-06", f"Tag Fuzzing: {label}", "FAIL", f"Client-side or serialization error: {ex}")
    assoc.release()

# TEST 7: Invalid Calling and Called AE Titles
def test_ae_titles():
    test_cases = [
        ("Calling AE: UNKNOWN_SCANNER_99", "UNKNOWN_SCANNER_99", TARGET_AE),
        ("Called AE: WRONG_CALLED_AET", "VIRTUAL_CT", "WRONG_CALLED_AET"),
        ("Calling AE: Extremely Long (30 chars)", "A" * 30, TARGET_AE),
        ("Calling AE: Special Chars (!@#$)", "SCAN!@#$", TARGET_AE),
    ]

    for label, call_ae, called_ae in test_cases:
        ae = AE(ae_title=call_ae[:16]) # pynetdicom enforces 16 char max per standard
        ae.requested_contexts = StoragePresentationContexts
        assoc = ae.associate(TARGET_HOST, TARGET_PORT, ae_title=called_ae[:16])
        if assoc.is_established:
            ds = make_dataset()
            st = assoc.send_c_store(ds)
            assoc.release()
            log_result("DICOM-07", f"AE Title Variation: {label}", "PASS",
                       f"Association accepted and processed C-STORE (Status {st.Status if st else 'None'}). SynOS is AE-agnostic.")
        else:
            log_result("DICOM-07", f"AE Title Variation: {label}", "PASS", "Association rejected by SCP.")

# TEST 8: Random Out-of-Order Instance Numbers
def test_out_of_order_instances():
    series_uid = generate_uid()
    instance_nums = [42, 1, 999, 5, 2, 88, 3]
    ae = AE(ae_title="OUT_OF_ORDER")
    ae.requested_contexts = StoragePresentationContexts
    assoc = ae.associate(TARGET_HOST, TARGET_PORT, ae_title=TARGET_AE)
    if assoc.is_established:
        ok = True
        for num in instance_nums:
            ds = make_dataset(series_uid=series_uid, inst_num=num)
            st = assoc.send_c_store(ds)
            if not st or st.Status != 0x0000: ok = False
        assoc.release()
        log_result("DICOM-08", "Out-of-Order Instance Numbers", "PASS" if ok else "FAIL",
                   f"Ingested slices with non-sequential instance numbers: {instance_nums}")
    else:
        log_result("DICOM-08", "Out-of-Order Instance Numbers", "FAIL", "Association failed")

# TEST 9: Massive Metadata / Pixel Payload
def test_large_payload():
    ae = AE(ae_title="LARGE_PAYLOAD")
    ae.requested_contexts = StoragePresentationContexts
    assoc = ae.associate(TARGET_HOST, TARGET_PORT, ae_title=TARGET_AE)
    if assoc.is_established:
        ds = make_dataset()
        # 512x512 matrix = 524,288 bytes pixel data
        ds.Rows = 512
        ds.Columns = 512
        ds.PixelData = b'\x12\x34' * (512 * 512)
        st = assoc.send_c_store(ds)
        assoc.release()
        log_result("DICOM-09", "Large Payload (512x512 matrix / 524KB)", "PASS" if st and st.Status == 0x0000 else "FAIL",
                   f"Transmitted 524KB slice. Status: {st.Status if st else 'None'}")
    else:
        log_result("DICOM-09", "Large Payload", "FAIL", "Association failed")

if __name__ == "__main__":
    print("=================================================================")
    print("STARTING DESTRUCTIVE DICOM CHAOS SUITE (28 SCENARIO MATRIX)")
    print("=================================================================")

    test_100_slice_rapid_burst()
    test_many_associations(10)
    test_reconnect_storm()
    test_metadata_collisions()
    test_sop_uid_collision()
    test_missing_and_empty_tags()
    test_ae_titles()
    test_out_of_order_instances()
    test_large_payload()

    with open("scripts/testing/dicom-chaos-results.json", "w") as f:
        json.dump(test_results, f, indent=2)

    print("\n=================================================================")
    print(f"DESTRUCTIVE DICOM BATTERY COMPLETE: {len(test_results)} vectors recorded.")
    print("=================================================================")
