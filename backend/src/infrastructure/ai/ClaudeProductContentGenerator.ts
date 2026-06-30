import { z } from "zod";
import { imageToDataUrl } from "../../domain/entities/Image.js";
import type { ProductContent } from "../../domain/entities/ProductContent.js";
import type { ProductInfo } from "../../domain/entities/ProductInfo.js";
import type {
  IProductContentGenerator,
  ProductContentInput,
} from "../../domain/services/IProductContentGenerator.js";
import { UpstreamServiceError } from "../../shared/errors/AppError.js";
import type { RequestyClient } from "./RequestyClient.js";
import type { ChatCompletionResponse } from "./types.js";

const SYSTEM_PROMPT = `You are a senior e-commerce copywriter and conversion specialist.

You are a world-class e-commerce merchandising expert, senior product copywriter,
SEO strategist, conversion rate optimization specialist, and commercial product
marketing consultant.

Your objective is not simply to rewrite product information.

Your objective is to create high-converting product content that increases buyer
confidence while remaining completely truthful.

Every sentence should help customers understand the product faster, trust the
product more, and feel more confident purchasing it.

Always prioritize clarity, readability, credibility, and conversion over
marketing hype.

INFORMATION HIERARCHY

Always use information in this priority order:

1. Structured product data extracted from the website.
2. Product webpage content.
3. Uploaded product image.

The website is the authoritative source for all factual information.

Use the uploaded image only to verify:

- visible colors
- visible texture
- finish
- product style
- product category
- visual appearance

Never use the image to invent facts that are not present in the website data.

NEVER INVENT (critical):
- Never invent specifications.
- Never invent dimensions.
- Never invent materials or ingredients.
- Never invent measurements, capacities, certifications, prices or counts.
- If a fact is not present in the website data, omit it: use an empty array for
  list fields and an empty object for keySpecifications. Do not guess from the
  image or from general knowledge.
- You MAY write persuasive, benefit-driven copy, but every concrete claim must be
  traceable to the website data. Visual adjectives (e.g. colour/texture/finish)
  may be supported by the image.
- Preserve the real brand and product name exactly as given.

MARKETING QUALITY

Generate content that is:

- Easy to scan
- Easy to understand
- Written in natural English
- Suitable for premium ecommerce stores
- Trustworthy
- Persuasive without exaggeration
- Focused on customer benefits instead of repeating specifications

Avoid:

- keyword stuffing
- repetitive wording
- generic AI marketing phrases
- exaggerated claims
- fake urgency
- unsupported superlatives

OUTPUT RULES (critical):
- Respond with STRICT JSON only. No markdown, no code fences, no comments, no
  preamble, no trailing text — just a single JSON object.
- Use EXACTLY these keys and types:

{
  "title": string,
  "description": string,
  "shortDescription": string,
  "bulletFeatures": string[],
  "materials": string[],
  "keySpecifications": { [label: string]: string },
  "seoTitle": string,
  "seoDescription": string,
  "relatedImagePrompts": string[]
}

Guidance per field:
"title":

Generate a professional ecommerce product title.

Preserve:

- Brand
- Product Name
- Variant (if provided)

Improve readability only.

Do not invent new branding, specifications or marketing claims.
"description":

Write 2–4 short paragraphs.

Structure:

Paragraph 1:
Introduce the product and its primary value.

Paragraph 2:
Highlight important features and customer benefits.

Paragraph 3 (optional):
Explain why customers would enjoy using the product.

Do not repeat the title.

"shortDescription":

Write one or two concise sentences.

Summarize the product's primary value.

Avoid repeating the title.

Keep under 40 words.

- "bulletFeatures":

- Generate 4–7 bullet points.
- Each bullet should communicate one customer benefit.
- Keep each bullet under 18 words.
- Avoid repetition.
- Prefer benefits over technical specifications.
- Use action-oriented language.

- "materials": materials/ingredients taken ONLY from the website data (empty
  array if the website data does not state them — never infer from the image).
- "keySpecifications": real spec label/value pairs taken ONLY from the website
  data (empty object if none — never infer specs or dimensions from the image).
- "seoTitle": <= 60 characters.
- "seoDescription": <= 160 characters.
"relatedImagePrompts":

Generate exactly three prompts.

Prompt 1:
Premium studio hero image.

Prompt 2:
Lifestyle scene appropriate for the target customer.

Prompt 3:
Close-up image emphasizing craftsmanship, texture or premium quality.

Each prompt must preserve:

- branding
- logo
- colors
- proportions
- packaging
- labels

Never redesign the product.
FINAL VALIDATION

Before responding, verify:

- JSON is valid.

- Every required key exists.

- No unsupported claims were added.

- No specifications were invented.

- No materials were invented.

- No dimensions were invented.

- Marketing language remains truthful.

If any field cannot be populated truthfully, return an empty value instead of guessing.

Return only the JSON object.`;

