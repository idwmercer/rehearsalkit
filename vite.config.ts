import path from "node:path";

import { fmBridge } from "@proofkit/webviewer/vite-plugins";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Single-file build of the RehearsalKitDev console, for direct upload into
// FileMaker Pro's ProofKitApps HTML field (AppName "RehearsalKitDev").
// Mirrors ~/Projects/auditionkit's vite.config.dev.ts.
const currentDirectory = import.meta.dirname;

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    // Pin the dev bridge to this app's file — otherwise it auto-selects the
    // first entry from fm-mcp's /connectedFiles, which is whichever file was
    // connected first (e.g. AuditionKit_MASTER) and has the wrong schema.
    fmBridge({ fileName: "RehearsalKit_MASTER" }),
    react(),
    tailwindcss(),
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(currentDirectory, "./src"),
    },
  },
  server: {
    port: 5178,
  },
});
