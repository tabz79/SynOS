"""
Deep Analyzer Reality & Pathology Interoperability Matrix
Exhaustively tests the ugly reality of real clinical laboratory analyzers:
- 15+ parameter full CBC panel
- Abnormal flags (H, L, A, *, !)
- High/low bounds (<0.01, >5000)
- Scientific notation (1.45E+03)
- Non-numeric errors (ERROR_CLOT, ERR_LIP)
- Empty/blank results
- Multi-patient batch packets (P|1...P|2...)
- QC & Calibration records
- Replays & Duplicate results
"""

import sys
import time
import requests

BASE_API = "http://localhost:59999"
ANALYZER_ID = "C0000000-0000-0000-0000-000000000001"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NDlGNEM0NS1EOTYwLTQ4QjMtOUIwMi0wRkEzNTA0NjdDRTUiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6Ijg0OUY0QzQ1LUQ5NjAtNDhCMy05QjAyLTBGQTM1MDQ2N0NFNSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6WyJBZG1pbiIsIlBhdGhvbG9naXN0IiwiTGFiVGVjaCJdLCJpc3MiOiJTeW5PUy5BcGkiLCJhdWQiOiJTeW5PUy5BcHAiLCJleHAiOjE3OTEyNTg5ODR9.GGZpCVXyT2KogeiBwJGoVFyHdr8haNKKcTBu-ivQlws"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def post_raw_astm(astm_str):
    url = f"{BASE_API}/api/v1/lab/analyzers/{ANALYZER_ID}/results/raw"
    resp = requests.post(url, headers=HEADERS, json={"rawMessage": astm_str, "protocol": "ASTM"}, timeout=10)
    return resp.status_code, resp.json() if resp.status_code in [200, 400] else resp.text

