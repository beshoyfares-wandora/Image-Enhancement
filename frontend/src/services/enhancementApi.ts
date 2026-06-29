import { config } from "../config/env";
import type { ApiError, EnhanceResponse } from "../types/enhancement";

/**
 * Sends the uploaded image (as a base64 data URL) to the backend and returns
 * the generated prompt plus each provider's enhanced image.
 */
export async function enhanceImage(
  imageDataUrl: string,
  signal?: AbortSignal
): Promise<EnhanceResponse> {
  const response = await fetch(`${config.apiBaseUrl}/enhance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageDataUrl }),
    signal,
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as EnhanceResponse;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiError;
    return body.error?.message ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}
