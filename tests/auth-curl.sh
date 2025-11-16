#!/bin/bash

# Base URL for the API
BASE_URL="http://localhost:5000/api/v1/auth"

echo "--- Testing User Login (admin@lab.com / Admin) ---"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/login"
-H "Content-Type: application/json"
-d '{ "email": "admin@lab.com", "password": "Admin" }')

echo "Login Response:"
echo "${LOGIN_RESPONSE}" | jq .

ACCESS_TOKEN=$(echo "${LOGIN_RESPONSE}" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "${LOGIN_RESPONSE}" | jq -r '.refreshToken')

echo "Access Token: ${ACCESS_TOKEN}"
echo "Refresh Token: ${REFRESH_TOKEN}"

if [ -z "$ACCESS_TOKEN" ] || [ -z "$REFRESH_TOKEN" ]; then
    echo "Login failed. Exiting."
    exit 1
fi

echo -e "\n--- Testing Access to Protected Route (e.g., /health) with Access Token ---"
# Assuming a /health endpoint exists and is protected
curl -s -X GET "http://localhost:5000/api/v1/health"
-H "Authorization: Bearer ${ACCESS_TOKEN}" | jq .

echo -e "\n--- Testing Refresh Token ---"
# For cURL, we need to manually handle cookies.
# In a real browser, the HttpOnly cookie would be sent automatically.
# This example assumes the refresh token is also returned in the body for testing purposes,
# or you would extract it from a 'Set-Cookie' header if the API sends it that way.
# For this setup, the API sets an HttpOnly cookie, so we simulate it.

# First, get the Set-Cookie header from the login response to extract the refresh token cookie
LOGIN_HEADERS=$(curl -s -D - -X POST "${BASE_URL}/login"
-H "Content-Type: application/json"
-d '{ "email": "admin@lab.com", "password": "Admin" }' -o /dev/null)

REFRESH_COOKIE=$(echo "${LOGIN_HEADERS}" | grep -oP 'Set-Cookie: refreshToken=\K[^;]+')

if [ -z "$REFRESH_COOKIE" ]; then
    echo "Could not extract refresh token cookie. Refresh test skipped."
else
    echo "Refresh Token Cookie: ${REFRESH_COOKIE}"
    REFRESH_RESPONSE=$(curl -s -X POST "${BASE_URL}/refresh"
    -H "Cookie: refreshToken=${REFRESH_COOKIE}"
    -H "Content-Type: application/json")

    echo "Refresh Response:"
    echo "${REFRESH_RESPONSE}" | jq .

    NEW_ACCESS_TOKEN=$(echo "${REFRESH_RESPONSE}" | jq -r '.accessToken')
    NEW_REFRESH_TOKEN=$(echo "${REFRESH_RESPONSE}" | jq -r '.refreshToken')

    echo "New Access Token: ${NEW_ACCESS_TOKEN}"
    echo "New Refresh Token: ${NEW_REFRESH_TOKEN}"
fi

echo -e "\n--- Testing User Logout ---"
# Use the latest refresh token cookie for logout
LOGOUT_RESPONSE=$(curl -s -X POST "${BASE_URL}/logout"
-H "Cookie: refreshToken=${REFRESH_COOKIE}"
-H "Content-Type: application/json")

echo "Logout Response:"
echo "${LOGOUT_RESPONSE}"

echo -e "\n--- Testing Access to Protected Route After Logout (Should be Unauthorized) ---"
curl -s -X GET "http://localhost:5000/api/v1/health"
-H "Authorization: Bearer ${ACCESS_TOKEN}" | jq .

echo -e "\n--- Testing Invalid Login ---"
curl -s -X POST "${BASE_URL}/login"
-H "Content-Type: application/json"
-d '{ "email": "admin@lab.com", "password": "WrongPassword" }' | jq .

echo -e "\n--- Testing Forbidden Access (e.g., non-admin trying to access admin route) ---"
# This requires a protected admin route and a non-admin user.
# For demonstration, let's assume /api/v1/admin is an admin-only route.
# First, login as a non-admin user (e.g., reception@lab.com / Reception)
RECEPTION_LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/login"
-H "Content-Type: application/json"
-d '{ "email": "reception@lab.com", "password": "Reception" }')
RECEPTION_ACCESS_TOKEN=$(echo "${RECEPTION_LOGIN_RESPONSE}" | jq -r '.accessToken')

if [ -z "$RECEPTION_ACCESS_TOKEN" ]; then
    echo "Reception login failed. Skipping forbidden access test."
else
    echo "Reception Access Token: ${RECEPTION_ACCESS_TOKEN}"
    echo "Attempting to access /api/v1/admin as Reception (should be 403 Forbidden):"
    curl -s -X GET "http://localhost:5000/api/v1/admin"
    -H "Authorization: Bearer ${RECEPTION_ACCESS_TOKEN}" | jq .
fi
