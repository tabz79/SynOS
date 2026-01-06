✦ Execution Plan: Register Employee Admin Service in API (Step 5)

This plan outlines the precise steps to register the HR Employee Admin service for dependency injection.

1. Read Program.cs:
   * I will read the full contents of src/SynOS.Api/Program.cs.

2. Register HR Service:
   * I will add the following DI registration:
     builder.Services.AddScoped<IEmployeeAdminService, EmployeeAdminService>();

   * This line will be placed alongside other service registrations, near existing admin or master services.

3. Output Modified Line Only:
   * I will output ONLY the newly added registration line.

This change is strictly additive and does not affect any existing services.
