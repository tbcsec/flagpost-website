// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// docs.flagpost.io — static Starlight site, deployed to Cloudflare (assets-only
// Worker, like the apex). `site` drives canonical URLs + the built-in sitemap.
export default defineConfig({
  site: "https://docs.flagpost.io",
  integrations: [
    starlight({
      title: "Flagpost",
      description:
        "Documentation for Flagpost, the modern open-source CTF platform: getting started, running competitions, deployment, and development.",
      logo: {
        light: "./src/assets/flagpost-mark-light.svg",
        dark: "./src/assets/flagpost-mark-dark.svg",
      },
      favicon: "/favicon.svg",
      customCss: [
        "@fontsource/space-grotesk/500.css",
        "@fontsource/space-grotesk/700.css",
        "./src/styles/flagpost.css",
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/tbcsec/flagpost",
        },
      ],
      lastUpdated: true,
      head: [
        {
          tag: "meta",
          attrs: { property: "og:image", content: "https://docs.flagpost.io/og.png" },
        },
      ],
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "What is Flagpost?", slug: "start/introduction" },
            { label: "Quick start", slug: "start/quick-start" },
            { label: "Core concepts", slug: "start/concepts" },
          ],
        },
        {
          label: "Running competitions",
          items: [
            { label: "Competitions", slug: "guides/competitions" },
            { label: "Challenges", slug: "guides/challenges" },
            { label: "Teams & participants", slug: "guides/teams" },
            { label: "Scoreboard", slug: "guides/scoreboard" },
            { label: "Automations", slug: "guides/automations" },
            { label: "Support & communication", slug: "guides/support" },
            { label: "Feedback & analytics", slug: "guides/feedback" },
            { label: "Import & export", slug: "guides/import-export" },
          ],
        },
        {
          label: "Administration",
          items: [
            { label: "First-run setup", slug: "admin/setup" },
            { label: "Users & roles", slug: "admin/users-roles" },
            { label: "Site settings & branding", slug: "admin/site-settings" },
            { label: "Backup & restore", slug: "admin/backup" },
            { label: "Audit log", slug: "admin/audit-log" },
          ],
        },
        {
          label: "Deployment",
          items: [
            { label: "Production deployment", slug: "deploy/production" },
            { label: "Configuration reference", slug: "deploy/configuration" },
            { label: "Running without Docker", slug: "deploy/without-docker" },
            { label: "Stack architecture", slug: "deploy/stack" },
            { label: "Security notes", slug: "deploy/security" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Event catalogue", slug: "reference/events" },
            { label: "Automation reference", slug: "reference/automations" },
            { label: "Permissions", slug: "reference/permissions" },
            { label: "ctfcli YAML format", slug: "reference/ctfcli" },
            { label: "REST API", slug: "reference/api" },
          ],
        },
        {
          label: "Development",
          items: [
            { label: "Local development", slug: "dev/local" },
            { label: "Architecture overview", slug: "dev/architecture" },
            { label: "Developing modules", slug: "dev/modules" },
            { label: "Working with events", slug: "dev/events" },
            { label: "Testing", slug: "dev/testing" },
            { label: "Decision records (ADRs)", slug: "dev/adrs" },
          ],
        },
      ],
    }),
  ],
});
