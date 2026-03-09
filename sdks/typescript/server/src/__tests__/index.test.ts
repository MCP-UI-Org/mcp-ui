import {
  createUIResource,
  sendExperimentalRequest,
} from '../index';
import { UI_METADATA_PREFIX } from '../types.js';

describe('@mcp-ui/server', () => {
  describe('createUIResource', () => {
    it('should create a text-based direct HTML resource', async () => {
      const options = {
        uri: 'ui://test-html' as const,
        content: { type: 'rawHtml' as const, htmlString: '<p>Test</p>' },
        encoding: 'text' as const,
      };
      const resource = await createUIResource(options);
      expect(resource.type).toBe('resource');
      expect(resource.resource.uri).toBe('ui://test-html');
      expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
      expect(resource.resource.text).toBe('<p>Test</p>');
      expect(resource.resource.blob).toBeUndefined();
    });

    it('should create a blob-based direct HTML resource', async () => {
      const options = {
        uri: 'ui://test-html-blob' as const,
        content: { type: 'rawHtml' as const, htmlString: '<h1>Blob</h1>' },
        encoding: 'blob' as const,
      };
      const resource = await createUIResource(options);
      expect(resource.resource.blob).toBe(Buffer.from('<h1>Blob</h1>').toString('base64'));
      expect(resource.resource.text).toBeUndefined();
    });

    describe('externalUrl (fetches and injects <base>)', () => {
      const MOCK_HTML = '<html><head><title>Test</title></head><body>Hello</body></html>';

      function mockFetchWithHtml(html: string) {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(html);
        let readCalled = false;
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            ok: true,
            headers: new Headers(),
            body: {
              getReader: () => ({
                read: () => {
                  if (!readCalled) {
                    readCalled = true;
                    return Promise.resolve({ done: false, value: encoded });
                  }
                  return Promise.resolve({ done: true, value: undefined });
                },
                cancel: vi.fn(),
              }),
            },
          }),
        );
      }

      beforeEach(() => {
        mockFetchWithHtml(MOCK_HTML);
      });

      afterEach(() => {
        vi.unstubAllGlobals();
      });

      it('should fetch external URL, inject <base> tag, and set CSP resourceDomains', async () => {
        const resource = await createUIResource({
          uri: 'ui://test-url' as const,
          content: { type: 'externalUrl' as const, iframeUrl: 'https://example.com/page' },
          encoding: 'text' as const,
        });

        expect(fetch).toHaveBeenCalledWith('https://example.com/page', expect.objectContaining({
          signal: expect.any(AbortSignal),
        }));
        expect(resource.resource.uri).toBe('ui://test-url');
        expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
        expect(resource.resource.text).toBe(
          '<html><head><base href="https://example.com/page"><title>Test</title></head><body>Hello</body></html>',
        );
        expect(resource.resource.blob).toBeUndefined();
        // CSP resourceDomains should contain the external origin
        expect(resource.resource._meta).toEqual({
          csp: { baseUriDomains: ['https://example.com'] },
        });
      });

      it('should fetch and encode as blob', async () => {
        const resource = await createUIResource({
          uri: 'ui://test-url-blob' as const,
          content: { type: 'externalUrl' as const, iframeUrl: 'https://example.com/blob' },
          encoding: 'blob' as const,
        });

        expect(fetch).toHaveBeenCalledWith('https://example.com/blob', expect.objectContaining({
          signal: expect.any(AbortSignal),
        }));
        const expectedHtml =
          '<html><head><base href="https://example.com/blob"><title>Test</title></head><body>Hello</body></html>';
        expect(resource.resource.blob).toBe(Buffer.from(expectedHtml).toString('base64'));
        expect(resource.resource.text).toBeUndefined();
      });

      it('should include metadata on fetched external URL resource', async () => {
        const resource = await createUIResource({
          uri: 'ui://test-url' as const,
          content: { type: 'externalUrl' as const, iframeUrl: 'https://example.com' },
          encoding: 'text' as const,
          uiMetadata: { 'preferred-frame-size': ['100px', '100px'] as [string, string] },
          resourceProps: { _meta: { 'arbitrary-prop': 'arbitrary' } },
        });

        expect(resource.resource._meta).toEqual({
          [`${UI_METADATA_PREFIX}preferred-frame-size`]: ['100px', '100px'],
          'arbitrary-prop': 'arbitrary',
          csp: { baseUriDomains: ['https://example.com'] },
        });
      });

      it('should include metadata respecting order of overriding metadata', async () => {
        const resource = await createUIResource({
          uri: 'ui://test-url' as const,
          content: { type: 'externalUrl' as const, iframeUrl: 'https://example.com' },
          encoding: 'text' as const,
          metadata: { 'arbitrary-prop': 'arbitrary', foo: 'bar' },
          resourceProps: { _meta: { 'arbitrary-prop': 'arbitrary2' } },
        });

        expect(resource.resource._meta).toEqual({
          foo: 'bar',
          'arbitrary-prop': 'arbitrary2',
          csp: { baseUriDomains: ['https://example.com'] },
        });
      });

      it('should include embedded resource props', async () => {
        const resource = await createUIResource({
          uri: 'ui://test-url' as const,
          content: { type: 'externalUrl' as const, iframeUrl: 'https://example.com' },
          encoding: 'text' as const,
          uiMetadata: { 'preferred-frame-size': ['100px', '100px'] as [string, string] },
          resourceProps: { _meta: { 'arbitrary-metadata': 'resource-level-metadata' } },
          embeddedResourceProps: {
            annotations: { audience: ['user'] },
            _meta: { 'arbitrary-metadata': 'embedded-resource-metadata' },
          },
        });

        expect(resource.annotations).toEqual({ audience: ['user'] });
        expect(resource._meta).toEqual({ 'arbitrary-metadata': 'embedded-resource-metadata' });
        expect(resource.resource._meta).toEqual({
          'arbitrary-metadata': 'resource-level-metadata',
          [`${UI_METADATA_PREFIX}preferred-frame-size`]: ['100px', '100px'],
          csp: { baseUriDomains: ['https://example.com'] },
        });
      });

      it('should merge with existing CSP baseUriDomains without duplicating', async () => {
        const resource = await createUIResource({
          uri: 'ui://test-url' as const,
          content: { type: 'externalUrl' as const, iframeUrl: 'https://example.com/page' },
          encoding: 'text' as const,
          resourceProps: {
            _meta: { csp: { baseUriDomains: ['https://cdn.other.com'] } },
          },
        });

        expect(resource.resource._meta).toEqual({
          csp: { baseUriDomains: ['https://cdn.other.com', 'https://example.com'] },
        });
      });

      it('should not duplicate origin if already present in CSP baseUriDomains', async () => {
        const resource = await createUIResource({
          uri: 'ui://test-url' as const,
          content: { type: 'externalUrl' as const, iframeUrl: 'https://example.com/page' },
          encoding: 'text' as const,
          resourceProps: {
            _meta: { csp: { baseUriDomains: ['https://example.com'] } },
          },
        });

        expect(resource.resource._meta).toEqual({
          csp: { baseUriDomains: ['https://example.com'] },
        });
      });

      it('should throw when fetch fails', async () => {
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            headers: new Headers(),
          }),
        );

        await expect(
          createUIResource({
            uri: 'ui://test-url' as const,
            content: { type: 'externalUrl' as const, iframeUrl: 'https://example.com/missing' },
            encoding: 'text' as const,
          }),
        ).rejects.toThrow('Failed to fetch external URL');
      });
    });

    it('should create a blob-based direct HTML resource with correct mimetype', async () => {
      const options = {
        uri: 'ui://test-html-blob' as const,
        content: { type: 'rawHtml' as const, htmlString: '<h1>Blob</h1>' },
        encoding: 'blob' as const,
      };
      const resource = await createUIResource(options);
      expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
      expect(resource.resource.blob).toBe(Buffer.from('<h1>Blob</h1>').toString('base64'));
      expect(resource.resource.text).toBeUndefined();
    });

    it('should throw error for invalid URI prefix with rawHtml', async () => {
      const options = {
        uri: 'invalid://test-html' as const,
        content: { type: 'rawHtml' as const, htmlString: '<p>Test</p>' },
        encoding: 'text' as const,
      };
      // @ts-expect-error We are intentionally passing an invalid URI to test the error.
      await expect(createUIResource(options)).rejects.toThrow(
        "MCP-UI SDK: URI must start with 'ui://'.",
      );
    });

    it('should throw error for invalid URI prefix with externalUrl', async () => {
      const options = {
        uri: 'invalid://test-url' as const,
        content: {
          type: 'externalUrl' as const,
          iframeUrl: 'https://example.com',
        },
        encoding: 'text' as const,
      };
      // @ts-expect-error We are intentionally passing an invalid URI to test the error.
      await expect(createUIResource(options)).rejects.toThrow(
        "MCP-UI SDK: URI must start with 'ui://'.",
      );
    });

    it('should throw an error if htmlString is not a string for rawHtml', async () => {
      const options = {
        uri: 'ui://test' as const,
        content: { type: 'rawHtml' as const, htmlString: null },
      };
      // @ts-expect-error intentionally passing invalid type
      await expect(createUIResource(options)).rejects.toThrow(
        "MCP-UI SDK: content.htmlString must be provided as a string when content.type is 'rawHtml'.",
      );
    });

    it('should throw an error if iframeUrl is not a string for externalUrl', async () => {
      const options = {
        uri: 'ui://test' as const,
        content: { type: 'externalUrl' as const, iframeUrl: 123 },
      };
      // @ts-expect-error intentionally passing invalid type
      await expect(createUIResource(options)).rejects.toThrow(
        "MCP-UI SDK: content.iframeUrl must be provided as a string when content.type is 'externalUrl'.",
      );
    });

    it('should use MCP Apps mime type', async () => {
      const options = {
        uri: 'ui://test-html-no-config' as const,
        content: { type: 'rawHtml' as const, htmlString: '<p>Test no config</p>' },
        encoding: 'text' as const,
      };
      const resource = await createUIResource(options);
      expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
      expect(resource.resource.text).toBe('<p>Test no config</p>');
    });
  });
});

