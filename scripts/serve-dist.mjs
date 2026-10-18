// Serves dist/ like Cloudflare Pages would: the rules in public/_headers and the SPA fallback.
// Used to test the Content Security Policy before deploying. Run: node scripts/serve-dist.mjs [port]
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = new URL('../dist', import.meta.url).pathname;
const port = Number(process.argv[2] ?? 4190);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.txt': 'text/plain' };

/** Parses the _headers file into [pattern, headers] blocks. */
function parseHeaders(text) {
  const blocks = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    if (!line.startsWith(' ')) blocks.push([line.trim(), {}]);
    else {
      const i = line.indexOf(':');
      blocks.at(-1)[1][line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return blocks;
}
const rules = parseHeaders(readFileSync(join(root, '_headers'), 'utf8'));
const matches = (pattern, path) => (pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern);

createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = join(root, normalize(path));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
  const headers = { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' };
  for (const [pattern, values] of rules) if (matches(pattern, path)) Object.assign(headers, values);
  res.writeHead(200, headers);
  res.end(readFileSync(file));
}).listen(port, () => console.log(`serving dist on http://localhost:${port}`));
