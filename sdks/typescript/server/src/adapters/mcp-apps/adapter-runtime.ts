/**
 * MCP-UI to MCP Apps Adapter Runtime
 *
 * This module enables existing MCP-UI apps to run in new MCP Apps SEP environments
 * by intercepting MCP-UI protocol messages and translating them to JSON-RPC over postMessage.
 *
 * Note: This file is bundled as a standalone script injected into HTML.
 * Types are imported from @modelcontextprotocol/ext-apps for compile-time safety only.
 * All runtime values (like LATEST_PROTOCOL_VERSION) must be defined locally to avoid
 * bundling the entire ext-apps package into the output.
 *
 * @see https://github.com/modelcontextprotocol/ext-apps
 */

// Import types from ext-apps for compile-time type checking only
// These are erased during compilation and don't affect the bundled output
import type { McpUiHostContext, McpUiInitializeResult } from '@modelcontextprotocol/ext-apps';

// ============================================================================
// Protocol Constants (must match @modelcontextprotocol/ext-apps)
// These are defined locally to avoid bundling the ext-apps package.
// Keep in sync with: https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts
// ============================================================================

/**
 * Current protocol version - must match LATEST_PROTOCOL_VERSION from ext-apps
 * @see https://github.com/modelcontextprotocol/ext-apps
 */
const LATEST_PROTOCOL_VERSION = '2025-11-21';

/**
 * MCP Apps SEP protocol method constants
 * These match the `method` field values from @modelcontextprotocol/ext-apps type definitions:
 * - McpUiInitializeRequest: "ui/initialize"
 * - McpUiInitializedNotification: "ui/notifications/initialized"
 * - McpUiToolInputNotification: "ui/notifications/tool-input"
 * - McpUiToolInputPartialNotification: "ui/notifications/tool-input-partial"
 * - McpUiToolResultNotification: "ui/notifications/tool-result"
 * - McpUiHostContextChangedNotification: "ui/notifications/host-context-changed"
 * - McpUiSizeChangedNotification: "ui/notifications/size-changed"
 * - McpUiResourceTeardownRequest: "ui/resource-teardown"
 *
 * @see https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts
 */
const METHODS = {
  // Lifecycle
  INITIALIZE: 'ui/initialize',
  INITIALIZED: 'ui/notifications/initialized',

  // Tool data (Host -> Guest)
  TOOL_INPUT: 'ui/notifications/tool-input',
  TOOL_INPUT_PARTIAL: 'ui/notifications/tool-input-partial',
  TOOL_RESULT: 'ui/notifications/tool-result',
  TOOL_CANCELLED: 'ui/notifications/tool-cancelled',

  // Context & UI
  HOST_CONTEXT_CHANGED: 'ui/notifications/host-context-changed',
  SIZE_CHANGED: 'ui/notifications/size-changed',
  RESOURCE_TEARDOWN: 'ui/resource-teardown',

  // Standard MCP methods
  TOOLS_CALL: 'tools/call',
  NOTIFICATIONS_MESSAGE: 'notifications/message',
  OPEN_LINK: 'ui/open-link',
  MESSAGE: 'ui/message',
} as const;

// ============================================================================
// Local Types (for runtime - mirrors ext-apps types)
// ============================================================================

/** Configuration for the MCP Apps adapter */
interface McpAppsAdapterConfig {
  logger?: Pick<Console, 'log' | 'warn' | 'error' | 'debug'>;
  timeout?: number;
}

/** Pending request tracking */
interface PendingRequest<T = unknown> {
  messageId: string;
  type: string;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (error: unknown) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

/** MCP-UI message types (legacy protocol from widget) */
interface MCPUIMessage {
  type: string;
  messageId?: string;
  payload?: unknown;
}

/** MCP-UI action result (legacy protocol) */
interface UIActionResult {
  type: string;
  messageId?: string;
  payload?: Record<string, unknown>;
}

type ParentPostMessage = Window['postMessage'];

class McpAppsAdapter {
  private config: Required<McpAppsAdapterConfig>;
  private pendingRequests: Map<string, PendingRequest<unknown>> = new Map();
  private messageIdCounter = 0;
  private originalPostMessage: ParentPostMessage | null = null;
  private parentWindow: Window | null = null;
  private hostCapabilities: McpUiInitializeResult['hostCapabilities'] | null = null;
  private hostContext: McpUiHostContext | null = null;
  private initialized = false;

