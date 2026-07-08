# A2UI Support

[A2UI](https://a2ui.org) is a generative-UI format: instead of shipping HTML, a server returns a declarative, typed UI document (`application/a2ui+json`) in its tool results, and a *generic* renderer displays it. `@mcp-ui/client` bundles such a renderer, so mcp-ui hosts can render A2UI-returning MCP servers **even when the server ships no renderer resource at all** — including servers not built with mcp-ui.

## How it works

`<AppRenderer />` normally resolves the tool's UI from its predeclared `_meta.ui.resourceUri`. With A2UI support, when

1. the tool declares **no** `ui/resourceUri`, **and**
2. `toolResult` contains an embedded resource with MIME type `application/a2ui+json` (or the legacy `application/json+a2ui`),

AppRenderer automatically injects a bundled, self-contained generic A2UI renderer into the sandboxed iframe instead of erroring out. The renderer:

- receives the tool result through the standard `ui/notifications/tool-result` notification and renders every A2UI surface it contains (full re-render per result),
- maps A2UI user actions back to server tools: the action's `name` is called via `tools/call` with the action's resolved `context` as arguments, and the response is applied incrementally.

Tools that predeclare their own renderer are never affected — the declared renderer always wins.

```tsx
import { AppRenderer } from '@mcp-ui/client';

// No special wiring needed: if the tool has no declared renderer and the
// result carries application/a2ui+json content, the bundled renderer is used.
<AppRenderer
  client={mcpClient}
  toolName="get_dashboard"
  sandbox={{ url: sandboxUrl }}
  toolResult={toolResult}
/>;
```

## The `a2uiRenderer` prop

```ts
a2uiRenderer?: boolean | { html?: string }
```

| Value | Behavior |
| --- | --- |
| `undefined` (default) | Auto: inject when the tool declares no renderer **and** `toolResult` contains A2UI content |
| `false` | Never inject |
| `true` | Always inject when the tool declares no renderer (skips content detection) |
| `{ html }` | Like `true`, but render the provided HTML instead of the bundled renderer |

::: tip Timing in auto mode
If `toolResult` arrives *after* AppRenderer mounts, the usual "tool has no UI resource" error may surface briefly and is superseded automatically once the result with A2UI content arrives. Hosts that mount AppRenderer only after receiving the result (the common flow) never see it. For explicit control, run `hasA2uiContent(result)` yourself and pass `a2uiRenderer={true}` / `{false}`.
:::

## Detection helpers

```ts
import {
  A2UI_MIME_TYPE, // 'application/a2ui+json'
  A2UI_LEGACY_MIME_TYPE, // 'application/json+a2ui'
  hasA2uiContent, // result contains at least one A2UI block
  getA2uiContentBlocks, // all A2UI embedded resources, in content order
  isA2uiContentBlock, // single-block check (marked or unmarked)
  isViewContentBlock, // _meta.ui.content marker (Dynamic View Content spec)
} from '@mcp-ui/client';
```

Detection accepts both blocks marked with `_meta.ui.content` (per the ext-apps ["Dynamic View Content" proposal](https://github.com/modelcontextprotocol/ext-apps/pull/699)) and unmarked blocks, since existing A2UI servers don't set the marker. Once the official ext-apps helpers ([PR #700](https://github.com/modelcontextprotocol/ext-apps/pull/700)) ship, these become thin re-exports.

## The bundled renderer artifact

The renderer is a prebuilt, self-contained single-file HTML app (Lit-based, built on `@a2ui/lit` + `@a2ui/web_core`) exposed via a dedicated subpath export:

```ts
import { A2UI_RENDERER_HTML } from '@mcp-ui/client/a2ui-renderer';
```

- The main `@mcp-ui/client` bundle never includes it — AppRenderer lazy-loads the subpath only when the fallback actually triggers, and the published package gains **no** runtime dependencies from it.
- **UMD / no-dynamic-import setups**: if your bundler can't resolve the subpath at runtime, import `A2UI_RENDERER_HTML` statically and pass it via `a2uiRenderer={{ html: A2UI_RENDERER_HTML }}`.
- `{ html }` also lets you swap in your own A2UI renderer (e.g. an official one published by the A2UI project in the future).

## Host capability advertisement

`UI_EXTENSION_CONFIG` now advertises `contentMimeTypes: ['application/a2ui+json', 'application/json+a2ui']` (Dynamic View Content host capability). This promises that content blocks marked with `_meta.ui.content` are forwarded to renderers unmodified — AppRenderer/AppFrame already pass the full `CallToolResult` through untouched, so just make sure any pre-processing you do on `toolResult` doesn't strip those blocks.

## Regenerating the artifact (contributors)

The artifact is checked into git (`sdks/typescript/client/src/a2ui/a2ui-renderer.html`, marked `linguist-generated`), so builds, tests, and publishing never need the renderer toolchain. To rebuild it from source after changing the renderer or bumping `@a2ui/*` versions:

```sh
pnpm --filter @mcp-ui/client run regen:a2ui-renderer
```

This builds the private `@mcp-ui/client-a2ui-renderer` workspace package (vite + vite-plugin-singlefile) and copies the output into the checked-in location.
