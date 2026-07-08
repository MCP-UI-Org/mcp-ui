import type { CallToolResult, EmbeddedResource } from '@modelcontextprotocol/sdk/types.js';

/** MIME type of A2UI payloads (https://a2ui.org). */
export const A2UI_MIME_TYPE = 'application/a2ui+json';

/** Legacy A2UI MIME type still emitted by some servers. */
export const A2UI_LEGACY_MIME_TYPE = 'application/json+a2ui';

/** All MIME types recognized as A2UI payloads. */
export const A2UI_MIME_TYPES: readonly string[] = [A2UI_MIME_TYPE, A2UI_LEGACY_MIME_TYPE];

// TODO: Replace these local helpers with the official ext-apps SDK helpers
// (isViewContentBlock, getViewContentBlocks, supportsContentMimeType) once
// https://github.com/modelcontextprotocol/ext-apps/pull/700 ships in a
// release. Semantics here intentionally match that proposal, plus legacy
// support for unmarked blocks (existing A2UI servers don't set
// _meta.ui.content).

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

/**
 * True when a content block is an embedded resource marked as view content
 * per the "Dynamic View Content" spec proposal (ext-apps PR #699), i.e. it
 * carries `_meta.ui.content`.
 */
export function isViewContentBlock(block: unknown): block is EmbeddedResource {
  if (!isEmbeddedResourceBlock(block)) return false;
  const content = block._meta?.ui?.content;
  return typeof content === 'object' && content !== null;
}

/**
 * True when a content block is an embedded resource holding an A2UI payload:
 * its MIME type is `application/a2ui+json` (or the legacy
 * `application/json+a2ui`) and it carries text or base64 blob content.
 * Accepts both blocks marked with `_meta.ui.content` (spec PR #699) and
 * unmarked blocks (existing A2UI servers).
 */
export function isA2uiContentBlock(block: unknown): block is EmbeddedResource {
  if (!isEmbeddedResourceBlock(block)) return false;
  const resource = block.resource!;
  return (
    A2UI_MIME_TYPES.includes(resource.mimeType as string) &&
    (typeof resource.text === 'string' || typeof resource.blob === 'string')
  );
}

/**
 * Returns every A2UI embedded-resource block from a tool result, in content
 * order. Safe to call with an undefined or malformed result.
 */
export function getA2uiContentBlocks(
  result?: Pick<CallToolResult, 'content'>,
): EmbeddedResource[] {
  const content = result?.content;
  if (!Array.isArray(content)) return [];
  return content.filter(isA2uiContentBlock);
}

/**
 * True when a tool result contains at least one A2UI embedded resource.
 * AppRenderer uses this (in the default `a2uiRenderer: 'auto'` mode) to
 * decide whether to inject the bundled generic A2UI renderer for tools
 * that declare no UI resource of their own.
 */
export function hasA2uiContent(result?: Pick<CallToolResult, 'content'>): boolean {
  return getA2uiContentBlocks(result).length > 0;
}