  // Current render data state (similar to window.openai in Apps SDK)
  private currentRenderData: {
    toolInput?: Record<string, unknown>;
    toolOutput?: unknown;
    widgetState?: unknown;
    locale?: string;
    theme?: string;
    displayMode?: 'inline' | 'pip' | 'fullscreen';
    maxHeight?: number;
  } = {};

  constructor(config: McpAppsAdapterConfig = {}) {
    this.config = {
      logger: config.logger || console,
      timeout: config.timeout || 30000,
    };
  }

  install(): boolean {
    this.parentWindow = window.parent;

    // Debug: Log parent window detection
    this.config.logger.log('[MCP Apps Adapter] Checking parent window...');
    this.config.logger.log('[MCP Apps Adapter] window.parent exists:', !!this.parentWindow);
    this.config.logger.log(
      '[MCP Apps Adapter] window.parent === window:',
      this.parentWindow === window,
    );

    if (!this.parentWindow || this.parentWindow === window) {
      this.config.logger.warn(
        '[MCP Apps Adapter] No parent window detected. Adapter will not activate.',
      );
      return false;
    }

    this.config.logger.log('[MCP Apps Adapter] Initializing adapter...');

    // Monkey-patch parent.postMessage
    this.patchPostMessage();

    // Listen for messages from the host (JSON-RPC)
    window.addEventListener('message', this.handleHostMessage.bind(this));

    // Perform MCP Apps initialization handshake
    this.performInitialization();

    this.config.logger.log('[MCP Apps Adapter] Adapter initialized successfully');
    return true;
  }

  /**
   * Performs the MCP Apps SEP initialization handshake:
   * 1. Send ui/initialize request with adapter info
   * 2. Receive host capabilities and context
   * 3. Send ui/notifications/initialized notification
   * 4. Dispatch ready event to MCP-UI app
   */
  private async performInitialization(): Promise<void> {
    const jsonRpcId = this.generateJsonRpcId();

    // Create a promise to wait for the initialization response
    const initPromise = new Promise<void>((resolve, reject) => {
      this.pendingRequests.set(String(jsonRpcId), {
        messageId: 'init',
        type: 'init',
        resolve: (result: unknown) => {
          // Use McpUiInitializeResult type from ext-apps
          const res = result as McpUiInitializeResult;
          this.hostCapabilities = res?.hostCapabilities ?? null;
          this.hostContext = res?.hostContext ?? null;
          this.initialized = true;

          // Send initialized notification
          this.sendJsonRpcNotification(METHODS.INITIALIZED, {});

          // Update current render data with host context (using McpUiHostContext type)
          if (this.hostContext) {
            if (this.hostContext.theme) this.currentRenderData.theme = this.hostContext.theme;
            if (this.hostContext.displayMode)
              this.currentRenderData.displayMode = this.hostContext.displayMode as
                | 'inline'
                | 'pip'
                | 'fullscreen';
            if (this.hostContext.locale) this.currentRenderData.locale = this.hostContext.locale;
            const dims = this.hostContext.containerDimensions;
            if (dims && 'maxHeight' in dims && dims.maxHeight !== undefined)
              this.currentRenderData.maxHeight = dims.maxHeight;
          }

          // Send initial render data to MCP-UI app
          this.sendRenderData();

          // Signal ready to MCP-UI app
          this.dispatchMessageToIframe({
            type: 'ui-lifecycle-iframe-ready',
          });

          resolve();
        },
        reject: (error: unknown) => {
          this.config.logger.error('[MCP Apps Adapter] Initialization failed:', error);
          reject(error);
        },
        timeoutId: setTimeout(() => {
          this.pendingRequests.delete(String(jsonRpcId));
          this.config.logger.warn('[MCP Apps Adapter] Initialization timed out, proceeding anyway');
          // Even if init times out, signal ready to the MCP-UI app
          this.dispatchMessageToIframe({
            type: 'ui-lifecycle-iframe-ready',
          });
          // Resolve the promise to allow the adapter to proceed
          resolve();
        }, this.config.timeout),
      });
    });

    // Send ui/initialize request
    this.config.logger.log('[MCP Apps Adapter] Sending ui/initialize request with id:', jsonRpcId);
    this.sendJsonRpcRequest(jsonRpcId, METHODS.INITIALIZE, {
      appInfo: {
        name: 'mcp-ui-adapter',
        version: '1.0.0',
      },
      appCapabilities: {},
      protocolVersion: LATEST_PROTOCOL_VERSION,
    });
    this.config.logger.log('[MCP Apps Adapter] ui/initialize request sent');

    try {
      await initPromise;
    } catch (_error) {
      // Initialization failed, but we still try to work
      this.config.logger.warn('[MCP Apps Adapter] Continuing despite initialization error');
    }
  }

