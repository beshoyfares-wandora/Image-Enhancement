import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { env } from "../config/env.js";
import type { ImageData } from "../domain/entities/Image.js";
import { ClaudeProductContentGenerator } from "../infrastructure/ai/ClaudeProductContentGenerator.js";
import { RequestyClient } from "../infrastructure/ai/RequestyClient.js";
import { HtmlProductExtractor } from "../infrastructure/scraping/HtmlProductExtractor.js";

/**
 * Manual test harness for the ProductContentGenerator.
 *
 *   npm run generate -- <product-url> <image-path-or-url>
 *   # examples:
 *   npm run generate -- https://example.com/product ./samples/bottle.jpg
 *   npm run generate -- https://example.com/product https://example.com/img.png
 *
 * Flow: scrape the page into ProductInfo, load the image, then ask Claude (via
 * Requesty) to generate marketing content. Requires REQUESTY_API_KEY in .env.
 */
async function main(): Promise<void> {
  const url = process.argv[2];
  const imageRef = process.argv[3];

  if (!url || !imageRef) {
    console.error("Usage: npm run generate -- <product-url> <image-path-or-url>");
    process.exit(1);
  }

  const extractor = new HtmlProductExtractor();
  const client = new RequestyClient({
    apiKey: env.REQUESTY_API_KEY,
    baseUrl: env.REQUESTY_BASE_URL,
    timeoutMs: env.AI_REQUEST_TIMEOUT_MS,
  });
  const generator = new ClaudeProductContentGenerator(client, env.CLAUDE_PROMPT_MODEL);

  const started = Date.now();
  try {
    console.log(`\nScraping: ${url}`);
    const product = await extractor.extract(url);

    console.log(`Loading image: ${imageRef}`);
    const image = await loadImage(imageRef);

    console.log(`Generating content with ${env.CLAUDE_PROMPT_MODEL} ...\n`);
    const content = await generator.generate({ product, image });

    console.log(JSON.stringify(content, null, 2));
    console.log(`\nDone in ${Date.now() - started}ms`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nGenerate failed: ${message}`);
    process.exit(1);
  }
}

async function loadImage(ref: string): Promise<ImageData> {
  if (/^https?:\/\//i.test(ref)) {
    const response = await fetch(ref);
    if (!response.ok) {
      throw new Error(`Failed to download image (${response.status})`);
    }
    const mimeType = response.headers.get("content-type") ?? mimeFromExt(ref);
    const buffer = Buffer.from(await response.arrayBuffer());
    return { base64: buffer.toString("base64"), mimeType };
  }

  const buffer = await readFile(ref);
  return { base64: buffer.toString("base64"), mimeType: mimeFromExt(ref) };
}

function mimeFromExt(ref: string): string {
  switch (extname(ref).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

void main();
