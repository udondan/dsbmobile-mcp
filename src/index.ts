#!/usr/bin/env node
/**
 * DSBmobile MCP Server
 *
 * An MCP server that provides access to DSBmobile — a German school
 * communication platform for substitution plans (Vertretungspläne),
 * news, and documents.
 *
 * Required environment variables:
 *   DSB_USERNAME - Your DSBmobile username/ID
 *   DSB_PASSWORD - Your DSBmobile password
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ENV_PASSWORD, ENV_USERNAME } from './constants.js';
import { DsbmobileClient } from './services/dsbmobile.js';
import { registerDocumentsTool } from './tools/documents.js';
import { registerNewsTool } from './tools/news.js';
import { registerSubstitutionsTool } from './tools/substitutions.js';
import { registerTimetablesTool } from './tools/timetables.js';

/**
 * Validates that required environment variables are set.
 * Exits with a clear error message if any are missing.
 */
function validateEnvironment(): void {
  const missing: string[] = [];

  if (!process.env[ENV_USERNAME]) {
    missing.push(ENV_USERNAME);
  }
  if (!process.env[ENV_PASSWORD]) {
    missing.push(ENV_PASSWORD);
  }

  if (missing.length > 0) {
    console.error(
      `Error: The following required environment variables are not set: ${missing.join(', ')}\n` +
        `\nPlease set them before starting the server:\n` +
        `  export DSB_USERNAME=your_username\n` +
        `  export DSB_PASSWORD=your_password`,
    );
    process.exit(1);
  }
}

/**
 * Main entry point for the DSBmobile MCP server.
 */
async function main(): Promise<void> {
  // Validate environment variables before doing anything else
  validateEnvironment();

  // Create the DSBmobile API client
  // This reads credentials from environment variables
  const client = new DsbmobileClient();

  // Create the MCP server
  const server = new McpServer({
    name: 'dsbmobile-mcp-server',
    version: '1.0.0',
  });

  // Register all tools
  registerTimetablesTool(server, client);
  registerSubstitutionsTool(server, client);
  registerNewsTool(server, client);
  registerDocumentsTool(server, client);

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('DSBmobile MCP server running via stdio');
}

main().catch((error: unknown) => {
  console.error('Fatal error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
