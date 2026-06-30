export type EnhancementProvider = "gemini" | "gpt-image";

export interface ProviderResult {
  provider: EnhancementProvider;
  model: string;
  /** Enhanced image as a base64 data URL, or null if the provider failed. */
  image: string | null;
  error: string | null;
}

export interface ProductContent {
  title: string;
  description: string;
  shortDescription: string;
  bulletFeatures: string[];
  materials: string[];
  keySpecifications: Record<string, string>;
  seoTitle: string;
  seoDescription: string;
  relatedImagePrompts: string[];
}

export interface MarketingImage {
  prompt: string;
  /** Generated image as a base64 data URL, or null if generation failed. */
  image: string | null;
  error: string | null;
}

export interface EnhanceResponse {
  prompt: string;
  results: ProviderResult[];
  /** Scraped product data (null if scraping/content generation failed). */
  productInfo: unknown | null;
  /** AI-generated marketing content (null if scraping/generation failed). */
  productContent: ProductContent | null;
  /** Marketing images generated from productContent.relatedImagePrompts. */
  marketingImages: MarketingImage[];
}

export interface ApiError {
  error: {
    message: string;
    details: unknown;
  };
}