def test_deep_analyzer_matrix():
    print("="*70)
    print("STARTING DEEP CLINICAL ANALYZER REALITY MATRIX")
    print("="*70)

    results = []

    # 1. 15+ Parameter Complete CBC Panel
    cbc_15 = (
        "H|\\^&|||SYSMEX_XN1000||||||||E1394-97\r"
        "P|1||A00001||Test Patient1\r"
        f"O|1|SMP-CBC15||^^^CBC||||||||||||||||||||F\r"
        "R|1|^^^WBC|6.54|10^3/uL|4.0-11.0|N||F\r"
        "R|2|^^^RBC|4.82|10^6/uL|4.2-5.8|N||F\r"
        "R|3|^^^HGB|14.1|g/dL|12.0-16.0|N||F\r"
        "R|4|^^^HCT|42.3|%|37.0-48.0|N||F\r"
        "R|5|^^^MCV|87.8|fL|80.0-100.0|N||F\r"
        "R|6|^^^MCH|29.3|pg|27.0-33.0|N||F\r"
        "R|7|^^^MCHC|33.3|g/dL|32.0-36.0|N||F\r"
        "R|8|^^^PLT|225|10^3/uL|150-450|N||F\r"
        "R|9|^^^RDW_CV|13.2|%|11.5-14.5|N||F\r"
        "R|10|^^^MPV|9.8|fL|7.5-11.5|N||F\r"
        "R|11|^^^NEUT#|3.85|10^3/uL|2.0-7.0|N||F\r"
        "R|12|^^^LYMPH#|2.10|10^3/uL|1.0-3.0|N||F\r"
        "R|13|^^^MONO#|0.42|10^3/uL|0.2-1.0|N||F\r"
        "R|14|^^^EO#|0.12|10^3/uL|0.0-0.5|N||F\r"
        "R|15|^^^BASO#|0.05|10^3/uL|0.0-0.2|N||F\r"
        "L|1|N\r"
    )
    st, res = post_raw_astm(cbc_15)
    print(f"[TEST 1] 15-Parameter Full CBC Panel -> Status: {st}")
    results.append(st == 200)

    # 2. Abnormal High / Low / Critical Flags (H, L, HH, LL, A)
    astm_flags = (
        "H|\\^&|||ROCHE_COBAS||||||||E1394-97\r"
        "P|1||A00001||Test Patient1\r"
        f"O|1|SMP-FLAGS||^^^CHEM||||||||||||||||||||F\r"
        "R|1|^^^GLU|350|mg/dL|70-99|HH||F\r"
        "R|2|^^^K|2.1|mmol/L|3.5-5.1|LL||F\r"
        "R|3|^^^ALT|85|U/L|10-40|H||F\r"
        "R|4|^^^TSH|0.02|uIU/mL|0.4-4.2|L||F\r"
        "L|1|N\r"
    )
    st, res = post_raw_astm(astm_flags)
    print(f"[TEST 2] High/Low/Critical Flags (HH, LL, H, L) -> Status: {st}")
    results.append(st == 200)

    # 3. Dynamic Lower and Upper Boundary Notation (<0.01 and >5000)
    astm_bounds = (
        "H|\\^&|||ABBOTT_ARCHITECT||||||||E1394-97\r"
        "P|1||A00001||Test Patient1\r"
        f"O|1|SMP-BOUNDS||^^^IMMUNO||||||||||||||||||||F\r"
        "R|1|^^^HCG|<0.01|mIU/mL|0.0-5.0|N||F\r"
        "R|2|^^^FERRITIN|>5000|ng/mL|30-400|H||F\r"
        "L|1|N\r"
    )
    st, res = post_raw_astm(astm_bounds)
    print(f"[TEST 3] Out-of-Range Bounds (<0.01, >5000) -> Status: {st}")
    results.append(st == 200)

    # 4. Scientific Notation (1.45E+03) & Precision Decimals
    astm_sci = (
        "H|\\^&|||BIO_RAD_D10||||||||E1394-97\r"
        "P|1||A00001||Test Patient1\r"
        f"O|1|SMP-SCI||^^^SPECIAL||||||||||||||||||||F\r"
        "R|1|^^^VIRAL_LOAD|1.45E+03|copies/mL||N||F\r"
        "R|2|^^^CREA_PRECISE|1.042857|mg/dL|0.7-1.3|N||F\r"
        "L|1|N\r"
    )
    st, res = post_raw_astm(astm_sci)
    print(f"[TEST 4] Scientific Notation & High Precision -> Status: {st}")
    results.append(st == 200)

    # 5. Non-numeric Analyzer Flags / Errors (ERROR_CLOT, HEMOLYZED, LIPEMIC)
    astm_errors = (
        "H|\\^&|||SYSMEX_CS||||||||E1394-97\r"
        "P|1||A00001||Test Patient1\r"
        f"O|1|SMP-ERR||^^^COAG||||||||||||||||||||F\r"
        "R|1|^^^PT|ERROR_CLOT|sec|11.0-13.5|A||F\r"
        "R|2|^^^APTT|HEMOLYZED|sec|25.0-35.0|A||F\r"
        "L|1|N\r"
    )
    st, res = post_raw_astm(astm_errors)
    print(f"[TEST 5] Non-numeric Analyzer Errors (ERROR_CLOT, HEMOLYZED) -> Status: {st}")
    results.append(st == 200)

    # 6. Blank / Empty Result Value
    astm_blank = (
        "H|\\^&|||ANONYMOUS_ANALYZER||||||||E1394-97\r"
        "P|1||A00001||Test Patient1\r"
        f"O|1|SMP-BLANK||^^^CHEM||||||||||||||||||||F\r"
        "R|1|^^^NA||mmol/L|135-145|N||F\r"
        "L|1|N\r"
    )
    st, res = post_raw_astm(astm_blank)
    print(f"[TEST 6] Blank / Empty Value Segment -> Status: {st}")
    results.append(st == 200)

    # 7. Quality Control (QC) Result Record (Control Sample)
    astm_qc = (
        "H|\\^&|||ROCHE_COBAS||||||||E1394-97\r"
        "P|1||QC_CONTROL_LEVEL_1||QC^PreciNorm\r"
        f"O|1|QC-LOT-202610||^^^QC||||||||||||||||||||Q\r"
        "R|1|^^^GLU|102|mg/dL|95-105|N||F\r"
        "L|1|N\r"
    )
    st, res = post_raw_astm(astm_qc)
    print(f"[TEST 7] Quality Control (QC) Payload -> Status: {st}")
    results.append(st == 200)

    # 8. Calibration Record
    astm_cal = (
        "H|\\^&|||ROCHE_COBAS||||||||E1394-97\r"
        "P|1||CALIBRATOR_LEVEL_2||C_CalSet\r"
        f"O|1|CAL-LOT-9876||^^^CAL||||||||||||||||||||C\r"
        "R|1|^^^CAL_FACTOR|1.002|||||F\r"
        "L|1|N\r"
    )
    st, res = post_raw_astm(astm_cal)
    print(f"[TEST 8] Calibration Record -> Status: {st}")
    results.append(st == 200)

    # 9. Multi-Patient Combined ASTM Stream (P|1...P|2...)
    astm_multipatient = (
        "H|\\^&|||SYSMEX_MULTI||||||||E1394-97\r"
        "P|1||A00001||Test Patient1\r"
        f"O|1|SMP-P1||^^^CBC||||||||||||||||||||F\r"
        "R|1|^^^WBC|7.1|10^3/uL|4.0-11.0|N||F\r"
        "P|2||A00012||Shakeel\r"
        f"O|2|SMP-P2||^^^CBC||||||||||||||||||||F\r"
        "R|1|^^^WBC|5.9|10^3/uL|4.0-11.0|N||F\r"
        "L|1|N\r"
    )
    st, res = post_raw_astm(astm_multipatient)
    print(f"[TEST 9] Multi-Patient Batch Stream -> Status: {st}")
    results.append(st == 200)

    # 10. Duplicate Re-Transmission of Same Sample Result
    st, res = post_raw_astm(cbc_15)
    print(f"[TEST 10] Duplicate Sample Re-transmission -> Status: {st}")
    results.append(st == 200)

    all_passed = all(results)
    print("\n" + "="*70)
    print(f"DEEP ANALYZER REALITY MATRIX: {'ALL 10 PASSED' if all_passed else 'FAILURES DETECTED'}")
    print("="*70)
    return all_passed

if __name__ == "__main__":
    ok = test_deep_analyzer_matrix()
    sys.exit(0 if ok else 1)
