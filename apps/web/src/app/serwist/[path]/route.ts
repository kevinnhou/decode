import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout ??
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [
      { url: "/~offline", revision },
      { url: "/scout", revision },
      { url: "/scout/frc/match", revision },
      { url: "/scout/ftc/match", revision },
      { url: "/scout/frc/pit", revision },
      { url: "/scout/ftc/pit", revision },
    ],
    swSrc: "src/app/sw.ts",
    // If set to `false`, Serwist will attempt to use `esbuild-wasm`.
    useNativeEsbuild: true,
  });
