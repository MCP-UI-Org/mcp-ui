import {
  Base64BlobContent,
  CreateUIResourceOptions,
  HTMLTextContent,
  MimeType,
  RESOURCE_MIME_TYPE,
  UIActionResult,
  UIActionResultLink,
  UIActionResultNotification,
  UIActionResultPrompt,
  UIActionResultIntent,
  UIActionResultToolCall,
} from './types.js';
import {
  getAdditionalResourceProps,
  utf8ToBase64,
  wrapHtmlWithAdapters,
  getAdapterMimeType,
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
 * @param options Configuration for the interactive resource.
 * @returns a UIResource
 */
export function createUIResource(options: CreateUIResourceOptions): UIResource {
  let actualContentString: string;
  let mimeType: MimeType;

  if (options.content.type === 'rawHtml') {
    if (!options.uri.startsWith('ui://')) {
      throw new Error("MCP-UI SDK: URI must start with 'ui://' when content.type is 'rawHtml'.");
    }
    actualContentString = options.content.htmlString;
    if (typeof actualContentString !== 'string') {
      throw new Error(
        "MCP-UI SDK: content.htmlString must be provided as a string when content.type is 'rawHtml'.",
      );
    }

    // Wrap with adapters if any are enabled
    if (options.adapters) {
      actualContentString = wrapHtmlWithAdapters(actualContentString, options.adapters);
      // Use adapter's mime type if provided, otherwise fall back to MCP Apps standard
      mimeType = (getAdapterMimeType(options.adapters) as MimeType) ?? RESOURCE_MIME_TYPE;
    } else {
      // Default to MCP Apps standard MIME type
      mimeType = RESOURCE_MIME_TYPE;
    }
  } else if (options.content.type === 'externalUrl') {
    if (!options.uri.startsWith('ui://')) {
      throw new Error(
        "MCP-UI SDK: URI must start with 'ui://' when content.type is 'externalUrl'.",
      );
    }
    const iframeUrl = options.content.iframeUrl;
    if (typeof iframeUrl !== 'string') {
      throw new Error(
        "MCP-UI SDK: content.iframeUrl must be provided as a string when content.type is 'externalUrl'.",
      );
    }
    actualContentString = iframeUrl;
    // externalUrl now uses the same MIME type as rawHtml - hosts that support
    // external URLs will detect the URL content and handle it appropriately
    mimeType = RESOURCE_MIME_TYPE;
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
        mimeType: mimeType as MimeType,
        text: actualContentString,
        ...getAdditionalResourceProps(options),
      };
      break;
    case 'blob':
      resource = {
        uri: options.uri,
        mimeType: mimeType as MimeType,
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
  UIActionResult,
  AdaptersConfig,
  AppsSdkAdapterOptions,
} from './types.js';

// Re-export constants from @modelcontextprotocol/ext-apps via types.js
// This allows users to import everything they need from @mcp-ui/server
export { RESOURCE_URI_META_KEY, RESOURCE_MIME_TYPE } from './types.js';

// Export adapters
export { wrapHtmlWithAdapters, getAdapterMimeType } from './utils.js';
export * from './adapters/index.js';

export function postUIActionResult(result: UIActionResult): void {
  if (window.parent) {
    window.parent.postMessage(result, '*');
  }
}

export const InternalMessageType = {
  UI_MESSAGE_RECEIVED: 'ui-message-received',
  UI_MESSAGE_RESPONSE: 'ui-message-response',

  UI_SIZE_CHANGE: 'ui-size-change',

  UI_LIFECYCLE_IFRAME_READY: 'ui-lifecycle-iframe-ready',
  UI_LIFECYCLE_IFRAME_RENDER_DATA: 'ui-lifecycle-iframe-render-data',

  UI_RAWHTML_CONTENT: 'ui-html-content',
};

export const ReservedUrlParams = {
  WAIT_FOR_RENDER_DATA: 'waitForRenderData',
} as const;

export function uiActionResultToolCall(
  toolName: string,
  params: Record<string, unknown>,
): UIActionResultToolCall {
  return {
    type: 'tool',
    payload: {
      toolName,
      params,
    },
  };
}

export function uiActionResultPrompt(prompt: string): UIActionResultPrompt {
  return {
    type: 'prompt',
    payload: {
      prompt,
    },
  };
}

export function uiActionResultLink(url: string): UIActionResultLink {
  return {
    type: 'link',
    payload: {
      url,
    },
  };
}

export function uiActionResultIntent(
  intent: string,
  params: Record<string, unknown>,
): UIActionResultIntent {
  return {
    type: 'intent',
    payload: {
      intent,
      params,
    },
  };
}

export function uiActionResultNotification(message: string): UIActionResultNotification {
  return {
    type: 'notify',
    payload: {
      message,
    },
  };
}
