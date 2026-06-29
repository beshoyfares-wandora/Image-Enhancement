import type { ImageData } from "../entities/Image.js";

/**
 * Generates an editing prompt describing how to enhance a product image.
 * Implemented in the infrastructure layer (e.g. Claude Opus via Requesty).
 */
export interface IPromptGenerator {
  generateEditingPrompt(image: ImageData): Promise<string>;
}
