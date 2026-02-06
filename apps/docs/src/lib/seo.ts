import type { Metadata } from "next";
import type {
  BreadcrumbList,
  ListItem,
  Thing,
  WebPage,
  WebSite,
  WithContext,
} from "schema-dts";
import { source } from "@/lib/source";

export type SiteConfig = {
  name: string;
  description: string;
  baseUrl: string;
  locale: string;
};

const trailingSlashRegex = /\/?$/;

export function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && envUrl.length > 0) {
    return envUrl.replace(trailingSlashRegex, "");
  }
  return "http://localhost:3000";
}

export const siteConfig: SiteConfig = {
  name: "Next Mono",
  description: "",
  baseUrl: getBaseUrl(),
  locale: "en-AU",
};

export const siteMetadata: Metadata = {
  metadataBase: new URL(siteConfig.baseUrl),
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.name,
    template: `%s / ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.baseUrl,
    locale: siteConfig.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
  icons: {
    icon: [{ url: "/favicon.ico" }],
  },
};

export function buildCanonicalUrl(pathname: string): string {
  const base = siteConfig.baseUrl;
  if (pathname === "/") {
    return base;
  }
  return `${base}${pathname.startsWith("/") ? "" : "/"}${pathname}`;
}

export function buildPageMetadata(
  title: string,
  description: string,
  pathname: string
): Metadata {
  const canonical = buildCanonicalUrl(pathname);
  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  } satisfies Metadata;
}

export type AnyWithContext<T extends Thing> = WithContext<T>;

export function buildWebsiteJsonLd(): AnyWithContext<WebSite> {
  const url = siteConfig.baseUrl;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    description: siteConfig.description,
    url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${url}/api/search?q={search_term_string}` as const,
      "query-input": "required name=search_term_string",
    } as unknown as WebSite["potentialAction"],
  } as const;
}

export function buildWebPageJsonLd(args: {
  title: string;
  description: string;
  url: string;
}): AnyWithContext<WebPage> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: args.title,
    description: args.description,
    url: args.url,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.baseUrl,
    },
  } as const;
}

export function buildBreadcrumbListJsonLd(
  items: Array<{
    name: string;
    item: string;
  }>
): AnyWithContext<BreadcrumbList> {
  const element: ListItem[] = items.map((entry, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: entry.name,
    item: entry.item,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: element,
  } as const;
}

export function buildPageSEO(args: {
  title: string;
  description: string;
  pathname: string;
  includeBreadcrumbs?: boolean;
}): {
  metadata: Metadata;
  jsonLd: AnyWithContext<Thing>[];
} {
  const metadata = buildPageMetadata(
    args.title,
    args.description,
    args.pathname
  );
  const jsonLd: AnyWithContext<Thing>[] = [
    buildWebPageJsonLd({
      title: args.title,
      description: args.description,
      url: buildCanonicalUrl(args.pathname),
    }),
  ];

  if (args.includeBreadcrumbs) {
    const segments = args.pathname.split("/").filter((s) => s.length > 0);
    const items: Array<{ name: string; item: string }> = [
      { name: "Home", item: buildCanonicalUrl("/") },
    ];

    let acc: string[] = [];
    for (const segment of segments) {
      acc = [...acc, segment];
      const page = source.getPage(acc);
      if (!page) {
        continue;
      }
      items.push({
        name: page.data.title ?? "",
        item: buildCanonicalUrl(`/${acc.join("/")}`),
      });
    }

    jsonLd.push(buildBreadcrumbListJsonLd(items));
  }

  return { metadata, jsonLd };
}
