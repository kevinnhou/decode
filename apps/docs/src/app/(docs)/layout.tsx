import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { Metadata } from "next";
import { JsonLd } from "@/components/jsonld";
import { baseOptions } from "@/lib/layout.shared";
import { buildWebsiteJsonLd, siteMetadata } from "@/lib/seo";
import { source } from "@/lib/source";

import "katex/dist/katex.css";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <DocsLayout tree={source.pageTree} {...baseOptions()}>
      {children}
      <JsonLd data={buildWebsiteJsonLd()} />
    </DocsLayout>
  );
}

export const metadata: Metadata = siteMetadata;
