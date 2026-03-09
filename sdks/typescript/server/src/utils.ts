import type { CreateUIResourceOptions, UIResourceProps } from './types.js';
import { UI_METADATA_PREFIX } from './types.js';

/**
 * Fetches the HTML content from an external URL and injects a `<base>` tag
 * so that relative paths (CSS, JS, images, etc.) resolve against the original URL.
 *
 * @param url The external URL to fetch.
 * @returns The fetched HTML with a `<base>` tag injected.
 */
export async function fetchExternalUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `MCP-UI SDK: Failed to fetch external URL "${url}": ${response.status} ${response.statusText}`,
    );
  }
  const html = await response.text();
  return injectBaseTag(html, url);
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
