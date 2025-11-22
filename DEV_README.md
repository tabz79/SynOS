# SynOS Developer Helpers

This document outlines helper endpoints and middleware available ONLY in the Development environment.

**IMPORTANT**: These features introduce security shortcuts for ease of testing. They MUST be removed or disabled before merging to any `main`, `release`, or `production` branch.

---

## 1. Development JWT Endpoint

To test protected routes without going through the full login flow, you can get a valid 24-hour JWT for a default developer user.

**Endpoint**: `POST /dev-login`

This endpoint accepts optional query parameters `?userId=...&name=...&roles=...` to customize the token claims.

### Example curl Command

```shell
# Get a token for the default dev user (Admin, PathTech, Reception roles)
curl -X POST "http://localhost:5002/dev-login" -H "accept: */*"
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 2. Header-Based Authentication Bypass

To bypass authentication for a single request, you can add the `X-DEV-USER` header. The middleware will construct a user principal based on the header's JSON value, skipping JWT validation entirely.

### Example curl Command

This example calls a protected endpoint by impersonating a user with only the 'PathTech' role.

```shell
curl -X GET "http://localhost:5002/api/v1/samples/worklist" \
-H "accept: */*" \
-H "X-DEV-USER: {"id":"dev-user-123", "name":"Temp Tech", "roles":["PathTech"]}"
```

This is useful for testing specific role permissions without needing to generate a new token for every scenario.

```