describe('sendExperimentalRequest', () => {
  let originalParent: typeof window.parent;
  const mockParent = {
    postMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    originalParent = window.parent;
    // Simulate being inside an iframe by making parent !== window
    Object.defineProperty(window, 'parent', {
      value: mockParent,
      writable: true,
      configurable: true,
    });
    mockParent.postMessage.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'parent', {
      value: originalParent,
      writable: true,
      configurable: true,
    });
  });

  /** Simulate the host responding to a JSON-RPC request via postMessage */
  function simulateResponse(data: Record<string, unknown>, source: unknown = mockParent) {
    const event = new MessageEvent('message', { data, source: source as Window });
    window.dispatchEvent(event);
  }

  it('should reject when not inside an iframe', async () => {
    // Restore parent === window (top-level context)
    Object.defineProperty(window, 'parent', {
      value: window,
      writable: true,
      configurable: true,
    });

    await expect(sendExperimentalRequest('x/test')).rejects.toThrow(
      'sendExperimentalRequest must be called from within an iframe',
    );
  });

  it('should post a JSON-RPC request to the parent window', () => {
    sendExperimentalRequest('x/clipboard/write', { text: 'hello' });

    expect(mockParent.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        jsonrpc: '2.0',
        method: 'x/clipboard/write',
        params: { text: 'hello' },
      }),
      '*',
    );
  });

  it('should omit params when not provided', () => {
    sendExperimentalRequest('x/ping');

    const posted = mockParent.postMessage.mock.calls[0][0];
    expect(posted).not.toHaveProperty('params');
  });

  it('should resolve with the result on a successful response', async () => {
    const promise = sendExperimentalRequest('x/test', { key: 'val' });
    const sentId = mockParent.postMessage.mock.calls[0][0].id;

    simulateResponse({ jsonrpc: '2.0', id: sentId, result: { success: true } });

    await expect(promise).resolves.toEqual({ success: true });
  });

  it('should reject with the error on an error response', async () => {
    const promise = sendExperimentalRequest('x/test');
    const sentId = mockParent.postMessage.mock.calls[0][0].id;

    const error = { code: -32601, message: 'Method not found' };
    simulateResponse({ jsonrpc: '2.0', id: sentId, error });

    await expect(promise).rejects.toEqual(error);
  });

  it('should ignore messages from non-parent sources', async () => {
    const promise = sendExperimentalRequest('x/test', undefined, { timeoutMs: 100 });
    const sentId = mockParent.postMessage.mock.calls[0][0].id;

    // Message from a different source — should be ignored
    simulateResponse({ jsonrpc: '2.0', id: sentId, result: { spoofed: true } }, {} as Window);

    // The promise should still be pending; advance timers to trigger timeout
    vi.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow('timed out');
  });

  it('should ignore messages with non-matching ids', async () => {
    const promise = sendExperimentalRequest('x/test', undefined, { timeoutMs: 100 });
    const sentId = mockParent.postMessage.mock.calls[0][0].id;

    // Response with a different id
    simulateResponse({ jsonrpc: '2.0', id: sentId + 999, result: { wrong: true } });

    vi.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow('timed out');
  });

  it('should reject after default timeout', async () => {
    const promise = sendExperimentalRequest('x/slow');

    vi.advanceTimersByTime(30_000);

    await expect(promise).rejects.toThrow('timed out after 30000ms');
  });

  it('should reject after custom timeout', async () => {
    const promise = sendExperimentalRequest('x/slow', undefined, { timeoutMs: 500 });

    vi.advanceTimersByTime(500);

    await expect(promise).rejects.toThrow('timed out after 500ms');
  });

  it('should not timeout when timeoutMs is 0', async () => {
    const promise = sendExperimentalRequest('x/test', undefined, { timeoutMs: 0 });
    const sentId = mockParent.postMessage.mock.calls[0][0].id;

    // Advance far into the future — should not reject
    vi.advanceTimersByTime(999_999);

    // Now respond — should still resolve
    simulateResponse({ jsonrpc: '2.0', id: sentId, result: { late: true } });

    await expect(promise).resolves.toEqual({ late: true });
  });

  it('should reject immediately when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      sendExperimentalRequest('x/test', undefined, { signal: controller.signal }),
    ).rejects.toThrow('was aborted');
  });

  it('should reject when signal is aborted mid-request', async () => {
    const controller = new AbortController();
    const promise = sendExperimentalRequest('x/test', undefined, {
      signal: controller.signal,
      timeoutMs: 0,
    });

    controller.abort();

    await expect(promise).rejects.toThrow('was aborted');
  });

  it('should clean up the message listener after resolving', async () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const promise = sendExperimentalRequest('x/test');
    const sentId = mockParent.postMessage.mock.calls[0][0].id;

    simulateResponse({ jsonrpc: '2.0', id: sentId, result: {} });
    await promise;

    expect(removeSpy).toHaveBeenCalledWith('message', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('should clean up the message listener after timeout', async () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const promise = sendExperimentalRequest('x/test', undefined, { timeoutMs: 100 });

    vi.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow('timed out');
    expect(removeSpy).toHaveBeenCalledWith('message', expect.any(Function));
    removeSpy.mockRestore();
  });
});
