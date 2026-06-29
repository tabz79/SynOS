# WhatsApp Cloud API & Notification Engine Setup

This document describes the configuration, architecture, and setup instructions for the **Generic Notification Engine** and the **Meta WhatsApp Cloud API Provider** integrated inside the TBZ Middleware.

---

## Configuration (`appsettings.json`)

Configure your Meta WhatsApp options under the `"WhatsApp"` configuration section. Ensure you do not check secrets into source control (override them using environment variables).

```json
{
  "WhatsApp": {
    "AccessToken": "YOUR_META_PERMANENT_ACCESS_TOKEN",
    "PhoneNumberId": "YOUR_PHONE_NUMBER_ID",
    "BusinessAccountId": "YOUR_BUSINESS_ACCOUNT_ID",
    "VerifyToken": "YOUR_WEBHOOK_VERIFY_TOKEN_CHALLENGE",
    "AppSecret": "YOUR_META_APP_SECRET_FOR_SIGNATURES",
    "GraphApiVersion": "v25.0",
    "BaseUrl": "https://graph.facebook.com/"
  }
}
```

### Environment Variable Equivalents
For production environments, map these options using standard environment variables:
- `WhatsApp__AccessToken`
- `WhatsApp__PhoneNumberId`
- `WhatsApp__BusinessAccountId`
- `WhatsApp__VerifyToken`
- `WhatsApp__AppSecret`

---

## Database Tables

We store outbox history, worker queue state, webhook audits, and inbound messages in the SQLite database (`MiddlewareDb.db`). The schema includes:

1. **`NotificationMessages`** (Business Audit Record):
   - Permanent database log of every sent message, including channels, recipient details, template parameters (`VariablesJson`), message IDs, correlation IDs, and timestamps.
2. **`NotificationOutboxes`** (Transient Worker Queue):
   - Outbox processing state. Manages worker thread locking (`LockedUntil`, `WorkerId`), delivery retry counts (`Attempts`), backoff timing (`NextRetry`), and errors.
3. **`NotificationTemplates`** (Template Management):
   - Store for approved Meta templates, matching pattern translation blocks, and variable positional indexes.
4. **`NotificationWebhookEvents`** (Webhook Audit Log):
   - Raw JSON payloads from webhook status checks.
5. **`NotificationInboxes`** (Inbound Message Ingestion):
   - Stores inbound customer messages received from WhatsApp.

---

## Webhook Endpoint Routing

Meta requires webhooks to be registered at a public-facing URL to confirm delivery updates.

- **GET `/api/webhooks/whatsapp`** (Challenge verification):
  - Automatically responds to Meta's subscription challenge by validating `hub.verify_token` against the configured `VerifyToken`.
- **POST `/api/webhooks/whatsapp`** (Event delivery):
  - Validates Meta's request authenticity by computing `HMAC-SHA256` of the raw stream body with `AppSecret` and comparing it to the `X-Hub-Signature-256` header.
  - Updates matching `NotificationMessage` entities on delivery/read receipts.
  - Saves customer replies to `NotificationInboxes`.

---

## Direct Dispatches

To send/queue notifications, call the public endpoints or inject `INotificationService`:

```bash
# Queue a notification for background dispatching via outbox worker:
curl -X POST http://localhost:5000/api/notifications/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "+16505551234",
    "templateName": "report_ready",
    "variables": {
      "PatientName": "Alice",
      "DownloadLink": "https://tbzlabs.com/reports/Alice"
    },
    "correlationId": "order-1002"
  }'
```