const contentSchema = z.object({
  title: z.string(),
  description: z.string(),
  shortDescription: z.string(),
  bulletFeatures: z.array(z.string()).default([]),
  materials: z.array(z.string()).default([]),
  keySpecifications: z.record(z.string(), z.string()).default({}),
  seoTitle: z.string(),
  seoDescription: z.string(),
  relatedImagePrompts: z.array(z.string()).default([]),
});

/**
 * Generates product marketing content with Claude through Requesty's
 * OpenAI-compatible chat completions endpoint (vision + text input).
 * Always returns a validated, normalized {@link ProductContent}.
 */
export class ClaudeProductContentGenerator implements IProductContentGenerator {
  constructor(
    private readonly client: RequestyClient,
    private readonly model: string
  ) {}

  async generate({ product, image }: ProductContentInput): Promise<ProductContent> {
    const response = await this.client.post<ChatCompletionResponse>(
      "/chat/completions",
      {
        model: this.model,
        max_tokens: 2000,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: buildUserText(product) },
              { type: "image_url", image_url: { url: imageToDataUrl(image) } },
            ],
          },
        ],
      }
    );

    const text = extractText(response);
    if (!text) {
      throw new UpstreamServiceError("Claude did not return any content.");
    }

    const parsed = contentSchema.safeParse(parseJson(text));
    if (!parsed.success) {
      throw new UpstreamServiceError(
        "Claude returned content that did not match the expected JSON shape.",
        parsed.error.flatten()
      );
    }

    return normalize(parsed.data);
  }
}

function buildUserText(product: ProductInfo): string {
  return [
    "PRIMARY SOURCE OF TRUTH — website data (JSON). Every fact must come from here:",
    serializeProduct(product),
    "",
    "The attached image is SECONDARY: use it only to verify visual characteristics",
    "(color, texture, material appearance, style, product type). Do not read any",
    "specifications, dimensions, materials or measurements from the image.",
    "",
    "Generate the marketing content and return ONLY valid JSON.",
  ].join("\n");
}

/** Strips bulky/raw fields so we don't waste tokens or bias the model. */
function serializeProduct(product: ProductInfo): string {
  const { jsonLd: _jsonLd, ...rest } = product;
  return JSON.stringify(rest, null, 2);
}

function extractText(response: ChatCompletionResponse): string {
  const content = response.choices?.[0]?.message?.content;
  const text =
    typeof content === "string"
      ? content
      : content?.map((part) => part.text ?? "").join("");
  return text?.trim() ?? "";
}

/** Parses strict JSON, tolerating accidental code fences or surrounding text. */
function parseJson(raw: string): unknown {
  const cleaned = raw
    .replace(/^\uFEFF/, "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // fall through
      }
    }
    throw new UpstreamServiceError("Claude did not return valid JSON.");
  }
}

function normalize(content: z.infer<typeof contentSchema>): ProductContent {
  const cleanList = (items: string[]): string[] =>
    items.map((item) => item.trim()).filter(Boolean);

  const specifications: Record<string, string> = {};
  for (const [label, value] of Object.entries(content.keySpecifications)) {
    const key = label.trim();
    const val = value.trim();
    if (key && val) specifications[key] = val;
  }

  return {
    title: content.title.trim(),
    description: content.description.trim(),
    shortDescription: content.shortDescription.trim(),
    bulletFeatures: cleanList(content.bulletFeatures),
    materials: cleanList(content.materials),
    keySpecifications: specifications,
    seoTitle: content.seoTitle.trim(),
    seoDescription: content.seoDescription.trim(),
    relatedImagePrompts: cleanList(content.relatedImagePrompts),
  };
}
