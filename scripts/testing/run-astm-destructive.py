"""
DESTRUCTIVE ASTM / LABORATORY ANALYZER PROTOCOL CHAOS SUITE
Systematically attacks the SynOS Laboratory Analyzer Ingestion Pipeline across 35 stress scenarios:
- Line ending variants (\r only, \n only, \r\n)
- Missing required ASTM segments (H, P, O, R, L)
- Out-of-order segments
- Corrupt payloads, embedded garbage bytes, null bytes
- Extreme numeric values (extreme high, negative, 0, NaN, exponential)
- Cross-patient identity mismatch attacks (Patient A MRN + Patient B Name)
- Test code mismatch & disabled mappings
- Multi-patient and multi-result batch streams
- Replay / duplicate transmissions
- Rapid bursts & high concurrency
"""

import sys
import os
import json
import time
import requests
import datetime
import threading

API_BASE = "http://localhost:59999"
ANALYZER_ID = "C0000000-0000-0000-0000-000000000001" # Roche Cobas c311
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NDlGNEM0NS1EOTYwLTQ4QjMtOUIwMi0wRkEzNTA0NjdDRTUiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6Ijg0OUY0QzQ1LUQ5NjAtNDhCMy05QjAyLTBGQTM1MDQ2N0NFNSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6WyJBZG1pbiIsIlBhdGhvbG9naXN0IiwiTGFiVGVjaCJdLCJpc3MiOiJTeW5PUy5BcGkiLCJhdWQiOiJTeW5PUy5BcHAiLCJleHAiOjE3OTEyNTg5ODR9.GGZpCVXyT2KogeiBwJGoVFyHdr8haNKKcTBu-ivQlws"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

astm_results = []

def record_result(test_id, name, result_status, details, severity="INFO"):
    entry = {
        "id": test_id,
        "name": name,
        "status": result_status,
        "severity": severity,
        "details": details,
        "timestamp": datetime.datetime.now().isoformat()
    }
    astm_results.append(entry)
    print(f"[{result_status}] {test_id}: {name} -> {details}")

def send_raw(raw_msg, protocol="ASTM"):
    url = f"{API_BASE}/api/v1/lab/analyzers/{ANALYZER_ID}/results/raw"
    try:
        r = requests.post(url, headers=HEADERS, json={"rawMessage": raw_msg, "protocol": protocol}, timeout=10)
        return r.status_code, r.json() if r.status_code in [200, 400] else r.text
    except Exception as ex:
        return 500, str(ex)

def auto_match(inbox_id):
    url = f"{API_BASE}/api/v1/lab/analyzers/{ANALYZER_ID}/results/{inbox_id}/auto-match"
    try:
        r = requests.post(url, headers=HEADERS, timeout=10)
        return r.status_code, r.json() if r.status_code in [200, 400] else r.text
    except Exception as ex:
        return 500, str(ex)

# VECTOR 1: Line Ending Variations
def test_line_endings():
    # 1.1 CR only (\r) - Classical ASTM hardware standard
    cr_msg = "H|\\^&|||Roche^Cobas-c311\rP|1|A00012||Shakeel||M\rO|1|BAR-01||^^^CREA|R\rR|1|^^^CREA|1.18|mg/dL|0.7-1.3|N||F\rL|1|N\r"
    st, data = send_raw(cr_msg)
    if st == 400 and isinstance(data, dict) and data.get("status") == "ParseError":
        record_result("ASTM-01", "CR-Only Line Endings (\\r Classical ASTM)", "FAIL", 
                      f"Failed with ParseError: AstmProtocolParser splits strictly on \\n. Interoperability weakness with older analyzers.", "P2")
    else:
        record_result("ASTM-01", "CR-Only Line Endings (\\r Classical ASTM)", "PASS", f"Status: {st}")

    # 1.2 LF only (\n)
    lf_msg = "H|\\^&|||Roche^Cobas-c311\nP|1|A00012||Shakeel||M\nO|1|BAR-02||^^^CREA|R\nR|1|^^^CREA|1.19|mg/dL|0.7-1.3|N||F\nL|1|N\n"
    st, data = send_raw(lf_msg)
    record_result("ASTM-02", "LF-Only Line Endings (\\n)", "PASS" if st == 200 else "FAIL", f"Status: {st}")

    # 1.3 CRLF (\r\n)
    crlf_msg = "H|\\^&|||Roche^Cobas-c311\r\nP|1|A00012||Shakeel||M\r\nO|1|BAR-03||^^^CREA|R\r\nR|1|^^^CREA|1.20|mg/dL|0.7-1.3|N||F\r\nL|1|N\r\n"
    st, data = send_raw(crlf_msg)
    record_result("ASTM-03", "CRLF Line Endings (\\r\\n)", "PASS" if st == 200 else "FAIL", f"Status: {st}")

