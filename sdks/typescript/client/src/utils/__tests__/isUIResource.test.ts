import { describe, it, expect } from 'vitest';
import { isUIResource } from '../isUIResource';

describe('isUIResource', () => {
  const uiResources = [
    { type: 'resource', resource: { uri: 'ui://test' } },
    {
      type: 'resource',
      resource: { uri: 'ui://test', mimeType: 'text/html', text: 'Hello, world!' },
      arbitraryProp: 'arbitrary',
    },
    {
      type: 'resource',
      resource: { uri: 'ui://test', mimeType: 'text/uri-list', text: 'https://example.com' },
    },
    {
      type: 'resource',
      resource: {
        uri: 'ui://test',
        mimeType: 'text/html;profile=mcp-app',
        text: 'Hello, world!',
      },
    },
  ];

  const nonUiResources = [
    { type: 'resource', resource: { uri: 'https://example.com' } },
    { type: 'text', text: 'Hello, world!' },
    { type: 'text', resource: { uri: 'ui://test' } },
  ];

  it(`should return true if the content is a UI resource: ${JSON.stringify(uiResources)}`, () => {
    uiResources.forEach((content) => {
      expect(isUIResource(content)).toBe(true);
    });
  });

  nonUiResources.forEach((content) => {
    it(`should return false if the content is not a UI resource: ${JSON.stringify(content)}`, () => {
      expect(isUIResource(content)).toBe(false);
    });
  });

  it('should return false if the content is not a UI resource', () => {
    const content = { type: 'resource', resource: { uri: 'https://example.com' } };
    expect(isUIResource(content)).toBe(false);
  });
});
