// Generates a flat "coverage" SVG badge from Vitest's coverage summary.
// Reads coverage/coverage-summary.json (produced by the json-summary reporter)
// and writes badges/coverage.svg. Run after `npm run test:coverage`.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const summaryPath = path.join(root, "coverage", "coverage-summary.json");

let pct;
try {
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  pct = Math.round(summary.total.lines.pct);
} catch {
  console.error(
    `Could not read ${summaryPath}. Run "npm run test:coverage" first.`,
  );
  process.exit(1);
}

function colorFor(value) {
  if (value >= 90) return "#4c1"; // brightgreen
  if (value >= 80) return "#97ca00"; // green
  if (value >= 70) return "#a4a61d"; // yellowgreen
  if (value >= 60) return "#dfb317"; // yellow
  if (value >= 50) return "#fe7d37"; // orange
  return "#e05d44"; // red
}

const label = "coverage";
const message = `${pct}%`;
const color = colorFor(pct);

// Approximate text widths for the default badge font (Verdana 11px).
const labelW = 62;
const messageW = 8 + message.length * 7;
const totalW = labelW + messageW;
const labelX = (labelW / 2) * 10;
const messageX = (labelW + messageW / 2) * 10;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="20" role="img" aria-label="${label}: ${message}">
  <title>${label}: ${message}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalW}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#555"/>
    <rect x="${labelW}" width="${messageW}" height="20" fill="${color}"/>
    <rect width="${totalW}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="110" text-rendering="geometricPrecision">
    <text aria-hidden="true" x="${labelX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelW - 10) * 10}">${label}</text>
    <text x="${labelX}" y="140" transform="scale(.1)" fill="#fff" textLength="${(labelW - 10) * 10}">${label}</text>
    <text aria-hidden="true" x="${messageX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(messageW - 10) * 10}">${message}</text>
    <text x="${messageX}" y="140" transform="scale(.1)" fill="#fff" textLength="${(messageW - 10) * 10}">${message}</text>
  </g>
</svg>
`;

const outDir = path.join(root, "badges");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "coverage.svg"), svg);
console.log(`Wrote badges/coverage.svg (${message} lines covered).`);
