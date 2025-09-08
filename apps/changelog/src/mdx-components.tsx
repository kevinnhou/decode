import { cn } from "@repo/ui/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/shadcn/accordion";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
    img: ({ className, ...props }: React.ComponentProps<"img">) => (
      // biome-ignore lint/nursery/useImageSize: pass
      // biome-ignore lint/performance/noImgElement: pass
      <img
        className={cn("rounded-md border", className)}
        {...props}
        alt={props.alt || ""}
      />
    ),
    Video: ({ className, ...props }: React.ComponentProps<"video">) => (
      <video
        className={cn("rounded-md border", className)}
        controls
        loop
        {...props}
      />
    ),
    ...components,
  };
}

export const useMDXComponents = getMDXComponents;
