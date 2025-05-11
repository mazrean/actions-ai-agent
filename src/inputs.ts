import * as core from "@actions/core";
import { z } from "zod";

const InputSchema = z.object({
  prompt: z.string(),
  model: z.string().min(1),
  baseUrl: z.string().url(),
  systemPrompt: z.string(),
  maxTokens: z.number().int().positive(),
  token: z.string().min(1),
  mcpConfigFile: z.string(),
  timeout: z.number().int().positive().optional(),
});

export type ActionInputs = z.infer<typeof InputSchema>;

export function getInputs(): ActionInputs {
  const prompt = core.getInput("prompt");
  const model = core.getInput("model");
  const baseUrl = core.getInput("base-url");
  const systemPrompt = core.getInput("system-prompt");
  const maxTokens = parseInt(core.getInput("max-tokens"));
  const token = core.getInput("token") ?? process.env.GITHUB_TOKEN;
  const mcpConfigFile = core.getInput("mcp-config-file");
  const strTimeout = core.getInput("timeout");
  const timeout = strTimeout ? parseInt(strTimeout) : undefined;

  const inputs = {
    prompt,
    model,
    baseUrl,
    systemPrompt,
    maxTokens,
    token,
    mcpConfigFile,
    timeout,
  };

  try {
    return InputSchema.parse(inputs);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");
      core.setFailed(`Invalid inputs:\n${errorMessage}`);
    }
    throw error;
  }
}
