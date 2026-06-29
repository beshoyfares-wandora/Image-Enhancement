import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

/**
 * Centralised, validated access to environment variables.
 * The app fails fast at startup if required configuration is missing.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    ),
  MAX_UPLOAD_SIZE: z.string().default("25mb"),

  REQUESTY_API_KEY: z.string().min(1, "REQUESTY_API_KEY is required"),
  REQUESTY_BASE_URL: z
    .string()
    .url()
    .default("https://router.requesty.ai/v1"),

  CLAUDE_PROMPT_MODEL: z.string().min(1).default("anthropic/claude-opus-4-20250514"),
  GEMINI_IMAGE_MODEL: z.string().min(1).default("google/gemini-3-pro-image"),
  GPT_IMAGE_MODEL: z.string().min(1).default("openai/gpt-image-2"),

  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
