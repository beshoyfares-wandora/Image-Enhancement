import { z } from "zod";

/** Validates the enhance-image request payload. */
export const enhanceRequestSchema = z.object({
  /** The uploaded image as a base64 data URL: "data:image/png;base64,...". */
  image: z
    .string()
    .min(1, "image is required")
    .regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "image must be a base64 data URL"),
});

export type EnhanceRequestDto = z.infer<typeof enhanceRequestSchema>;
