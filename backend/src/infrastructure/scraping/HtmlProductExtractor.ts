import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { IncludedProduct, ProductInfo } from "../../domain/entities/ProductInfo.js";
import type { IProductExtractor } from "../../domain/services/IProductExtractor.js";
import { PageDownloader } from "./PageDownloader.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

/** A partial view of ProductInfo produced by a single source (JSON-LD/OG/HTML). */
interface PartialInfo {
  title?: string | null;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  price?: string | null;
  currency?: string | null;
  availability?: string | null;
  sku?: string | null;
  materials?: string[];
  features?: string[];
  specifications?: Record<string, string>;
  images?: string[];
  breadcrumbs?: string[];
}

/**
 * Extracts normalized {@link ProductInfo} from a product page.
 *
 * Priority per field: schema.org Product JSON-LD, then Open Graph / meta tags,
 * then raw HTML. Values are never fabricated — anything the page omits comes
 * back as null or an empty array.
 */
export class HtmlProductExtractor implements IProductExtractor {
  constructor(private readonly downloader: PageDownloader = new PageDownloader()) {}

  async extract(url: string): Promise<ProductInfo> {
    const { html, finalUrl } = await this.downloader.download(url);
    const $ = cheerio.load(html);
    const base = new URL(finalUrl);

    const ld = this.parseJsonLd($);
    const fromLd = ld.product ? this.fromJsonLd(ld.product, ld.breadcrumbs) : {};
    const fromOg = this.fromOpenGraph($);
    const fromMeta = this.fromMetadata($);
    const fromHtml = this.fromHtml($);

    const description =
      coalesce(fromLd.description, fromMeta.description, fromOg.description) ?? null;
    const shortDescription =
      coalesce(fromOg.shortDescription, fromMeta.shortDescription) ?? null;

    const specifications = {
      ...fromHtml.specifications,
      ...fromLd.specifications, // JSON-LD wins on key conflicts
    };

    const materials = firstNonEmpty(
      fromLd.materials,
      materialsFromSpecs(specifications)
    );

    return {
      url: finalUrl,
      title: coalesce(fromLd.title, fromOg.title, fromMeta.title) ?? null,
      brand: coalesce(fromLd.brand, fromOg.brand) ?? null,
      category: coalesce(fromLd.category, fromOg.category) ?? null,
      description,
      shortDescription,
      price: coalesce(fromLd.price, fromOg.price, fromHtml.price) ?? null,
      currency: coalesce(fromLd.currency, fromOg.currency, fromHtml.currency) ?? null,
      availability: coalesce(fromLd.availability, fromOg.availability) ?? null,
      sku: coalesce(fromLd.sku, fromOg.sku, fromHtml.sku) ?? null,
      materials,
      features: firstNonEmpty(fromLd.features, fromHtml.features),
      specifications,
      images: resolveAll(
        unique([
          ...(fromLd.images ?? []),
          ...(fromOg.images ?? []),
          ...(fromHtml.images ?? []),
        ]),
        base
      ),
      breadcrumbs: firstNonEmpty(fromLd.breadcrumbs, fromHtml.breadcrumbs),
      includedProducts: this.extractIncluded($, ld.product, description),
      jsonLd: ld.product ?? undefined,
    };
  }

  // --- Included products (bundles / sets / kits) -------------------------

