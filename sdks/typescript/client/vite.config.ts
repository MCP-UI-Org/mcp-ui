import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: false,
      exclude: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  ],
  build: {
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'McpUiClient',
      formats: ['es', 'umd'],
      fileName: (format) =>
        `index.${format === 'es' ? 'mjs' : format === 'umd' ? 'js' : format + '.js'}`,
    },
    rollupOptions: {
      external: [
        'react',
        'react/jsx-runtime',
        '@mcp-ui/shared',
        /@modelcontextprotocol\/sdk(\/.*)?/,
      ],
      output: {
        globals: {
          react: 'React',
          'react/jsx-runtime': 'jsxRuntime',
          '@mcp-ui/shared': 'McpUiShared',
          '@modelcontextprotocol/sdk': 'ModelContextProtocolSDK',
        },
      },
    },
    sourcemap: false,
  },
  // Vitest specific config can go here if not using a separate vitest.config.ts for the package
  // test: { ... }
});
