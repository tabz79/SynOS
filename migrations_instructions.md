# Database Migration Instructions

A new entity `EditLock` has been added to the model. To update the database, please follow these steps:

1.  **Install EF Core tools** if you haven't already:
    ```
    dotnet tool install --global dotnet-ef
    ```

2.  **Navigate to the `src/SynOS.Api` directory** in your terminal.

3.  **Create a new migration:**
    ```
    dotnet ef migrations add AddEditLocksTable -p ../SynOS.Data/SynOS.Data.csproj -s SynOS.Api.csproj -o ../SynOS.Data/migrations
    ```

4.  **Apply the migration to the database:**
    ```
    dotnet ef database update -p ../SynOS.Data/SynOS.Data.csproj -s SynOS.Api.csproj
    ```

This will create the `EditLocks` table in your database with the required schema.