  private extractIncluded(
    $: CheerioAPI,
    product?: Json,
    description?: string | null
  ): IncludedProduct[] {
    const raw: IncludedProduct[] = [];

    // 1) JSON-LD structured bundle fields.
    if (product) {
      for (const offer of toArray(product.offers)) {
        for (const inc of toArray(offer?.includesObject)) {
          const name = asString(inc?.typeOfGood?.name);
          if (name) {
            const parsed = splitNameSize(name);
            raw.push({ name: parsed.name, size: parsed.size ?? asString(inc?.amountOfThisGood) });
          }
        }
      }
      for (const part of [...toArray(product.hasPart), ...toArray(product.isRelatedTo)]) {
        const name = asString(part?.name);
        if (name) {
          const parsed = splitNameSize(name);
          raw.push({
            name: parsed.name,
            size: parsed.size ?? asString(part?.size) ?? asString(part?.weight),
          });
        }
      }
    }

    // 2) Explicit "what's included" / "in the box" lists in the HTML.
    for (const line of collectIncludeLines($)) {
      const parsed = splitNameSize(line);
      if (parsed.name) raw.push(parsed);
    }

    // 3) Prose in the description: "What's Inside", "Package Contents",
    //    "Included: a, b, c", or numbered lists like "1. ... 2. ...".
    for (const line of includedLinesFromDescription(description ?? null)) {
      const parsed = splitNameSize(line);
      if (parsed.name) raw.push(parsed);
    }

    const seen = new Set<string>();
    const out: IncludedProduct[] = [];
    for (const item of raw) {
      const key = item.name.toLowerCase();
      if (item.name && !seen.has(key)) {
        seen.add(key);
        out.push({ name: item.name, size: item.size ?? null });
      }
    }
    return out;
  }

  // --- JSON-LD ------------------------------------------------------------

  private parseJsonLd($: CheerioAPI): { product?: Json; breadcrumbs?: string[] } {
    const nodes: Json[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      const raw = $(el).text();
      if (!raw?.trim()) return;
      try {
        collectNodes(JSON.parse(raw), nodes);
      } catch {
        /* ignore malformed JSON-LD blocks */
      }
    });

    const product = nodes.find((n) => hasType(n, "Product"));
    const breadcrumbNode = nodes.find((n) => hasType(n, "BreadcrumbList"));
    const breadcrumbs = breadcrumbNode
      ? toArray(breadcrumbNode.itemListElement)
          .map((item) => asString(item?.name) ?? asString(item?.item?.name))
          .filter((s): s is string => Boolean(s))
      : undefined;

    return { product, breadcrumbs };
  }

  private fromJsonLd(node: Json, breadcrumbs?: string[]): PartialInfo {
    const offer = extractOffer(node.offers);
    const specifications: Record<string, string> = {};
    for (const prop of toArray(node.additionalProperty)) {
      const name = asString(prop?.name);
      const value = asString(prop?.value);
      if (name && value) specifications[name] = value;
    }

    return {
      title: asString(node.name),
      brand: asString(node.brand),
      category: asString(toArray(node.category)[0] ?? node.category),
      description: asString(node.description),
      price: offer.price,
      currency: offer.currency,
      availability: offer.availability,
      sku: asString(node.sku) ?? offer.sku,
      materials: collectStrings(node.material),
      images: collectStrings(node.image),
      specifications,
      breadcrumbs,
    };
  }

  // --- Open Graph / product meta -----------------------------------------

  private fromOpenGraph($: CheerioAPI): PartialInfo {
    const m = (selector: string) => clean($(selector).attr("content"));
    const images: string[] = [];
    $(
      'meta[property="og:image"], meta[property="og:image:url"], meta[property="og:image:secure_url"], meta[name="og:image"]'
    ).each((_, el) => {
      const c = clean($(el).attr("content"));
      if (c) images.push(c);
    });

    return {
      title: m('meta[property="og:title"]') ?? m('meta[name="og:title"]'),
      brand: m('meta[property="product:brand"]') ?? m('meta[property="og:brand"]'),
      category: m('meta[property="product:category"]'),
      description: m('meta[property="og:description"]'),
      shortDescription: m('meta[property="og:description"]'),
      price:
        m('meta[property="product:price:amount"]') ??
        m('meta[property="og:price:amount"]'),
      currency:
        m('meta[property="product:price:currency"]') ??
        m('meta[property="og:price:currency"]'),
      availability: normalizeAvailability(
        m('meta[property="product:availability"]') ??
          m('meta[property="og:availability"]')
      ),
      sku:
        m('meta[property="product:retailer_item_id"]') ??
        m('meta[property="product:sku"]'),
      images,
    };
  }

  // --- <title> / <meta> metadata (preserved from the original scraper) -----

  private fromMetadata($: CheerioAPI): PartialInfo {
    const metaDescription = clean($('meta[name="description"]').attr("content"));
    return {
      title: clean($("title").first().text()),
      description: metaDescription,
      shortDescription: metaDescription,
    };
  }

  // --- Raw HTML fallback --------------------------------------------------

  private fromHtml($: CheerioAPI): PartialInfo {
    return {
      price:
        clean($('[itemprop="price"]').attr("content")) ??
        clean($('[itemprop="price"]').first().text()),
      currency: clean($('[itemprop="priceCurrency"]').attr("content")),
      sku:
        clean($('[itemprop="sku"]').attr("content")) ??
        clean($('[itemprop="sku"]').first().text()),
      images: collectHtmlImages($),
      features: collectFeatures($),
      specifications: collectSpecTables($),
      breadcrumbs: collectBreadcrumbs($),
    };
  }
}

