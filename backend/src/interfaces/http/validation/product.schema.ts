import { z } from "zod";

/** Validates the scrape-product request payload. */
export const scrapeProductSchema = z.object({
  url: z
    .string()
    .min(1, "url is required")
    .url("url must be a valid URL"),
});

export type ScrapeProductDto = z.infer<typeof scrapeProductSchema>;
