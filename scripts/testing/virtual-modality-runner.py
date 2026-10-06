"""
Standalone Protocol-Level DICOM Test Runner
Impersonates a real CT / MRI Modality SCU connecting over TCP to SynOS PACS SCP.
NO UI, NO MOCKS. Uses genuine pynetdicom / pydicom network sockets.
"""

import sys
import os
import time
import datetime
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid
from pynetdicom import AE, VerificationPresentationContexts, StoragePresentationContexts
from pynetdicom.sop_class import CTImageStorage, MRImageStorage, Verification

def test_cecho(host="127.0.0.1", port=8899, calling_aet="VIRTUAL_CT", called_aet="SYNOS_PACS"):
    print(f"\n--- [1] PROTOCOL TEST: DICOM C-ECHO (PING) ---")
    print(f"Connecting from Calling AE '{calling_aet}' to '{called_aet}' on {host}:{port}...")
    
    ae = AE(ae_title=calling_aet)
    ae.requested_contexts = VerificationPresentationContexts
    
    start_t = time.time()
    assoc = ae.associate(host, port, ae_title=called_aet)
    
    if assoc.is_established:
        latency = (time.time() - start_t) * 1000
        print(f"[PASS] TCP Association ESTABLISHED in {latency:.2f}ms")
        
        status = assoc.send_c_echo()
        assoc.release()
        
        if status and status.Status == 0x0000:
            print(f"[PASS] C-ECHO Response Received: Status 0x0000 (SUCCESS)")
            return True
        else:
            print(f"[FAIL] C-ECHO Failed: Status={status}")
            return False
    else:
        print(f"[FAIL] Association REJECTED or ABORTED by {host}:{port}")
        return False

def generate_sample_dicom(patient_id="MOD-PAT-001", patient_name="Virtual^Scanner^Test", modality="CT"):
    study_uid = generate_uid()
    series_uid = generate_uid()
    sop_uid = generate_uid()

    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = CTImageStorage if modality == "CT" else MRImageStorage
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

    ds.PatientID = patient_id
    ds.PatientName = patient_name
    ds.Modality = modality
    ds.StudyDescription = f"{modality} Virtual Scanner Diagnostic Scan"
    ds.SeriesDescription = f"{modality} Axial 5mm Series"
    ds.InstanceNumber = 1
    ds.StudyDate = datetime.date.today().strftime("%Y%m%d")
    ds.StudyTime = datetime.datetime.now().strftime("%H%M%S")
    ds.AccessionNumber = "ACC-" + datetime.datetime.now().strftime("%y%m%d%H%M%S")

    # Minimal uncompressed 64x64 pixel data
    ds.Rows = 64
    ds.Columns = 64
    ds.BitsAllocated = 16
    ds.BitsStored = 12
    ds.HighBit = 11
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelData = b'\x00\x00' * (64 * 64)

    return ds, study_uid, series_uid, sop_uid

def test_cstore(host="127.0.0.1", port=8899, calling_aet="VIRTUAL_CT", called_aet="SYNOS_PACS"):
    print(f"\n--- [2] PROTOCOL TEST: DICOM C-STORE (IMAGE PUSH) ---")
    
    ds, study_uid, series_uid, sop_uid = generate_sample_dicom()
    print(f"Generated Synthetic DICOM Dataset:")
    print(f"  PatientID: {ds.PatientID}")
    print(f"  PatientName: {ds.PatientName}")
    print(f"  Modality: {ds.Modality}")
    print(f"  StudyUID: {study_uid}")
    print(f"  SeriesUID: {series_uid}")
    print(f"  SOPInstanceUID: {sop_uid}")

    ae = AE(ae_title=calling_aet)
    ae.requested_contexts = StoragePresentationContexts

    print(f"\nInitiating Association to {host}:{port} (AE: {called_aet})...")
    assoc = ae.associate(host, port, ae_title=called_aet)

    if assoc.is_established:
        print(f"[PASS] Association Accepted. Sending C-STORE-RQ...")
        status = assoc.send_c_store(ds)
        assoc.release()

        if status and status.Status == 0x0000:
            print(f"[PASS] C-STORE Succeeded! Remote Status: 0x0000 (SUCCESS)")
            return True, study_uid, series_uid, sop_uid
        else:
            print(f"[FAIL] C-STORE Failed: Status={status}")
            return False, study_uid, series_uid, sop_uid
    else:
        print(f"[FAIL] Failed to establish Storage association with {host}:{port}")
        return False, study_uid, series_uid, sop_uid

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
    print(f"==================================================")
    print(f"SYNOS PROTOCOL-LEVEL VIRTUAL MODALITY VALIDATOR")
    print(f"Target Port: {port}")
    print(f"==================================================")

    # Step 1: C-ECHO
    echo_ok = test_cecho(port=port)
    if not echo_ok:
        print("\nFATAL: C-ECHO failed. Aborting C-STORE.")
        sys.exit(1)

    # Step 2: C-STORE
    store_ok, study_uid, series_uid, sop_uid = test_cstore(port=port)
    if not store_ok:
        print("\nFATAL: C-STORE failed.")
        sys.exit(1)

    print(f"\n[PASS] PROTOCOL TESTS COMPLETED SUCCESSFULLY!")
    print(f"Target verification details for backend inspection:")
    print(f"  Expected Path: C:\\SynOS_Files\\PACS\\{study_uid}\\{series_uid}\\{sop_uid}.dcm")
    print(f"  Expected SOP UID: {sop_uid}")
