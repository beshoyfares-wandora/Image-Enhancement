import type { ImageData } from "../entities/Image.js";
import type { ProductContent } from "../entities/ProductContent.js";
import type { ProductInfo } from "../entities/ProductInfo.js";

/** Inputs required to generate product marketing content. */
export interface ProductContentInput {
  /** Structured data extracted from the product page. */
  product: ProductInfo;
  /** The uploaded product image. */
  image: ImageData;
}

/**
 * Analyzes a product image together with extracted {@link ProductInfo} and
 * generates structured marketing content. Implemented in infrastructure
 * (Claude via Requesty).
 */
export interface IProductContentGenerator {
  generate(input: ProductContentInput): Promise<ProductContent>;
}
