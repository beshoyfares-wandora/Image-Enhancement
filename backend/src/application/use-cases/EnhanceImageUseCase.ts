import type {
  EnhancementOutcome,
  MarketingImageResult,
  ProviderResult,
} from "../../domain/entities/Enhancement.js";
import type { ImageData } from "../../domain/entities/Image.js";
import type { ProductContent } from "../../domain/entities/ProductContent.js";
import type { ProductInfo } from "../../domain/entities/ProductInfo.js";
import type { IImageEnhancer } from "../../domain/services/IImageEnhancer.js";
import type { IImageGenerator } from "../../domain/services/IImageGenerator.js";
import type { IProductContentGenerator } from "../../domain/services/IProductContentGenerator.js";
import type { IProductExtractor } from "../../domain/services/IProductExtractor.js";
import type { IPromptGenerator } from "../../domain/services/IPromptGenerator.js";
import { logger } from "../../shared/logger.js";

// Max marketing image edits to run at once. Image-edit calls are slow/expensive
// and the provider gateway times out (504) under too much concurrency, so we cap
// the fan-out instead of firing every prompt simultaneously.
const MARKETING_CONCURRENCY = 2;

/**
 * Core business flow:
 *   1. Scrape the product URL into ProductInfo, generate marketing content
 *      (Claude) from the scraped data + the uploaded image, then generate a
 *      marketing image for each of the content's related image prompts.
 *   2. In parallel, run the image enhancement flow: Claude writes an editing
 *      prompt, then every enhancer produces an image.
 *   3. Return the product content, the generated marketing images and the
 *      enhancements. Content/marketing generation is tolerant — a scraping/AI
 *      failure never blocks the enhancements, and one failed marketing image
 *      never blocks the others.
 */
export class EnhanceImageUseCase {
  constructor(
    private readonly promptGenerator: IPromptGenerator,
    private readonly enhancers: IImageEnhancer[],
    private readonly productExtractor: IProductExtractor,
    private readonly productContentGenerator: IProductContentGenerator,
    private readonly marketingImageGenerator: IImageGenerator
  ) {}

  async execute(original: ImageData, url: string): Promise<EnhancementOutcome> {
    logger.info("Starting enhancement", { url });

    // Product content (scrape + generate + marketing images) and image
    // enhancement run in parallel.
    const [content, enhancements] = await Promise.all([
      this.generateContent(original, url),
      this.runEnhancements(original),
    ]);

    return {
      prompt: enhancements.prompt,
      results: enhancements.results,
      productInfo: content.productInfo,
      productContent: content.productContent,
      marketingImages: content.marketingImages,
    };
  }

  /**
   * Generates the product content and then, from its related image prompts, the
   * marketing images. Marketing images are only attempted when content exists.
   */
  private async generateContent(
    original: ImageData,
    url: string
  ): Promise<{
    productInfo: ProductInfo | null;
    productContent: ProductContent | null;
    marketingImages: MarketingImageResult[];
  }> {
    const { productInfo, productContent } = await this.generateProductContent(
      original,
      url
    );

    const marketingImages = productContent
      ? await this.generateMarketingImages(original, productContent.relatedImagePrompts)
      : [];

    return { productInfo, productContent, marketingImages };
  }

  /**
   * Generates one marketing image per prompt by editing the uploaded product
   * image, with bounded concurrency. Individual failures are isolated so a single
   * bad prompt never blocks the rest, and result order matches the prompt order.
   */
  private async generateMarketingImages(
    original: ImageData,
    prompts: string[]
  ): Promise<MarketingImageResult[]> {
    if (prompts.length === 0) return [];

    logger.info("Generating marketing images", {
      count: prompts.length,
      concurrency: MARKETING_CONCURRENCY,
    });

    const results = new Array<MarketingImageResult>(prompts.length);
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (cursor < prompts.length) {
        const index = cursor++;
        results[index] = await this.generateMarketingImage(original, prompts[index]);
      }
    };

    const workerCount = Math.min(MARKETING_CONCURRENCY, prompts.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return results;
  }

  private async generateMarketingImage(
    original: ImageData,
    prompt: string
  ): Promise<MarketingImageResult> {
    try {
      const image = await this.marketingImageGenerator.generate(original, prompt);
      return { prompt, image, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error("Marketing image generation failed", message);
      return { prompt, image: null, error: message };
    }
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
