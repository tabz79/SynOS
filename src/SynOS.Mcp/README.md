# SynOS Model Context Protocol (MCP) Server

Production-grade, full-access MCP Server enabling autonomous AI agents (Antigravity, Codex, Claude) to inspect, diagnose, and remotely remediate client SynOS installations without requiring inbound firewall openings.

## Architecture

```text
Mac Mini / Antigravity                  Cloud Relay                      Client On-Prem Server
┌──────────────────────┐        ┌─────────────────────────┐        ┌─────────────────────────┐
│  Antigravity Agent   │  Stdio │     TBZ Labs Cloud      │  WSS   │  SynOS Application      │
│  SynOS MCP Server    ├───────►│  (ops.tbzlabs.in Relay) ├───────►│  MiddlewareSyncWorker  │
│  (synos-mcp)         │        │   Command Directive     │        │  (Local Loopback API)   │
└──────────────────────┘        └─────────────────────────┘        └─────────────────────────┘
```

- **Zero Inbound Ports on Client Sites:** Client SynOS uses outbound TLS connection to TBZ Labs infrastructure.
- **Universal Escape Hatch (`synos_api_request`):** 100% coverage over all 506+ endpoints in SynOS.
- **High-Impact Guardrails:** Destructive/financial/legal operations require `confirm: true`.

## Running the Server

```bash
cd src/SynOS.Mcp
npm run build
npm start
```

## Adding to Antigravity / Claude Settings

```json
{
  "mcpServers": {
    "synos": {
      "command": "node",
      "args": ["/Users/tabrez/.gemini/antigravity/scratch/research/SynOS/src/SynOS.Mcp/dist/index.js"],
      "env": {
        "SYNOS_API_URL": "http://localhost:59999",
        "SYNOS_RELAY_URL": "https://cloud.tbzlabs.in"
      }
    }
  }
}
```
