import type { EnhancementOutcome, ProviderResult } from "../../domain/entities/Enhancement.js";
import type { ImageData } from "../../domain/entities/Image.js";
import type { ProductContent } from "../../domain/entities/ProductContent.js";
import type { ProductInfo } from "../../domain/entities/ProductInfo.js";
import type { IImageEnhancer } from "../../domain/services/IImageEnhancer.js";
import type { IProductContentGenerator } from "../../domain/services/IProductContentGenerator.js";
import type { IProductExtractor } from "../../domain/services/IProductExtractor.js";
import type { IPromptGenerator } from "../../domain/services/IPromptGenerator.js";
import { logger } from "../../shared/logger.js";

/**
 * Core business flow:
 *   1. Scrape the product URL into ProductInfo and generate marketing content
 *      (Claude) from the scraped data + the uploaded image.
 *   2. In parallel, run the image enhancement flow: Claude writes an editing
 *      prompt, then every enhancer produces an image.
 *   3. Return both the product content and the enhancements. Content generation
 *      is tolerant — a scraping/AI failure never blocks the enhancements.
 */
export class EnhanceImageUseCase {
  constructor(
    private readonly promptGenerator: IPromptGenerator,
    private readonly enhancers: IImageEnhancer[],
    private readonly productExtractor: IProductExtractor,
    private readonly productContentGenerator: IProductContentGenerator
  ) {}

  async execute(original: ImageData, url: string): Promise<EnhancementOutcome> {
    logger.info("Starting enhancement", { url });

    // Product content (scrape + generate) and image enhancement run in parallel.
    const [content, enhancements] = await Promise.all([
      this.generateProductContent(original, url),
      this.runEnhancements(original),
    ]);

    return {
      prompt: enhancements.prompt,
      results: enhancements.results,
      productInfo: content.productInfo,
      productContent: content.productContent,
    };
  }

  /** Existing image enhancement flow — unchanged. */
  private async runEnhancements(
    original: ImageData
  ): Promise<{ prompt: string; results: ProviderResult[] }> {
    logger.info("Generating editing prompt with Claude Opus");
    const prompt = await this.promptGenerator.generateEditingPrompt(original);
    logger.info("Editing prompt generated", { prompt });

    const results = await Promise.all(
      this.enhancers.map((enhancer) => this.runEnhancer(enhancer, original, prompt))
    );

    return { prompt, results };
  }

  /**
   * Scrapes the product page and generates marketing content from the scraped
   * data + uploaded image. Failures are logged and degraded to null so the
   * enhancement response still succeeds.
   */
  private async generateProductContent(
    original: ImageData,
    url: string
  ): Promise<{ productInfo: ProductInfo | null; productContent: ProductContent | null }> {
    try {
      logger.info("Scraping product page", { url });
      const productInfo = await this.productExtractor.extract(url);

      logger.info("Generating product content with Claude");
      const productContent = await this.productContentGenerator.generate({
        product: productInfo,
        image: original,
      });

      return { productInfo, productContent };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error("Product content generation failed", message);
      return { productInfo: null, productContent: null };
    }
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
