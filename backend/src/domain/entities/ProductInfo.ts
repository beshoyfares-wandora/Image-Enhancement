/** A single item contained in a bundle/set/kit product. */
export interface IncludedProduct {
  name: string;
  /** e.g. "100ml", "50g" — null when the page does not state a size. */
  size: string | null;
}

/**
 * Normalized product information extracted from a product web page.
 *
 * Extraction priority is JSON-LD (schema.org Product) -> Open Graph -> raw HTML.
 * Values are NEVER invented: a field is null (or an empty array) whenever the
 * page does not actually provide the data.
 */
export interface ProductInfo {
  url: string;
  title: string | null;
  brand: string | null;
  category: string | null;
  description: string | null;
  shortDescription: string | null;
  price: string | null;
  currency: string | null;
  availability: string | null;
  sku: string | null;
  materials: string[];
  features: string[];
  specifications: Record<string, string>;
  images: string[];
  breadcrumbs: string[];
  /** Items bundled in a set/kit, parsed from JSON-LD or "what's included" lists. */
  includedProducts: IncludedProduct[];
  /** The raw schema.org Product JSON-LD node, when one was found. */
  jsonLd?: unknown;
}
