import { describe, expect, it } from 'vitest';
import {
  A2UI_LEGACY_MIME_TYPE,
  A2UI_MIME_TYPE,
  extractA2uiMessages,
} from './extract-a2ui-messages';

const surfaceMessage = { version: 'v0.9', createSurface: { surfaceId: 'main' } };
const updateMessage = {
  version: 'v0.9',
  updateDataModel: { surfaceId: 'main', path: '/counter', value: 1 },
};

function resourceBlock(overrides: Record<string, unknown> = {}) {
  return {
    type: 'resource',
    resource: {
      uri: 'a2ui://payload',
      mimeType: A2UI_MIME_TYPE,
      text: JSON.stringify([surfaceMessage]),
      ...overrides,
    },
  };
}

describe('extractA2uiMessages', () => {
  it('returns empty for non-array content', () => {
    expect(extractA2uiMessages(undefined)).toEqual([]);
    expect(extractA2uiMessages(null)).toEqual([]);
    expect(extractA2uiMessages({})).toEqual([]);
  });

  it('parses an array payload from a text resource', () => {
    expect(extractA2uiMessages([resourceBlock()])).toEqual([surfaceMessage]);
  });

  it('wraps a single-object payload into an array', () => {
    const block = resourceBlock({ text: JSON.stringify(surfaceMessage) });
    expect(extractA2uiMessages([block])).toEqual([surfaceMessage]);
  });

  it('accepts the legacy a2ui MIME type', () => {
    const block = resourceBlock({ mimeType: A2UI_LEGACY_MIME_TYPE });
    expect(extractA2uiMessages([block])).toEqual([surfaceMessage]);
  });

  it('decodes base64 blob resources', () => {
    const block = resourceBlock({ text: undefined, blob: btoa(JSON.stringify([updateMessage])) });
    expect(extractA2uiMessages([block])).toEqual([updateMessage]);
  });

  it('concatenates messages from multiple resources in order', () => {
    const blocks = [
      resourceBlock(),
      { type: 'text', text: 'ignored' },
      resourceBlock({ text: JSON.stringify([updateMessage]) }),
    ];
    expect(extractA2uiMessages(blocks)).toEqual([surfaceMessage, updateMessage]);
  });

  it('ignores non-resource blocks, wrong MIME types, and invalid payloads', () => {
    const blocks = [
      { type: 'text', text: 'hello' },
      resourceBlock({ mimeType: 'application/json' }),
      resourceBlock({ text: 'not json' }),
      resourceBlock({ text: JSON.stringify('a string') }),
      resourceBlock({ text: undefined }),
    ];
    expect(extractA2uiMessages(blocks)).toEqual([]);
  });
});
