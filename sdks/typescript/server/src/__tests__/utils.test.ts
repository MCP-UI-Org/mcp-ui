import { describe, it, expect, vi } from 'vitest';
import {
  extractOrigin,
  fetchExternalUrl,
  getAdditionalResourceProps,
  injectBaseTag,
  utf8ToBase64,
  validateExternalUrl,
} from '../utils.js';
import { UI_METADATA_PREFIX, RESOURCE_MIME_TYPE } from '../types.js';
import { mockFetchWithBody } from './test-utils';
import { RESOURCE_MIME_TYPE as EXT_APPS_RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps';

describe('getAdditionalResourceProps', () => {
  it('should return the additional resource props', () => {
    const uiMetadata = {
      'preferred-frame-size': ['100px', '100px'] as [string, string],
      'initial-render-data': { test: 'test' },
    };
    const additionalResourceProps = getAdditionalResourceProps({ uiMetadata });
    expect(additionalResourceProps).toEqual({
      _meta: {
        [`${UI_METADATA_PREFIX}preferred-frame-size`]: ['100px', '100px'],
        [`${UI_METADATA_PREFIX}initial-render-data`]: { test: 'test' },
      },
    });
  });

  it('should return the additional resource props with user defined _meta', () => {
    const uiMetadata = {
      'preferred-frame-size': ['100px', '100px'] as [string, string],
      'initial-render-data': { test: 'test' },
    };
    const additionalResourceProps = getAdditionalResourceProps({
      uiMetadata,
      resourceProps: {
        annotations: { audience: 'user' },
        _meta: { foo: 'bar', [`${UI_METADATA_PREFIX}preferred-frame-size`]: ['200px', '200px'] },
      },
    });
    expect(additionalResourceProps).toEqual({
      _meta: {
        [`${UI_METADATA_PREFIX}initial-render-data`]: { test: 'test' },
        foo: 'bar',
        [`${UI_METADATA_PREFIX}preferred-frame-size`]: ['200px', '200px'],
      },
      annotations: { audience: 'user' },
    });
  });

  it('should return an empty object if no uiMetadata or metadata is provided', () => {
    const additionalResourceProps = getAdditionalResourceProps({});
    expect(additionalResourceProps).toEqual({});
  });

  it('should respect order of overriding metadata', () => {
    const additionalResourceProps = getAdditionalResourceProps({
      uiMetadata: { 'preferred-frame-size': ['100px', '100px'] as [string, string] },
      metadata: { [`${UI_METADATA_PREFIX}preferred-frame-size`]: ['200px', '200px'], foo: 'bar' },
      resourceProps: { annotations: { audience: 'user' }, _meta: { foo: 'baz' } },
    });
    expect(additionalResourceProps).toEqual({
      _meta: {
        [`${UI_METADATA_PREFIX}preferred-frame-size`]: ['200px', '200px'],
        foo: 'baz',
      },
      annotations: { audience: 'user' },
    });
  });
});

describe('utf8ToBase64', () => {
  it('should correctly encode a simple ASCII string', () => {
    const str = 'hello world';
    const expected = 'aGVsbG8gd29ybGQ=';
    expect(utf8ToBase64(str)).toBe(expected);
  });

  it('should correctly encode a string with UTF-8 characters', () => {
    const str = '你好,世界';
    const expected = '5L2g5aW9LOS4lueVjA==';
    expect(utf8ToBase64(str)).toBe(expected);
  });

  it('should correctly encode an empty string', () => {
    const str = '';
    const expected = '';
    expect(utf8ToBase64(str)).toBe(expected);
  });

  it('should correctly encode a string with various special characters', () => {
    const str = '`~!@#$%^&*()_+-=[]{}\\|;\':",./<>?';
    const expected = 'YH4hQCMkJV4mKigpXystPVtde31cfDsnOiIsLi88Pj8=';
    expect(utf8ToBase64(str)).toBe(expected);
  });

  it('should use TextEncoder and btoa when Buffer is not available', () => {
    const str = 'hello world';
    const expected = 'aGVsbG8gd29ybGQ=';

    const bufferBackup = global.Buffer;
    // @ts-expect-error - simulating Buffer not being available
    delete global.Buffer;

    expect(utf8ToBase64(str)).toBe(expected);

    global.Buffer = bufferBackup;
  });

  it('should use fallback btoa when Buffer and TextEncoder are not available', () => {
    const str = 'hello world';
    const expected = 'aGVsbG8gd29ybGQ=';

    const bufferBackup = global.Buffer;
    const textEncoderBackup = global.TextEncoder;

    // @ts-expect-error - simulating Buffer not being available
    delete global.Buffer;
    // @ts-expect-error - simulating TextEncoder not being available
    delete global.TextEncoder;

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(utf8ToBase64(str)).toBe(expected);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'MCP-UI SDK: Buffer API and TextEncoder/btoa not available. Base64 encoding might not be UTF-8 safe.',
    );

    consoleWarnSpy.mockRestore();
    global.Buffer = bufferBackup;
    global.TextEncoder = textEncoderBackup;
  });

  it('should throw an error if all encoding methods fail', () => {
    const str = 'hello world';

    const bufferBackup = global.Buffer;
    const textEncoderBackup = global.TextEncoder;
    const btoaBackup = global.btoa;

    // @ts-expect-error - simulating Buffer not being available
    delete global.Buffer;
    // @ts-expect-error - simulating TextEncoder not being available
    delete global.TextEncoder;
    // @ts-expect-error - simulating btoa not being available
    delete global.btoa;

    expect(() => utf8ToBase64(str)).toThrow(
      'MCP-UI SDK: Suitable UTF-8 to Base64 encoding method not found, and fallback btoa failed.',
    );

    global.Buffer = bufferBackup;
    global.TextEncoder = textEncoderBackup;
    global.btoa = btoaBackup;
  });
});

