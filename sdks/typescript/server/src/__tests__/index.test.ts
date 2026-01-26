import {
  createUIResource,
  uiActionResultToolCall,
  uiActionResultPrompt,
  uiActionResultLink,
  uiActionResultIntent,
  uiActionResultNotification,
} from '../index';
import { UI_METADATA_PREFIX } from '../types.js';

describe('@mcp-ui/server', () => {
  describe('createUIResource', () => {
    it('should create a text-based direct HTML resource', () => {
      const options = {
        uri: 'ui://test-html' as const,
        content: { type: 'rawHtml' as const, htmlString: '<p>Test</p>' },
        encoding: 'text' as const,
      };
      const resource = createUIResource(options);
      expect(resource.type).toBe('resource');
      expect(resource.resource.uri).toBe('ui://test-html');
      expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
      expect(resource.resource.text).toBe('<p>Test</p>');
      expect(resource.resource.blob).toBeUndefined();
    });

    it('should create a blob-based direct HTML resource', () => {
      const options = {
        uri: 'ui://test-html-blob' as const,
        content: { type: 'rawHtml' as const, htmlString: '<h1>Blob</h1>' },
        encoding: 'blob' as const,
      };
      const resource = createUIResource(options);
      expect(resource.resource.blob).toBe(Buffer.from('<h1>Blob</h1>').toString('base64'));
      expect(resource.resource.text).toBeUndefined();
    });

    it('should create a text-based external URL resource', () => {
      const options = {
        uri: 'ui://test-url' as const,
        content: {
          type: 'externalUrl' as const,
          iframeUrl: 'https://example.com',
        },
        encoding: 'text' as const,
      };
      const resource = createUIResource(options);
      expect(resource.resource.uri).toBe('ui://test-url');
      expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
      expect(resource.resource.text).toBe('https://example.com');
      expect(resource.resource.blob).toBeUndefined();
    });

    it('should create a text-based external URL resource with metadata', () => {
      const options = {
        uri: 'ui://test-url' as const,
        content: { type: 'externalUrl' as const, iframeUrl: 'https://example.com' },
        encoding: 'text' as const,
        uiMetadata: { 'preferred-frame-size': ['100px', '100px'] as [string, string] },
        resourceProps: { _meta: { 'arbitrary-prop': 'arbitrary' } },
      };
      const resource = createUIResource(options);
      expect(resource.resource.uri).toBe('ui://test-url');
      expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
      expect(resource.resource.text).toBe('https://example.com');
      expect(resource.resource.blob).toBeUndefined();
      expect(resource.resource._meta).toEqual({
        [`${UI_METADATA_PREFIX}preferred-frame-size`]: ['100px', '100px'],
        'arbitrary-prop': 'arbitrary',
      });
    });

    it('should create a text-based external URL resource with metadata, respecting order of overriding metadata', () => {
      const options = {
        uri: 'ui://test-url' as const,
        content: { type: 'externalUrl' as const, iframeUrl: 'https://example.com' },
        encoding: 'text' as const,
        metadata: { 'arbitrary-prop': 'arbitrary', foo: 'bar' },
        resourceProps: { _meta: { 'arbitrary-prop': 'arbitrary2' } },
      };
      const resource = createUIResource(options);
      expect(resource.resource.uri).toBe('ui://test-url');
      expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
      expect(resource.resource.text).toBe('https://example.com');
      expect(resource.resource.blob).toBeUndefined();
      expect(resource.resource._meta).toEqual({ foo: 'bar', 'arbitrary-prop': 'arbitrary2' });
    });

    it('should create a text-based external URL resource with embedded resource props', () => {
      const options = {
        uri: 'ui://test-url' as const,
        content: { type: 'externalUrl' as const, iframeUrl: 'https://example.com' },
        encoding: 'text' as const,
        uiMetadata: { 'preferred-frame-size': ['100px', '100px'] as [string, string] },
        resourceProps: { _meta: { 'arbitrary-metadata': 'resource-level-metadata' } },
        embeddedResourceProps: {
          annotations: {
            audience: ['user'],
          },
          _meta: { 'arbitrary-metadata': 'embedded-resource-metadata' },
        },
      };
      const resource = createUIResource(options);
      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://test-url',
          mimeType: 'text/html;profile=mcp-app',
          text: 'https://example.com',
          blob: undefined,
          _meta: {
            'arbitrary-metadata': 'resource-level-metadata',
            [`${UI_METADATA_PREFIX}preferred-frame-size`]: ['100px', '100px'],
          },
        },
        annotations: {
          audience: ['user'],
        },
        _meta: {
          'arbitrary-metadata': 'embedded-resource-metadata',
        },
      });
    });

    it('should create a blob-based external URL resource', () => {
      const options = {
        uri: 'ui://test-url-blob' as const,
        content: {
          type: 'externalUrl' as const,
          iframeUrl: 'https://example.com/blob',
        },
        encoding: 'blob' as const,
      };
      const resource = createUIResource(options);
      expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
      expect(resource.resource.blob).toBe(
        Buffer.from('https://example.com/blob').toString('base64'),
      );
      expect(resource.resource.text).toBeUndefined();
      expect(resource.resource._meta).toBeUndefined();
    });

    it('should create a blob-based direct HTML resource with correct mimetype', () => {
      const options = {
        uri: 'ui://test-html-blob' as const,
        content: { type: 'rawHtml' as const, htmlString: '<h1>Blob</h1>' },
        encoding: 'blob' as const,
      };
      const resource = createUIResource(options);
      expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
      expect(resource.resource.blob).toBe(Buffer.from('<h1>Blob</h1>').toString('base64'));
      expect(resource.resource.text).toBeUndefined();
    });

    it('should throw error for invalid URI prefix with rawHtml', () => {
      const options = {
        uri: 'invalid://test-html' as const,
        content: { type: 'rawHtml' as const, htmlString: '<p>Test</p>' },
        encoding: 'text' as const,
      };
      // @ts-expect-error We are intentionally passing an invalid URI to test the error.
      expect(() => createUIResource(options)).toThrow(
        "MCP-UI SDK: URI must start with 'ui://' when content.type is 'rawHtml'.",
      );
    });

    it('should throw error for invalid URI prefix with externalUrl', () => {
      const options = {
        uri: 'invalid://test-url' as const,
        content: {
          type: 'externalUrl' as const,
          iframeUrl: 'https://example.com',
        },
        encoding: 'text' as const,
      };
      // @ts-expect-error We are intentionally passing an invalid URI to test the error.
      expect(() => createUIResource(options)).toThrow(
        "MCP-UI SDK: URI must start with 'ui://' when content.type is 'externalUrl'.",
      );
    });

    it('should throw an error if htmlString is not a string for rawHtml', () => {
      const options = {
        uri: 'ui://test' as const,
        content: { type: 'rawHtml' as const, htmlString: null },
      };
      // @ts-expect-error intentionally passing invalid type
      expect(() => createUIResource(options)).toThrow(
        "MCP-UI SDK: content.htmlString must be provided as a string when content.type is 'rawHtml'.",
      );
    });

    it('should throw an error if iframeUrl is not a string for externalUrl', () => {
      const options = {
        uri: 'ui://test' as const,
        content: { type: 'externalUrl' as const, iframeUrl: 123 },
      };
      // @ts-expect-error intentionally passing invalid type
      expect(() => createUIResource(options)).toThrow(
        "MCP-UI SDK: content.iframeUrl must be provided as a string when content.type is 'externalUrl'.",
      );
    });

    it('should use text/html+skybridge mime type when appsSdk adapter is enabled', () => {
      const options = {
        uri: 'ui://test-html-adapter' as const,
        content: { type: 'rawHtml' as const, htmlString: '<p>Test with adapter</p>' },
        encoding: 'text' as const,
        adapters: {
          appsSdk: { enabled: true },
        },
      };
      const resource = createUIResource(options);
      expect(resource.resource.mimeType).toBe('text/html+skybridge');
      expect(resource.resource.text).toContain('<script>');
      expect(resource.resource.text).toContain('MCP_APPSSDK_ADAPTER');
    });

    it('should use custom mime type from appsSdk adapter config', () => {
      const options = {
        uri: 'ui://test-html-adapter-custom' as const,
        content: { type: 'rawHtml' as const, htmlString: '<p>Test with custom adapter</p>' },
        encoding: 'text' as const,
        adapters: {
          appsSdk: { enabled: true, mimeType: 'text/html+custom-platform' },
        },
      };
      const resource = createUIResource(options);
      expect(resource.resource.mimeType).toBe('text/html+custom-platform');
      expect(resource.resource.text).toContain('<script>');
    });

    it('should use MCP Apps mime type when no adapters are enabled', () => {
      const options = {
        uri: 'ui://test-html-no-adapter' as const,
        content: { type: 'rawHtml' as const, htmlString: '<p>Test without adapter</p>' },
        encoding: 'text' as const,
        adapters: {
          appsSdk: { enabled: false },
        },
      };
      const resource = createUIResource(options);
      expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
      expect(resource.resource.text).toBe('<p>Test without adapter</p>');
    });

    it('should use MCP Apps mime type when adapters config is not provided', () => {
      const options = {
        uri: 'ui://test-html-no-config' as const,
        content: { type: 'rawHtml' as const, htmlString: '<p>Test no config</p>' },
        encoding: 'text' as const,
      };
      const resource = createUIResource(options);
      expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
      expect(resource.resource.text).toBe('<p>Test no config</p>');
    });

    it('should work with blob encoding and appsSdk adapter', () => {
      const options = {
        uri: 'ui://test-html-adapter-blob' as const,
        content: { type: 'rawHtml' as const, htmlString: '<p>Test blob with adapter</p>' },
        encoding: 'blob' as const,
        adapters: {
          appsSdk: { enabled: true },
        },
      };
      const resource = createUIResource(options);
      expect(resource.resource.mimeType).toBe('text/html+skybridge');
      expect(resource.resource.blob).toBeDefined();
      expect(resource.resource.text).toBeUndefined();
      // Decode blob to verify adapter was injected
      const decodedHtml = Buffer.from(resource.resource.blob!, 'base64').toString('utf-8');
      expect(decodedHtml).toContain('<script>');
      expect(decodedHtml).toContain('MCP_APPSSDK_ADAPTER');
    });
  });
});

describe('UI Action Result Creators', () => {
  it('should create a tool call action result', () => {
    const result = uiActionResultToolCall('testTool', { param1: 'value1' });
    expect(result).toEqual({
      type: 'tool',
      payload: {
        toolName: 'testTool',
        params: { param1: 'value1' },
      },
    });
  });

  it('should create a prompt action result', () => {
    const result = uiActionResultPrompt('Enter your name');
    expect(result).toEqual({
      type: 'prompt',
      payload: {
        prompt: 'Enter your name',
      },
    });
  });

  it('should create a link action result', () => {
    const result = uiActionResultLink('https://example.com');
    expect(result).toEqual({
      type: 'link',
      payload: {
        url: 'https://example.com',
      },
    });
  });

  it('should create an intent action result', () => {
    const result = uiActionResultIntent('doSomething', { data: 'abc' });
    expect(result).toEqual({
      type: 'intent',
      payload: {
        intent: 'doSomething',
        params: { data: 'abc' },
      },
    });
  });

  it('should create a notification action result', () => {
    const result = uiActionResultNotification('Success!');
    expect(result).toEqual({
      type: 'notify',
      payload: {
        message: 'Success!',
      },
    });
  });
});
