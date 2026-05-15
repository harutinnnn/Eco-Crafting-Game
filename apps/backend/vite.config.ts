import { defineConfig } from "vite";
import { VitePluginNode } from "vite-plugin-node";

export default defineConfig({
  build: {
    outDir: "dist",
    ssr: true,
    rollupOptions: {
      input: "src/server.ts",
      output: {
        entryFileNames: "server.js"
      }
    }
  },
  server: {
    port: 4000
  },
  plugins: [
    ...VitePluginNode({
      adapter: "express",
      appPath: "./src/server.ts",
      exportName: "app",
      tsCompiler: "esbuild"
    })
  ]
});
