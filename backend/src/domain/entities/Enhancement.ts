import type { ImageData } from "./Image.js";

/** The provider that produced an enhanced image. */
export type EnhancementProvider = "gemini" | "gpt-image";

/** A single provider's result, including failures so the UI can show them. */
export interface ProviderResult {
  readonly provider: EnhancementProvider;
  readonly model: string;
  readonly image: ImageData | null;
  readonly error: string | null;
}

/** The full outcome of enhancing one uploaded image. */
export interface EnhancementOutcome {
  readonly prompt: string;
  readonly results: ProviderResult[];
}