  uninstall(): void {
    // Clear pending requests
    for (const request of this.pendingRequests.values()) {
      clearTimeout(request.timeoutId);
      request.reject(new Error('Adapter uninstalled'));
    }
    this.pendingRequests.clear();

    // Restore original postMessage
    if (this.originalPostMessage && this.parentWindow) {
      try {
        this.parentWindow.postMessage = this.originalPostMessage;
        this.config.logger.log('[MCP Apps Adapter] Restored original parent.postMessage');
      } catch (error) {
        this.config.logger.error(
          '[MCP Apps Adapter] Failed to restore original postMessage:',
          error,
        );
      }
    }

    window.removeEventListener('message', this.handleHostMessage.bind(this));
    this.config.logger.log('[MCP Apps Adapter] Adapter uninstalled');
  }

  private patchPostMessage(): void {
    // Save original postMessage
    this.originalPostMessage = this.parentWindow?.postMessage.bind(this.parentWindow) ?? null;

    // Create interceptor
    const postMessageInterceptor: ParentPostMessage = (
      message: unknown,
      targetOriginOrOptions?: string | WindowPostMessageOptions,
      transfer?: Transferable[],
    ): void => {
      if (this.isMCPUIMessage(message)) {
        const mcpMessage = message as MCPUIMessage;
        this.config.logger.debug('[MCP Apps Adapter] Intercepted MCP-UI message:', mcpMessage.type);
        this.handleMCPUIMessage(mcpMessage);
      } else {
        // Forward non-MCP-UI messages
        if (this.originalPostMessage) {
          if (typeof targetOriginOrOptions === 'string' || targetOriginOrOptions === undefined) {
            const targetOrigin = targetOriginOrOptions ?? '*';
            this.originalPostMessage(message, targetOrigin, transfer);
          } else {
            this.originalPostMessage(message, targetOriginOrOptions);
          }
        }
      }
    };

    try {
      if (this.parentWindow) {
        this.parentWindow.postMessage = postMessageInterceptor;
      }
    } catch (error) {
      this.config.logger.error(
        '[MCP Apps Adapter] Failed to monkey-patch parent.postMessage:',
        error,
      );
    }
  }

  private isMCPUIMessage(message: unknown): boolean {
    if (!message || typeof message !== 'object') {
      return false;
    }
    const msg = message as Record<string, unknown>;
    return (
      typeof msg.type === 'string' &&
      (msg.type.startsWith('ui-') ||
        ['tool', 'prompt', 'intent', 'notify', 'link'].includes(msg.type))
    );
  }

