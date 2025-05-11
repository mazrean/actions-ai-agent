import { readFile } from "fs/promises";
import { z } from "zod";

const CommonConfigSchema = z.object({
  capabilities: z.record(z.string(), z.unknown()).optional(),
  timeout: z.number().optional(),
});

const CommandConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  ...CommonConfigSchema.shape,
});

const URLConfigSchema = z.object({
  url: z.string().url(),
  requestInit: z
    .object({
      headers: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  ...CommonConfigSchema.shape,
});

const MCPServerConfigSchema = z.union([CommandConfigSchema, URLConfigSchema]);

const MCPConfigSchema = z.object({
  mcpServers: z.record(z.string(), MCPServerConfigSchema),
});

export type URLConfig = z.infer<typeof URLConfigSchema>;
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;
export type MCPConfig = z.infer<typeof MCPConfigSchema>;

/**
 * Load MCP server configurations from a JSON file
 * @param configPath Path to the JSON configuration file
 * @returns Array of MCP server configurations
 */
export async function loadMCPConfigs(configPath: string): Promise<MCPConfig> {
  try {
    const configContent = await readFile(configPath, "utf-8");
    const rawConfig = JSON.parse(configContent);

    // Validate the config using zod schema
    const result = MCPConfigSchema.safeParse(rawConfig);
    if (!result.success) {
      throw new Error(`Invalid config file: ${result.error.message}`);
    }

    return result.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load MCP config: ${error.message}`);
    }
    throw error;
  }
}
