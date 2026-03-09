import type { CreateUIResourceOptions, UIResourceProps } from './types.js';
import { UI_METADATA_PREFIX } from './types.js';

/** Maximum response body size in bytes (10 MB). */
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

/** Default fetch timeout in milliseconds (30 seconds). */
const FETCH_TIMEOUT_MS = 30_000;

/** Hostnames that are always blocked to prevent SSRF. */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  '[::0]',
  '[0000::1]',
]);

/**
 * Returns true if the hostname belongs to a private/reserved IPv4 range.
 * Checks 10.x.x.x, 172.16-31.x.x, 192.168.x.x, and 169.254.x.x (link-local).
 */
function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4) return false;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return false;

  const [a, b] = nums;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true;

  return false;
}

/**
 * Validates that a URL is safe for server-side fetching.
 * Restricts to http/https and blocks private/reserved network addresses.
 *
 * @throws Error if the URL is invalid or targets a restricted address.
 */
export function validateExternalUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`MCP-UI SDK: Invalid external URL: "${url}"`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `MCP-UI SDK: External URL must use http or https protocol, got "${parsed.protocol}" in "${url}"`,
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error(
      `MCP-UI SDK: External URL must not target localhost or loopback addresses: "${url}"`,
    );
  }

  if (isPrivateIPv4(hostname)) {
    throw new Error(
      `MCP-UI SDK: External URL must not target private network addresses: "${url}"`,
    );
  }

  return parsed;
}

/**
 * Fetches the HTML content from an external URL and injects a `<base>` tag
 * so that relative paths (CSS, JS, images, etc.) resolve against the original URL.
 *
 * Includes SSRF protections (protocol/host validation), a timeout, and a
 * response size limit.
 *
 * @param url The external URL to fetch.
 * @returns The fetched HTML with a `<base>` tag injected.
 */
export async function fetchExternalUrl(url: string): Promise<string> {
  validateExternalUrl(url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(
        `MCP-UI SDK: Failed to fetch external URL "${url}": ${response.status} ${response.statusText}`,
      );
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
      throw new Error(
        `MCP-UI SDK: External URL response too large (${contentLength} bytes, max ${MAX_RESPONSE_BYTES}): "${url}"`,
      );
    }

    // Read body in chunks to enforce size limit even without content-length
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error(`MCP-UI SDK: Unable to read response body from "${url}"`);
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        reader.cancel();
        throw new Error(
          `MCP-UI SDK: External URL response too large (exceeded ${MAX_RESPONSE_BYTES} bytes): "${url}"`,
        );
      }
      chunks.push(value);
    }

    const decoder = new TextDecoder();
    const html = chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join('') +
      decoder.decode();

    return injectBaseTag(html, url);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Injects a `<base href="...">` tag into HTML so relative paths resolve against
 * the given URL. If the HTML already contains a `<base` tag, it is left as-is.
 */
export function injectBaseTag(html: string, url: string): string {
  // Don't add <base> if one already exists
  if (/<base\s/i.test(html)) {
    return html;
  }

  const baseTag = `<base href="${escapeHtmlAttr(url)}">`;

  // Inject after <head> or <head ...> if present
  const headMatch = html.match(/<head(\s[^>]*)?>/i);
  if (headMatch) {
    const insertPos = headMatch.index! + headMatch[0].length;
    return html.slice(0, insertPos) + baseTag + html.slice(insertPos);
  }

  // No <head> tag — prepend
  return baseTag + html;
}

function escapeHtmlAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Extracts the origin (scheme + host) from a URL string.
 * Returns undefined if the URL is invalid.
 */
export function extractOrigin(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

export function getAdditionalResourceProps(
  resourceOptions: Partial<CreateUIResourceOptions>,
): UIResourceProps {
  const additionalResourceProps = { ...(resourceOptions.resourceProps ?? {}) } as UIResourceProps;

  // prefix ui specific metadata with the prefix to be recognized by the client
  if (resourceOptions.uiMetadata || resourceOptions.metadata) {
    const uiPrefixedMetadata = Object.fromEntries(
      Object.entries(resourceOptions.uiMetadata ?? {}).map(([key, value]) => [
        `${UI_METADATA_PREFIX}${key}`,
        value,
      ]),
    );
    // allow user defined _meta to override ui metadata
    additionalResourceProps._meta = {
      ...uiPrefixedMetadata,
      ...(resourceOptions.metadata ?? {}),
      ...(additionalResourceProps._meta ?? {}),
    };
  }

  return additionalResourceProps;
}

/**
 * Robustly encodes a UTF-8 string to Base64.
 * Uses Node.js Buffer if available, otherwise TextEncoder and btoa.
 * @param str The string to encode.
 * @returns Base64 encoded string.
 */
export function utf8ToBase64(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  } else if (typeof TextEncoder !== 'undefined' && typeof btoa !== 'undefined') {
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(str);
    // Efficiently convert Uint8Array to binary string, handling large arrays in chunks
    let binaryString = '';
    // 8192 is a common chunk size used in JavaScript for performance reasons.
    // It tends to align well with internal buffer sizes and memory page sizes,
    // and it's small enough to avoid stack overflow errors with String.fromCharCode.
    const CHUNK_SIZE = 8192;
    for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
      binaryString += String.fromCharCode(...uint8Array.slice(i, i + CHUNK_SIZE));
    }
    return btoa(binaryString);
  } else {
    console.warn(
      'MCP-UI SDK: Buffer API and TextEncoder/btoa not available. Base64 encoding might not be UTF-8 safe.',
    );
    try {
      return btoa(str);
    } catch (_e) {
      throw new Error(
        'MCP-UI SDK: Suitable UTF-8 to Base64 encoding method not found, and fallback btoa failed.',
      );
    }
  }
}