// === helpers ==============================================================

function collectNodes(value: Json, out: Json[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectNodes(item, out);
    return;
  }
  if (value && typeof value === "object") {
    out.push(value);
    if (value["@graph"]) collectNodes(value["@graph"], out);
  }
}

function hasType(node: Json, type: string): boolean {
  const t = node?.["@type"];
  if (typeof t === "string") return t.toLowerCase() === type.toLowerCase();
  if (Array.isArray(t)) {
    return t.some((x) => typeof x === "string" && x.toLowerCase() === type.toLowerCase());
  }
  return false;
}

function extractOffer(offers: Json): {
  price: string | null;
  currency: string | null;
  availability: string | null;
  sku: string | null;
} {
  for (const offer of toArray(offers)) {
    if (!offer || typeof offer !== "object") continue;
    const price = asString(offer.price) ?? asString(offer.lowPrice);
    const currency = asString(offer.priceCurrency);
    const availability = normalizeAvailability(asString(offer.availability));
    const sku = asString(offer.sku);
    if (price || currency || availability || sku) {
      return { price, currency, availability, sku };
    }
  }
  return { price: null, currency: null, availability: null, sku: null };
}

function collectHtmlImages($: CheerioAPI): string[] {
  const images: string[] = [];
  const push = (v: string | undefined | null) => {
    const c = clean(v);
    if (c) images.push(c);
  };
  $('[itemprop="image"]').each((_, el) => {
    push($(el).attr("content") ?? $(el).attr("src") ?? $(el).attr("href"));
  });
  $('link[rel="image_src"]').each((_, el) => push($(el).attr("href")));
  return images;
}

function collectFeatures($: CheerioAPI): string[] {
  const features: string[] = [];
  matchingElements($, /feature|highlight|key[\s-]?point|bullet/i).each((_, el) => {
    cheerioOf($, el)
      .find("li")
      .each((__, li) => {
        const text = clean(cheerioOf($, li).text());
        if (text && text.length <= 300) features.push(text);
      });
  });
  return unique(features).slice(0, 30);
}

function collectSpecTables($: CheerioAPI): Record<string, string> {
  const specs: Record<string, string> = {};

  $("table tr").each((_, row) => {
    const cells = cheerioOf($, row).find("th, td");
    if (cells.length >= 2) {
      const key = clean(cheerioOf($, cells[0]).text());
      const value = clean(cheerioOf($, cells[1]).text());
      if (key && value && !(key in specs)) specs[key] = value;
    }
  });

  $("dl").each((_, dl) => {
    const terms = cheerioOf($, dl).find("dt");
    const defs = cheerioOf($, dl).find("dd");
    terms.each((i, dt) => {
      const key = clean(cheerioOf($, dt).text());
      const value = clean(cheerioOf($, defs[i]).text());
      if (key && value && !(key in specs)) specs[key] = value;
    });
  });

  return specs;
}

function collectBreadcrumbs($: CheerioAPI): string[] {
  const crumbs: string[] = [];
  const containers = matchingElements($, /breadcrumb/i);
  containers.find("a, li").each((_, el) => {
    const text = clean(cheerioOf($, el).text());
    if (text) crumbs.push(text);
  });
  return unique(crumbs);
}

