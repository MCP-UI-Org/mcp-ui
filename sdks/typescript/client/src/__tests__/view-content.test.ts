import { describe, expect, it } from 'vitest';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  getViewContentBlocks,
  getViewContentRendererUri,
  isViewContentBlock,
} from '../view-content';

function block(
  overrides: Record<string, unknown> = {},
  meta?: Record<string, unknown>,
) {
  return {
    type: 'resource',
    resource: {
      uri: 'content://payload',
      mimeType: 'application/vnd.example+json',
      text: '{"hello":"world"}',
      ...overrides,
    },
    ...(meta ? { _meta: meta } : {}),
  };
}

function markedBlock(overrides: Record<string, unknown> = {}, content: Record<string, unknown> = {}) {
  return block(overrides, { ui: { content } });
}

function result(...content: unknown[]): CallToolResult {
  return { content } as CallToolResult;
}

describe('isViewContentBlock', () => {
  it('accepts embedded resources marked with _meta.ui.content', () => {
    expect(isViewContentBlock(markedBlock())).toBe(true);
    expect(isViewContentBlock(markedBlock({}, { rendererUri: 'ui://x' }))).toBe(true);
  });

  it('rejects unmarked blocks and non-resources', () => {
    expect(isViewContentBlock(block())).toBe(false);
    expect(isViewContentBlock({ type: 'text', text: 'hi', _meta: { ui: { content: {} } } })).toBe(
      false,
    );
    expect(isViewContentBlock(undefined)).toBe(false);
  });

  it('rejects non-object markers', () => {
    expect(isViewContentBlock(block({}, { ui: { content: 'yes' } }))).toBe(false);
    expect(isViewContentBlock(block({}, { ui: { content: null } }))).toBe(false);
  });
});

describe('getViewContentRendererUri', () => {
  it('extracts rendererUri from marked blocks', () => {
    expect(getViewContentRendererUri(markedBlock({}, { rendererUri: 'ui://srv/renderer' }))).toBe(
      'ui://srv/renderer',
    );
  });

  it('is undefined when omitted (payload targets the tool renderer)', () => {
    expect(getViewContentRendererUri(markedBlock())).toBeUndefined();
  });

  it('is undefined for unmarked blocks, non-string values, and non-blocks', () => {
    expect(getViewContentRendererUri(block())).toBeUndefined();
    expect(getViewContentRendererUri(markedBlock({}, { rendererUri: 42 }))).toBeUndefined();
    expect(getViewContentRendererUri(null)).toBeUndefined();
    expect(getViewContentRendererUri('resource')).toBeUndefined();
  });
});

describe('getViewContentBlocks', () => {
  it('returns marked blocks of any MIME type by default', () => {
    const first = markedBlock({ mimeType: 'application/vnd.a+json' });
    const second = markedBlock({ mimeType: 'application/vnd.b+json' });
    expect(getViewContentBlocks(result(first, { type: 'text', text: 'between' }, second))).toEqual([
      first,
      second,
    ]);
  });

  it('filters marked blocks by mimeTypes when given', () => {
    const wanted = markedBlock({ mimeType: 'application/vnd.a+json' });
    const other = markedBlock({ mimeType: 'application/vnd.b+json' });
    expect(
      getViewContentBlocks(result(wanted, other), { mimeTypes: ['application/vnd.a+json'] }),
    ).toEqual([wanted]);
  });

  it('excludes unmarked blocks unless their MIME is in unmarkedMimeTypes', () => {
    const unmarked = block();
    expect(getViewContentBlocks(result(unmarked))).toEqual([]);
    expect(
      getViewContentBlocks(result(unmarked), {
        unmarkedMimeTypes: ['application/vnd.example+json'],
      }),
    ).toEqual([unmarked]);
    expect(
      getViewContentBlocks(result(unmarked), { unmarkedMimeTypes: ['application/other+json'] }),
    ).toEqual([]);
  });

  it('requires text or base64 blob content', () => {
    expect(getViewContentBlocks(result(markedBlock({ text: undefined })))).toEqual([]);
    const blobBlock = markedBlock({ text: undefined, blob: btoa('{"hello":"world"}') });
    expect(getViewContentBlocks(result(blobBlock))).toEqual([blobBlock]);
  });

  it('preserves content order across marked and unmarked blocks', () => {
    const unmarked = block({ mimeType: 'application/vnd.legacy+json' });
    const marked = markedBlock();
    const blocks = getViewContentBlocks(result(unmarked, { type: 'text', text: 'x' }, marked), {
      unmarkedMimeTypes: ['application/vnd.legacy+json'],
    });
    expect(blocks).toEqual([unmarked, marked]);
  });

  it('returns empty for undefined or malformed results', () => {
    expect(getViewContentBlocks(undefined)).toEqual([]);
    expect(getViewContentBlocks({} as CallToolResult)).toEqual([]);
    expect(getViewContentBlocks({ content: 'nope' } as unknown as CallToolResult)).toEqual([]);
  });
});
