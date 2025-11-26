import type {
  AggregateRating,
  Offer,
  Person,
  SoftwareApplication,
  WithContext,
} from "schema-dts";
import { site } from "@/lib/site";
import type { MetadataProps } from "./index";

/**
 * Computes SEO values needed when building JSON-LD structured data.
 *
 * @param props Partial metadata overrides for the current page.
 * @returns Normalised values (title, descriptions and URLs)
 */
function processSeoProps(props: MetadataProps = {}) {
  const baseUrl: string = site.links.url;

  const baseTitle = props.title ? `${site.name} / ${props.title}` : site.name;

  const description = props.description || site.description;
  return {
    baseTitle,
    baseUrl,
    description,
    keywords: [...site.keywords, ...(props.keywords || [])].join(", "),
    openGraphDescription: props.openGraph?.description || description,
    openGraphUrl: `${baseUrl}${props.openGraph?.url || "/opengraph-image.png"}`,
  };
}

/**
 * Type guard to verify a JSON-LD object is a valid schema.
 *
 * @param data Arbitrary JSON to validate.
 * @returns True if the object matches `WithContext<SoftwareApplication>`.
 */
export function validateStructuredData(
  data: unknown
): data is WithContext<SoftwareApplication> {
  try {
    if (!data || typeof data !== "object") {
      return false;
    }

    const typedData = data as Record<string, unknown>;

    const hasValidContext = typedData["@context"] === "https://schema.org";
    const hasValidType = typedData["@type"] === "SoftwareApplication";
    const hasName =
      typeof typedData.name === "string" && typedData.name.length > 0;
    const hasDescription =
      typeof typedData.description === "string" &&
      typedData.description.length > 0;

    const hasValidAuthor =
      typedData.author &&
      typeof typedData.author === "object" &&
      (typedData.author as Record<string, unknown>)["@type"] === "Person";

    const hasValidOffers =
      typedData.offers &&
      typeof typedData.offers === "object" &&
      (typedData.offers as Record<string, unknown>)["@type"] === "Offer";

    const hasValidRating =
      typedData.aggregateRating &&
      typeof typedData.aggregateRating === "object" &&
      (typedData.aggregateRating as Record<string, unknown>)["@type"] ===
        "AggregateRating";

    return Boolean(
      hasValidContext &&
        hasValidType &&
        hasName &&
        hasDescription &&
        hasValidAuthor &&
        hasValidOffers &&
        hasValidRating
    );
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: PASS
    console.error("[DECODE] Structured Data Validation:", error);
    return false;
  }
}

/**
 * Check if JSON-LD blob has the expected `@type`.
 *
 * @param data Arbitrary JSON to validate.
 * @param expectedType The schema.org type expected.
 * @returns True if `@context` and `@type` match expectations.
 */
export function isValidSchemaType(
  data: unknown,
  expectedType: string
): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }

  const typedData = data as Record<string, unknown>;

  return (
    typedData["@context"] === "https://schema.org" &&
    typedData["@type"] === expectedType
  );
}

/**
 * Creates JSON-LD for a SoftwareApplication
 *
 * @param props Partial metadata overrides for the current page.
 * @returns `{ __html }` object containing the JSON-LD string.
 */
export function createValidatedStructuredData(props: MetadataProps = {}) {
  const { baseTitle, description } = processSeoProps(props);

  const structuredData: WithContext<SoftwareApplication> = {
    "@context": "https://schema.org",
    "@type": (site.type as "SoftwareApplication") || "SoftwareApplication",
    name: baseTitle,
    description,
    applicationCategory: site.category || "WebApplication",
    author: {
      "@type": "Person",
      name: site.author.name || "",
    } as Person,
    datePublished: site.datePublished || new Date().toISOString(),
    url: site.links.url,
    operatingSystem: site.operatingSystem || "Any",
    aggregateRating:
      site.rating.ratingCount && site.rating.ratingCount > 0
        ? ({
            "@type": "AggregateRating",
            bestRating: site.rating.bestRating,
            ratingCount: site.rating.ratingCount,
            ratingValue: site.rating.ratingValue || 0,
            worstRating: 1,
          } as AggregateRating)
        : undefined,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "AUD",
      availability: "https://schema.org/InStock",
    } as Offer,
  };

  return {
    __html: JSON.stringify(structuredData),
  };
}

/**
 * Builds SoftwareApplication JSON-LD
 *
 * @param props Partial metadata overrides for the current page.
 * @returns `{ __html }` object containing the JSON-LD string.
 */
export function generateStructuredData(props: MetadataProps = {}) {
  const { baseTitle, description } = processSeoProps(props);

  const structuredData: WithContext<SoftwareApplication> = {
    "@context": "https://schema.org",
    "@type": site.type as "SoftwareApplication",
    aggregateRating:
      site.rating.ratingCount && site.rating.ratingCount > 0
        ? ({
            "@type": "AggregateRating",
            bestRating: site.rating.bestRating,
            ratingCount: site.rating.ratingCount,
            ratingValue: site.rating.ratingValue,
            worstRating: 1,
          } as AggregateRating)
        : undefined,
    applicationCategory: site.category,
    author: {
      "@type": "Person",
      name: site.author.name,
    } as Person,
    datePublished: site.datePublished,
    description,
    url: site.links.url,
    name: baseTitle,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "AUD",
    } as Offer,
    operatingSystem: site.operatingSystem,
  };

  return {
    __html: JSON.stringify(structuredData),
  };
}
