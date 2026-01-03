import { Agent } from "@mastra/core/agent";
import { MastraMemory } from "@mastra/core/memory";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { MCPClient } from "@mastra/mcp";
import { MCPConfig } from "./mcp-config";
import { createGitHubModelsProvider } from "./github-models-provider";
import { ActionInputs } from "./inputs";

function recordMap<T, R>(
  record: Record<string, T>,
  fn: (key: string, value: T) => R
): Record<string, R> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, fn(key, value)])
  );
}

/**
 * Creates MCP server configurations with proper URL objects
 * @param configs The MCP server configurations
 * @returns Processed MCP server configurations
 */
function createMCPServers(configs: MCPConfig) {
  return recordMap(configs.mcpServers, (_, value) =>
    "url" in value
      ? {
          ...value,
          url: new URL(value.url),
        }
      : value
  );
}

export async function createMCPClient(
  inputs: ActionInputs,
  configs: MCPConfig
) {
  const mcpServers = createMCPServers(configs);
  return new MCPClient({
    servers: mcpServers,
    timeout: inputs.timeout,
  });
}

/**
 * Creates an agent with MCP server tools
 * @param configs The MCP server configurations
 * @returns An agent with MCP server tools
 */
export async function createMCPAgent(inputs: ActionInputs, mcp: MCPClient) {
  const tools = await mcp.getTools();
  console.log(tools);
  return new Agent({
    name: "MCP Agent",
    instructions: `
      You are a helpful assistant that can interact with MCP servers.

      Your primary function is to help users interact with MCP servers. When responding:
      - Always ask for clarification if the user's request is unclear
      - Use the appropriate MCP server tool based on the user's needs
      - Keep responses concise but informative
      - If an error occurs, explain what happened and suggest alternatives

      Use the available MCP server tools to handle user requests.
    `,
    model: createGitHubModelsProvider({
      baseURL: inputs.baseUrl,
      apiKey: inputs.token,
    })(inputs.model, {
      maxTokens: inputs.maxTokens,
    }),
    tools: tools,
    memory: new Memory({
      storage: new LibSQLStore({
        url: `file:${inputs.memoryDbFile}`,
      }),
      options: {
        lastMessages: 10,
        semanticRecall: false,
        threads: {
          generateTitle: false,
        },
      },
    }) as unknown as MastraMemory,
  });
}