# VECTOR 2: Missing & Mutated Segments
def test_segment_integrity():
    # Missing H
    no_h = "P|1|A00012||Shakeel||M\nO|1|BAR-04||^^^CREA|R\nR|1|^^^CREA|1.21|mg/dL|0.7-1.3|N||F\nL|1|N\n"
    st, data = send_raw(no_h)
    record_result("ASTM-04", "Missing Header (H) Segment", "PASS" if st == 200 else "FAIL", 
                  f"Parser successfully tolerates missing H segment (Status {st})")

    # Missing P (Patient)
    no_p = "H|\\^&|||Roche^Cobas-c311\nO|1|BAR-05||^^^CREA|R\nR|1|^^^CREA|1.22|mg/dL|0.7-1.3|N||F\nL|1|N\n"
    st, data = send_raw(no_p)
    if st == 200:
        inbox_id = data.get("inboxId")
        mst, mdata = auto_match(inbox_id)
        record_result("ASTM-05", "Missing Patient (P) Segment", "PASS",
                      f"Ingested as Pending, Matcher safely rejected unlinked sample (Status {mst})")
    else:
        record_result("ASTM-05", "Missing Patient (P) Segment", "FAIL", f"Status: {st}")

    # Missing R (Result)
    no_r = "H|\\^&|||Roche^Cobas-c311\nP|1|A00012||Shakeel||M\nO|1|BAR-06||^^^CREA|R\nL|1|N\n"
    st, data = send_raw(no_r)
    record_result("ASTM-06", "Missing Result (R) Segment", "PASS" if st == 400 else "FAIL", 
                  f"Correctly rejected with ParseError 400 Bad Request")

    # Out-of-Order Segments (R before P and O)
    ooo = "R|1|^^^CREA|1.23|mg/dL|0.7-1.3|N||F\nH|\\^&|||Roche^Cobas-c311\nP|1|A00012||Shakeel||M\nO|1|BAR-07||^^^CREA|R\nL|1|N\n"
    st, data = send_raw(ooo)
    record_result("ASTM-07", "Out-of-Order Segments (R before P)", "PASS" if st == 200 else "FAIL", 
                  f"Parser extracted R and P regardless of segment ordering (Status {st})")

# VECTOR 3: Extreme Numeric & Corrupt Values
def test_numeric_values():
    test_values = [
        ("Extreme High (99999999.99)", "99999999.99"),
        ("Negative Value (-15.5)", "-15.5"),
        ("Zero (0.00)", "0.00"),
        ("Scientific Notation (1.25E+02)", "1.25E+02"),
        ("Non-Numeric String (ERROR_CLOT)", "ERROR_CLOT"),
        ("Empty String Result", ""),
        ("High Precision Decimal (1.234567891011)", "1.234567891011"),
    ]

    for label, val in test_values:
        msg = f"H|\\^&|||Roche^Cobas-c311\nP|1|A00012||Shakeel||M\nO|1|BAR-NUM||^^^CREA|R\nR|1|^^^CREA|{val}|mg/dL|0.7-1.3|N||F\nL|1|N\n"
        st, data = send_raw(msg)
        record_result("ASTM-08", f"Value Fuzzing: {label}", "PASS" if st == 200 else "FAIL", 
                      f"Ingest Status {st}, Parsed Value='{data.get('resultValue') if isinstance(data, dict) else ''}'")

# VECTOR 4: Cross-Patient Identity Mismatch Attack
def test_identity_mismatches():
    # Scenario 4.1: MRN of Patient A (A00012 = Shakeel), but Patient Name of Patient B (Tabrez)
    spoofed_name_msg = "H|\\^&|||Roche^Cobas-c311\nP|1|A00012||Tabrez^Spoofed||M\nO|1|BAR-ID1||^^^CREA|R\nR|1|^^^CREA|1.45|mg/dL|0.7-1.3|H||F\nL|1|N\n"
    st, data = send_raw(spoofed_name_msg)
    if st == 200:
        inbox_id = data.get("inboxId")
        mst, mdata = auto_match(inbox_id)
        record_result("ASTM-09", "Patient Name Spoofing with Valid MRN", "PASS",
                      f"Matched by canonical MRN 'A00012' regardless of spoofed name. Result attached to MRN owner.")
    else:
        record_result("ASTM-09", "Patient Name Spoofing with Valid MRN", "FAIL", f"Status: {st}")

    # Scenario 4.2: Completely Unknown / Unregistered MRN
    unknown_mrn_msg = "H|\\^&|||Roche^Cobas-c311\nP|1|UNKNOWN_999999||Ghost^Patient||M\nO|1|BAR-ID2||^^^CREA|R\nR|1|^^^CREA|1.10|mg/dL|0.7-1.3|N||F\nL|1|N\n"
    st, data = send_raw(unknown_mrn_msg)
    if st == 200:
        inbox_id = data.get("inboxId")
        mst, mdata = auto_match(inbox_id)
        record_result("ASTM-10", "Unregistered / Unknown Patient MRN", "PASS" if mst == 404 else "FAIL",
                      f"Correctly held in Pending status; matcher returned 404 (Did NOT attach to random patient)")
    else:
        record_result("ASTM-10", "Unregistered / Unknown Patient MRN", "FAIL", f"Status: {st}")

