import type { EnhancementProvider } from "../../domain/entities/Enhancement.js";
import type { ImageData } from "../../domain/entities/Image.js";
import type { IImageEnhancer } from "../../domain/services/IImageEnhancer.js";
import { UpstreamServiceError } from "../../shared/errors/AppError.js";
import { buildEditInstruction } from "./prompts.js";
import type { RequestyClient } from "./RequestyClient.js";
import type { ImagesResponse } from "./types.js";

/**
 * Image enhancer for models served through Requesty's image *edits* API
 * (`/v1/images/edits`) rather than chat completions — e.g. OpenAI's GPT Image
 * models. It uploads the original image as a multipart `image` file field plus
 * the editing prompt and reads the generated image back from the `data[]` array.
 */
export class ImagesApiEnhancer implements IImageEnhancer {
  constructor(
    public readonly provider: EnhancementProvider,
    public readonly model: string,
    private readonly client: RequestyClient
  ) {}

  async enhance(original: ImageData, prompt: string): Promise<ImageData> {
    // The OpenAI-style image edits endpoint expects the original as a file field
    // named `image` (multipart/form-data), not a JSON image reference.
    const form = new FormData();
    form.append("model", this.model);
    form.append("prompt", buildEditInstruction(prompt));
    // A fixed 1024 square at medium quality keeps generation fast enough to beat
    // the provider/gateway timeout (high quality + auto size frequently 504s).
    form.append("size", "1024x1024");
    form.append("quality", "medium");
    // Keep the edit as close to the supplied image as possible.
    form.append("input_fidelity", "high");
    form.append(
      "image",
      new Blob([Buffer.from(original.base64, "base64")], {
        type: original.mimeType,
      }),
      `image.${mimeToExt(original.mimeType)}`
    );

    const response = await this.client.postForm<ImagesResponse>(
      "/images/edits",
      form
    );

    const result = response.data?.[0];
    if (result?.b64_json) {
      return { base64: result.b64_json, mimeType: "image/png" };
    }
    if (result?.url) {
      return this.fetchRemoteImage(result.url);
    }

    throw new UpstreamServiceError(`${this.provider} did not return an image.`);
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

function mimeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
  };
  return map[mimeType.toLowerCase()] ?? "png";
}