/** Selects elements whose class or id attribute matches the pattern. */
function matchingElements($: CheerioAPI, pattern: RegExp) {
  return $("*").filter((_, el) => {
    const attribs = (el as { attribs?: Record<string, string> }).attribs;
    if (!attribs) return false;
    return pattern.test(`${attribs.class ?? ""} ${attribs.id ?? ""}`);
  });
}

function cheerioOf($: CheerioAPI, el: Json) {
  return $(el);
}

const INCLUDE_HEADING =
  /(what'?s inside|what'?s included|what is included|in the (box|set|kit)|set (includes|contains|contents)|kit (includes|contains|contents)|bundle (includes|contains)|package (includes|contains)|package contents|^\s*includes?\b|^\s*included\b|^\s*contents\b)/i;

/** Collects candidate "included item" text lines from include-style sections. */
function collectIncludeLines($: CheerioAPI): string[] {
  const lines: string[] = [];

  $("h1, h2, h3, h4, h5, h6, strong, b, summary, dt, p, legend, th").each((_, el) => {
    const text = clean(cheerioOf($, el).text());
    if (!text || text.length > 160 || !INCLUDE_HEADING.test(text)) return;

    // Inline form: "Includes: A, B and C".
    const afterColon = text.includes(":") ? text.slice(text.indexOf(":") + 1) : "";
    for (const part of afterColon.split(/[,;•|]|\band\b/i)) {
      const p = clean(part);
      if (p) lines.push(p);
    }

    // Following / nearby list.
    let list = cheerioOf($, el).nextAll("ul, ol").first();
    if (!list.length) list = cheerioOf($, el).parent().find("ul, ol").first();
    list.find("li").each((__, li) => {
      const t = clean(cheerioOf($, li).text());
      if (t) lines.push(t);
    });
  });

  // Containers whose class/id signals an "included items" section.
  matchingElements($, /included|includes|whats?-?inside|in-?the-?box|package-?contents|set-?contents|kit-?contents|bundle/i)
    .find("li")
    .each((_, li) => {
      const t = clean(cheerioOf($, li).text());
      if (t) lines.push(t);
    });

  return unique(lines);
}

const SIZE_PATTERN =
  /(\d+(?:[.,]\d+)?)\s?(ml|cl|l|litres?|liters?|g|grams?|kg|mg|oz|fl\.?\s?oz|fluid\s?ounces?|pcs?|pack)\b/i;

