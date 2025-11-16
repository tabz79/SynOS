#!/bin/bash

# Base URL for the API
BASE_URL="http://localhost:5000/api/v1"
AUTH_URL="${BASE_URL}/auth"
APP_URL="${BASE_URL}/appointments"
PATIENT_URL="${BASE_URL}/patients"

# --- Authenticate as Admin to get a token ---
echo "--- Authenticating as admin@lab.com ---"
LOGIN_RESPONSE=$(curl -s -X POST "${AUTH_URL}/login" \
-H "Content-Type: application/json" \
-d '{
    "email": "admin@lab.com",
    "password": "Admin"
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

# --- 1. Create Appointment (with Idempotency-Key) ---
echo -e "\n--- 1. Creating a new appointment ---"
IDEMPOTENCY_KEY=$(uuidgen)
CREATE_RESPONSE=$(curl -s -X POST "${APP_URL}" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer ${ACCESS_TOKEN}" \
-H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
-d '{
    "patientId": "'"${PATIENT_ID}"'",
    "scheduledFor": "'$(date -u -d "+2 days" +"%Y-%m-%dT10:00:00Z")'",
    "department": "Radiology",
    "notes": "Annual check-up"
}')

echo "${CREATE_RESPONSE}" | jq .
APPOINTMENT_ID=$(echo "${CREATE_RESPONSE}" | jq -r '.appointmentId')

# --- 2. Reschedule Appointment ---
echo -e "\n--- 2. Rescheduling the appointment ---"
if [ -z "$APPOINTMENT_ID" ] || [ "$APPOINTMENT_ID" == "null" ]; then
    echo "Could not get appointment ID. Skipping reschedule test."
else
    RESCHEDULE_RESPONSE=$(curl -s -X POST "${APP_URL}/${APPOINTMENT_ID}/reschedule" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer ${ACCESS_TOKEN}" \
-d '{
        "newScheduledForUtc": "'$(date -u -d "+3 days" +"%Y-%m-%dT11:30:00Z")'"
    }')
    echo "${RESCHEDULE_RESPONSE}" | jq .
fi

# --- 3. Cancel Appointment ---
echo -e "\n--- 3. Cancelling the appointment ---"
if [ -z "$APPOINTMENT_ID" ] || [ "$APPOINTMENT_ID" == "null" ]; then
    echo "Could not get appointment ID. Skipping cancel test."
else
    CANCEL_RESPONSE=$(curl -s -X POST "${APP_URL}/${APPOINTMENT_ID}/cancel" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer ${ACCESS_TOKEN}" \
-d '{
        "reason": "Patient requested cancellation."
    }')
    echo "${CANCEL_RESPONSE}" | jq .
fi

# --- 4. Same-Day Visit Check ---
echo -e "\n--- 4. Checking for same-day visits ---"
# Use patient TC-A00002 who is seeded with same-day visits
SAME_DAY_PATIENT_ID=$(curl -s -X GET "${PATIENT_URL}?q=TC-A00002" \
-H "Authorization: Bearer ${ACCESS_TOKEN}" | jq -r '.[0].patientId')

if [ -z "$SAME_DAY_PATIENT_ID" ] || [ "$SAME_DAY_PATIENT_ID" == "null" ]; then
    echo "Could not find test patient TC-A00002. Skipping same-day visit test."
else
    TODAY=$(date -u +"%Y-%m-%d")
    SAME_DAY_RESPONSE=$(curl -s -X GET "${PATIENT_URL}/${SAME_DAY_PATIENT_ID}/same-day-visits?date=${TODAY}" \
-H "Authorization: Bearer ${ACCESS_TOKEN}")
    echo "${SAME_DAY_RESPONSE}" | jq .
fi
