import type { EnhancementProvider } from "../../domain/entities/Enhancement.js";
import type { ImageData } from "../../domain/entities/Image.js";
import { dataUrlToImage, imageToDataUrl } from "../../domain/entities/Image.js";
import type { IImageEnhancer } from "../../domain/services/IImageEnhancer.js";
import { UpstreamServiceError } from "../../shared/errors/AppError.js";
import { logger } from "../../shared/logger.js";
import { buildEditInstruction } from "./prompts.js";
import type { RequestyClient } from "./RequestyClient.js";
import type { ChatCompletionResponse } from "./types.js";

/**
 * Image enhancer that drives an image-capable multimodal model through the
 * OpenAI-compatible chat completions endpoint: it sends the original image
 * plus the editing prompt and extracts the generated image from the response.
 *
 * Gemini ("Nano Banana") and GPT Image both work through this same shape on
 * Requesty, so they share this implementation and only differ in provider/model.
 */
export class ChatImageEnhancer implements IImageEnhancer {
  constructor(
    public readonly provider: EnhancementProvider,
    public readonly model: string,
    private readonly client: RequestyClient,
    // How the editing prompt is finalised before sending. Defaults to the
    // enhancement fidelity directive; callers (e.g. marketing image generation)
    // can pass an identity builder to send self-contained prompts verbatim.
    private readonly buildPrompt: (prompt: string) => string = buildEditInstruction
  ) {}

  async enhance(original: ImageData, prompt: string): Promise<ImageData> {
    const response = await this.client.post<ChatCompletionResponse>(
      "/chat/completions",
      {
        model: this.model,
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: this.buildPrompt(prompt) },
              { type: "image_url", image_url: { url: imageToDataUrl(original) } },
            ],
          },
        ],
      }
    );

    const dataUrl = await this.extractImageUrl(response);
    if (!dataUrl) {
      throw new UpstreamServiceError(
        `${this.provider} did not return an image.`
      );
    }

    const result = dataUrl.startsWith("data:")
      ? dataUrlToImage(dataUrl)
      : await this.fetchRemoteImage(dataUrl);

    if (result.base64 === original.base64) {
      logger.warn(
        `${this.provider} (${this.model}) returned an image identical to the input — the model likely did not apply an edit.`
      );
    }

    return result;
  }

  private async extractImageUrl(
    response: ChatCompletionResponse
  ): Promise<string | undefined> {
    const message = response.choices?.[0]?.message;
    if (!message) return undefined;

    // 1) Non-standard but common: message.images[]
    const fromImages = message.images?.find(
      (img) => img.image_url?.url ?? img.url
    );
    if (fromImages) return fromImages.image_url?.url ?? fromImages.url;

    // 2) Structured content array containing an image part.
    if (Array.isArray(message.content)) {
      const imagePart = message.content.find(
        (part) => part.type === "image_url" && part.image_url?.url
      );
      if (imagePart?.image_url?.url) return imagePart.image_url.url;
    }

    return undefined;
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
