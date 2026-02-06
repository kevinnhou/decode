// @ts-nocheck

import { createRelativeLink } from "fumadocs-ui/mdx";
import { DocsBody, DocsPage } from "fumadocs-ui/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/jsonld";
import { LLMCopyButton, ViewOptions } from "@/components/page-actions";
import { buildPageSEO } from "@/lib/seo";
import { source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

export default async function Page(props: PageProps<"/[[...slug]]">) {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) {
    notFound();
  }

  const MDXContent = page.data.body;

  const { jsonLd } = buildPageSEO({
    title: page.data.title ?? "",
    description: page.data.description ?? "",
    pathname: page.url,
    includeBreadcrumbs: true,
  });

  return (
    <DocsPage full={page.data.full} toc={page.data.toc}>
      <h1 className="font-semibold text-[1.75em]">{page.data.title}</h1>
      <p className="text-fd-muted-foreground text-lg">
        {page.data.description}
      </p>
      <div className="flex flex-row items-center gap-2 border-b pt-2 pb-6">
        <LLMCopyButton markdownUrl={`${page.url}.mdx`} />
        <ViewOptions
          githubUrl={`https://github.com/kevinnhou/decode/blob/dev/apps/docs/content/docs/${page.path}`}
          markdownUrl={`${page.url}.mdx`}
        />
      </div>
      <DocsBody>
        <MDXContent
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
      {jsonLd.map((data) => (
        <JsonLd data={data} key={JSON.stringify(data)} />
      ))}
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(
  props: PageProps<"/[[...slug]]">
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    notFound();
  }

  return buildPageSEO({
    title: page.data.title ?? "",
    description: page.data.description ?? "",
    pathname: page.url,
    includeBreadcrumbs: true,
  }).metadata;
}
