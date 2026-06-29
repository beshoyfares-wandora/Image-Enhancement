import type { EnhancementProvider } from "../entities/Enhancement.js";
import type { ImageData } from "../entities/Image.js";

/**
 * Produces an enhanced image from an original image plus an editing prompt.
 * One implementation exists per provider (Gemini, GPT Image, ...).
 */
export interface IImageEnhancer {
  readonly provider: EnhancementProvider;
  readonly model: string;
  enhance(original: ImageData, prompt: string): Promise<ImageData>;
}
