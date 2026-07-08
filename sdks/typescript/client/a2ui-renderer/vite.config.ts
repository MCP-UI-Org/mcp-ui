import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  resolve: {
    // A single instance of the A2UI data-model/signals stack is required:
    // duplicated copies (e.g. hoisted vs nested in node_modules) break
    // reactivity between the MessageProcessor and the rendered components.
    dedupe: [
      '@a2ui/web_core',
      '@a2ui/markdown-it',
      '@preact/signals-core',
      'lit',
      '@lit/context',
      'zod',
    ],
  },
  build: {
    outDir: 'dist',
  },
});
