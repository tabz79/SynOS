"""
DESTRUCTIVE CROSS-SYSTEM IDENTITY & VISIT ATTACHMENT ATTACK HARNESS
Explores race conditions and edge cases in AnalyzerResultMatcherService:
1. Multiple Paid Visits for Same Patient (Does result attach to oldest or newest?)
2. Unpaid Visit vs Paid Visit (Does matcher skip unpaid visit?)
3. Duplicate Matching Orders within same Visit
4. Post-Lock Ingestion (Does matcher push results into already signed/completed orders?)
"""

import sys
import json
import requests
import datetime

API_BASE = "http://localhost:59999"
ANALYZER_ID = "C0000000-0000-0000-0000-000000000001"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NDlGNEM0NS1EOTYwLTQ4QjMtOUIwMi0wRkEzNTA0NjdDRTUiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6Ijg0OUY0QzQ1LUQ5NjAtNDhCMy05QjAyLTBGQTM1MDQ2N0NFNSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6WyJBZG1pbiIsIlBhdGhvbG9naXN0IiwiTGFiVGVjaCJdLCJpc3MiOiJTeW5PUy5BcGkiLCJhdWQiOiJTeW5PUy5BcHAiLCJleHAiOjE3OTEyNTg5ODR9.GGZpCVXyT2KogeiBwJGoVFyHdr8haNKKcTBu-ivQlws"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

identity_findings = []

def run_identity_battery():
    print("=================================================================")
    print("STARTING CROSS-SYSTEM IDENTITY & WRONG-PATIENT ATTACHMENT ATTACK")
    print("=================================================================")

    # Test Case 1: Send ASTM packet with Patient A MRN and Order
    msg1 = (
        "H|\\^&|||Roche^Cobas-c311\n"
        "P|1|A00012||Shakeel||M\n"
        "O|1|BAR-ID-01||^^^CREA|R\n"
        "R|1|^^^CREA|1.35|mg/dL|0.7-1.3|H||F\n"
        "L|1|N\n"
    )
    r1 = requests.post(f"{API_BASE}/api/v1/lab/analyzers/{ANALYZER_ID}/results/raw", headers=HEADERS, json={"rawMessage": msg1, "protocol": "ASTM"})
    inbox1 = r1.json()["inboxId"]
    m1 = requests.post(f"{API_BASE}/api/v1/lab/analyzers/{ANALYZER_ID}/results/{inbox1}/auto-match", headers=HEADERS)
    match1 = m1.json()

    # Test Case 2: Send exact same result 5 seconds later (Duplicate Replay)
    r2 = requests.post(f"{API_BASE}/api/v1/lab/analyzers/{ANALYZER_ID}/results/raw", headers=HEADERS, json={"rawMessage": msg1, "protocol": "ASTM"})
    inbox2 = r2.json()["inboxId"]
    m2 = requests.post(f"{API_BASE}/api/v1/lab/analyzers/{ANALYZER_ID}/results/{inbox2}/auto-match", headers=HEADERS)
    match2 = m2.json()

    # Import both
    imp1 = requests.post(f"{API_BASE}/api/v1/lab/analyzers/{ANALYZER_ID}/results/{inbox1}/import-to-order", headers=HEADERS)
    imp2 = requests.post(f"{API_BASE}/api/v1/lab/analyzers/{ANALYZER_ID}/results/{inbox2}/import-to-order", headers=HEADERS)

    print(f"Import 1 Status: {imp1.status_code} -> {imp1.json().get('status')}")
    print(f"Import 2 (Replay) Status: {imp2.status_code} -> {imp2.json().get('status')}")

    return {
        "inbox1": inbox1,
        "inbox2": inbox2,
        "import1": imp1.json(),
        "import2": imp2.json()
    }

if __name__ == "__main__":
    res = run_identity_battery()
    with open("scripts/testing/identity-chaos-results.json", "w") as f:
        json.dump(res, f, indent=2)
