import type { ImageData } from "../../domain/entities/Image.js";
import type { IImageGenerator } from "../../domain/services/IImageGenerator.js";
import { UpstreamServiceError } from "../../shared/errors/AppError.js";
import type { RequestyClient } from "./RequestyClient.js";
import type { ImagesResponse } from "./types.js";

/**
 * Generates a brand-new marketing image from a text prompt only — it never
 * receives an input image.
 *
 * Unlike ChatImageEnhancer (which uses /chat/completions and fails for
 * image-only models like azure/openai/gpt-image-2 with "Provider and/or model
 * not supported"), this uses the OpenAI Images *generations* endpoint
 * (`/images/generations`). It mirrors ImagesApiEnhancer's request/response
 * style — the difference is simply that generation takes no input `image` file,
 * so a plain JSON body is sent instead of multipart form-data. The generated
 * image is read back from the `data[]` array and returned as {@link ImageData}.
 */
export class MarketingImageGenerator implements IImageGenerator {
  constructor(
    public readonly model: string,
    private readonly client: RequestyClient
  ) {}

  async generate(prompt: string): Promise<ImageData> {
    const response = await this.client.post<ImagesResponse>(
      "/images/generations",
      {
        model: this.model,
        prompt,
        // A fixed 1024 square at medium quality keeps generation fast enough to
        // beat the provider/gateway timeout (high quality + auto size 504s).
        size: "1024x1024",
        quality: "medium",
      }
    );

    // Same response handling as ImagesApiEnhancer: prefer inline base64, else
    // download a remote URL.
    const result = response.data?.[0];
    if (result?.b64_json) {
      return { base64: result.b64_json, mimeType: "image/png" };
    }
    if (result?.url) {
      return this.fetchRemoteImage(result.url);
    }

    throw new UpstreamServiceError("Marketing image generator did not return an image.");
  }

  private async fetchRemoteImage(url: string): Promise<ImageData> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new UpstreamServiceError(
        `Failed to download generated image (status ${response.status}).`
      );
    }
    const mimeType = response.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    return { base64: buffer.toString("base64"), mimeType };
  }
}
