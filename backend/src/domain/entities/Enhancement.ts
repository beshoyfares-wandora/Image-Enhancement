import type { ImageData } from "./Image.js";
import type { ProductContent } from "./ProductContent.js";
import type { ProductInfo } from "./ProductInfo.js";

/** The provider that produced an enhanced image. */
export type EnhancementProvider = "gemini" | "gpt-image";

/** A single provider's result, including failures so the UI can show them. */
export interface ProviderResult {
  readonly provider: EnhancementProvider;
  readonly model: string;
  readonly image: ImageData | null;
  readonly error: string | null;
}

/** The full outcome of enhancing one uploaded image. */
export interface EnhancementOutcome {
  readonly prompt: string;
  readonly results: ProviderResult[];
  /** Scraped product data used for content generation (null if it failed). */
  readonly productInfo: ProductInfo | null;
  /** AI-generated marketing content (null if scraping/generation failed). */
  readonly productContent: ProductContent | null;
}
