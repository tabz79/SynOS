# SynOS Backend (API)

This project contains the .NET 8 Web API for the SynOS application.

## Project Structure:
- `SynOS.Api`: The main ASP.NET Core Web API project.
- `SynOS.Models`: Contains shared DTOs and EF Core entities.
- `SynOS.Services`: Contains business logic interfaces and implementations.
- `SynOS.Data`: Contains the EF Core DbContext and database migration logic.

## Build and Run Instructions (for PO):

1.  **Open your terminal or command prompt.**
2.  **Navigate to the solution root directory** (where `SynOS.sln` is located).
3.  **Restore NuGet packages:**
    ```bash
    dotnet restore
    ```
4.  **Build the entire solution:**
    ```bash
    dotnet build
    ```
    *Expected: Build successful with no errors.*

5.  **Run the API project:**
    ```bash
    dotnet run --project src/SynOS.Api
    ```
    *Expected: The API starts, typically on `http://localhost:5000` and `https://localhost:7000` (check console output).*

6.  **Verify Health Endpoint:**
    Once the API is running, open your browser or a tool like Postman/curl and navigate to:
    ```
    http://localhost:<api_port>/healthz
    ```
    *Expected: You should see a `200 OK` response with the message "SynOS API is healthy."*

7.  **Database Setup (Important - Day 2 onwards):**
    Before running migrations, ensure your SQL Server is running and the connection string in `src/SynOS.Api/appsettings.json` is correctly configured for your environment. Refer to `src/SynOS.Data/migrations/README.md` for detailed migration instructions.

## Configuration:
-   **`src/SynOS.Api/appsettings.json`**: Contains database connection strings, JWT secrets, and Serilog configuration. **!!! UPDATE `ConnectionStrings:SynOS` and `Jwt:Secret` BEFORE RUNNING !!!**
