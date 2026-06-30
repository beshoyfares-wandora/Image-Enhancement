import type { ProductInfo } from "../../domain/entities/ProductInfo.js";
import type { IProductExtractor } from "../../domain/services/IProductExtractor.js";
import { logger } from "../../shared/logger.js";

/**
 * Scrapes a product page into normalized {@link ProductInfo}. No AI yet — this
 * orchestrates the extractor so the HTTP layer stays thin and the flow can later
 * be extended (e.g. feeding the result into AI content generation).
 */
export class ScrapeProductUseCase {
  constructor(private readonly extractor: IProductExtractor) {}

  async execute(url: string): Promise<ProductInfo> {
    logger.info("Extracting product page", { url });
    const info = await this.extractor.extract(url);
    logger.info("Extracted product page", { url: info.url, title: info.title });
    return info;
  }
}
