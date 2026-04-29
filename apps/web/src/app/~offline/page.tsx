import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <WifiOff aria-hidden className="size-12 text-muted-foreground" />
      <h1 className="font-semibold text-2xl tracking-tight">
        You&apos;re offline
      </h1>
      <p className="max-w-md text-muted-foreground text-sm leading-relaxed">
        This page isn&apos;t available without a network connection. If you
        opened Decode while online, scout pages you visited may still work;
        reconnect to load new pages.
      </p>
    </div>
  );
}
