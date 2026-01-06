### Output for Step 5: Modified parts of Program.cs

**1. Added `using` Directive:**
```csharp
using SynOS.Services.HR; // ADDED
```

**2. Added Service Registration:**
```csharp
builder.Services.AddScoped<IEmployeeAdminService, EmployeeAdminService>(); // ADDED
```