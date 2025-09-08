import { formatDate } from "@repo/ui/lib/utils";
import { loader } from "fumadocs-core/source";
import { createMDXSource } from "fumadocs-mdx";
import { useMemo } from "react";
import { docs, meta } from "@/.source";

const source = loader({
  baseUrl: "/docs",
  source: createMDXSource(docs, meta),
});

interface ChangelogData {
  title: string;
  date: string;
  version?: string;
  tags?: string[];
  body: React.ComponentType;
}

interface ChangelogPage {
  url: string;
  data: ChangelogData;
}

export default function Home() {
  const sortedChangelogs = useMemo(() => {
    const allPages = source.getPages() as ChangelogPage[];
    return allPages.sort((a, b) => {
      const dateA = new Date(a.data.date).getTime();
      const dateB = new Date(b.data.date).getTime();
      return dateB - dateA;
    });
  }, []);

  return (
    <div className="relative min-h-svh">
      <div className="mx-auto max-w-5xl px-6 pt-10 lg:px-10">
        <div className="relative">
          {sortedChangelogs.map((changelog) => {
            const MDX = changelog.data.body;
            const formattedDate = formatDate(changelog.data.date);

            return (
              <div className="relative" key={changelog.url}>
                <div className="flex flex-col gap-y-6 md:flex-row">
                  <div className="flex-shrink-0 md:w-48">
                    <div className="pb-10 md:sticky md:top-8">
                      <time className="mb-3 block font-medium text-muted-foreground text-sm">
                        {formattedDate}
                      </time>

                      {changelog.data.version && (
                        <div className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border font-bold text-foreground text-sm">
                          {changelog.data.version}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative flex-1 pb-10 md:pl-8">
                    <div className="absolute top-2 left-0 hidden h-full w-px bg-border md:block">
                      <div className="-translate-x-1/2 absolute z-10 hidden size-3 rounded-full bg-primary md:block" />
                    </div>

                    <div className="space-y-6">
                      <div className="relative z-10 flex flex-col gap-2">
                        <h2 className="text-balance font-semibold text-2xl tracking-tight">
                          {changelog.data.title}
                        </h2>

                        {changelog.data.tags &&
                          changelog.data.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {changelog.data.tags.map((tag: string) => (
                                <span
                                  className="flex h-6 w-fit items-center justify-center rounded-full border bg-muted px-2 font-medium text-muted-foreground text-xs"
                                  key={tag}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                      <div className="prose dark:prose-invert max-w-none prose-headings:scroll-mt-8 prose-headings:text-balance prose-p:text-balance prose-headings:font-semibold prose-headings:tracking-tight prose-p:tracking-tight prose-a:no-underline">
                        <MDX />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
