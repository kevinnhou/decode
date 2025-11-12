/** biome-ignore-all lint/suspicious/noExplicitAny: PASS */
import type { Metadata } from "next";
import { site } from "@/config/site";

export interface MetadataProps {
  title?: string;
  description?: string;
  keywords?: string[];
  openGraph?: {
    title?: string;
    description?: string;
    url?: string;
  };
}

export interface AsyncMetadataOptions {
  fetchFn?: () => Promise<Partial<MetadataProps>>;
  fallback?: MetadataProps;
  params?: Record<string, any>;
  searchParams?: Record<string, any>;
}

/**
 * Computes SEO primitives from `MetadataProps`.
 *
 * @param props Partial metadata overrides for the current page.
 * @returns Normalised values used to construct `Metadata`.
 */
function processSeoProps(props: MetadataProps = {}) {
  const baseUrl: string = site.links.url;

  const baseTitle = props.title ? `${site.name} | ${props.title}` : site.name;

  const description = props.description || site.description;
  const pagePath = props.openGraph?.url || "/";
  const canonicalUrl = `${baseUrl}${pagePath}`;
  const openGraphImageUrl = `${baseUrl}/opengraph-image.png`;
  return {
    baseTitle,
    baseUrl,
    description,
    keywords: [...site.keywords, ...(props.keywords || [])].join(", "),
    openGraphDescription: props.openGraph?.description || description,
    openGraphUrl: canonicalUrl,
    openGraphImageUrl,
    canonicalUrl,
  };
}

/**
 * Generates Metadata for a page using site defaults and page specific overrides.
 *
 * @param props Partial metadata overrides for the current page.
 * @returns Metadata object to export from a route or layout.
 */
export function generateMetadata(props: MetadataProps = {}): Metadata {
  const {
    baseTitle,
    baseUrl,
    description,
    keywords,
    openGraphDescription,
    openGraphUrl,
    openGraphImageUrl,
    canonicalUrl,
  } = processSeoProps(props);

  return {
    applicationName: site.name,
    description,
    keywords,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      description: openGraphDescription,
      locale: "en_AU",
      siteName: site.name,
      title: baseTitle,
      type: "website",
      url: openGraphUrl,
      images: [
        {
          url: openGraphImageUrl,
        },
      ],
    },
    title: baseTitle,
    twitter: {
      card: "summary_large_image",
      creator: site.author.tag,
      description: openGraphDescription,
      title: baseTitle,
      images: [openGraphImageUrl],
    },
  };
}

// biome-ignore lint/performance/noBarrelFile: PASS
export {
  createValidatedStructuredData,
  generateStructuredData,
  isValidSchemaType,
  validateStructuredData,
} from "./structured-data";