  /**
   * Handles messages coming from the Host (JSON-RPC) and translates them to MCP-UI messages
   *
   * MCP Apps SEP protocol methods (from @modelcontextprotocol/ext-apps):
   * - ui/notifications/tool-input: Complete tool arguments
   * - ui/notifications/tool-input-partial: Streaming partial tool arguments
   * - ui/notifications/tool-result: Tool execution results
   * - ui/notifications/host-context-changed: Theme, viewport, locale changes
   * - ui/notifications/size-changed: Size change notifications (bidirectional)
   * - ui/notifications/tool-cancelled: Tool execution was cancelled
   * - ui/resource-teardown: Host notifies UI before teardown (request)
   */
  private handleHostMessage(event: MessageEvent) {
    const data = event.data;
    if (!data || typeof data !== 'object' || !data.jsonrpc) {
      return; // Not a JSON-RPC message
    }

    this.config.logger.debug('[MCP Apps Adapter] Received JSON-RPC message:', data);

    // Handle notifications from host
    if (data.method) {
      switch (data.method) {
        // MCP Apps SEP: Complete tool input notification
        case METHODS.TOOL_INPUT:
          // Update stored render data (like Apps SDK's window.openai.toolInput)
          this.currentRenderData.toolInput = data.params?.arguments;
          this.sendRenderData();
          break;

        // MCP Apps SEP: Partial/streaming tool input notification
        case METHODS.TOOL_INPUT_PARTIAL:
          // Update stored render data with partial input
          this.currentRenderData.toolInput = data.params?.arguments;
          this.sendRenderData();
          break;

        // MCP Apps SEP: Tool execution result notification
        case METHODS.TOOL_RESULT:
          // Update stored render data (like Apps SDK's window.openai.toolOutput)
          this.currentRenderData.toolOutput = data.params;
          this.sendRenderData();
          break;

        // MCP Apps SEP: Host context changed (theme, viewport, etc.)
        case METHODS.HOST_CONTEXT_CHANGED: {
          // Update stored render data with context
          if (data.params?.theme) this.currentRenderData.theme = data.params.theme;
          if (data.params?.displayMode)
            this.currentRenderData.displayMode = data.params.displayMode;
          if (data.params?.locale) this.currentRenderData.locale = data.params.locale;
          const contextDims = data.params?.containerDimensions;
          if (contextDims && 'maxHeight' in contextDims && contextDims.maxHeight !== undefined)
            this.currentRenderData.maxHeight = contextDims.maxHeight;
          this.sendRenderData();
          break;
        }

        // MCP Apps SEP: Size change notification from host
        case METHODS.SIZE_CHANGED:
          // Host is informing us of size constraints
          if (data.params?.height) this.currentRenderData.maxHeight = data.params.height;
          this.sendRenderData();
          break;

        // MCP Apps SEP: Tool execution was cancelled
        case METHODS.TOOL_CANCELLED:
          // Notify the widget that the tool was cancelled
          this.dispatchMessageToIframe({
            type: 'ui-lifecycle-tool-cancelled',
            payload: {
              reason: data.params?.reason,
            },
          });
          break;

        // MCP Apps SEP: Host notifies UI before teardown (this is a request, not notification)
        case METHODS.RESOURCE_TEARDOWN:
          // Notify the widget that it's about to be torn down
          this.dispatchMessageToIframe({
            type: 'ui-lifecycle-teardown',
            payload: {
              reason: data.params?.reason,
            },
          });
          // Send success response to host
          if (data.id) {
            this.sendJsonRpcResponse(data.id, {});
          }
          break;
      }
    } else if (data.id) {
      // Handle responses to our requests
      const pendingRequest = this.pendingRequests.get(String(data.id));
      if (pendingRequest) {
        if (data.error) {
          pendingRequest.reject(new Error(data.error.message));
        } else {
          pendingRequest.resolve(data.result);
        }
        this.pendingRequests.delete(String(data.id));
        clearTimeout(pendingRequest.timeoutId);

        // Send response back to the app (if expected)
        this.dispatchMessageToIframe({
          type: 'ui-message-response',
          messageId: pendingRequest.messageId, // The original message ID from the App
          payload: {
            messageId: pendingRequest.messageId,
            response: data.result,
            error: data.error,
          },
        });
      }
    }
  }

