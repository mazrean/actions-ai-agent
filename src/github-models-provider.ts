import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";
import {
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1StreamPart,
  LanguageModelV1FinishReason,
} from "@ai-sdk/provider";

export type GitHubModelsChatModelId = string;

export interface GitHubModelsChatSettings {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface GitHubModelsProviderSettings {
  baseURL?: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

interface GitHubModelsResponse {
  choices: Array<{
    message: {
      content: string;
    };
    delta?: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class GitHubModelsChatLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1";
  readonly provider = "github.models";
  readonly modelId: GitHubModelsChatModelId;
  readonly defaultObjectGenerationMode = "json";

  private readonly baseURL: string;
  private readonly headers: () => Record<string, string>;

  constructor(
    modelId: GitHubModelsChatModelId,
    private readonly settings: GitHubModelsChatSettings = {},
    options: {
      baseURL: string;
      headers: () => Record<string, string>;
    }
  ) {
    this.modelId = modelId;
    this.baseURL = options.baseURL;
    this.headers = options.headers;
  }

  async doGenerate(options: LanguageModelV1CallOptions) {
    const response = await fetch(`${this.baseURL}/inference/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.headers(),
      },
      body: JSON.stringify({
        messages: options.prompt,
        model: this.modelId,
        temperature: this.settings.temperature,
        max_tokens: this.settings.maxTokens,
        top_p: this.settings.topP,
        frequency_penalty: this.settings.frequencyPenalty,
        presence_penalty: this.settings.presencePenalty,
      }),
      signal: options.abortSignal,
    });

    if (!response.ok) {
      throw new Error(
        `GitHub Models API error: ${
          response.statusText
        } ${await response.text()}`
      );
    }

    const data = (await response.json()) as GitHubModelsResponse;
    return {
      text: data.choices[0].message.content,
      finishReason: "stop" as LanguageModelV1FinishReason,
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          model: this.modelId,
          temperature: this.settings.temperature,
          max_tokens: this.settings.maxTokens,
          top_p: this.settings.topP,
          frequency_penalty: this.settings.frequencyPenalty,
          presence_penalty: this.settings.presencePenalty,
        },
      },
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  async doStream(options: LanguageModelV1CallOptions) {
    const response = await fetch(`${this.baseURL}/inference/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.headers(),
      },
      body: JSON.stringify({
        messages: options.prompt,
        model: this.modelId,
        temperature: this.settings.temperature,
        max_tokens: this.settings.maxTokens,
        top_p: this.settings.topP,
        frequency_penalty: this.settings.frequencyPenalty,
        presence_penalty: this.settings.presencePenalty,
        stream: true,
      }),
      signal: options.abortSignal,
    });

    if (!response.ok) {
      throw new Error(`GitHub Models API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response reader");
    }

    return {
      stream: new ReadableStream<LanguageModelV1StreamPart>({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split("\n").filter(Boolean);

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = JSON.parse(
                    line.slice(6)
                  ) as GitHubModelsResponse;
                  if (data.choices[0].delta?.content) {
                    controller.enqueue({
                      type: "text-delta",
                      textDelta: data.choices[0].delta.content,
                    });
                  }
                }
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          } finally {
            reader.releaseLock();
          }
        },
      }),
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          model: this.modelId,
          temperature: this.settings.temperature,
          max_tokens: this.settings.maxTokens,
          top_p: this.settings.topP,
          frequency_penalty: this.settings.frequencyPenalty,
          presence_penalty: this.settings.presencePenalty,
          stream: true,
        },
      },
    };
  }
}

export interface GitHubModelsProvider {
  (
    modelId: GitHubModelsChatModelId,
    settings?: GitHubModelsChatSettings
  ): GitHubModelsChatLanguageModel;

  chat(
    modelId: GitHubModelsChatModelId,
    settings?: GitHubModelsChatSettings
  ): GitHubModelsChatLanguageModel;
}

export function createGitHubModelsProvider(
  options: GitHubModelsProviderSettings = {}
): GitHubModelsProvider {
  const createModel = (
    modelId: GitHubModelsChatModelId,
    settings: GitHubModelsChatSettings = {}
  ) =>
    new GitHubModelsChatLanguageModel(modelId, settings, {
      baseURL:
        withoutTrailingSlash(options.baseURL) ?? "https://models.github.ai",
      headers: () => ({
        Authorization: `Bearer ${loadApiKey({
          apiKey: options.apiKey,
          environmentVariableName: "GITHUB_TOKEN",
          description: "GitHub Models Provider",
        })}`,
        ...options.headers,
      }),
    });

  const provider = function (
    modelId: GitHubModelsChatModelId,
    settings?: GitHubModelsChatSettings
  ) {
    if (new.target) {
      throw new Error(
        "The model factory function cannot be called with the new keyword."
      );
    }

    return createModel(modelId, settings);
  };

  provider.chat = createModel;

  return provider;
}
