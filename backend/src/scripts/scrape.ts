import { HtmlProductExtractor } from "../infrastructure/scraping/HtmlProductExtractor.js";

/**
 * Manual test harness for the product extractor.
 *
 *   npm run scrape --workspace backend -- <url>
 *   # or, from the backend folder:
 *   npm run scrape -- <url>
 *
 * Runs the extractor directly against a live page and prints the normalized
 * ProductInfo. Does not start the HTTP server and needs no API key.
 */
async function main(): Promise<void> {
  const url = process.argv[2];

  if (!url) {
    console.error("Usage: npm run scrape -- <product-url>");
    console.error("Example: npm run scrape -- https://example.com");
    process.exit(1);
  }

  const extractor = new HtmlProductExtractor();

  console.log(`\nExtracting: ${url}\n`);
  const started = Date.now();

  try {
    const data = await extractor.extract(url);
    console.log(JSON.stringify(data, null, 2));
    console.log(`\nDone in ${Date.now() - started}ms`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nScrape failed: ${message}`);
    process.exit(1);
  }
}

void main();
