import { describe, expect, it } from 'vitest';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  A2UI_LEGACY_MIME_TYPE,
  A2UI_MIME_TYPE,
  DEFAULT_FALLBACK_CONTENT_RENDERERS,
  getA2uiContentBlocks,
  hasA2uiContent,
  isA2uiContentBlock,
} from '../detection';

const a2uiText = JSON.stringify([{ version: 'v0.9', createSurface: { surfaceId: 'main' } }]);

function a2uiBlock(overrides: Record<string, unknown> = {}, meta?: Record<string, unknown>) {
  return {
    type: 'resource',
    resource: {
      uri: 'a2ui://payload',
      mimeType: A2UI_MIME_TYPE,
      text: a2uiText,
      ...overrides,
    },
    ...(meta ? { _meta: meta } : {}),
  };
}

function result(...content: unknown[]): CallToolResult {
  return { content } as CallToolResult;
}

describe('isA2uiContentBlock', () => {
  it('accepts marked blocks (spec PR #699)', () => {
    expect(isA2uiContentBlock(a2uiBlock({}, { ui: { content: {} } }))).toBe(true);
  });

  it('accepts unmarked blocks (legacy servers)', () => {
    expect(isA2uiContentBlock(a2uiBlock())).toBe(true);
  });

  it('accepts the legacy MIME type', () => {
    expect(isA2uiContentBlock(a2uiBlock({ mimeType: A2UI_LEGACY_MIME_TYPE }))).toBe(true);
  });

  it('accepts base64 blob content', () => {
    expect(isA2uiContentBlock(a2uiBlock({ text: undefined, blob: btoa(a2uiText) }))).toBe(true);
  });

  it('rejects non-resource blocks', () => {
    expect(isA2uiContentBlock({ type: 'text', text: 'hello' })).toBe(false);
    expect(isA2uiContentBlock(null)).toBe(false);
    expect(isA2uiContentBlock('resource')).toBe(false);
  });

  it('rejects wrong MIME types and empty resources', () => {
    expect(isA2uiContentBlock(a2uiBlock({ mimeType: 'application/json' }))).toBe(false);
    expect(isA2uiContentBlock(a2uiBlock({ mimeType: undefined }))).toBe(false);
    expect(isA2uiContentBlock(a2uiBlock({ text: undefined }))).toBe(false);
  });
});

describe('getA2uiContentBlocks', () => {
  it('returns a2ui blocks in content order', () => {
    const first = a2uiBlock();
    const second = a2uiBlock({ mimeType: A2UI_LEGACY_MIME_TYPE });
    const blocks = getA2uiContentBlocks(
      result(first, { type: 'text', text: 'between' }, second),
    );
    expect(blocks).toEqual([first, second]);
  });

  it('returns empty for undefined or malformed results', () => {
    expect(getA2uiContentBlocks(undefined)).toEqual([]);
    expect(getA2uiContentBlocks({} as CallToolResult)).toEqual([]);
    expect(getA2uiContentBlocks({ content: 'nope' } as unknown as CallToolResult)).toEqual([]);
  });
});

describe('hasA2uiContent', () => {
  it('detects a2ui content among other blocks', () => {
    expect(hasA2uiContent(result({ type: 'text', text: 'x' }, a2uiBlock()))).toBe(true);
  });

  it('is false without a2ui blocks', () => {
    expect(hasA2uiContent(result({ type: 'text', text: 'x' }))).toBe(false);
    expect(hasA2uiContent(result())).toBe(false);
    expect(hasA2uiContent(undefined)).toBe(false);
  });
});

describe('DEFAULT_FALLBACK_CONTENT_RENDERERS', () => {
  it('maps both a2ui MIME types to lazy loaders (not inline HTML strings)', () => {
    expect(Object.keys(DEFAULT_FALLBACK_CONTENT_RENDERERS)).toEqual([
      A2UI_MIME_TYPE,
      A2UI_LEGACY_MIME_TYPE,
    ]);
    for (const entry of Object.values(DEFAULT_FALLBACK_CONTENT_RENDERERS)) {
      expect(typeof entry).toBe('function');
    }
  });
});