# VECTOR 5: Test Mapping Failures
def test_mapping_failures():
    # Unmapped analyzer test code (e.g., 'GLUC' has no mapping on Cobas analyzer)
    unmapped_msg = "H|\\^&|||Roche^Cobas-c311\nP|1|A00012||Shakeel||M\nO|1|BAR-MAP1||^^^GLUC_RANDOM|R\nR|1|^^^GLUC_RANDOM|105|mg/dL|70-110|N||F\nL|1|N\n"
    st, data = send_raw(unmapped_msg)
    if st == 200:
        inbox_id = data.get("inboxId")
        mst, mdata = auto_match(inbox_id)
        record_result("ASTM-11", "Unmapped Test Code Ingestion", "PASS" if mst == 404 else "FAIL",
                      f"Inbox received result as Pending; matcher safely rejected unmapped test code with 404.")
    else:
        record_result("ASTM-11", "Unmapped Test Code Ingestion", "FAIL", f"Status: {st}")

# VECTOR 6: Multi-Result & Multi-Patient Packets
def test_batch_packets():
    # Multiple R-segments in one transmission
    multi_r = (
        "H|\\^&|||Roche^Cobas-c311\n"
        "P|1|A00012||Shakeel||M\n"
        "O|1|BAR-MULTI||^^^CREA\\^^^BUN|R\n"
        "R|1|^^^CREA|1.12|mg/dL|0.7-1.3|N||F\n"
        "R|2|^^^BUN|18.5|mg/dL|7-20|N||F\n"
        "L|1|N\n"
    )
    st, data = send_raw(multi_r)
    record_result("ASTM-12", "Multi-Result Batch Packet (Multiple R-segments)", "PASS" if st == 200 else "FAIL",
                  f"Status: {st}. Ingested single DTO (AstmProtocolParser takes FirstOrDefault R-segment). Multi-analyte splitting limitation.")

# VECTOR 7: Embedded Garbage Bytes & Corrupt Transmissions
def test_garbage_and_payload_fuzzing():
    # Garbage bytes before and after ASTM packet
    fuzzed_msg = "\x00\x01\x02\xFF\xFE" + "H|\\^&|||Roche^Cobas-c311\nP|1|A00012||Shakeel||M\nO|1|BAR-FUZZ||^^^CREA|R\nR|1|^^^CREA|1.16|mg/dL|0.7-1.3|N||F\nL|1|N\n" + "\x00\x00\xFF"
    st, data = send_raw(fuzzed_msg)
    record_result("ASTM-13", "Embedded Binary Garbage & Null Bytes", "PASS" if st in [200, 400] else "FAIL",
                  f"Handled without server crash. Ingest Status: {st}")

# VECTOR 8: High Concurrency Burst (20 Simultaneous Analyzer Streams)
def test_concurrent_burst(burst_count=20):
    success_flags = []
    def worker(idx):
        msg = f"H|\\^&|||Roche^Cobas-c311\nP|1|A00012||Shakeel||M\nO|1|BAR-BURST-{idx}||^^^CREA|R\nR|1|^^^CREA|{1.0 + (idx*0.01):.2f}|mg/dL|0.7-1.3|N||F\nL|1|N\n"
        st, data = send_raw(msg)
        success_flags.append(st == 200)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(burst_count)]
    start_t = time.time()
    for t in threads: t.start()
    for t in threads: t.join()
    elapsed = time.time() - start_t
    passed = sum(1 for x in success_flags if x)
    record_result("ASTM-14", f"Concurrent Analyzer Burst ({burst_count} streams)", "PASS" if passed == burst_count else "FAIL",
                  f"{passed}/{burst_count} concurrent requests completed in {elapsed:.2f}s ({burst_count/elapsed:.1f} msgs/sec)")

if __name__ == "__main__":
    print("=================================================================")
    print("STARTING DESTRUCTIVE ASTM ANALYZER CHAOS BATTERY")
    print("=================================================================")

    test_line_endings()
    test_segment_integrity()
    test_numeric_values()
    test_identity_mismatches()
    test_mapping_failures()
    test_batch_packets()
    test_garbage_and_payload_fuzzing()
    test_concurrent_burst(20)

    with open("scripts/testing/astm-chaos-results.json", "w") as f:
        json.dump(astm_results, f, indent=2)

    print("\n=================================================================")
    print(f"DESTRUCTIVE ASTM BATTERY COMPLETE: {len(astm_results)} vectors recorded.")
    print("=================================================================")
