import type { EmbeddedResource, Resource } from '@modelcontextprotocol/sdk/types.js';

// Re-export constants from the official ext-apps SDK for convenience
// This ensures we stay in sync with the MCP Apps specification
export { RESOURCE_URI_META_KEY, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps';

// Primary identifier for the resource. Starts with ui://`
export type URI = `ui://${string}`;

// text/html;profile=mcp-app is the MCP Apps standard MIME type
export type MimeType = 'text/html;profile=mcp-app';

export type HTMLTextContent = {
  uri: URI;
  mimeType: MimeType;
  text: string; // HTML content or iframe URL
  blob?: never;
  _meta?: Record<string, unknown>;
};

export type Base64BlobContent = {
  uri: URI;
  mimeType: MimeType;
  blob: string; // Base64 encoded HTML content or iframe URL
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
