"""
Protocol-Level Test: Send DICOM study matching an existing scheduled RadiologyStudy.
This tests the C-STORE ingest path when the Study already exists in SynOS.
"""

import sys
import time
import datetime
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid
from pynetdicom import AE, StoragePresentationContexts
from pynetdicom.sop_class import CTImageStorage

def run_matched_cstore(host="127.0.0.1", port=8899):
    study_uid = "1.2.826.0.1.3680043.8.498.TARGET_MATCH_STUDY_001"
    series_uid = generate_uid()
    sop_uid = generate_uid()

    print(f"\n--- PROTOCOL TEST: C-STORE TO EXISTING SCHEDULED STUDY ---")
    print(f"Target Host: {host}:{port}")
    print(f"Study UID: {study_uid}")
    print(f"Series UID: {series_uid}")
    print(f"SOP UID: {sop_uid}")

    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = CTImageStorage
    file_meta.MediaStorageSOPInstanceUID = sop_uid
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    file_meta.ImplementationClassUID = generate_uid()

    ds = Dataset()
    ds.file_meta = file_meta
    ds.is_little_endian = True
    ds.is_implicit_VR = False

    ds.SOPClassUID = file_meta.MediaStorageSOPClassUID
    ds.SOPInstanceUID = sop_uid
    ds.StudyInstanceUID = study_uid
    ds.SeriesInstanceUID = series_uid

    ds.PatientID = "A00012"
    ds.PatientName = "Shakeel"
    ds.Modality = "CT"
    ds.StudyDescription = "Scheduled CT Brain"
    ds.SeriesDescription = "Axial Bone"
    ds.InstanceNumber = 1
    ds.StudyDate = datetime.date.today().strftime("%Y%m%d")
    ds.StudyTime = datetime.datetime.now().strftime("%H%M%S")

    ds.Rows = 64
    ds.Columns = 64
    ds.BitsAllocated = 16
    ds.BitsStored = 12
    ds.HighBit = 11
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelData = b'\x00\x00' * (64 * 64)

    ae = AE(ae_title="VIRTUAL_CT")
    ae.requested_contexts = StoragePresentationContexts

    assoc = ae.associate(host, port, ae_title="SYNOS_PACS")
    if assoc.is_established:
        print("[PASS] Association established. Transmitting C-STORE-RQ...")
        status = assoc.send_c_store(ds)
        assoc.release()

        print(f"Server Response Status: {status}")
        if status and status.Status == 0x0000:
            print("[PASS] C-STORE Succeeded with Status 0x0000 (SUCCESS)!")
            return True, study_uid, series_uid, sop_uid
        else:
            print(f"[FAIL] Server returned non-success: {status}")
            return False, study_uid, series_uid, sop_uid
    else:
        print("[FAIL] Association failed.")
        return False, None, None, None

if __name__ == "__main__":
    ok, st, se, so = run_matched_cstore()
    if not ok:
        sys.exit(1)
