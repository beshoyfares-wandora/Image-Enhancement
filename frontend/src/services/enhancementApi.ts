import { config } from "../config/env";
import type { ApiError, EnhanceResponse } from "../types/enhancement";

/**
 * Sends the uploaded image plus the (optional) product URL to the backend as
 * multipart/form-data and returns the generated prompt plus each provider's
 * enhanced image.
 */
export async function enhanceImage(
  imageDataUrl: string,
  productUrl: string,
  signal?: AbortSignal
): Promise<EnhanceResponse> {
  const blob = await dataUrlToBlob(imageDataUrl);

  const form = new FormData();
  form.append("image", blob, filenameForBlob(blob));
  form.append("url", productUrl);

  // Note: do NOT set Content-Type — the browser adds the multipart boundary.
  const response = await fetch(`${config.apiBaseUrl}/enhance`, {
    method: "POST",
    body: form,
    signal,
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as EnhanceResponse;
}

/** Converts a base64 data URL into a Blob for multipart upload. */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

function filenameForBlob(blob: Blob): string {
  const ext = blob.type.split("/")[1] ?? "png";
  return `upload.${ext}`;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiError;
    return body.error?.message ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}
