import { z } from "zod";

const InputSchema = z.object({
  prompt: z.string(),
  model: z.string().min(1),
  baseUrl: z.string().url(),
  systemPrompt: z.string(),
  maxTokens: z.number().int().positive(),
  token: z.string().min(1),
  mcpConfigFile: z.string(),
  memoryDbFile: z.string(),
  timeout: z.number().int().positive().optional(),
});

export type ActionInputs = z.infer<typeof InputSchema>;

export function getInputs(): ActionInputs {
  const prompt = process.env.PROMPT;
  const model = process.env.MODEL;
  const baseUrl = process.env.BASE_URL;
  const systemPrompt = process.env.SYSTEM_PROMPT;
  const maxTokens = parseInt(process.env.MAX_TOKENS ?? "4000");
  const token = process.env.TOKEN ?? process.env.GITHUB_TOKEN;
  const mcpConfigFile = process.env.MCP_CONFIG_FILE;
  const memoryDbFile = process.env.MEMORY_DB_FILE;
  const strTimeout = process.env.TIMEOUT;
  const timeout = strTimeout ? parseInt(strTimeout) : undefined;

  const inputs = {
    prompt,
    model,
    baseUrl,
    systemPrompt,
    maxTokens,
    token,
    mcpConfigFile,
    memoryDbFile,
    timeout,
  };

  try {
    return InputSchema.parse(inputs);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");
      console.error(`Invalid inputs:\n${errorMessage}`);
      process.exit(1);
    }
    throw error;
  }
}
