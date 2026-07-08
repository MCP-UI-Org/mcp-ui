/**
 * Emits the bundled generic A2UI renderer as importable modules.
 *
 * Default mode (runs as part of `pnpm build` after vite):
 *   Reads the checked-in single-file HTML artifact at
 *   src/a2ui/a2ui-renderer.html and writes dist/a2ui-renderer.{mjs,js,d.ts},
 *   each exporting `A2UI_RENDERER_HTML: string`. These back the
 *   `@mcp-ui/client/a2ui-renderer` subpath export.
 *
 * --regenerate mode (via `pnpm run regen:a2ui-renderer`):
 *   First copies the freshly built artifact from a2ui-renderer/dist/index.html
 *   into src/a2ui/a2ui-renderer.html, then emits as above. Requires the
 *   a2ui-renderer workspace package to have been built.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientDir = dirname(dirname(fileURLToPath(import.meta.url)));
const checkedInHtml = join(clientDir, 'src', 'a2ui', 'a2ui-renderer.html');
const distDir = join(clientDir, 'dist');

if (process.argv.includes('--regenerate')) {
  const builtHtml = join(clientDir, 'a2ui-renderer', 'dist', 'index.html');
  if (!existsSync(builtHtml)) {
    console.error(
      `Built renderer not found at ${builtHtml}.\n` +
        'Run `pnpm --filter @mcp-ui/client-a2ui-renderer build` first ' +
        '(or use `pnpm run regen:a2ui-renderer`, which does both).',
    );
    process.exit(1);
  }
  mkdirSync(dirname(checkedInHtml), { recursive: true });
  copyFileSync(builtHtml, checkedInHtml);
  console.log(`Copied ${builtHtml} -> ${checkedInHtml}`);
}

if (!existsSync(checkedInHtml)) {
  console.error(`Checked-in renderer HTML not found at ${checkedInHtml}.`);
  process.exit(1);
}

const html = readFileSync(checkedInHtml, 'utf8');
const encoded = JSON.stringify(html);

mkdirSync(distDir, { recursive: true });
writeFileSync(join(distDir, 'a2ui-renderer.mjs'), `export const A2UI_RENDERER_HTML = ${encoded};\n`);
writeFileSync(
  join(distDir, 'a2ui-renderer.js'),
  `'use strict';\nObject.defineProperty(exports, '__esModule', { value: true });\nexports.A2UI_RENDERER_HTML = ${encoded};\n`,
);
writeFileSync(
  join(distDir, 'a2ui-renderer.d.ts'),
  '/** Self-contained HTML of the bundled generic A2UI renderer. */\nexport declare const A2UI_RENDERER_HTML: string;\n',
);
console.log(`Emitted a2ui-renderer.{mjs,js,d.ts} to ${distDir} (${(html.length / 1024).toFixed(0)} KB HTML)`);
