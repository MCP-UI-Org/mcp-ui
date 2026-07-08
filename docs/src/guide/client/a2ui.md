# Dynamic View Content & Fallback Renderers

Per the ext-apps ["Dynamic View Content" proposal](https://github.com/modelcontextprotocol/ext-apps/pull/699), tools can return typed *view-content* blocks in their results instead of (or alongside) declaring an HTML renderer: an embedded resource marked with `_meta.ui.content`, whose MIME type identifies the payload format (e.g. `application/a2ui+json`). A renderer view — generic for that format — displays the payloads.

`@mcp-ui/client` supports this generically in `<AppRenderer />`, and ships a bundled generic [A2UI](https://a2ui.org) renderer as the default — so mcp-ui hosts can render A2UI-returning MCP servers **even when the server ships no renderer resource at all**, including servers not built with mcp-ui.

## Renderer resolution order

`<AppRenderer />` resolves the HTML to render, in order:

1. The `html` prop (full override).
2. The `toolResourceUri` prop → read that resource.
3. The tool's predeclared `_meta.ui.resourceUri` (via the client) — a declared tool renderer always wins.
4. **Spec-native view-content targeting**: the first *marked* view-content block carrying `_meta.ui.content.rendererUri` → that `ui://` resource is read as the renderer (via the client, or `onReadResource` when no client is present).
5. **Fallback renderer registry**: the first view-content block whose MIME type has an entry in the active `fallbackContentRenderers` registry → that entry's HTML is injected.
6. Otherwise, the usual "tool has no UI resource" error.

## The `fallbackContentRenderers` prop

```ts
fallbackContentRenderers?: Record<string, string | (() => Promise<string>)>
```

A registry of fallback renderers keyed by view-content MIME type. Each entry is either the renderer's self-contained HTML **string**, or an **async loader** resolving to it (so the renderer can stay out of your main bundle via a dynamic import).

| Value | Behavior |
| --- | --- |
| `undefined` (default) | `DEFAULT_FALLBACK_CONTENT_RENDERERS` — the bundled generic A2UI renderer (lazily loaded) for `application/a2ui+json` and the legacy `application/json+a2ui` |
| `{}` | Disable all fallback renderers |
| Custom registry | **Replaces** the default — spread `DEFAULT_FALLBACK_CONTENT_RENDERERS` to extend it instead |

```tsx
import { AppRenderer, DEFAULT_FALLBACK_CONTENT_RENDERERS } from '@mcp-ui/client';

// Default: no wiring needed — a2ui results "just work".
<AppRenderer client={mcpClient} toolName="get_dashboard" sandbox={{ url: sandboxUrl }} toolResult={toolResult} />;

// Extend the defaults with a renderer for your own format:
<AppRenderer
  {...props}
  fallbackContentRenderers={{
    ...DEFAULT_FALLBACK_CONTENT_RENDERERS,
    'application/vnd.chart+json': () => import('./chart-renderer.html?raw').then((m) => m.default),
  }}
/>;
```

::: warning Unmarked blocks (legacy compat)
The spec requires the `_meta.ui.content` marker and explicitly rejected marker-less MIME inference. As a beyond-spec legacy allowance — existing A2UI servers don't set the marker — AppRenderer also treats **unmarked** embedded resources as view content when their MIME type is a key of the active registry. Registering a custom MIME opts that MIME into the same leniency.
:::

::: tip Timing
If `toolResult` arrives *after* AppRenderer mounts, the usual "tool has no UI resource" error may surface briefly and is superseded automatically once view content is detected. Hosts that mount AppRenderer only after receiving the result (the common flow) never see it.
:::

## Detection helpers

Generic (Dynamic View Content):

```ts
import {
  isViewContentBlock, // _meta.ui.content marker present
  getViewContentBlocks, // marked blocks (+ opt-in unmarked MIMEs), in content order
  getViewContentRendererUri, // _meta.ui.content.rendererUri, if any
} from '@mcp-ui/client';
```

A2UI-specific wrappers:

```ts
import {
  A2UI_MIME_TYPE, // 'application/a2ui+json'
  A2UI_LEGACY_MIME_TYPE, // 'application/json+a2ui'
  hasA2uiContent, // result contains at least one A2UI block
  getA2uiContentBlocks, // all A2UI embedded resources, in content order
  isA2uiContentBlock, // single-block check (marked or unmarked)
} from '@mcp-ui/client';
```

Once the official ext-apps helpers ([PR #700](https://github.com/modelcontextprotocol/ext-apps/pull/700)) ship, the generic helpers become thin re-exports.

## The bundled A2UI renderer

The default registry's renderer is a prebuilt, self-contained single-file HTML app (Lit-based, built on `@a2ui/lit` + `@a2ui/web_core`) exposed via a dedicated subpath export:

```ts
import { A2UI_RENDERER_HTML } from '@mcp-ui/client/a2ui-renderer';
```

It receives the tool result through the standard `ui/notifications/tool-result` notification and renders every A2UI surface it contains (full re-render per result), mapping A2UI user actions back to server tools: the action's `name` is called via `tools/call` with the action's resolved `context` as arguments, and the response is applied incrementally.

- The main `@mcp-ui/client` bundle never includes it — the default registry entries are lazy loaders, so the artifact loads only when the fallback actually triggers, and the published package gains **no** runtime dependencies from it.
- **UMD / no-dynamic-import setups**: if your bundler can't resolve the subpath at runtime, import `A2UI_RENDERER_HTML` statically and register it as a string entry: `fallbackContentRenderers={{ [A2UI_MIME_TYPE]: A2UI_RENDERER_HTML }}`.
- String entries also let you swap in your own A2UI renderer (e.g. an official one published by the A2UI project in the future).

## Host capability advertisement

`UI_EXTENSION_CONFIG` advertises `contentMimeTypes: ['application/a2ui+json', 'application/json+a2ui']` (the Dynamic View Content host capability), kept in lockstep with `Object.keys(DEFAULT_FALLBACK_CONTENT_RENDERERS)` by a test. This promises that content blocks marked with `_meta.ui.content` are forwarded to renderers unmodified — AppRenderer/AppFrame already pass the full `CallToolResult` through untouched, so just make sure any pre-processing you do on `toolResult` doesn't strip those blocks.

## Regenerating the artifact (contributors)

The artifact is checked into git (`sdks/typescript/client/src/a2ui/a2ui-renderer.html`, marked `linguist-generated`), so builds, tests, and publishing never need the renderer toolchain. To rebuild it from source after changing the renderer or bumping `@a2ui/*` versions:

```sh
pnpm --filter @mcp-ui/client run regen:a2ui-renderer
```

This builds the private `@mcp-ui/client-a2ui-renderer` workspace package (vite + vite-plugin-singlefile) and copies the output into the checked-in location.
