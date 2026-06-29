import { EnhanceImageUseCase } from "../application/use-cases/EnhanceImageUseCase.js";
import type { EnhancementProvider } from "../domain/entities/Enhancement.js";
import type { IImageEnhancer } from "../domain/services/IImageEnhancer.js";
import { env } from "../config/env.js";
import { ChatImageEnhancer } from "../infrastructure/ai/ChatImageEnhancer.js";
import { ClaudePromptGenerator } from "../infrastructure/ai/ClaudePromptGenerator.js";
import { ImagesApiEnhancer } from "../infrastructure/ai/ImagesApiEnhancer.js";
import { RequestyClient } from "../infrastructure/ai/RequestyClient.js";
import { EnhancementController } from "../interfaces/http/controllers/EnhancementController.js";

/**
 * Composition root: constructs and wires every dependency in one place.
 * The rest of the app depends only on interfaces, never on concrete adapters.
 */
export function buildContainer() {
  const requestyClient = new RequestyClient({
    apiKey: env.REQUESTY_API_KEY,
    baseUrl: env.REQUESTY_BASE_URL,
    timeoutMs: env.AI_REQUEST_TIMEOUT_MS,
  });

  const promptGenerator = new ClaudePromptGenerator(
    requestyClient,
    env.CLAUDE_PROMPT_MODEL
  );

  // Pick the right adapter for each model:
  //  - OpenAI GPT Image / DALL-E models use the image *edits* endpoint.
  //  - Gemini (and other vision) image models return images via chat completions.
  const createEnhancer = (
    provider: EnhancementProvider,
    model: string
  ): IImageEnhancer =>
    /gpt-image|dall-e/i.test(model)
      ? new ImagesApiEnhancer(provider, model, requestyClient)
      : new ChatImageEnhancer(provider, model, requestyClient);

  const enhancers: IImageEnhancer[] = [
    createEnhancer("gemini", env.GEMINI_IMAGE_MODEL),
    createEnhancer("gpt-image", env.GPT_IMAGE_MODEL),
  ];

  const enhanceImageUseCase = new EnhanceImageUseCase(promptGenerator, enhancers);

  const controllers = {
    enhancement: new EnhancementController(enhanceImageUseCase),
  };

  return { controllers };
}
