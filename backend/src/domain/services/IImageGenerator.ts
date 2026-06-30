import type { ImageData } from "../entities/Image.js";

/**
 * Generates additional ecommerce gallery images of the EXACT SAME product by
 * editing the uploaded image — not by creating a new product from text.
 *
 * Given the uploaded product image plus an editing prompt, it returns a new
 * photograph of that same physical product with only the presentation
 * (background, environment, lighting, composition, props, camera angle) changed.
 */
export interface IImageGenerator {
  readonly model: string;
  generate(original: ImageData, prompt: string): Promise<ImageData>;
}
