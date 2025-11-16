#!/bin/bash

# Base URL for the API
BASE_URL="http://localhost:5000/api/v1"
AUTH_URL="${BASE_URL}/auth"
VISIT_URL="${BASE_URL}/visits"
PATIENT_URL="${BASE_URL}/patients"

# --- Authenticate as Admin to get a token ---
echo "--- Authenticating as admin@lab.com ---"
LOGIN_RESPONSE=$(curl -s -X POST "${AUTH_URL}/login" \
-H "Content-Type: application/json" \
-d '{ \
    "email": "admin@lab.com", \
    "password": "Admin" \
}')

ACCESS_TOKEN=$(echo "${LOGIN_RESPONSE}" | jq -r '.accessToken')
if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
    echo "Authentication failed. Exiting."
    exit 1
fi
echo "Authentication successful."

# --- Get a Test Patient ID ---
PATIENT_ID=$(curl -s -X GET "${PATIENT_URL}?q=TC-A00001" \
-H "Authorization: Bearer ${ACCESS_TOKEN}" | jq -r '.[0].patientId')

if [ -z "$PATIENT_ID" ] || [ "$PATIENT_ID" == "null" ]; then
    echo "Could not find test patient TC-A00001. Exiting."
    exit 1
fi
echo "Using Patient ID: ${PATIENT_ID}"

# --- 1. Create Visit ---
echo -e "\n--- 1. Creating a new visit ---"
CREATE_VISIT_RESPONSE=$(curl -s -X POST "${VISIT_URL}" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer ${ACCESS_TOKEN}" \
-d '{ \
    "patientId": "'"${PATIENT_ID}"'", \
    "department": "Pathology", \
    "testCodes": ["CBC", "FBS"] \
}')

echo "${CREATE_VISIT_RESPONSE}" | jq .
VISIT_ID=$(echo "${CREATE_VISIT_RESPONSE}" | jq -r '.visitId')
VISIT_TOKEN=$(echo "${CREATE_VISIT_RESPONSE}" | jq -r '.token')

if [ -z "$VISIT_ID" ] || [ "$VISIT_ID" == "null" ]; then
    echo "Visit creation failed. Exiting."
    exit 1
fi
echo "Created Visit ID: ${VISIT_ID}, Token: ${VISIT_TOKEN}"

# --- 2. Record Payment (Full Payment) ---
echo -e "\n--- 2. Recording full payment for the visit ---"
RECORD_PAYMENT_RESPONSE=$(curl -s -X POST "${VISIT_URL}/${VISIT_ID}/payment" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer ${ACCESS_TOKEN}" \
-d '{ \
    "amount": 250.00, \
    "method": "Cash", \
    "receiptNo": "REC-001" \
}')

echo "${RECORD_PAYMENT_RESPONSE}" | jq .

# --- 3. Get Visit Details ---
echo -e "\n--- 3. Getting visit details after payment ---"
GET_DETAILS_RESPONSE=$(curl -s -X GET "${VISIT_URL}/${VISIT_ID}" \
-H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "${GET_DETAILS_RESPONSE}" | jq .

# --- 4. Create another visit for partial payment test ---
echo -e "\n--- 4. Creating another visit for partial payment test ---"
PATIENT_ID_2=$(curl -s -X GET "${PATIENT_URL}?q=TC-A00002" \
-H "Authorization: Bearer ${ACCESS_TOKEN}" | jq -r '.[0].patientId')

CREATE_VISIT_RESPONSE_2=$(curl -s -X POST "${VISIT_URL}" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer ${ACCESS_TOKEN}" \
-d '{ \
    "patientId": "'"${PATIENT_ID_2}"'", \
    "department": "Radiology", \
    "testCodes": ["USG", "XrayChest"] \
}')
VISIT_ID_2=$(echo "${CREATE_VISIT_RESPONSE_2}" | jq -r '.visitId')
echo "Created Visit ID for partial payment: ${VISIT_ID_2}"

# --- 5. Record Partial Payment ---
echo -e "\n--- 5. Recording partial payment for the second visit ---"
PARTIAL_PAYMENT_RESPONSE=$(curl -s -X POST "${VISIT_URL}/${VISIT_ID_2}/payment" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer ${ACCESS_TOKEN}" \
-d '{ \
    "amount": 200.00, \
    "method": "Card", \
    "receiptNo": "REC-002" \
}')
echo "${PARTIAL_PAYMENT_RESPONSE}" | jq .

# --- 6. Cancel Visit ---
echo -e "\n--- 6. Cancelling the first visit ---"
CANCEL_VISIT_RESPONSE=$(curl -s -X POST "${VISIT_URL}/${VISIT_ID}/cancel" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer ${ACCESS_TOKEN}" \
-d '{ \
    "reason": "Patient changed mind." \
}')

echo "${CANCEL_VISIT_RESPONSE}" | jq .

# --- 7. Get Visits by Department and Status ---
echo -e "\n--- 7. Getting visits for Pathology with status 'Cancelled' ---"
GET_CANCELLED_VISITS=$(curl -s -X GET "${VISIT_URL}?dept=Pathology&status=Cancelled" \
-H "Authorization: Bearer ${ACCESS_TOKEN}")
echo "${GET_CANCELLED_VISITS}" | jq .

echo -e "\n--- 8. Getting visits for Radiology with status 'PendingPayment' ---"
GET_PENDING_VISITS=$(curl -s -X GET "${VISIT_URL}?dept=Radiology&status=PendingPayment" \
-H "Authorization: Bearer ${ACCESS_TOKEN}")
echo "${GET_PENDING_VISITS}" | jq .
