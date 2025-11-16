# EF Core Migrations for SynOS.Data

This directory will contain your Entity Framework Core migration files.

## Instructions for PO:

1.  **Ensure your SQL Server is running and accessible.**
2.  **Update the `ConnectionStrings:SynOS` in `src/SynOS.Api/appsettings.json`** with your local SQL Server credentials.
3.  **Navigate to the `src/SynOS.Api` directory** in your terminal.
4.  **Run the following command to add the initial migration:**
    ```bash
    dotnet ef migrations add InitialCreate --project ../SynOS.Data --startup-project .
    ```
5.  **Then, apply the migration to your database:**
    ```bash
    dotnet ef database update --project ../SynOS.Data --startup-project .
    ```

These commands will create the `Users` table (and any other entities defined in `SynOSDbContext`) in your configured SQL Server database.
