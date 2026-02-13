const { build } = require('esbuild')

const baseConfig = {
  bundle: true,
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV !== 'production',
}

const extensionConfig = {
  ...baseConfig,
  platform: 'node',
  mainFields: ['module', 'main'],
  format: 'cjs',
  entryPoints: ['./src/extension.ts'],
  outfile: './out/extension.js',
  external: ['vscode'],
}

const webviewConfig = {
  ...baseConfig,
  target: 'es2020',
  format: 'esm',
  entryPoints: ['./src/webview/index.tsx'],
  outfile: './out/webview/index.js',
};

(async () => {
  try {
    await build(extensionConfig)
    await build(webviewConfig)
    console.log('build complete')
  }
  catch (err) {
    process.stderr.write(err.stderr)
    process.exit(1)
  }
})()
