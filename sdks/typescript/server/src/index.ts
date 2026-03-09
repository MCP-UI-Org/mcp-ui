import {
  type Base64BlobContent,
  type CreateUIResourceOptions,
  type HTMLTextContent,
  type MimeType,
  RESOURCE_MIME_TYPE,
} from './types.js';
import {
  fetchExternalUrl,
  getAdditionalResourceProps,
  utf8ToBase64,
} from './utils.js';

export type UIResource = {
  type: 'resource';
  resource: HTMLTextContent | Base64BlobContent;
  annotations?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
};

/**
 * Creates a UIResource.
 * This is the object that should be included in the 'content' array of a toolResult.
 *
 * For `externalUrl` content, fetches the URL's HTML and injects a `<base>` tag
 * so that relative paths resolve against the original URL.
 *
 * @param options Configuration for the interactive resource.
 * @returns a UIResource (async for externalUrl content which requires fetching)
 */
export async function createUIResource(options: CreateUIResourceOptions): Promise<UIResource> {
  let actualContentString: string;
  const mimeType: MimeType = RESOURCE_MIME_TYPE;

  if (!options.uri.startsWith('ui://')) {
    throw new Error("MCP-UI SDK: URI must start with 'ui://'.");
  }

  if (options.content.type === 'rawHtml') {
    actualContentString = options.content.htmlString;
    if (typeof actualContentString !== 'string') {
      throw new Error(
        "MCP-UI SDK: content.htmlString must be provided as a string when content.type is 'rawHtml'.",
      );
    }
  } else if (options.content.type === 'externalUrl') {
    const iframeUrl = options.content.iframeUrl;
    if (typeof iframeUrl !== 'string') {
      throw new Error(
        "MCP-UI SDK: content.iframeUrl must be provided as a string when content.type is 'externalUrl'.",
      );
    }
    actualContentString = await fetchExternalUrl(iframeUrl);
  } else {
    // This case should ideally be prevented by TypeScript's discriminated union checks
    const exhaustiveCheckContent: never = options.content;
    throw new Error(`MCP-UI SDK: Invalid content.type specified: ${exhaustiveCheckContent}`);
  }

  let resource: UIResource['resource'];

  switch (options.encoding) {
    case 'text':
      resource = {
        uri: options.uri,
        mimeType,
        text: actualContentString,
        ...getAdditionalResourceProps(options),
      };
      break;
    case 'blob':
      resource = {
        uri: options.uri,
        mimeType,
        blob: utf8ToBase64(actualContentString),
        ...getAdditionalResourceProps(options),
      };
      break;
    default: {
      const exhaustiveCheck: never = options.encoding;
      throw new Error(`MCP-UI SDK: Invalid encoding type: ${exhaustiveCheck}`);
    }
  }

  return {
    type: 'resource',
    resource: resource,
    ...(options.embeddedResourceProps ?? {}),
  };
}

export type {
  CreateUIResourceOptions,
  ResourceContentPayload,
} from './types.js';

// Re-export constants from @modelcontextprotocol/ext-apps via types.js
// This allows users to import everything they need from @mcp-ui/server
export { RESOURCE_URI_META_KEY, RESOURCE_MIME_TYPE } from './types.js';

// --- Experimental JSON-RPC helpers ---
// These enable guest UIs to send custom JSON-RPC requests to the host's
// onFallbackRequest handler on AppRenderer, using the existing PostMessageTransport.

let _experimentalRequestId = 0;

const DEFAULT_EXPERIMENTAL_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Send an experimental JSON-RPC request to the host from inside a guest UI iframe.
 *
 * The host must have an `onFallbackRequest` handler registered on AppRenderer.
 * The request flows through PostMessageTransport and AppBridge's fallbackRequestHandler.
 *
 * @param method - JSON-RPC method name. Convention: use "x/<namespace>/<action>" for
 *   experimental methods (e.g., "x/clipboard/write"). Standard MCP methods not yet
 *   in the Apps spec (e.g., "sampling/createMessage") can use their canonical names.
 * @param params - Request parameters
 * @param options - Optional configuration
 * @param options.signal - AbortSignal to cancel the request
 * @param options.timeoutMs - Timeout in milliseconds (default: 30000). Set to 0 to disable.
 * @returns Promise that resolves with the host's JSON-RPC response result, or rejects
 *   with the JSON-RPC error
 *
 * @example
 * ```ts
 * const result = await sendExperimentalRequest('x/clipboard/write', { text: 'hello' });
 * ```
 */
export function sendExperimentalRequest(
  method: string,
  params?: Record<string, unknown>,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<unknown> {
  if (window.parent === window) {
    return Promise.reject(
      new Error('sendExperimentalRequest must be called from within an iframe'),
    );
  }

  const id = ++_experimentalRequestId;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_EXPERIMENTAL_REQUEST_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      window.removeEventListener('message', handler);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      options?.signal?.removeEventListener('abort', onAbort);
    };

    const handler = (event: MessageEvent) => {
      // Only accept responses from the parent window
      if (event.source !== window.parent) return;

      const data = event.data;
      if (data?.jsonrpc === '2.0' && data?.id === id) {
        cleanup();
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data.result);
        }
      }
    };

    const onAbort = () => {
      cleanup();
      reject(new Error(`Experimental request "${method}" was aborted`));
    };

    if (options?.signal?.aborted) {
      reject(new Error(`Experimental request "${method}" was aborted`));
      return;
    }

    options?.signal?.addEventListener('abort', onAbort);
    window.addEventListener('message', handler);

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Experimental request "${method}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }

    window.parent.postMessage(
      {
        jsonrpc: '2.0',
        id,
        method,
        ...(params !== undefined && { params }),
      },
      '*',
    );
  });
}
