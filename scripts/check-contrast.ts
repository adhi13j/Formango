/**
 * Verifies the theme contrast pairs listed in docs/theme-preview.html against src/styles/theme.css.
 * Run with `npm run check:contrast`. Exits 1 and prints a table when a pair is below its minimum.
 */
import { readFileSync } from 'node:fs';

const THEME_PATH = 'src/styles/theme.css';
const DOCS_THEME_PATH = 'docs/theme.css';
const PREVIEW_PATH = 'docs/theme-preview.html';

interface Pair {
  label: string;
  foreground: string;
  background: string;
  minimum: number;
}

function parseTokens(css: string): Map<string, string> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const root = /:root\s*{([\s\S]*?)\n}/.exec(withoutComments);
  if (!root?.[1]) throw new Error(`No :root block found in ${THEME_PATH}`);
  const tokens = new Map<string, string>();
  for (const match of root[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value) tokens.set(name, value.trim());
  }
  return tokens;
}

function resolveColor(value: string, tokens: Map<string, string>, depth = 0): string {
  if (depth > 10) throw new Error(`Token cycle while resolving ${value}`);
  const ref = /^(?:var\()?--([\w-]+)\)?$/.exec(value);
  if (!ref?.[1]) return value;
  const next = tokens.get(ref[1]);
  if (next === undefined) throw new Error(`Unknown token --${ref[1]}`);
  return resolveColor(next, tokens, depth + 1);
}

function parsePairs(html: string): Pair[] {
  const block = /const pairs = \[([\s\S]*?)\n\];/.exec(html);
  if (!block?.[1]) throw new Error(`No pairs array found in ${PREVIEW_PATH}`);
  const pairs: Pair[] = [];
  for (const line of block[1].split('\n')) {
    const match = /\[\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*([\d.]+)\s*\]/.exec(line);
    if (match?.[1] && match[2] && match[3] && match[4]) {
      pairs.push({
        label: match[1],
        foreground: match[2],
        background: match[3],
        minimum: Number(match[4]),
      });
    }
  }
  if (pairs.length === 0) throw new Error('Parsed zero contrast pairs');
  return pairs;
}

function luminance(hex: string): number {
  const channels = /^#([0-9a-f]{6})$/i.exec(hex)?.[1]?.match(/.{2}/g);
  if (!channels) throw new Error(`Not a #RRGGBB color: ${hex}`);
  const [r = 0, g = 0, b = 0] = channels
    .map((part) => parseInt(part, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [lighter = 0, darker = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

function main(): number {
  const themeCss = readFileSync(THEME_PATH, 'utf8');
  if (themeCss !== readFileSync(DOCS_THEME_PATH, 'utf8')) {
    console.error(
      `${THEME_PATH} and ${DOCS_THEME_PATH} differ. Copy docs/theme.css to src/styles.`,
    );
    return 1;
  }

  const tokens = parseTokens(themeCss);
  const pairs = parsePairs(readFileSync(PREVIEW_PATH, 'utf8'));

  const rows = pairs.map((pair) => {
    const foreground = resolveColor(pair.foreground, tokens);
    const background = resolveColor(pair.background, tokens);
    const ratio = contrastRatio(foreground, background);
    return { pair, foreground, background, ratio, ok: ratio >= pair.minimum };
  });

  const failures = rows.filter((row) => !row.ok);
  if (failures.length === 0) {
    process.stdout.write(`Contrast OK: ${rows.length} pairs pass.\n`);
    return 0;
  }

  console.error('Contrast check failed:\n');
  console.error('Pair'.padEnd(46) + 'Colors'.padEnd(24) + 'Ratio'.padEnd(9) + 'Needs');
  for (const row of failures) {
    console.error(
      row.pair.label.padEnd(46) +
        `${row.foreground} on ${row.background}`.padEnd(24) +
        `${row.ratio.toFixed(2)}`.padEnd(9) +
        `${row.pair.minimum}`,
    );
  }
  return 1;
}

process.exit(main());
