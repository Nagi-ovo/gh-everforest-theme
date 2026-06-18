/**
 * Generates demo/preview.svg — a dark | light hero for the README that mocks a
 * real GitHub repo page (global bar, tabs, code + diff) in the Everforest theme.
 * Pure SVG built from the palette: renders inline on GitHub, no screenshots, no
 * real account data, no GitHub logo. Run: bun run scripts/make-preview.ts
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { resolve, type Mode, type ResolvedPalette } from "../src/palette";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const MONO = `font-family="ui-monospace, SFMono-Regular, Menlo, monospace"`;
const SANS = `font-family="-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"`;

const PW = 640, H = 560;

type Role = "cm" | "kw" | "str" | "fn" | "num" | "ty" | "vr" | "fg";
const roles = (p: ResolvedPalette): Record<Role, string> => ({
  cm: p.grey1, kw: p.red, str: p.aqua, fn: p.green, num: p.purple, ty: p.yellow, vr: p.orange, fg: p.fg,
});

const CODE: { t: string; c: Role }[][] = [
  [{ t: "// Everforest — gentle on the eyes", c: "cm" }],
  [{ t: "export function ", c: "kw" }, { t: "resolve", c: "fn" }, { t: "(mode: ", c: "fg" }, { t: "Mode", c: "ty" }, { t: ", contrast) {", c: "fg" }],
  [{ t: "  const ", c: "kw" }, { t: "p", c: "vr" }, { t: " = everforest[mode]", c: "fg" }],
  [{ t: "  return", c: "kw" }, { t: " { ...p, ...p.bg[contrast] }", c: "fg" }],
  [{ t: "}", c: "fg" }],
];

function page(ox: number, mode: Mode): string {
  const p = resolve(mode, "medium");
  const c = roles(p);
  const onEmph = mode === "dark" ? "#232a2e" : "#fffbef";
  const s: string[] = [];
  const rect = (x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) =>
    s.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ""}/>`);
  const txt = (x: number, y: number, str: string, fill: string, opts = "") =>
    s.push(`<text x="${x}" y="${y}" ${opts.includes("mono") ? MONO : SANS} ${opts.replace("mono", "")} fill="${fill}">${esc(str)}</text>`);

  // page canvas
  rect(ox, 0, PW, H, 0, p.bg0);

  // global header bar
  rect(ox, 0, PW, 48, 0, p.bg_dim);
  s.push(`<line x1="${ox}" y1="48" x2="${ox + PW}" y2="48" stroke="${p.bg4}"/>`);
  for (let i = 0; i < 3; i++) s.push(`<rect x="${ox + 18}" y="${18 + i * 6}" width="18" height="2.5" rx="1" fill="${p.grey1}"/>`);
  s.push(`<circle cx="${ox + 52}" cy="24" r="9" fill="${p.bg4}"/>`);
  rect(ox + 72, 14, 250, 20, 6, p.bg0, p.bg4);
  txt(ox + 82, 28, "Type / to search", p.grey1, `font-size="11.5"`);
  s.push(`<circle cx="${ox + PW - 26}" cy="24" r="11" fill="${p.green}"/>`);

  // repo path + Public badge
  const LX = ox + 24;
  txt(LX, 84, "nagi-ovo", p.blue, `font-size="16"`);
  txt(LX + 70, 84, "/", p.grey1, `font-size="16"`);
  txt(LX + 80, 84, "everforest-demo", p.blue, `font-size="16" font-weight="650"`);
  rect(LX + 220, 71, 52, 18, 9, "none", p.bg4);
  txt(LX + 246, 84, "Public", p.grey1, `font-size="11" text-anchor="middle"`);

  // tabs + active underline
  const tabs: [string, number][] = [["Code", 0], ["Issues 12", 64], ["Pull requests 3", 150], ["Settings", 268]];
  const tabY = 116;
  for (const [label, dx] of tabs)
    txt(LX + dx, tabY, label, dx === 0 ? p.fg : p.grey1, `font-size="13.5"${dx === 0 ? ' font-weight="600"' : ""}`);
  s.push(`<line x1="${ox}" y1="${tabY + 12}" x2="${ox + PW}" y2="${tabY + 12}" stroke="${p.bg4}"/>`);
  s.push(`<rect x="${LX - 4}" y="${tabY + 9}" width="40" height="3" rx="1.5" fill="${p.orange}"/>`);

  // toolbar: branch pill + green Code button
  const barY = 150;
  rect(LX, barY, 78, 26, 6, p.bg1, p.bg4);
  txt(LX + 12, barY + 17, "⎇ main", p.fg, `font-size="12.5"`);
  rect(ox + PW - 24 - 88, barY, 88, 26, 6, p.green);
  txt(ox + PW - 24 - 44, barY + 17, "◇ Code ▾", onEmph, `font-size="12.5" font-weight="600" text-anchor="middle"`);

  // code card
  const cardX = LX, cardW = PW - 48;
  let cy = 196;
  rect(cardX, cy, cardW, 150, 8, p.bg0, p.bg4);
  rect(cardX, cy, cardW, 30, 8, p.bg_dim);
  rect(cardX, cy + 16, cardW, 14, 0, p.bg_dim);
  s.push(`<line x1="${cardX}" y1="${cy + 30}" x2="${cardX + cardW}" y2="${cy + 30}" stroke="${p.bg4}"/>`);
  txt(cardX + 14, cy + 20, "theme.ts", p.fg, `font-size="12.5"`);
  txt(cardX + cardW - 14, cy + 20, "128 lines · 4.2 KB", p.grey1, `font-size="11.5" text-anchor="end"`);
  let ty = cy + 52;
  for (const segs of CODE) {
    let tx = cardX + 18;
    const tspans = segs.map((sg) => `<tspan fill="${c[sg.c]}">${esc(sg.t)}</tspan>`).join("");
    if (segs.length) s.push(`<text x="${tx}" y="${ty}" ${MONO} font-size="12.5" xml:space="preserve">${tspans}</text>`);
    ty += 21;
  }

  // diff card
  cy = 366;
  rect(cardX, cy, cardW, 150, 8, p.bg0, p.bg4);
  rect(cardX, cy, cardW, 30, 8, p.bg_dim);
  rect(cardX, cy + 16, cardW, 14, 0, p.bg_dim);
  s.push(`<line x1="${cardX}" y1="${cy + 30}" x2="${cardX + cardW}" y2="${cy + 30}" stroke="${p.bg4}"/>`);
  txt(cardX + 14, cy + 20, "mapping.ts", p.fg, `font-size="12.5"`);
  txt(cardX + cardW - 14, cy + 20, "+3 −1", p.grey1, `font-size="11.5" text-anchor="end"`);
  const dl = [
    { sign: " ", t: '   t["--bgColor-default"] = bg0', bg: "" },
    { sign: "−", t: '   t["--fgColor-accent"]  = "#0969da"', bg: p.bg_red },
    { sign: "+", t: '   t["--fgColor-accent"]  = blue', bg: p.bg_green },
    { sign: "+", t: '   t["--fgColor-link"]    = blue', bg: p.bg_green },
    { sign: " ", t: "   return t", bg: "" },
  ];
  let dy = cy + 50;
  for (const r of dl) {
    if (r.bg) rect(cardX + 1, dy - 14, cardW - 2, 20, 0, r.bg);
    txt(cardX + 14, dy, r.sign, p.grey1, `font-size="12.5" mono`);
    s.push(`<text x="${cardX + 30}" y="${dy}" ${MONO} font-size="12.5" fill="${p.fg}" xml:space="preserve">${esc(r.t)}</text>`);
    dy += 21;
  }

  // corner label
  txt(ox + PW - 16, H - 16, mode === "dark" ? "Dark" : "Light", p.grey1, `font-size="12" text-anchor="end" font-weight="600"`);
  return s.join("\n  ");
}

const dim = resolve("dark", "medium").bg_dim;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PW * 2}" height="${H}" viewBox="0 0 ${PW * 2} ${H}">
  ${page(0, "dark")}
  ${page(PW, "light")}
  <line x1="${PW}" y1="0" x2="${PW}" y2="${H}" stroke="${dim}" stroke-width="2"/>
</svg>
`;

await writeFile(path.join(import.meta.dir, "..", "demo", "preview.svg"), svg, "utf8");
console.log("✓ wrote demo/preview.svg (GitHub-page mock, dark | light)");
