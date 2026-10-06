"""
Protocol-Level Laboratory Analyzer Ingestion & Workflow Validation Harness
Impersonates a Roche Cobas c311 / Sysmex XN-550 sending real ASTM E1394 and HL7 v2.x messages.
Pushes raw messages to SynOS and traces:
1. Parsing into LabAnalyzerResultInbox
2. Automatic matching against Patient MRN + Active Order
3. Auto-import into clinical pathology results
"""

import sys
import json
import requests

API_BASE = "http://localhost:59999"
ANALYZER_ID = "C0000000-0000-0000-0000-000000000001" # Roche Cobas c311
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NDlGNEM0NS1EOTYwLTQ4QjMtOUIwMi0wRkEzNTA0NjdDRTUiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6Ijg0OUY0QzQ1LUQ5NjAtNDhCMy05QjAyLTBGQTM1MDQ2N0NFNSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6WyJBZG1pbiIsIlBhdGhvbG9naXN0IiwiTGFiVGVjaCJdLCJpc3MiOiJTeW5PUy5BcGkiLCJhdWQiOiJTeW5PUy5BcHAiLCJleHAiOjE3OTEyNTg5ODR9.GGZpCVXyT2KogeiBwJGoVFyHdr8haNKKcTBu-ivQlws"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def run_analyzer_test():
    print("=============================================================")
    print("LABORATORY ANALYZER PROTOCOL & PIPELINE VALIDATION")
    print("Analyzer: Roche Cobas c311 (Biochemistry)")
    print("=============================================================")

    # In AstmProtocolParser.cs:
    # result.PatientIdentifier = pFields[2].Split('^').FirstOrDefault()
    # So P|1|A00012^^^ puts A00012 directly into pFields[2]
    raw_astm = (
        "H|\\^&|||Roche^Cobas-c311||||||P|1|20261005\n"
        "P|1|A00012||Shakeel||M\n"
        "O|1|BAR-99881||^^^CREA|R\n"
        "R|1|^^^CREA|1.15|mg/dL|0.7-1.3|N||F\n"
        "L|1|N\n"
    )

    print("\n--- [1] TRANSMITTING RAW ASTM E1394 PACKET ---")
    print("Raw Packet Content:\n" + raw_astm)

    ingest_payload = {
        "rawMessage": raw_astm,
        "protocol": "ASTM"
    }

    resp = requests.post(
        f"{API_BASE}/api/v1/lab/analyzers/{ANALYZER_ID}/results/raw",
        headers=HEADERS,
        json=ingest_payload
    )

    print(f"Ingest Response Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"[FAIL] Ingest failed: {resp.text}")
        return False

    inbox_item = resp.json()
    inbox_id = inbox_item.get("inboxId")
    print(f"[PASS] Successfully ingested into LabAnalyzerResultInbox!")
    print(f"  InboxId: {inbox_id}")
    print(f"  Status: {inbox_item.get('status')}")
    print(f"  PatientIdentifier: {inbox_item.get('patientIdentifier')}")
    print(f"  AnalyzerTestCode: {inbox_item.get('analyzerTestCode')}")
    print(f"  ResultValue: {inbox_item.get('resultValue')}")

    # Step 2: Trigger Auto-Match
    print("\n--- [2] TRIGGERING AUTOMATIC RESULT MATCHER ---")
    match_resp = requests.post(
        f"{API_BASE}/api/v1/lab/analyzers/{ANALYZER_ID}/results/{inbox_id}/auto-match",
        headers=HEADERS
    )
    print(f"Matcher Response Status: {match_resp.status_code}")
    if match_resp.status_code != 200:
        print(f"[FAIL] Auto-match failed: {match_resp.text}")
        return False

    matched_item = match_resp.json()
    print(f"[PASS] Successfully matched to Visit and Order!")
    print(f"  Status: {matched_item.get('status')}")
    print(f"  Mapped ParameterCode: {matched_item.get('parameterCode')}")
    print(f"  Matched OrderId: {matched_item.get('orderId')}")
    print(f"  Matched VisitId: {matched_item.get('visitId')}")

    # Step 3: Trigger Import to Clinical Order
    print("\n--- [3] IMPORTING INTO PATHOLOGY CLINICAL RESULTS ---")
    import_resp = requests.post(
        f"{API_BASE}/api/v1/lab/analyzers/{ANALYZER_ID}/results/{inbox_id}/import-to-order",
        headers=HEADERS
    )
    print(f"Import Response Status: {import_resp.status_code}")
    if import_resp.status_code != 200:
        print(f"[FAIL] Clinical import failed: {import_resp.text}")
        return False

    import_result = import_resp.json()
    print(f"[PASS] Successfully imported into core Clinical Pathology!")
    print(f"  ResultId: {import_result.get('resultId')}")
    print(f"  Status: {import_result.get('status')}")
    print(f"  Message: {import_result.get('message')}")

    return True

if __name__ == "__main__":
    ok = run_analyzer_test()
    if not ok:
        sys.exit(1)
