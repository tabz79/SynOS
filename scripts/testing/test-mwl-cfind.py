from pydicom.dataset import Dataset
from pynetdicom import AE, debug_logger
from pynetdicom.sop_class import ModalityWorklistInformationFind

debug_logger()

def test_mwl():
    ae = AE(ae_title="VIRTUAL_CT")
    ae.add_requested_context(ModalityWorklistInformationFind)

    print("Associating with SYNOS_PACS on 127.0.0.1:8899...")
    assoc = ae.associate("127.0.0.1", 8899, ae_title="SYNOS_PACS")
    if not assoc.is_established:
        print("Failed to establish association.")
        return

    print("Association established successfully!")
    query_ds = Dataset()
    query_ds.PatientName = ""
    query_ds.PatientID = ""
    query_ds.AccessionNumber = ""
    query_ds.Modality = ""
    query_ds.StudyInstanceUID = ""

    print("Sending C-FIND Request for ModalityWorklistInformationFind...")
    responses = assoc.send_c_find(query_ds, ModalityWorklistInformationFind)
    count = 0
    for status, identifier in responses:
        count += 1
        print(f"Response #{count}: Status = {status}")
        if identifier:
            print(identifier)

    assoc.release()
    print("Done. Total responses:", count)

if __name__ == "__main__":
    test_mwl()
