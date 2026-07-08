import type { CallToolResult, EmbeddedResource } from '@modelcontextprotocol/sdk/types.js';
import {
  getViewContentBlocks,
  type FallbackContentRenderers,
  type GetViewContentBlocksOptions,
} from '../view-content';

/** MIME type of A2UI payloads (https://a2ui.org). */
export const A2UI_MIME_TYPE = 'application/a2ui+json';

/** Legacy A2UI MIME type still emitted by some servers. */
export const A2UI_LEGACY_MIME_TYPE = 'application/json+a2ui';

/** All MIME types recognized as A2UI payloads. */
export const A2UI_MIME_TYPES: readonly string[] = [A2UI_MIME_TYPE, A2UI_LEGACY_MIME_TYPE];

// A2UI blocks count as view content whether marked with _meta.ui.content
// (spec PR #699) or unmarked (existing A2UI servers don't set the marker).
const A2UI_VIEW_CONTENT_OPTIONS: GetViewContentBlocksOptions = {
  mimeTypes: A2UI_MIME_TYPES,
  unmarkedMimeTypes: A2UI_MIME_TYPES,
};

/**
 * True when a content block is an embedded resource holding an A2UI payload:
 * its MIME type is `application/a2ui+json` (or the legacy
 * `application/json+a2ui`) and it carries text or base64 blob content.
 * Accepts both blocks marked with `_meta.ui.content` (spec PR #699) and
 * unmarked blocks (existing A2UI servers).
 */
export function isA2uiContentBlock(block: unknown): block is EmbeddedResource {
  return (
    getViewContentBlocks(
      { content: [block] } as unknown as Pick<CallToolResult, 'content'>,
      A2UI_VIEW_CONTENT_OPTIONS,
    ).length > 0
  );
}

/**
 * Returns every A2UI embedded-resource block from a tool result, in content
 * order. Safe to call with an undefined or malformed result.
 */
export function getA2uiContentBlocks(
  result?: Pick<CallToolResult, 'content'>,
): EmbeddedResource[] {
  return getViewContentBlocks(result, A2UI_VIEW_CONTENT_OPTIONS);
}

/**
 * True when a tool result contains at least one A2UI embedded resource.
 */
export function hasA2uiContent(result?: Pick<CallToolResult, 'content'>): boolean {
  return getA2uiContentBlocks(result).length > 0;
}

// Loads the bundled generic A2UI renderer behind the lazy
// '@mcp-ui/client/a2ui-renderer' subpath, keeping the ~600 KB artifact out
// of the main bundle.
async function loadBundledA2uiRendererHtml(): Promise<string> {
  try {
    const rendererModule = await import('@mcp-ui/client/a2ui-renderer');
    return rendererModule.A2UI_RENDERER_HTML;
  } catch (err) {
    throw new Error(
      "Failed to load the bundled A2UI renderer ('@mcp-ui/client/a2ui-renderer'). " +
        'If your bundler cannot resolve this subpath (e.g. UMD builds), import ' +
        "A2UI_RENDERER_HTML from '@mcp-ui/client/a2ui-renderer' statically and pass it " +
        'as a string entry in the fallbackContentRenderers prop.',
      { cause: err },
    );
  }
}

/**
 * The fallback content renderers AppRenderer uses when its
 * `fallbackContentRenderers` prop is omitted: the bundled generic A2UI
 * renderer for both A2UI MIME types, lazily loaded. Spread this to extend
 * the defaults rather than replace them:
 *
 * ```ts
 * fallbackContentRenderers={{
 *   ...DEFAULT_FALLBACK_CONTENT_RENDERERS,
 *   'application/vnd.foo+json': loadFooRendererHtml,
 * }}
 * ```
 */
export const DEFAULT_FALLBACK_CONTENT_RENDERERS: FallbackContentRenderers = {
  [A2UI_MIME_TYPE]: loadBundledA2uiRendererHtml,
  [A2UI_LEGACY_MIME_TYPE]: loadBundledA2uiRendererHtml,
};
