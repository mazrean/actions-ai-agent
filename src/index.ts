import core from "@actions/core";
import { getInputs } from "./inputs";
import { loadMCPConfigs } from "./mcp-config";
import { createMCPAgent, createMCPClient } from "./agent";
import { MCPClient } from "@mastra/mcp";

async function main() {
  let mcpClient: MCPClient | undefined;
  try {
    // Get inputs from GitHub Actions
    const inputs = getInputs();
    core.info("Successfully loaded inputs");

    // Load MCP configurations
    const mcpConfigs = await loadMCPConfigs(inputs.mcpConfigFile);
    core.info("Successfully loaded MCP configurations");

    // Create and run the agent
    mcpClient = await createMCPClient(inputs, mcpConfigs);
    const agent = await createMCPAgent(inputs, mcpClient);
    core.info("Successfully created agent");

    // Execute the prompt
    const response = await agent.generate(
      [
        {
          role: "system",
          content: inputs.systemPrompt,
        },
        {
          role: "user",
          content: inputs.prompt,
        },
      ],
      {
        modelSettings: {
          maxOutputTokens: inputs.maxTokens,
        },
      }
    );
    core.info("Successfully executed prompt");

    // Set the response as output
    core.setOutput("response", response.text);
    core.info("Successfully set response as output");
  } catch (error) {
    const err = error as Error;
    core.error(`Failed to run: ${error}, ${err.stack}`);
    core.setFailed(err.message);
  } finally {
    if (mcpClient) {
      await mcpClient.disconnect();
    }
  }
}

main();
