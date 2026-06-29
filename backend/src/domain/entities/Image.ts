/**
 * An image represented in memory as raw bytes plus its mime type.
 * Kept transport-agnostic: it can be created from a data URL, a base64
 * string, or a fetched URL, and rendered back to any of those.
 */
export interface ImageData {
  readonly base64: string;
  readonly mimeType: string;
}

export function dataUrlToImage(dataUrl: string): ImageData {
  const match = /^data:(?<mime>[^;]+);base64,(?<data>.+)$/s.exec(dataUrl.trim());
  if (!match?.groups) {
    throw new Error("Invalid data URL: expected 'data:<mime>;base64,<data>'.");
  }
  return { mimeType: match.groups.mime, base64: match.groups.data };
}

export function imageToDataUrl(image: ImageData): string {
  return `data:${image.mimeType};base64,${image.base64}`;
}
