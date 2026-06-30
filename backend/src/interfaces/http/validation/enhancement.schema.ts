import { z } from "zod";

/**
 * Validates the enhance-image request. The image itself arrives as a
 * multipart file (handled by multer), so only the text fields are validated
 * here. `url` is the product page URL and is required.
 */
export const enhanceRequestSchema = z.object({
  url: z
    .string({ required_error: "url is required" })
    .min(1, "url is required")
    .url("url must be a valid URL"),
});

export type EnhanceRequestDto = z.infer<typeof enhanceRequestSchema>;
