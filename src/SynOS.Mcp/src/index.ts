import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { SynOSApiClient } from './client.js';
import { registerSystemTools } from './tools/system.js';
import { registerClinicalTools } from './tools/clinical.js';
import { registerReportTools } from './tools/reports.js';
import { registerHardwareTools } from './tools/hardware.js';
import { registerFinanceTools } from './tools/finance.js';
import { registerInventoryTools } from './tools/inventory.js';
import { registerUniversalTool } from './tools/universal.js';

async function run() {
  const server = new Server(
    {
      name: 'synos-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const api = new SynOSApiClient();

  // Aggregate all registered tools
  const tools = [
    ...registerSystemTools(api),
    ...registerClinicalTools(api),
    ...registerReportTools(api),
    ...registerHardwareTools(api),
    ...registerFinanceTools(api),
    ...registerInventoryTools(api),
    ...registerUniversalTool(api),
  ];

  const toolsMap = new Map<string, any>();
  for (const t of tools) {
    toolsMap.set(t.name, t);
  }

  // Handle Tool Listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.parameters,
      })),
    };
  });

  // Handle Tool Calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = toolsMap.get(request.params.name);
    if (!tool) {
      throw new Error(`Tool not found: ${request.params.name}`);
    }

    try {
      const result = await tool.handler(request.params.arguments || {});
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing ${request.params.name}: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Connect stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[SynOS MCP] Server initialized and listening on stdio.');
}

run().catch((err) => {
  console.error('[SynOS MCP] Fatal error starting server:', err);
  process.exit(1);
});
