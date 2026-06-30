import type { ImageData } from "../../domain/entities/Image.js";
import type { IImageEnhancer } from "../../domain/services/IImageEnhancer.js";
import type { IImageGenerator } from "../../domain/services/IImageGenerator.js";

/**
 * Generates additional gallery images of the EXACT SAME uploaded product by
 * editing the uploaded image, rather than generating a brand-new product from
 * text (which previously redesigned the product).
 *
 * It is a thin wrapper over an existing {@link IImageEnhancer} adapter
 * (e.g. ImagesApiEnhancer via the OpenAI image *edits* endpoint), so all the
 * image-editing infrastructure — uploading the source image, calling the
 * provider, decoding the result — is reused with no duplication. The injected
 * editor is configured to pass each marketing prompt through verbatim (the
 * relatedImagePrompts already carry full "edit this exact product" instructions).
 */
export class MarketingImageGenerator implements IImageGenerator {
  constructor(private readonly editor: IImageEnhancer) {}

  get model(): string {
    return this.editor.model;
  }

  /** Edits the uploaded product image according to the marketing prompt. */
  generate(original: ImageData, prompt: string): Promise<ImageData> {
    return this.editor.enhance(original, prompt);
  }
}
