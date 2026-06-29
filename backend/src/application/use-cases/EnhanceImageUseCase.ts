import type { EnhancementOutcome, ProviderResult } from "../../domain/entities/Enhancement.js";
import type { ImageData } from "../../domain/entities/Image.js";
import type { IImageEnhancer } from "../../domain/services/IImageEnhancer.js";
import type { IPromptGenerator } from "../../domain/services/IPromptGenerator.js";
import { logger } from "../../shared/logger.js";

/**
 * Core business flow:
 *   1. Ask the prompt generator (Claude Opus) for an editing prompt.
 *   2. Fan out the original image + prompt to every image enhancer in parallel.
 *   3. Collect each provider's result, tolerating individual failures.
 */
export class EnhanceImageUseCase {
  constructor(
    private readonly promptGenerator: IPromptGenerator,
    private readonly enhancers: IImageEnhancer[]
  ) {}

  async execute(original: ImageData): Promise<EnhancementOutcome> {
    logger.info("Generating editing prompt with Claude Opus");
    const prompt = await this.promptGenerator.generateEditingPrompt(original);
    logger.info("Editing prompt generated", { prompt });

    const results = await Promise.all(
      this.enhancers.map((enhancer) => this.runEnhancer(enhancer, original, prompt))
    );

    return { prompt, results };
  }

  private async runEnhancer(
    enhancer: IImageEnhancer,
    original: ImageData,
    prompt: string
  ): Promise<ProviderResult> {
    try {
      logger.info(`Enhancing image via ${enhancer.provider} (${enhancer.model})`);
      const image = await enhancer.enhance(original, prompt);
      return { provider: enhancer.provider, model: enhancer.model, image, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Enhancer ${enhancer.provider} failed`, message);
      return {
        provider: enhancer.provider,
        model: enhancer.model,
        image: null,
        error: message,
      };
    }
  }
}