/** Splits "SPF 50 Sunblock 100ml" into { name: "SPF 50 Sunblock", size: "100ml" }. */
function splitNameSize(text: string): IncludedProduct {
  const cleaned = clean(text) ?? "";
  const match = cleaned.match(SIZE_PATTERN);

  let size: string | null = null;
  let name = cleaned;

  if (match && match.index !== undefined) {
    size = `${match[1]}${match[2].toLowerCase().replace(/\s+/g, "")}`;
    name = cleaned.slice(0, match.index) + cleaned.slice(match.index + match[0].length);
  }

  name = name
    .replace(/^\s*\d+\s*[x×]\s*/i, "") // leading quantity "1x"
    .replace(/^\s*[-–—•*]\s*/, "") // leading bullet
    .replace(/[\s\-–—:,(|]+$/, "") // trailing separators
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { name, size };
}

/** Trigger phrases that introduce a list of included items inside prose. */
const INCLUDE_TRIGGER =
  /(what'?s inside|what'?s included|what is included|package contents|in the (?:box|set|kit)|this (?:set|kit|bundle|pack(?:age)?) (?:includes|contains)|set (?:includes|contains|contents)|kit (?:includes|contains|contents)|bundle (?:includes|contains)|package (?:includes|contains)|\bincludes?\b|\bcontents\b)\s*:?\s*/gi;

/** Items that are perks/policies, not products — dropped from prose parsing. */
const NON_PRODUCT =
  /\b(free\s+)?(shipping|delivery|returns?|exchanges?|warranty|guarantee|refunds?|support|gift\s*card)\b/i;

/**
 * Parses included items out of the product description prose. Handles trigger
 * phrases ("What's Inside: a, b, c") and numbered lists ("1. a 2. b 3. c").
 * Purely heuristic — no AI.
 */
function includedLinesFromDescription(description: string | null): string[] {
  if (!description) return [];
  const out: string[] = [];

  // Numbered lists anywhere: "1. SPF 50 Sunblock 100ml 2. Aloe Jelly 100ml".
  const numbered = parseNumberedItems(description);
  if (numbered.length >= 2) out.push(...numbered);

  // Trigger phrase followed by a comma/and/bullet/number-separated list.
  for (const segment of triggeredSegments(description)) {
    const items = splitListItems(segment);
    const accept = items.length >= 2 || (items.length === 1 && SIZE_PATTERN.test(items[0]));
    if (accept) out.push(...items);
  }

  return out.filter((line) => line && !NON_PRODUCT.test(line));
}

/** Extracts items from a sequential numbered list embedded in text. */
function parseNumberedItems(text: string): string[] {
  const markerRe = /(\d{1,2})[.)\]]\s+/g;
  const markers: Array<{ num: number; start: number; end: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = markerRe.exec(text))) {
    markers.push({ num: Number(match[1]), start: match.index, end: markerRe.lastIndex });
  }

  // Require a real, sequential list (1, 2, 3, ...) to avoid false positives.
  if (markers.length < 2) return [];
  const sequential = markers.every((m, i) =>
    i === 0 ? m.num === 1 : m.num === markers[i - 1].num + 1
  );
  if (!sequential) return [];

  const items: string[] = [];
  for (let i = 0; i < markers.length; i++) {
    const from = markers[i].end;
    const to = i + 1 < markers.length ? markers[i + 1].start : text.length;
    const item = sentenceSegment(text.slice(from, to));
    if (item) items.push(item);
  }
  return items;
}

/** Returns the list-bearing segment after each trigger phrase occurrence. */
function triggeredSegments(text: string): string[] {
  const segments: string[] = [];
  INCLUDE_TRIGGER.lastIndex = 0;
  while (INCLUDE_TRIGGER.exec(text) !== null) {
    const segment = sentenceSegment(text.slice(INCLUDE_TRIGGER.lastIndex));
    if (segment) segments.push(segment);
  }
  return segments;
}

/** Trims a string to the end of its first sentence (ignoring decimals like 0.5). */
function sentenceSegment(text: string): string {
  const trimmed = text.trim();
  const stop = trimmed.search(/[.!?](?:\s+[A-Z]|\s*$)/);
  return (stop === -1 ? trimmed : trimmed.slice(0, stop)).trim();
}

/** Splits a list segment on commas, "and", bullets, pipes and number markers. */
function splitListItems(segment: string): string[] {
  return segment
    .split(/\s*(?:,|;|·|•|\u2022|\||&|\band\b|\d{1,2}[.)\]])\s*/i)
    .map((part) => clean(part) ?? "")
    .filter(Boolean);
}

function materialsFromSpecs(specs: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(specs)) {
    if (/material|fabric|composition/i.test(key)) out.push(value);
  }
  return out;
}

function asString(value: Json): string | null {
  if (value == null) return null;
  if (typeof value === "string") return clean(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    return (
      clean(value.name) ??
      clean(value.value) ??
      clean(value["@value"]) ??
      clean(value.url) ??
      null
    );
  }
  return null;
}

function collectStrings(value: Json): string[] {
  return toArray(value)
    .map((item) => asString(item))
    .filter((s): s is string => Boolean(s));
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeAvailability(value: string | null | undefined): string | null {
  const cleaned = clean(value);
  if (!cleaned) return null;
  const last = cleaned.split("/").pop();
  return last ? last.trim() : cleaned;
}

function coalesce(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }
  return null;
}

function firstNonEmpty(...lists: (string[] | undefined)[]): string[] {
  for (const list of lists) {
    if (list && list.length > 0) return unique(list);
  }
  return [];
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function resolveAll(values: string[], base: URL): string[] {
  return unique(
    values.map((v) => {
      try {
        return new URL(v, base).toString();
      } catch {
        return v;
      }
    })
  );
}

function clean(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}