  /**
   * Handles messages coming from the App (MCP-UI) and translates them to Host (JSON-RPC)
   *
   * MCP-UI message types translated to MCP Apps SEP:
   * - 'tool' -> tools/call request
   * - 'ui-size-change' -> ui/notifications/size-changed notification
   * - 'notify' -> notifications/message notification (logging)
   * - 'link' -> ui/open-link request
   * - 'prompt' -> ui/message request
   * - 'ui-lifecycle-iframe-ready' -> ui/notifications/initialized notification
   */
  private async handleMCPUIMessage(message: MCPUIMessage): Promise<void> {
    const messageId = message.messageId || this.generateMessageId();

    // Acknowledge receipt immediately
    this.dispatchMessageToIframe({
      type: 'ui-message-received',
      payload: { messageId },
    });

    try {
      switch (message.type) {
        // MCP-UI tool call -> MCP Apps tools/call
        case 'tool': {
          const { toolName, params } = (message as UIActionResult).payload as {
            toolName: string;
            params: unknown;
          };
          const jsonRpcId = this.generateJsonRpcId();

          this.pendingRequests.set(String(jsonRpcId), {
            messageId,
            type: 'tool',
            resolve: () => {}, // Handled in handleHostMessage
            reject: () => {},
            timeoutId: setTimeout(() => {
              this.pendingRequests.delete(String(jsonRpcId));
              this.dispatchMessageToIframe({
                type: 'ui-message-response',
                messageId,
                payload: { messageId, error: 'Timeout' },
              });
            }, this.config.timeout),
          });

          this.sendJsonRpcRequest(jsonRpcId, METHODS.TOOLS_CALL, {
            name: toolName,
            arguments: params,
          });
          break;
        }

        // MCP-UI size change -> MCP Apps ui/notifications/size-changed
        case 'ui-size-change': {
          const { width, height } = (
            message as MCPUIMessage & { payload: { width?: number; height?: number } }
          ).payload;
          this.sendJsonRpcNotification(METHODS.SIZE_CHANGED, { width, height });
          break;
        }

        // MCP-UI notification -> MCP Apps notifications/message (logging)
        case 'notify': {
          const { message: msg } = (message as UIActionResult).payload as { message: string };
          this.sendJsonRpcNotification(METHODS.NOTIFICATIONS_MESSAGE, {
            level: 'info',
            data: msg,
          });
          break;
        }

        // MCP-UI link -> MCP Apps ui/open-link request
        case 'link': {
          const { url } = (message as UIActionResult).payload as { url: string };
          const jsonRpcId = this.generateJsonRpcId();

          this.pendingRequests.set(String(jsonRpcId), {
            messageId,
            type: 'link',
            resolve: () => {},
            reject: () => {},
            timeoutId: setTimeout(() => {
              this.pendingRequests.delete(String(jsonRpcId));
              this.dispatchMessageToIframe({
                type: 'ui-message-response',
                messageId,
                payload: { messageId, error: 'Timeout' },
              });
            }, this.config.timeout),
          });

          this.sendJsonRpcRequest(jsonRpcId, METHODS.OPEN_LINK, { url });
          break;
        }

        // MCP-UI prompt -> MCP Apps ui/message request
        case 'prompt': {
          const { prompt } = (message as UIActionResult).payload as { prompt: string };
          const jsonRpcId = this.generateJsonRpcId();

          this.pendingRequests.set(String(jsonRpcId), {
            messageId,
            type: 'prompt',
            resolve: () => {},
            reject: () => {},
            timeoutId: setTimeout(() => {
              this.pendingRequests.delete(String(jsonRpcId));
              this.dispatchMessageToIframe({
                type: 'ui-message-response',
                messageId,
                payload: { messageId, error: 'Timeout' },
              });
            }, this.config.timeout),
          });

          this.sendJsonRpcRequest(jsonRpcId, METHODS.MESSAGE, {
            role: 'user',
            content: [{ type: 'text', text: prompt }],
          });
          break;
        }

        // MCP-UI iframe ready -> MCP Apps ui/notifications/initialized
        case 'ui-lifecycle-iframe-ready': {
          this.sendJsonRpcNotification(METHODS.INITIALIZED, {});
          // Also send current render data (like Apps SDK)
          this.sendRenderData();
          break;
        }

        // MCP-UI request render data -> Send current render data
        case 'ui-request-render-data': {
          this.sendRenderData(messageId);
          break;
        }

        // MCP-UI intent -> Currently no direct equivalent in MCP Apps
        // We translate it to a ui/message with the intent description
        case 'intent': {
          const { intent, params } = (message as UIActionResult).payload as {
            intent: string;
            params: unknown;
          };
          const jsonRpcId = this.generateJsonRpcId();

          this.pendingRequests.set(String(jsonRpcId), {
            messageId,
            type: 'intent',
            resolve: () => {},
            reject: () => {},
            timeoutId: setTimeout(() => {
              this.pendingRequests.delete(String(jsonRpcId));
              this.dispatchMessageToIframe({
                type: 'ui-message-response',
                messageId,
                payload: { messageId, error: 'Timeout' },
              });
            }, this.config.timeout),
          });

          // Translate intent to a message
          this.sendJsonRpcRequest(jsonRpcId, METHODS.MESSAGE, {
            role: 'user',
            content: [
              { type: 'text', text: `Intent: ${intent}. Parameters: ${JSON.stringify(params)}` },
            ],
          });
          break;
        }
      }
    } catch (error) {
      this.config.logger.error('[MCP Apps Adapter] Error handling message:', error);
      this.dispatchMessageToIframe({
        type: 'ui-message-response',
        messageId,
        payload: { messageId, error },
      });
    }
  }

