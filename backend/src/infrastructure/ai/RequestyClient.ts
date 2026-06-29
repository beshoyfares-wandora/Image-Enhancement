import { UpstreamServiceError } from "../../shared/errors/AppError.js";

export interface RequestyClientOptions {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}

/**
 * Thin wrapper around the Requesty router, which exposes an OpenAI-compatible
 * REST API. Centralises auth headers, timeouts and error normalisation so the
 * individual AI adapters only deal with request/response shapes.
 */
export class RequestyClient {
  constructor(private readonly options: RequestyClientOptions) {}

  /** POST a JSON body. */
  async post<TResponse>(path: string, body: unknown): Promise<TResponse> {
    return this.send<TResponse>(path, {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  /**
   * POST a multipart/form-data body. `Content-Type` is intentionally NOT set so
   * fetch can add the correct boundary. Used for the OpenAI-style image edits
   * endpoint, which expects an `image` file field.
   */
  async postForm<TResponse>(path: string, form: FormData): Promise<TResponse> {
    return this.send<TResponse>(path, { body: form });
  }

  private async send<TResponse>(
    path: string,
    init: { headers?: Record<string, string>; body: string | FormData }
  ): Promise<TResponse> {
    const url = `${this.options.baseUrl.replace(/\/$/, "")}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          ...init.headers,
        },
        body: init.body,
        signal: controller.signal,
      });

      const raw = await response.text();
      const parsed = raw ? safeJsonParse(raw) : undefined;

      if (!response.ok) {
        const detail =
          typeof parsed === "string"
            ? parsed
            : JSON.stringify(parsed ?? raw);
        throw new UpstreamServiceError(
          `Requesty request to ${path} failed with status ${response.status}: ${detail?.slice(0, 600)}`,
          parsed ?? raw
        );
      }

      return parsed as TResponse;
    } catch (error) {
      if (error instanceof UpstreamServiceError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new UpstreamServiceError(`Requesty request to ${path} timed out`);
      }
      throw new UpstreamServiceError(
        `Requesty request to ${path} failed`,
        error instanceof Error ? error.message : error
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
