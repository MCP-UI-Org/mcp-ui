export { getUIResourceMetadata, getResourceMetadata } from './utils/metadataUtils';
export { isUIResource } from './utils/isUIResource';

// Client capabilities for UI extension support
export {
  type ClientCapabilitiesWithExtensions,
  UI_EXTENSION_NAME,
  UI_EXTENSION_CONFIG,
  UI_EXTENSION_CAPABILITIES,
} from './capabilities';

// Dynamic View Content (ext-apps PR #699): generic detection helpers and
// the fallback content-renderer registry types
export {
  isViewContentBlock,
  getViewContentBlocks,
  getViewContentRendererUri,
  type FallbackContentRenderer,
  type FallbackContentRenderers,
  type GetViewContentBlocksOptions,
} from './view-content';

// A2UI layer: MIME constants, a2ui-specific detection, and the default
// fallback registry (the bundled generic renderer itself is exposed via the
// '@mcp-ui/client/a2ui-renderer' subpath export)
export {
  A2UI_MIME_TYPE,
  A2UI_LEGACY_MIME_TYPE,
  A2UI_MIME_TYPES,
  isA2uiContentBlock,
  getA2uiContentBlocks,
  hasA2uiContent,
  DEFAULT_FALLBACK_CONTENT_RENDERERS,
} from './a2ui/detection';

// MCP Apps renderers
export {
  AppRenderer,
  type AppRendererProps,
  type AppRendererHandle,
  type RequestHandlerExtra,
} from './components/AppRenderer';
export {
  AppFrame,
  type AppFrameProps,
  type SandboxConfig,
  type AppInfo,
} from './components/AppFrame';

// Re-export AppBridge, transport, and common types for advanced use cases
export {
  AppBridge,
  PostMessageTransport,
  type McpUiHostContext,
  type McpUiHostCapabilities,
} from '@modelcontextprotocol/ext-apps/app-bridge';

// Re-export MCP SDK types commonly used with AppRenderer
export type { Implementation, JSONRPCRequest } from '@modelcontextprotocol/sdk/types.js';

export type { UIResourceMetadata } from './types';
