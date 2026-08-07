/**
 * Post-build artefacts, generated into dist/ after `astro build`:
 *
 *   llms.txt       — llmstxt.org index: every page with its one-line
 *                    description, grouped by sidebar section.
 *   llms-full.txt  — the full docs corpus as plain markdown, for AI
 *                    assistants that want the whole thing in one fetch.
 *   _redirects     — explicit 301s from no-trailing-slash paths to their
 *                    canonical slashed URLs. Workers static assets would
 *                    otherwise emit a 307, which doesn't consolidate link
 *                    equity; Cloudflare evaluates _redirects before asset
 *                    serving, so these win.
 *
 * Section order mirrors the sidebar in astro.config.mjs — keep in sync.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SITE = "https://docs.flagpost.io";

const SECTIONS = [
  ["Start here", ["start/introduction", "start/quick-start", "start/concepts", "start/switching", "start/flagpost-vs-ctfd"]],
  ["Running competitions", ["guides/host-a-ctf", "guides/competitions", "guides/challenges", "guides/teams", "guides/scoreboard", "guides/automations", "guides/support", "guides/feedback", "guides/import-export"]],
  ["Administration", ["admin/setup", "admin/users-roles", "admin/sso", "admin/saml", "admin/ldap", "admin/site-settings", "admin/backup", "admin/audit-log"]],
  ["Deployment", ["deploy/production", "deploy/upgrades", "deploy/configuration", "deploy/without-docker", "deploy/stack", "deploy/security"]],
  ["Reference", ["reference/events", "reference/automations", "reference/permissions", "reference/ctfcli", "reference/api"]],
  ["Development", ["dev/local", "dev/architecture", "dev/modules", "dev/events", "dev/testing", "dev/adrs"]],
];

function parse(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { title: "", description: "", body: source };
  const front = match[1];
  const grab = (key) =>
    (front.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1] ?? "")
      .trim()
      .replace(/^['"]|['"]$/g, "");
  return { title: grab("title"), description: grab("description"), body: match[2].trim() };
}

const pages = new Map();
for (const [, slugs] of SECTIONS) {
  for (const slug of slugs) {
    const source = await readFile(join(root, "src/content/docs", `${slug}.md`), "utf8");
    pages.set(slug, parse(source));
  }
}

// --- llms.txt ---------------------------------------------------------------
let llms = `# Flagpost documentation

> Flagpost is a modern, open-source, self-hosted CTF (capture-the-flag)
> competition platform. These docs cover running competitions, deployment,
> administration, the full event/permission/automation reference, and
> extending the platform. Product site: https://flagpost.io/ — source:
> https://github.com/tbcsec/flagpost

`;
for (const [section, slugs] of SECTIONS) {
  llms += `## ${section}\n\n`;
  for (const slug of slugs) {
    const { title, description } = pages.get(slug);
    llms += `- [${title}](${SITE}/${slug}/): ${description}\n`;
  }
  llms += "\n";
}
await writeFile(join(root, "dist/llms.txt"), llms);

// --- llms-full.txt ----------------------------------------------------------
const full = [];
for (const [section, slugs] of SECTIONS) {
  for (const slug of slugs) {
    const { title, body } = pages.get(slug);
    full.push(`# ${title}\n\nSource: ${SITE}/${slug}/\nSection: ${section}\n\n${body}`);
  }
}
await writeFile(join(root, "dist/llms-full.txt"), full.join("\n\n---\n\n") + "\n");

// --- _redirects -------------------------------------------------------------
async function pagePaths(dir, prefix = "") {
  const out = [];
  for (const entry of await readdir(join(root, "dist", dir), { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out.push(...(await pagePaths(join(dir, entry.name), `${prefix}/${entry.name}`)));
    } else if (entry.name === "index.html" && prefix) {
      out.push(prefix);
    }
  }
  return out;
}
const paths = (await pagePaths("")).filter((p) => p !== "/404").sort();

// Friendly short-paths → canonical docs URLs. Neither the bare nor the
// trailing-slash form is a real page, so both redirect.
const SHORTCUTS = [["/sso", "/admin/sso/"]];
const shortcutRules = SHORTCUTS.flatMap(([from, to]) => [
  `${from} ${to} 301`,
  `${from}/ ${to} 301`,
]);

const redirects =
  "# Legacy security.txt location → the RFC 9116 canonical path.\n" +
  "/security.txt /.well-known/security.txt 301\n" +
  "# Friendly short-paths → canonical docs URLs.\n" +
  shortcutRules.join("\n") + "\n" +
  "# Canonical trailing-slash 301s (Workers assets would otherwise 307).\n" +
  paths.map((p) => `${p} ${p}/ 301`).join("\n") + "\n";
await writeFile(join(root, "dist/_redirects"), redirects);

console.log(`postbuild ✓ llms.txt (${pages.size} pages), llms-full.txt, _redirects (${paths.length + shortcutRules.length} rules)`);
