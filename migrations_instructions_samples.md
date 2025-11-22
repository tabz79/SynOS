# Database Migration Instructions for Samples Module

New entities `Sample` and `SampleRejection` have been added to the model. To update the database, please follow these steps:

1.  **Install EF Core tools** if you haven't already:
    ```
    dotnet tool install --global dotnet-ef
    ```

2.  **Navigate to the `src/SynOS.Api` directory** in your terminal.

3.  **Create a new migration:**
    ```
    dotnet ef migrations add AddSamplesAndRejectionsTables -p ../SynOS.Data/SynOS.Data.csproj -s SynOS.Api.csproj -o ../SynOS.Data/migrations
    ```

4.  **Apply the migration to the database:**
    ```
    dotnet ef database update -p ../SynOS.Data/SynOS.Data.csproj -s SynOS.Api.csproj
    ```

This will create the `Samples` and `SampleRejections` tables in your database with the required schema.

Also, for the new frontend features to work, please install the SignalR client library in the `web` directory:
```
npm install @microsoft/signalr
```
