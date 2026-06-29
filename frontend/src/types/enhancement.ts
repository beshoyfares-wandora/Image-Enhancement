export type EnhancementProvider = "gemini" | "gpt-image";

export interface ProviderResult {
  provider: EnhancementProvider;
  model: string;
  /** Enhanced image as a base64 data URL, or null if the provider failed. */
  image: string | null;
  error: string | null;
}

export interface EnhanceResponse {
  prompt: string;
  results: ProviderResult[];
}

export interface ApiError {
  error: {
    message: string;
    details: unknown;
  };
}
