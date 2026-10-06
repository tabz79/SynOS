# SynOS Local Security Testing with Strix

## Overview
This configuration sets up a repeatable, isolated local security testing workflow for the SynOS diagnostic laboratory system using the open-source [Strix](https://github.com/usestrix/strix) framework.

## Operational Boundaries & Safeguards
1. **Branch Isolation**: Testing workflows and configuration exist strictly on the `testing` Git branch.
2. **Local Staging Only**: The target is strictly scoped to the local instance (`http://localhost:59999`) and its OpenAPI schema (`/swagger/v1/swagger.json`).
3. **No External / Third-Party Traffic**: External cloud middleware endpoints (`cloud.tbzlabs.in`) and third-party APIs are explicitly excluded in scope configuration.
4. **Non-Destructive Testing**: Data reset, database wipe, or decommission endpoints are prohibited during testing.
5. **No Committed Secrets**: Authentication tokens and credentials must be supplied via environment variables at test execution time and never committed to version control.

## Prerequisites
1. **Python 3.10+**: Available on the system (`Python 3.13.5`).
2. **Strix CLI**: Installable via `pip install strix-agent` (or via Docker container as outlined in Strix documentation).
3. **Local SynOS Service**: Running on port 59999 (`Start-Service TBZSynOSService` or `dotnet run --project src/SynOS.Api`).

## Invocation Workflow
Run the automated test runner:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/testing/run-strix-assessment.ps1 -ScanMode standard -MaxBudget 10
```

Direct Strix CLI command:
```bash
strix -n -t http://localhost:59999/swagger/v1/swagger.json --scan-mode standard --max-budget 10 --output ./test-results/strix-report
```
