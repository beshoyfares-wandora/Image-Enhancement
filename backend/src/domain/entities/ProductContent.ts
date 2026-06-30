/**
 * AI-generated marketing content for an e-commerce product.
 *
 * Produced by combining the uploaded product image with the {@link ProductInfo}
 * extracted from the product page. Copy is persuasive but must stay faithful to
 * what the image and extracted data actually support — no invented specs.
 */
export interface ProductContent {
  /** Polished, conversion-oriented product title. */
  title: string;
  /** Full marketing description (a few short paragraphs). */
  description: string;
  /** One- or two-sentence summary for listings/cards. */
  shortDescription: string;
  /** Scannable selling points. */
  bulletFeatures: string[];
  /** Materials/ingredients the product is made of. */
  materials: string[];
  /** Key specifications as label -> value pairs. */
  keySpecifications: Record<string, string>;
  /** SEO meta title (<= ~60 chars). */
  seoTitle: string;
  /** SEO meta description (<= ~160 chars). */
  seoDescription: string;
  /** Three prompts for generating complementary lifestyle/detail images. */
  relatedImagePrompts: string[];
}