describe('injectBaseTag', () => {
  it('should inject after <head>', () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    expect(injectBaseTag(html, 'https://example.com/page')).toBe(
      '<html><head><base href="https://example.com/page"><title>Test</title></head><body></body></html>',
    );
  });

  it('should inject after <head> with attributes', () => {
    const html = '<html><head lang="en"><title>Test</title></head></html>';
    expect(injectBaseTag(html, 'https://example.com')).toBe(
      '<html><head lang="en"><base href="https://example.com"><title>Test</title></head></html>',
    );
  });

  it('should prepend if no <head> tag', () => {
    const html = '<p>Hello</p>';
    expect(injectBaseTag(html, 'https://example.com')).toBe(
      '<base href="https://example.com"><p>Hello</p>',
    );
  });

  it('should not add if <base> already exists', () => {
    const html = '<html><head><base href="https://other.com"><title>T</title></head></html>';
    expect(injectBaseTag(html, 'https://example.com')).toBe(html);
  });

  it('should escape ampersands and quotes in URL', () => {
    const html = '<head></head>';
    expect(injectBaseTag(html, 'https://example.com/a?b=1&c="2"')).toBe(
      '<head><base href="https://example.com/a?b=1&amp;c=&quot;2&quot;"></head>',
    );
  });
});

describe('extractOrigin', () => {
  it('should extract origin from a valid URL', () => {
    expect(extractOrigin('https://example.com/page?q=1')).toBe('https://example.com');
  });

  it('should include port if non-default', () => {
    expect(extractOrigin('https://example.com:8080/path')).toBe('https://example.com:8080');
  });

  it('should return undefined for invalid URLs', () => {
    expect(extractOrigin('not a url')).toBeUndefined();
  });
});

