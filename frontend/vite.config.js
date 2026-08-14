import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function removeCrossorigin() {
  return {
    name: "remove-crossorigin",
    transformIndexHtml(html) {
      return html.replace(/ crossorigin/g, "");
    },
  };
}

export default defineConfig({
  plugins: [react(), removeCrossorigin()],
  base: "./",
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    modulePreload: false,
  },
});

