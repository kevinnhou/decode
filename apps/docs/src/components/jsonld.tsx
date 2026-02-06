import type { Thing, WithContext } from "schema-dts";

export function JsonLd(props: { data: WithContext<Thing> }) {
  return (
    <script suppressHydrationWarning type="application/ld+json">
      {JSON.stringify(props.data)}
    </script>
  );
}
