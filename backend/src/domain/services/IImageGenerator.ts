import type { ImageData } from "../entities/Image.js";

/**
 * Generates a brand-new image purely from a text prompt (no input image).
 * Unlike IImageEnhancer, it does not transform an existing image.
 */
export interface IImageGenerator {
  readonly model: string;
  generate(prompt: string): Promise<ImageData>;
}
