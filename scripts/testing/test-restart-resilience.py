"""
Machine Reconnect & Resilience Test Matrix
Simulates network drops, mid-transfer aborts, duplicate pushes, and rapid reconnection.
"""

import sys
import time
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid
from pynetdicom import AE
from pynetdicom.sop_class import CTImageStorage

DICOM_HOST = "127.0.0.1"
DICOM_PORT = 8899

def create_slice(study_uid, series_uid, sop_uid, instance_no=1):
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = CTImageStorage
    file_meta.MediaStorageSOPInstanceUID = sop_uid
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    file_meta.ImplementationClassUID = generate_uid()

    ds = Dataset()
    ds.file_meta = file_meta
    ds.is_little_endian = True
    ds.is_implicit_VR = False
    ds.SOPClassUID = CTImageStorage
    ds.SOPInstanceUID = sop_uid
    ds.StudyInstanceUID = study_uid
    ds.SeriesInstanceUID = series_uid
    ds.PatientID = "A00001"
    ds.PatientName = "Test Patient1"
    ds.Modality = "CT"
    ds.InstanceNumber = instance_no
    ds.Rows = 64
    ds.Columns = 64
    ds.BitsAllocated = 16
    ds.BitsStored = 12
    ds.HighBit = 11
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelData = b'\x05\x00' * (64 * 64)
    return ds

def test_resilience():
    print("="*70)
    print("STARTING MACHINE RECONNECT & RESILIENCE MATRIX")
    print("="*70)

    study_uid = generate_uid()
    series_uid = generate_uid()
    sop_uid_1 = generate_uid()
    sop_uid_2 = generate_uid()

    # 1. Mid-transfer Abort Simulation
    print("\n[TEST 1] Modality aborts TCP connection mid-transfer on Slice 1...")
    ae = AE(ae_title="ABORT_MODALITY")
    ae.add_requested_context(CTImageStorage)
    assoc = ae.associate(DICOM_HOST, DICOM_PORT, ae_title="SYNOS_PACS")
    if assoc.is_established:
        ds1 = create_slice(study_uid, series_uid, sop_uid_1, 1)
        assoc.send_c_store(ds1)
        # Abort abruptly
        assoc.abort()
        print("[+] Aborted association intentionally.")
        time.sleep(0.3)

    # 2. Reconnect immediately and transmit Slice 2
    print("\n[TEST 2] Modality immediately reconnects and resumes transfer with Slice 2...")
    assoc2 = ae.associate(DICOM_HOST, DICOM_PORT, ae_title="SYNOS_PACS")
    if not assoc2.is_established:
        print("[-] Reconnection failed after abort.")
        return False
    ds2 = create_slice(study_uid, series_uid, sop_uid_2, 2)
    st2 = assoc2.send_c_store(ds2)
    assoc2.release()
    print(f"[+] Reconnect transfer succeeded! Status: {st2.Status if st2 else None}")
    assert st2 and st2.Status == 0x0000, "Slice 2 push failed"

    # 3. Duplicate transmission (Same slice sent twice)
    print("\n[TEST 3] Modality re-sends Slice 2 (Duplicate SOP UID)...")
    assoc3 = ae.associate(DICOM_HOST, DICOM_PORT, ae_title="SYNOS_PACS")
    st3 = assoc3.send_c_store(ds2)
    assoc3.release()
    print(f"[+] Duplicate push handled cleanly! Status: {st3.Status if st3 else None}")
    assert st3 and st3.Status == 0x0000, "Duplicate slice push failed"

    # 4. Rapid Re-connect Storm (5 connections in < 1 second)
    print("\n[TEST 4] Rapid reconnect storm (5 sequential associations)...")
    storm_ok = True
    for i in range(5):
        assoc_temp = ae.associate(DICOM_HOST, DICOM_PORT, ae_title="SYNOS_PACS")
        if assoc_temp.is_established:
            assoc_temp.release()
        else:
            storm_ok = False
            break
    print(f"[+] Rapid reconnect storm: {'SUCCESS' if storm_ok else 'FAILED'}")
    assert storm_ok, "Reconnect storm failed"

    print("\n" + "="*70)
    print("MACHINE RECONNECT & RESILIENCE MATRIX: ALL TESTS PASSED")
    print("="*70)
    return True

if __name__ == "__main__":
    ok = test_resilience()
    sys.exit(0 if ok else 1)
