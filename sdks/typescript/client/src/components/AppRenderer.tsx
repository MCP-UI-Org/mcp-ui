import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

import { type Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  type CallToolRequest,
  type CallToolResult,
  type ListPromptsRequest,
  type ListPromptsResult,
  type ListResourcesRequest,
  type ListResourcesResult,
  type ListResourceTemplatesRequest,
  type ListResourceTemplatesResult,
  type LoggingMessageNotification,
  type ReadResourceRequest,
  type ReadResourceResult,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

import {
  AppBridge,
  RESOURCE_MIME_TYPE,
  type McpUiMessageRequest,
  type McpUiMessageResult,
  type McpUiOpenLinkRequest,
  type McpUiOpenLinkResult,
  type McpUiSizeChangedNotification,
  type McpUiToolInputPartialNotification,
  type McpUiHostContext,
} from '@modelcontextprotocol/ext-apps/app-bridge';

import { AppFrame, type SandboxConfig } from './AppFrame';
import { getToolUiResourceUri, readToolUiResourceHtml } from '../utils/app-host-utils';

/**
 * Extra metadata passed to request handlers (from AppBridge).
 */
export type RequestHandlerExtra = Parameters<Parameters<AppBridge['setRequestHandler']>[1]>[1];

/**
 * Handle to access AppRenderer methods for sending notifications to the Guest UI.
 * Obtained via ref on AppRenderer.
 */
export interface AppRendererHandle {
  /** Notify the Guest UI that the server's tool list has changed */
  sendToolListChanged: () => void;
  /** Notify the Guest UI that the server's resource list has changed */
  sendResourceListChanged: () => void;
  /** Notify the Guest UI that the server's prompt list has changed */
  sendPromptListChanged: () => void;
  /** Notify the Guest UI that the resource is being torn down / cleaned up */
  teardownResource: () => void;
}

/**
 * Props for the AppRenderer component.
 */
export interface AppRendererProps {
  /** MCP client connected to the server providing the tool. Omit to disable automatic MCP forwarding and use custom handlers instead. */
  client?: Client;

  /** Name of the MCP tool to render UI for */
  toolName: string;

  /** Sandbox configuration */
  sandbox: SandboxConfig;

  /** Optional pre-fetched resource URI. If not provided, will be fetched via getToolUiResourceUri() */
  toolResourceUri?: string;

  /** Optional pre-fetched HTML. If provided, skips all resource fetching */
  html?: string;

  /** Optional input arguments to pass to the tool UI once it's ready */
  toolInput?: Record<string, unknown>;

  /** Optional result from tool execution to pass to the tool UI once it's ready */
  toolResult?: CallToolResult;

  /** Partial/streaming tool input to send to the guest UI */
  toolInputPartial?: McpUiToolInputPartialNotification['params'];

  /** Set to true to notify the guest UI that the tool execution was cancelled */
  toolCancelled?: boolean;

  /** Host context (theme, viewport, locale, etc.) to pass to the guest UI */
  hostContext?: McpUiHostContext;

  /** Handler for open-link requests from the guest UI */
  onOpenLink?: (
    params: McpUiOpenLinkRequest['params'],
    extra: RequestHandlerExtra,
  ) => Promise<McpUiOpenLinkResult>;

  /** Handler for message requests from the guest UI */
  onMessage?: (
    params: McpUiMessageRequest['params'],
    extra: RequestHandlerExtra,
  ) => Promise<McpUiMessageResult>;

  /** Handler for logging messages from the guest UI */
  onLoggingMessage?: (params: LoggingMessageNotification['params']) => void;

  /** Handler for size change notifications from the guest UI */
  onSizeChanged?: (params: McpUiSizeChangedNotification['params']) => void;

  /** Callback invoked when an error occurs during setup or message handling */
  onError?: (error: Error) => void;

  // --- MCP Request Handlers (override automatic forwarding) ---

  /**
   * Handler for tools/call requests from the guest UI.
   * If provided, overrides the automatic forwarding to the MCP client.
   */
  onCallTool?: (
    params: CallToolRequest['params'],
    extra: RequestHandlerExtra,
  ) => Promise<CallToolResult>;

  /**
   * Handler for resources/list requests from the guest UI.
   * If provided, overrides the automatic forwarding to the MCP client.
   */
  onListResources?: (
    params: ListResourcesRequest['params'],
    extra: RequestHandlerExtra,
  ) => Promise<ListResourcesResult>;

  /**
   * Handler for resources/templates/list requests from the guest UI.
   * If provided, overrides the automatic forwarding to the MCP client.
   */
  onListResourceTemplates?: (
    params: ListResourceTemplatesRequest['params'],
    extra: RequestHandlerExtra,
  ) => Promise<ListResourceTemplatesResult>;

  /**
   * Handler for resources/read requests from the guest UI.
   * If provided, overrides the automatic forwarding to the MCP client.
   */
  onReadResource?: (
    params: ReadResourceRequest['params'],
    extra: RequestHandlerExtra,
  ) => Promise<ReadResourceResult>;

  /**
   * Handler for prompts/list requests from the guest UI.
   * If provided, overrides the automatic forwarding to the MCP client.
   */
  onListPrompts?: (
    params: ListPromptsRequest['params'],
    extra: RequestHandlerExtra,
  ) => Promise<ListPromptsResult>;
}

/**
 * React component that renders an MCP tool's custom UI in a sandboxed iframe.
 *
 * This component manages the complete lifecycle of an MCP-UI tool:
 * 1. Creates AppBridge for MCP communication
 * 2. Fetches the tool's UI resource (HTML) if not provided
 * 3. Delegates rendering to AppFrame
 * 4. Handles UI actions (intents, link opening, prompts, notifications)
 *
 * For lower-level control or when you already have the HTML content,
 * use the AppFrame component directly.
 *
 * @example Basic usage
 * ```tsx
 * <AppRenderer
 *   sandbox={{ url: new URL('http://localhost:8765/sandbox_proxy.html') }}
 *   client={mcpClient}
 *   toolName="create-chart"
 *   toolInput={{ data: [1, 2, 3], type: 'bar' }}
 *   onOpenLink={async ({ url }) => window.open(url)}
 *   onError={(error) => console.error('UI Error:', error)}
 * />
 * ```
 *
 * @example With pre-fetched HTML (skips resource fetching)
 * ```tsx
 * <AppRenderer
 *   sandbox={{ url: sandboxUrl }}
 *   client={mcpClient}
 *   toolName="my-tool"
 *   html={preloadedHtml}
 *   toolInput={args}
 * />
 * ```
 *
 * @example Using ref to access AppBridge methods
 * ```tsx
 * const appRef = useRef<AppRendererHandle>(null);
 *
 * // Notify guest UI when tools change
 * useEffect(() => {
 *   appRef.current?.sendToolListChanged();
 * }, [toolsVersion]);
 *
 * <AppRenderer ref={appRef} ... />
 * ```
 *
 * @example With custom MCP request handlers (no client)
 * ```tsx
 * <AppRenderer
 *   // client omitted - use toolResourceUri + onReadResource to fetch HTML
 *   sandbox={{ url: sandboxUrl }}
 *   toolName="my-tool"
 *   toolResourceUri="ui://my-server/my-tool"
 *   onReadResource={async ({ uri }) => {
 *     // Proxy to your MCP client (e.g., in a different context)
 *     return myMcpProxy.readResource({ uri });
 *   }}
 *   onCallTool={async (params) => {
 *     // Custom tool call handling with caching/filtering
 *     return myCustomToolCall(params);
 *   }}
 *   onListResources={async () => {
 *     // Aggregate resources from multiple servers
 *     return { resources: [...server1Resources, ...server2Resources] };
 *   }}
 * />
 * ```
 */
export const AppRenderer = forwardRef<AppRendererHandle, AppRendererProps>((props, ref) => {
  const {
    client,
    toolName,
    sandbox,
    toolResourceUri,
    html: htmlProp,
    toolInput,
    toolResult,
    toolInputPartial,
    toolCancelled,
    hostContext,
    onMessage,
    onOpenLink,
    onLoggingMessage,
    onSizeChanged,
    onError,
    onCallTool,
    onListResources,
    onListResourceTemplates,
    onReadResource,
    onListPrompts,
  } = props;

  // State
  const [appBridge, setAppBridge] = useState<AppBridge | null>(null);
  const [html, setHtml] = useState<string | null>(htmlProp ?? null);
  const [error, setError] = useState<Error | null>(null);

  // Refs for callbacks
  const onMessageRef = useRef(onMessage);
  const onOpenLinkRef = useRef(onOpenLink);
  const onLoggingMessageRef = useRef(onLoggingMessage);
  const onSizeChangedRef = useRef(onSizeChanged);
  const onErrorRef = useRef(onError);
  const onCallToolRef = useRef(onCallTool);
  const onListResourcesRef = useRef(onListResources);
  const onListResourceTemplatesRef = useRef(onListResourceTemplates);
  const onReadResourceRef = useRef(onReadResource);
  const onListPromptsRef = useRef(onListPrompts);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenLinkRef.current = onOpenLink;
    onLoggingMessageRef.current = onLoggingMessage;
    onSizeChangedRef.current = onSizeChanged;
    onErrorRef.current = onError;
    onCallToolRef.current = onCallTool;
    onListResourcesRef.current = onListResources;
    onListResourceTemplatesRef.current = onListResourceTemplates;
    onReadResourceRef.current = onReadResource;
    onListPromptsRef.current = onListPrompts;
  });

  // Expose send methods via ref for Host → Guest notifications
  useImperativeHandle(
    ref,
    () => ({
      sendToolListChanged: () => appBridge?.sendToolListChanged(),
      sendResourceListChanged: () => appBridge?.sendResourceListChanged(),
      sendPromptListChanged: () => appBridge?.sendPromptListChanged(),
      teardownResource: () => appBridge?.teardownResource({}),
    }),
    [appBridge],
  );

  // Effect 1: Create and configure AppBridge
  useEffect(() => {
    let mounted = true;

    const createBridge = () => {
      try {
        const serverCapabilities = client?.getServerCapabilities();
        const bridge = new AppBridge(
          client ?? null,
          {
            name: 'MCP-UI Host',
            version: '1.0.0',
          },
          {
            openLinks: {},
            serverTools: serverCapabilities?.tools,
            serverResources: serverCapabilities?.resources,
          },
        );

        // Register message handler
        bridge.onmessage = async (params, extra) => {
          if (onMessageRef.current) {
            return onMessageRef.current(params, extra);
          } else {
            throw new McpError(ErrorCode.MethodNotFound, 'Method not found');
          }
        };

        // Register open-link handler
        bridge.onopenlink = async (params, extra) => {
          if (onOpenLinkRef.current) {
            return onOpenLinkRef.current(params, extra);
          } else {
            throw new McpError(ErrorCode.MethodNotFound, 'Method not found');
          }
        };

        // Register logging handler
        bridge.onloggingmessage = (params) => {
          if (onLoggingMessageRef.current) {
            onLoggingMessageRef.current(params);
          }
        };

        // Register custom MCP request handlers (these override automatic forwarding)
        if (onCallToolRef.current) {
          bridge.oncalltool = (params, extra) => onCallToolRef.current!(params, extra);
        }
        if (onListResourcesRef.current) {
          bridge.onlistresources = (params, extra) => onListResourcesRef.current!(params, extra);
        }
        if (onListResourceTemplatesRef.current) {
          bridge.onlistresourcetemplates = (params, extra) =>
            onListResourceTemplatesRef.current!(params, extra);
        }
        if (onReadResourceRef.current) {
          bridge.onreadresource = (params, extra) => onReadResourceRef.current!(params, extra);
        }
        if (onListPromptsRef.current) {
          bridge.onlistprompts = (params, extra) => onListPromptsRef.current!(params, extra);
        }

        if (!mounted) return;
        setAppBridge(bridge);
      } catch (err) {
        console.error('[AppRenderer] Error creating bridge:', err);
        if (!mounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onErrorRef.current?.(error);
      }
    };

    createBridge();

    return () => {
      mounted = false;
    };
  }, [client]);

  // Effect 2: Fetch HTML if not provided
  useEffect(() => {
    if (htmlProp) {
      setHtml(htmlProp);
      return;
    }

    // Determine if we can fetch HTML
    const canFetchWithClient = !!client;
    const canFetchWithCallback = !!toolResourceUri && !!onReadResourceRef.current;

    if (!canFetchWithClient && !canFetchWithCallback) {
      setError(
        new Error(
          "Either 'html' prop, 'client', or ('toolResourceUri' + 'onReadResource') must be provided to fetch UI resource",
        ),
      );
      return;
    }

    let mounted = true;

    const fetchHtml = async () => {
      try {
        // Get resource URI
        let uri: string;
        if (toolResourceUri) {
          uri = toolResourceUri;
          console.log(`[AppRenderer] Using provided resource URI: ${uri}`);
        } else if (client) {
          console.log(`[AppRenderer] Fetching resource URI for tool: ${toolName}`);
          const info = await getToolUiResourceUri(client, toolName);
          if (!info) {
            throw new Error(
              `Tool ${toolName} has no UI resource (no ui/resourceUri in tool._meta)`,
            );
          }
          uri = info.uri;
          console.log(`[AppRenderer] Got resource URI: ${uri}`);
        } else {
          throw new Error('Cannot determine resource URI without client or toolResourceUri');
        }

        if (!mounted) return;

        // Read HTML content - use client if available, otherwise use onReadResource callback
        console.log(`[AppRenderer] Reading resource HTML from: ${uri}`);
        let htmlContent: string;

        if (client) {
          htmlContent = await readToolUiResourceHtml(client, { uri });
        } else if (onReadResourceRef.current) {
          // Use the onReadResource callback to fetch the HTML
          const result = await onReadResourceRef.current({ uri }, {} as RequestHandlerExtra);
          if (!result.contents || result.contents.length !== 1) {
            throw new Error('Unsupported UI resource content length: ' + result.contents?.length);
          }
          const content = result.contents[0];
          const isHtml = (t?: string) => t === RESOURCE_MIME_TYPE;

          if ('text' in content && typeof content.text === 'string' && isHtml(content.mimeType)) {
            htmlContent = content.text;
          } else if (
            'blob' in content &&
            typeof content.blob === 'string' &&
            isHtml(content.mimeType)
          ) {
            htmlContent = atob(content.blob);
          } else {
            throw new Error('Unsupported UI resource content format: ' + JSON.stringify(content));
          }
        } else {
          throw new Error('No way to read resource HTML');
        }

        if (!mounted) return;

        setHtml(htmlContent);
      } catch (err) {
        if (!mounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onErrorRef.current?.(error);
      }
    };

    fetchHtml();

    return () => {
      mounted = false;
    };
  }, [client, toolName, toolResourceUri, htmlProp]);

  // Effect 3: Sync host context when it changes
  useEffect(() => {
    if (appBridge && hostContext) {
      appBridge.setHostContext(hostContext);
    }
  }, [appBridge, hostContext]);

  // Effect 4: Send partial tool input when it changes
  useEffect(() => {
    if (appBridge && toolInputPartial) {
      appBridge.sendToolInputPartial(toolInputPartial);
    }
  }, [appBridge, toolInputPartial]);

  // Effect 5: Send tool cancelled notification when flag is set
  useEffect(() => {
    if (appBridge && toolCancelled) {
      appBridge.sendToolCancelled({});
    }
  }, [appBridge, toolCancelled]);

  // Handle size change callback
  const handleSizeChanged = onSizeChangedRef.current;

  // Render error state
  if (error) {
    return <div style={{ color: 'red', padding: '1rem' }}>Error: {error.message}</div>;
  }

  // Render loading state
  if (!appBridge || !html) {
    return null;
  }

  // Render AppFrame with the fetched HTML and configured bridge
  return (
    <AppFrame
      html={html}
      sandbox={sandbox}
      appBridge={appBridge}
      toolInput={toolInput}
      toolResult={toolResult}
      onSizeChanged={handleSizeChanged}
      onError={onError}
    />
  );
});

AppRenderer.displayName = 'AppRenderer';
