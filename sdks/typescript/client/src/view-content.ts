import type { CallToolResult, EmbeddedResource } from '@modelcontextprotocol/sdk/types.js';

// TODO: Replace these local helpers with the official ext-apps SDK helpers
// (isViewContentBlock, getViewContentBlocks, supportsContentMimeType) once
// https://github.com/modelcontextprotocol/ext-apps/pull/700 ships in a
// release. Semantics here intentionally match that proposal, plus the
// `unmarkedMimeTypes` allowance for legacy servers that don't set
// _meta.ui.content (the spec itself has no marker-less inference).

/**
 * A fallback renderer registry entry: either the renderer's self-contained
 * HTML, or an async loader resolving to it (so bundlers can code-split the
 * renderer out of the main chunk).
 */
export type FallbackContentRenderer = string | (() => Promise<string>);

/**
 * Fallback content renderers keyed by the view-content MIME type they can
 * display.
 */
export type FallbackContentRenderers = Record<string, FallbackContentRenderer>;

interface ContentBlockLike {
  type?: unknown;
  resource?: { mimeType?: unknown; text?: unknown; blob?: unknown };
  _meta?: { ui?: { content?: unknown } };
}

function isEmbeddedResourceBlock(block: unknown): block is ContentBlockLike {
  return (
    typeof block === 'object' &&
    block !== null &&
    (block as ContentBlockLike).type === 'resource' &&
    typeof (block as ContentBlockLike).resource === 'object' &&
    (block as ContentBlockLike).resource !== null
  );
}

function getViewContentMarker(block: unknown): Record<string, unknown> | undefined {
  if (!isEmbeddedResourceBlock(block)) return undefined;
  const content = block._meta?.ui?.content;
  return typeof content === 'object' && content !== null
    ? (content as Record<string, unknown>)
    : undefined;
}

/**
 * True when a content block is an embedded resource marked as view content
 * per the "Dynamic View Content" spec proposal (ext-apps PR #699), i.e. it
 * carries `_meta.ui.content`.
 */
export function isViewContentBlock(block: unknown): block is EmbeddedResource {
  return getViewContentMarker(block) !== undefined;
}

/**
 * Returns the renderer view a marked view-content block targets
 * (`_meta.ui.content.rendererUri`), or undefined when the block is unmarked
 * or targets the calling tool's own `_meta.ui.resourceUri` (the spec default
 * when `rendererUri` is omitted).
 */
export function getViewContentRendererUri(block: unknown): string | undefined {
  const rendererUri = getViewContentMarker(block)?.rendererUri;
  return typeof rendererUri === 'string' ? rendererUri : undefined;
}

export interface GetViewContentBlocksOptions {
  /**
   * When set, marked blocks are only returned if their MIME type is in this
   * list. Defaults to accepting marked blocks of any MIME type.
   */
  mimeTypes?: readonly string[];
  /**
   * MIME types for which *unmarked* embedded resources also count as view
   * content. Beyond-spec legacy compat: the spec requires the
   * `_meta.ui.content` marker, but existing A2UI servers don't set it.
   * Defaults to none.
   */
  unmarkedMimeTypes?: readonly string[];
}

/**
 * Returns every view-content embedded-resource block from a tool result, in
 * content order: blocks marked with `_meta.ui.content` (optionally filtered
 * by `mimeTypes`), plus unmarked blocks whose MIME type is listed in
 * `unmarkedMimeTypes`. Blocks must carry text or base64 blob content. Safe
 * to call with an undefined or malformed result.
 */
export function getViewContentBlocks(
  result?: Pick<CallToolResult, 'content'>,
  options: GetViewContentBlocksOptions = {},
): EmbeddedResource[] {
  const content = result?.content;
  if (!Array.isArray(content)) return [];
  return content.filter((block: unknown): block is EmbeddedResource => {
    if (!isEmbeddedResourceBlock(block)) return false;
    const resource = block.resource!;
    if (typeof resource.text !== 'string' && typeof resource.blob !== 'string') return false;
    const mimeType = resource.mimeType;
    if (isViewContentBlock(block)) {
      return !options.mimeTypes || options.mimeTypes.includes(mimeType as string);
    }
    return !!options.unmarkedMimeTypes && options.unmarkedMimeTypes.includes(mimeType as string);
  });
}
