import core from "@actions/core";
import { getInputs } from "./inputs";
import { loadMCPConfigs } from "./mcp-config";
import { createMCPAgent } from "./agent";

async function main() {
  try {
    // Get inputs from GitHub Actions
    const inputs = getInputs();
    core.info("Successfully loaded inputs");

    // Load MCP configurations
    const mcpConfigs = await loadMCPConfigs(inputs.mcpConfigFile);
    core.info("Successfully loaded MCP configurations");

    // Create and run the agent
    const agent = await createMCPAgent(inputs, mcpConfigs);
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
        maxTokens: inputs.maxTokens,
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
  }
}

main();
