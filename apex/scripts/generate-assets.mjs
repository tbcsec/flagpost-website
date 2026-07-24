/**
 * Generates the raster brand assets into public/:
 *
 *   og.png                1200×630 social card (satori → resvg, so the
 *                         wordmark renders in real Space Grotesk as paths —
 *                         no system-font dependence)
 *   icon-512.png          web manifest
 *   icon-192.png          web manifest
 *   apple-touch-icon.png  180×180
 *   favicon.ico           48/32/16 bundle
 *
 * Outputs are committed; re-run `npm run assets` only when the brand changes.
 * Colour values follow FLAGPOST-LOGO-SPEC.md §2 (dark-ground set), and the
 * favicon artwork is the icon-container variant the app itself ships.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";

const root = fileURLToPath(new URL("..", import.meta.url));
const pub = (f) => `${root}public/${f}`;

// Brand values (LOGO-SPEC §2.1, dark grounds).
const INK_TILE = "#111b28"; // Harbor background
const SHEET = "#e4e7e2";
const GREEN_DARK = "#2cb57c";
const MUTED = "#97a7ba"; // Harbor muted-foreground

// Reverse mark with ground shadow (LOGO-SPEC §9 geometry), as a data URI for satori.
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="22" cy="55" rx="12" ry="3.2" fill="${SHEET}" opacity="0.16"/><rect x="19" y="6" width="6" height="49" rx="3" fill="${SHEET}"/><path d="M25 9 H46 L40.5 16 L46 23 H25 Z" fill="${GREEN_DARK}"/></svg>`;
const markUri = `data:image/svg+xml,${encodeURIComponent(markSvg)}`;

async function generateOg() {
  const [bold, medium] = await Promise.all([
    readFile(
      `${root}node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff`,
    ),
    readFile(
      `${root}node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff`,
    ),
  ]);

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: INK_TILE,
          backgroundImage:
            "radial-gradient(900px 560px at 78% -12%, rgba(31, 158, 107, 0.22), rgba(17, 27, 40, 0) 65%)",
          fontFamily: "Space Grotesk",
          position: "relative",
        },
        children: [
          {
            type: "img",
            props: {
              src: markUri,
              width: 190,
              height: 190,
              style: { marginBottom: 8 },
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: 108,
                fontWeight: 700,
                letterSpacing: "-0.035em",
                lineHeight: 1,
              },
              children: [
                { type: "span", props: { style: { color: SHEET }, children: "Flag" } },
                { type: "span", props: { style: { color: GREEN_DARK }, children: "post" } },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                marginTop: 26,
                fontSize: 32,
                fontWeight: 500,
                color: MUTED,
              },
              children: "The modern, open-source CTF platform",
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: 34,
                left: 48,
                right: 48,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 24,
                fontWeight: 500,
                color: MUTED,
              },
              children: [
                { type: "span", props: { children: "flagpost.io" } },
                {
                  type: "span",
                  props: { children: "open source · self-hosted · real-time" },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Space Grotesk", data: bold, weight: 700, style: "normal" },
        { name: "Space Grotesk", data: medium, weight: 500, style: "normal" },
      ],
    },
  );

  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  }).render();
  await writeFile(pub("og.png"), png.asPng());
  console.log("✓ og.png");
}

async function generateIcons() {
  const iconSvg = await readFile(pub("favicon.svg"), "utf8");

  const renderAt = (size) =>
    new Resvg(iconSvg, { fitTo: { mode: "width", value: size } })
      .render()
      .asPng();

  await writeFile(pub("icon-512.png"), renderAt(512));
  await writeFile(pub("icon-192.png"), renderAt(192));
  await writeFile(pub("apple-touch-icon.png"), renderAt(180));
  console.log("✓ icon-512.png, icon-192.png, apple-touch-icon.png");

  const ico = await pngToIco([renderAt(48), renderAt(32), renderAt(16)]);
  await writeFile(pub("favicon.ico"), ico);
  console.log("✓ favicon.ico");
}

await generateOg();
await generateIcons();
