/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const FLUSH_SUBMISSIONS_TAG = "flush-submissions";

self.addEventListener("sync", (event: SyncEvent) => {
  if (event.tag !== FLUSH_SUBMISSIONS_TAG) {
    return;
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length === 0) {
        // no open windows to handle the flush
        return Promise.reject(
          new Error("No window clients available to flush queue")
        );
      }
      return Promise.all(
        clients.map((client) =>
          client.postMessage({ type: "FLUSH_QUEUE" } satisfies {
            type: string;
          })
        )
      );
    })
  );
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
