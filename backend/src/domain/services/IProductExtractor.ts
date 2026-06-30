import type { ProductInfo } from "../entities/ProductInfo.js";

/**
 * Downloads a product page and extracts normalized {@link ProductInfo} from it,
 * combining metadata, JSON-LD, Open Graph and HTML. Performs no AI processing.
 */
export interface IProductExtractor {
  extract(url: string): Promise<ProductInfo>;
}
