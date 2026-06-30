import { BadRequestError, UpstreamServiceError } from "../../shared/errors/AppError.js";

export interface PageDownloaderOptions {
  /** Abort the download after this many milliseconds. */
  timeoutMs?: number;
  /** Maximum HTML size to read, in bytes (guards against huge pages). */
  maxBytes?: number;
  /** User-Agent sent with the request (some sites block unknown agents). */
  userAgent?: string;
}

export interface DownloadedPage {
  html: string;
  /** The final URL after any redirects. */
  finalUrl: string;
}

const DEFAULTS = {
  timeoutMs: 15_000,
  maxBytes: 5 * 1024 * 1024,
  userAgent:
    "Mozilla/5.0 (compatible; ImageEnhancerBot/1.0; +https://localhost) ProductScraper",
};

/**
 * Downloads an HTML page over HTTP(S) with a timeout, size cap and content-type
 * check. Shared by the scraping adapters so fetching concerns live in one place.
 */
export class PageDownloader {
  private readonly options: Required<PageDownloaderOptions>;

  constructor(options: PageDownloaderOptions = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  parseUrl(url: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestError(`Invalid URL: ${url}`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new BadRequestError("Only http and https URLs are supported.");
    }
    return parsed;
  }

  async download(url: string): Promise<DownloadedPage> {
    const target = this.parseUrl(url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const response = await fetch(target, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": this.options.userAgent,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new UpstreamServiceError(
          `Failed to download page (status ${response.status}).`
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        throw new UpstreamServiceError(
          `Expected an HTML page but received content-type "${contentType || "unknown"}".`
        );
      }

      const html = await this.readLimited(response);
      return { html, finalUrl: response.url || target.toString() };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof UpstreamServiceError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new UpstreamServiceError(
          `Timed out downloading page after ${this.options.timeoutMs}ms.`
        );
      }
      throw new UpstreamServiceError(
        `Failed to download page: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Reads the response body but stops once maxBytes is exceeded. */
  private async readLimited(response: Response): Promise<string> {
    const body = response.body;
    if (!body) return await response.text();

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > this.options.maxBytes) {
          await reader.cancel();
          throw new UpstreamServiceError(
            `Page exceeds maximum size of ${this.options.maxBytes} bytes.`
          );
        }
        chunks.push(value);
      }
    }

    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
  }
}