describe('validateExternalUrl', () => {
  it('should accept valid http URLs', () => {
    expect(() => validateExternalUrl('http://example.com')).not.toThrow();
  });

  it('should accept valid https URLs', () => {
    expect(() => validateExternalUrl('https://example.com/page?q=1')).not.toThrow();
  });

  it('should reject non-http protocols', () => {
    expect(() => validateExternalUrl('ftp://example.com')).toThrow('must use http or https');
    expect(() => validateExternalUrl('file:///etc/passwd')).toThrow('must use http or https');
  });

  it('should reject invalid URLs', () => {
    expect(() => validateExternalUrl('not a url')).toThrow('Invalid external URL');
  });

  it('should reject localhost', () => {
    expect(() => validateExternalUrl('http://localhost:3000')).toThrow('localhost or loopback');
    expect(() => validateExternalUrl('http://127.0.0.1:8080')).toThrow('localhost or loopback');
    expect(() => validateExternalUrl('http://[::1]/page')).toThrow('localhost or loopback');
    expect(() => validateExternalUrl('http://0.0.0.0')).toThrow('localhost or loopback');
  });

  it('should reject private IPv4 ranges', () => {
    expect(() => validateExternalUrl('http://10.0.0.1')).toThrow('private network');
    expect(() => validateExternalUrl('http://172.16.0.1')).toThrow('private network');
    expect(() => validateExternalUrl('http://172.31.255.255')).toThrow('private network');
    expect(() => validateExternalUrl('http://192.168.1.1')).toThrow('private network');
    expect(() => validateExternalUrl('http://169.254.169.254')).toThrow('private network');
  });

  it('should allow public IPs and non-private ranges', () => {
    expect(() => validateExternalUrl('http://8.8.8.8')).not.toThrow();
    expect(() => validateExternalUrl('http://172.32.0.1')).not.toThrow();
    expect(() => validateExternalUrl('https://203.0.113.1')).not.toThrow();
  });
});

describe('fetchExternalUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should fetch and inject <base> tag', async () => {
    mockFetchWithBody('<html><head></head><body>Hi</body></html>');

    const result = await fetchExternalUrl('https://example.com/page');
    expect(fetch).toHaveBeenCalledWith('https://example.com/page', expect.objectContaining({
      signal: expect.any(AbortSignal),
      redirect: 'follow',
    }));
    expect(result).toBe(
      '<html><head><base href="https://example.com/page"></head><body>Hi</body></html>',
    );
  });

  it('should throw on non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
      }),
    );

    await expect(fetchExternalUrl('https://example.com/error')).rejects.toThrow(
      'Failed to fetch external URL "https://example.com/error": 500 Internal Server Error',
    );
  });

  it('should reject URLs with non-http protocols', async () => {
    await expect(fetchExternalUrl('ftp://example.com')).rejects.toThrow('must use http or https');
  });

  it('should reject localhost URLs', async () => {
    await expect(fetchExternalUrl('http://localhost:3000')).rejects.toThrow('localhost or loopback');
  });

  it('should reject private IP URLs', async () => {
    await expect(fetchExternalUrl('http://10.0.0.1/admin')).rejects.toThrow('private network');
  });

  it('should reject responses exceeding content-length limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-length': '999999999' }),
        body: { getReader: () => ({ read: () => Promise.resolve({ done: true, value: undefined }), cancel: vi.fn() }) },
      }),
    );

    await expect(fetchExternalUrl('https://example.com/huge')).rejects.toThrow(
      'response too large',
    );
  });

  it('should reject responses exceeding streaming size limit', async () => {
    // Create a mock that returns chunks totalling over 10MB
    const bigChunk = new Uint8Array(6 * 1024 * 1024); // 6MB
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: () => {
              callCount++;
              if (callCount <= 2) {
                return Promise.resolve({ done: false, value: bigChunk });
              }
              return Promise.resolve({ done: true, value: undefined });
            },
            cancel: vi.fn(),
          }),
        },
      }),
    );

    await expect(fetchExternalUrl('https://example.com/stream-huge')).rejects.toThrow(
      'response too large',
    );
  });
});

describe('RESOURCE_MIME_TYPE constant from @modelcontextprotocol/ext-apps', () => {
  it('should match the expected MCP Apps MIME type', () => {
    // This test ensures that if @modelcontextprotocol/ext-apps changes RESOURCE_MIME_TYPE,
    // we'll be alerted to the breaking change
    expect(EXT_APPS_RESOURCE_MIME_TYPE).toBe('text/html;profile=mcp-app');
  });

  it('should be re-exported correctly from types.ts', () => {
    // Verify that our re-export matches the original
    expect(RESOURCE_MIME_TYPE).toBe(EXT_APPS_RESOURCE_MIME_TYPE);
  });
});