  /**
   * Send current render data to the MCP-UI app
   * This mirrors the Apps SDK adapter's sendRenderData method
   */
  private sendRenderData(requestMessageId?: string): void {
    this.dispatchMessageToIframe({
      type: 'ui-lifecycle-iframe-render-data',
      messageId: requestMessageId,
      payload: {
        renderData: {
          toolInput: this.currentRenderData.toolInput,
          toolOutput: this.currentRenderData.toolOutput,
          widgetState: this.currentRenderData.widgetState,
          locale: this.currentRenderData.locale,
          theme: this.currentRenderData.theme,
          displayMode: this.currentRenderData.displayMode,
          maxHeight: this.currentRenderData.maxHeight,
        },
      },
    });
  }

  private sendJsonRpcRequest(
    id: number | string,
    method: string,
    params?: Record<string, unknown>,
  ) {
    this.originalPostMessage?.(
      {
        jsonrpc: '2.0',
        id,
        method,
        params,
      },
      '*',
    );
  }

  private sendJsonRpcResponse(id: number | string, result: Record<string, unknown>) {
    this.originalPostMessage?.(
      {
        jsonrpc: '2.0',
        id,
        result,
      },
      '*',
    );
  }

  private sendJsonRpcNotification(method: string, params?: Record<string, unknown>) {
    this.originalPostMessage?.(
      {
        jsonrpc: '2.0',
        method,
        params,
      },
      '*',
    );
  }

  private dispatchMessageToIframe(data: MCPUIMessage): void {
    const event = new MessageEvent('message', {
      data,
      origin: window.location.origin, // Same origin since we are inside the iframe
      source: window,
    });
    window.dispatchEvent(event);
  }

  private generateMessageId(): string {
    return `adapter-${Date.now()}-${++this.messageIdCounter}`;
  }

  private generateJsonRpcId(): number {
    return ++this.messageIdCounter;
  }
}

let adapterInstance: McpAppsAdapter | null = null;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function initAdapter(config?: McpAppsAdapterConfig): boolean {
  if (adapterInstance) {
    console.warn('[MCP Apps Adapter] Adapter already initialized');
    return true;
  }
  adapterInstance = new McpAppsAdapter(config);
  return adapterInstance.install();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function uninstallAdapter(): void {
  if (adapterInstance) {
    adapterInstance.uninstall();
    adapterInstance = null;
  }
}
