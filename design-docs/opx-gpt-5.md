# Change 1 — Don't Inject SynOSDbContext Into MiddlewareOutboxService

Current plan:

```text
MiddlewareOutboxService
    ↓
Inject SynOSDbContext
    ↓
Insert OutboxEvent
```

This creates coupling.

Later you'll have:

```text
PatientService
    ↓
OutboxService
    ↓
DbContext
```

and

```text
PatientService
    ↓
DbContext
```

Two different persistence paths.

That becomes messy.

Instead:

```text
PatientService
    ↓
DbContext
    ↓
OutboxService.Enqueue()
```

The OutboxService should just create event objects.

The DbContext transaction should persist everything.

Think:

```csharp
_domainEvents.Add(event);
```

then during transaction commit:

```csharp
Save Business Data
Save Outbox Events
Commit
```

Single persistence boundary.

---

# Change 2 — Add Tenant Registration Table

Current middleware auth:

```text
appsettings.json

LAB001
apikey123
```

Good for testing.

Bad for production.

Imagine:

```text
Lab A
Lab B
Lab C
Lab D
```

You don't want:

```json
{
  "LAB001":"key1",
  "LAB002":"key2",
  "LAB003":"key3"
}
```

inside appsettings.

Instead create:

```text
Labs

Id
LabCode
LabName
ApiKeyHash
Status
CreatedAt
```

Middleware startup can seed:

```text
LAB001
```

for now.

But the architecture is ready for:

```text
50 labs
100 labs
500 labs
```

without changing auth later.

---

# One More Tiny Thing

Rename:

```text
Event
```

to:

```text
StoredEvent
```

inside middleware domain.

Because eventually you'll have:

```text
DomainEvent
IntegrationEvent
StoredEvent
```

and the name collision gets annoying fast.

---

# After These Changes

I would tell the agent:

> Approved. Start implementation.

The implementation order should be:

```text
1. Domain Events
2. OutboxEvents table
3. Transactional persistence
4. Sync Worker
5. Middleware Solution
6. StoredEvent table
7. Lab authentication
8. Event ingestion endpoint
9. Idempotency
10. Dead Letter support
11. Verification tests
```

And I would explicitly tell the agent:

```text
DO NOT BUILD

Control Tower
Analytics
WhatsApp Integration
AI Layer
Contact Graph
Trend Engine

IN PHASE 1
```

Because right now you're building the railway tracks.

The trains can come later.

Once a `ReportSignedEvent` can leave a lab in Khammam during an internet outage, sit in a local queue, survive a Windows restart, and eventually land in your founder-laptop Event Store exactly once, Phase 1 is a success.

Everything else is downstream from that.
