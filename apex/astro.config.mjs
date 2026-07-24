// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// flagpost.io — static marketing site, deployed to Cloudflare Pages.
// `site` is required for canonical URLs, the sitemap, and absolute OG images.
export default defineConfig({
  site: "https://flagpost.io",
  output: "static",
  integrations: [
    sitemap({
      // The 404 page is served for unknown paths; it has no business in the sitemap.
      filter: (page) => !page.endsWith("/404/") && !page.endsWith("/404"),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Never inline scripts/assets into the HTML: the Cloudflare `_headers`
      // CSP is `script-src 'self'`, which forbids inline script.
      assetsInlineLimit: 0,
    },
  },
});
