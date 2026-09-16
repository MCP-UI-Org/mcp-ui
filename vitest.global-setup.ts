import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The '@mcp-ui/client/a2ui-renderer' subpath export resolves to files emitted
 * into the client's dist at build time. Emit them before tests run so
 * vite's import analysis can resolve the specifier on fresh checkouts
 * (CI runs tests before building).
 */
export default function emitA2uiRendererModule() {
  const rootDir = dirname(fileURLToPath(import.meta.url));
  execFileSync(
    process.execPath,
    [join(rootDir, 'sdks', 'typescript', 'client', 'scripts', 'emit-a2ui-renderer.mjs')],
    { stdio: 'inherit' },
  );
}
