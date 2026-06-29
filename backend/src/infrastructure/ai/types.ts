/** Minimal subset of the OpenAI-compatible chat completion response. */
export interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
            image_url?: { url?: string };
          }>;
      images?: Array<{ image_url?: { url?: string }; url?: string }>;
    };
  }>;
}

/** Minimal subset of the OpenAI-compatible images response. */
export interface ImagesResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
}
