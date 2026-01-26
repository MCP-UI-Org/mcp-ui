import type { EmbeddedResource, Resource } from '@modelcontextprotocol/sdk/types.js';
import type { McpAppsAdapterConfig } from './adapters/mcp-apps/types.js';

// Re-export constants from the official ext-apps SDK for convenience
// This ensures we stay in sync with the MCP Apps specification
export { RESOURCE_URI_META_KEY, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps';

// Primary identifier for the resource. Starts with ui://`
export type URI = `ui://${string}`;

// text/html;profile=mcp-app is the MCP Apps standard MIME type
export type MimeType =
  | 'text/html'
  | 'text/html;profile=mcp-app'
  | 'text/html+skybridge';

export type HTMLTextContent = {
  uri: URI;
  mimeType: MimeType;
  text: string; // HTML content (for mimeType `text/html`), or iframe URL (for mimeType `text/uri-list`)
  blob?: never;
  _meta?: Record<string, unknown>;
};

export type Base64BlobContent = {
  uri: URI;
  mimeType: MimeType;
  blob: string; //  Base64 encoded HTML content (for mimeType `text/html`), or iframe URL (for mimeType `text/uri-list`)
  text?: never;
  _meta?: Record<string, unknown>;
};

export type ResourceContentPayload =
  | { type: 'rawHtml'; htmlString: string }
  | { type: 'externalUrl'; iframeUrl: string };

export interface CreateUIResourceOptions {
  uri: URI;
  content: ResourceContentPayload;
  encoding: 'text' | 'blob';
  // specific mcp-ui metadata
  uiMetadata?: UIResourceMetadata;
  // additional metadata to be passed on _meta
  metadata?: Record<string, unknown>;
  // additional resource props to be passed on the resource itself
  resourceProps?: UIResourceProps;
  // additional resource props to be passed on the top-level embedded resource (i.e. annotations)
  embeddedResourceProps?: EmbeddedUIResourceProps;
  // Adapters for different environments (e.g., Apps SDK)
  adapters?: AdaptersConfig;
}

/**
 * Configuration for adapters - only ONE adapter can be enabled at a time.
 * Each adapter produces a different MIME type, and resources can only have one MIME type.
 *
 * Use one of these configurations:
 * - `{ appsSdk: { enabled: true, ... } }` for ChatGPT/Apps SDK hosts
 * - `{ mcpApps: { enabled: true, ... } }` for MCP Apps SEP hosts
 *
 * @example Valid configurations
 * ```ts
 * // ✓ Apps SDK adapter only
 * const config1: AdaptersConfig = { appsSdk: { enabled: true } };
 *
 * // ✓ MCP Apps adapter only
 * const config2: AdaptersConfig = { mcpApps: { enabled: true } };
 *
 * // ✓ No adapters
 * const config3: AdaptersConfig = {};
 * ```
 *
 * @example Invalid configuration (TypeScript error)
 * ```ts
 * // ✗ Both adapters specified - compile-time error:
 * // "Type '{ appsSdk: ...; mcpApps: ...; }' is not assignable to type 'AdaptersConfig'"
 * const invalid: AdaptersConfig = {
 *   appsSdk: { enabled: true },
 *   mcpApps: { enabled: true }  // Error: mcpApps is 'never' when appsSdk is set
 * };
 * ```
 */
export type AdaptersConfig =
  | { appsSdk: AppsSdkAdapterOptions; mcpApps?: never }
  | { mcpApps: McpAppsAdapterOptions; appsSdk?: never }
  | { appsSdk?: undefined; mcpApps?: undefined };

/**
 * Configuration options for Apps SDK adapter
 */
export interface AppsSdkAdapterOptions {
  /**
   * Whether to enable the Apps SDK adapter.
   * When enabled, the adapter script will be automatically injected into HTML content,
   * allowing MCP-UI widgets to work in Apps SDK environments (e.g., ChatGPT).
   * @default false
   */
  enabled: boolean;

  /**
   * Custom configuration for the adapter
   */
  config?: {
    /**
     * How to handle 'intent' messages (defaults to 'prompt')
     * - 'prompt': Convert to sendFollowupTurn with intent description
     * - 'ignore': Log and acknowledge but take no action
     */
    intentHandling?: 'prompt' | 'ignore';

    /**
     * Timeout in milliseconds for async operations (defaults to 30000)
     */
    timeout?: number;

    /**
     * Origin to use when dispatching MessageEvents to the iframe (defaults to window.location.origin)
     */
    hostOrigin?: string;
  };

  /**
   * MIME type to use when this adapter is enabled.
   * @default 'text/html+skybridge'
   */
  mimeType?: string;
}

/**
 * Configuration options for MCP Apps adapter
 */
export interface McpAppsAdapterOptions {
  /**
   * Whether to enable the MCP Apps adapter.
   * When enabled, the adapter script will be automatically injected into HTML content,
   * allowing existing MCP-UI widgets to work in new MCP Apps hosts.
   * @default false
   */
  enabled: boolean;

  /**
   * Custom configuration for the adapter
   */
  config?: McpAppsAdapterConfig;
}

export type UIResourceProps = Omit<Partial<Resource>, 'uri' | 'mimeType'>;
export type EmbeddedUIResourceProps = Omit<Partial<EmbeddedResource>, 'resource' | 'type'>;

export const UIMetadataKey = {
  PREFERRED_FRAME_SIZE: 'preferred-frame-size',
  INITIAL_RENDER_DATA: 'initial-render-data',
} as const;

export const UI_METADATA_PREFIX = 'mcpui.dev/ui-';

export type UIResourceMetadata = {
  [UIMetadataKey.PREFERRED_FRAME_SIZE]?: [string, string];
  [UIMetadataKey.INITIAL_RENDER_DATA]?: Record<string, unknown>;
};

export type UIActionType = 'tool' | 'prompt' | 'link' | 'intent' | 'notify';

type GenericActionMessage = {
  messageId?: string;
};

export type UIActionResultToolCall = GenericActionMessage & {
  type: 'tool';
  payload: {
    toolName: string;
    params: Record<string, unknown>;
  };
};

export type UIActionResultPrompt = GenericActionMessage & {
  type: 'prompt';
  payload: {
    prompt: string;
  };
};

export type UIActionResultLink = GenericActionMessage & {
  type: 'link';
  payload: {
    url: string;
  };
};

export type UIActionResultIntent = GenericActionMessage & {
  type: 'intent';
  payload: {
    intent: string;
    params: Record<string, unknown>;
  };
};

export type UIActionResultNotification = GenericActionMessage & {
  type: 'notify';
  payload: {
    message: string;
  };
};

export type UIActionResult =
  | UIActionResultToolCall
  | UIActionResultPrompt
  | UIActionResultLink
  | UIActionResultIntent
  | UIActionResultNotification;
