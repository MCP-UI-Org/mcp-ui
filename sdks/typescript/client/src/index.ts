export { getUIResourceMetadata, getResourceMetadata } from './utils/metadataUtils';
export { isUIResource } from './utils/isUIResource';

// Client capabilities for UI extension support
export {
  type ClientCapabilitiesWithExtensions,
  UI_EXTENSION_NAME,
  UI_EXTENSION_CONFIG,
  UI_EXTENSION_CAPABILITIES,
} from './capabilities';

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
} from '@modelcontextprotocol/ext-apps/app-bridge';

// Re-export JSONRPCRequest for typing onFallbackRequest handlers
export type { JSONRPCRequest } from '@modelcontextprotocol/sdk/types.js';

export type { UIResourceMetadata } from './types';
