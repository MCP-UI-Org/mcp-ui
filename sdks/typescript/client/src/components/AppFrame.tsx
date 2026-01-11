import { useEffect, useRef, useState } from 'react';

import type { CallToolResult, Implementation } from '@modelcontextprotocol/sdk/types.js';

import {
  AppBridge,
  PostMessageTransport,
  type McpUiSizeChangedNotification,
  type McpUiResourceCsp,
  type McpUiAppCapabilities,
} from '@modelcontextprotocol/ext-apps/app-bridge';

import { setupSandboxProxyIframe } from '../utils/app-host-utils';

/**
 * Build sandbox URL with CSP query parameter for HTTP header-based CSP enforcement.
 *
 * When the proxy server supports it, CSP passed via query parameter allows the server
 * to set CSP via HTTP headers (tamper-proof) rather than relying on meta tags or
 * postMessage-based CSP injection (which can be bypassed by malicious content).
 *
 * @see https://github.com/modelcontextprotocol/ext-apps/pull/234
 */
function buildSandboxUrl(baseUrl: URL, csp?: McpUiResourceCsp): URL {
  const url = new URL(baseUrl.href);
  if (csp && Object.keys(csp).length > 0) {
    url.searchParams.set('csp', JSON.stringify(csp));
  }
  return url;
}

/**
 * Information about the guest app, available after initialization.
 */
export interface AppInfo {
  /** Guest app's name and version */
  appVersion?: Implementation;
  /** Guest app's declared capabilities */
  appCapabilities?: McpUiAppCapabilities;
}

/**
 * Sandbox configuration for the iframe.
 */
export interface SandboxConfig {
  /** URL to the sandbox proxy HTML */
  url: URL;
  /** Override iframe sandbox attribute (default: "allow-scripts allow-same-origin allow-forms") */
  permissions?: string;
  /**
   * CSP metadata for the sandbox.
   *
   * This CSP is passed to the sandbox proxy in two ways:
   * 1. Via URL query parameter (`?csp=<json>`) - allows servers that support it to set
   *    CSP via HTTP headers (tamper-proof, recommended)
   * 2. Via postMessage after sandbox loads - fallback for proxies that don't parse query params
   *
   * For maximum security, use a proxy server that reads the `csp` query parameter and sets
   * Content-Security-Policy HTTP headers accordingly.
   *
   * @see https://github.com/modelcontextprotocol/ext-apps/pull/234
   */
  csp?: McpUiResourceCsp;
}

/**
 * Props for the AppFrame component.
 */
export interface AppFrameProps {
  /** Pre-fetched HTML content to render in the sandbox */
  html: string;

  /** Sandbox configuration */
  sandbox: SandboxConfig;

  /** Pre-configured AppBridge for MCP communication (required) */
  appBridge: AppBridge;

  /** Callback when guest reports size change */
  onSizeChanged?: (params: McpUiSizeChangedNotification['params']) => void;

  /** Callback when app initialization completes, with app info */
  onInitialized?: (appInfo: AppInfo) => void;

  /** Tool input arguments to send when app initializes */
  toolInput?: Record<string, unknown>;

  /** Tool result to send when app initializes */
  toolResult?: CallToolResult;

  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

/**
 * Low-level component that renders pre-fetched HTML in a sandboxed iframe.
 *
 * This component requires a pre-configured AppBridge for MCP communication.
 * For automatic AppBridge creation and resource fetching, use the higher-level
 * AppRenderer component instead.
 *
 * @example With pre-configured AppBridge
 * ```tsx
 * const appBridge = new AppBridge(client, hostInfo, capabilities);
 * // ... configure appBridge handlers ...
 *
 * <AppFrame
 *   html={htmlContent}
 *   sandbox={{ url: sandboxUrl }}
 *   appBridge={appBridge}
 *   toolInput={args}
 *   toolResult={result}
 *   onSizeChanged={({ width, height }) => console.log('Size:', width, height)}
 * />
 * ```
 */
export const AppFrame = (props: AppFrameProps) => {
  const {
    html,
    sandbox,
    appBridge,
    onSizeChanged,
    onInitialized,
    toolInput,
    toolResult,
    onError,
  } = props;

  const [iframeReady, setIframeReady] = useState(false);
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Track the current sandbox URL to detect when it changes
  const currentSandboxUrlRef = useRef<string | null>(null);
  // Track the current appBridge to detect when it changes (for isolation)
  const currentAppBridgeRef = useRef<AppBridge | null>(null);

  // Refs for callbacks to avoid effect re-runs
  const onSizeChangedRef = useRef(onSizeChanged);
  const onInitializedRef = useRef(onInitialized);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSizeChangedRef.current = onSizeChanged;
    onInitializedRef.current = onInitialized;
    onErrorRef.current = onError;
  });

  // Effect 1: Set up sandbox iframe and connect AppBridge
  useEffect(() => {
    // Build sandbox URL with CSP query parameter for HTTP header-based CSP enforcement.
    // Servers that support this will parse the CSP from the query param and set it via
    // HTTP headers (tamper-proof). The CSP is also sent via postMessage as fallback.
    const sandboxUrl = buildSandboxUrl(sandbox.url, sandbox.csp);
    const sandboxUrlString = sandboxUrl.href;

    // If we already have an iframe set up for this sandbox URL AND the same appBridge, skip setup
    // This preserves the iframe state across React re-renders (including StrictMode)
    // but ensures isolation when switching to a different app/resource (different appBridge)
    if (
      currentSandboxUrlRef.current === sandboxUrlString &&
      currentAppBridgeRef.current === appBridge &&
      iframeRef.current
    ) {
      return;
    }

    // Reset state when setting up a new iframe/bridge to ensure isolation
    // between different apps/resources
    setIframeReady(false);
    setBridgeConnected(false);
    setError(null);

    let mounted = true;

    const setup = async () => {
      try {
        // If switching to a different sandbox URL or appBridge, clean up the old iframe first
        if (iframeRef.current && containerRef.current?.contains(iframeRef.current)) {
          containerRef.current.removeChild(iframeRef.current);
          iframeRef.current = null;
          currentSandboxUrlRef.current = null;
          currentAppBridgeRef.current = null;
        }

        const { iframe, onReady } = await setupSandboxProxyIframe(sandboxUrl);

        if (!mounted) return;

        iframeRef.current = iframe;
        currentSandboxUrlRef.current = sandboxUrlString;
        currentAppBridgeRef.current = appBridge;
        if (containerRef.current) {
          containerRef.current.appendChild(iframe);
        }

        await onReady;

        if (!mounted) return;

        // Register size change handler
        appBridge.onsizechange = async (params) => {
          onSizeChangedRef.current?.(params);
          // Also update iframe size
          if (iframeRef.current) {
            if (params.width !== undefined) {
              iframeRef.current.style.width = `${params.width}px`;
            }
            if (params.height !== undefined) {
              iframeRef.current.style.height = `${params.height}px`;
            }
          }
        };

        // Hook into initialization
        appBridge.oninitialized = () => {
          if (!mounted) return;
          console.log('[AppFrame] App initialized');
          setIframeReady(true);
          onInitializedRef.current?.({
            appVersion: appBridge.getAppVersion(),
            appCapabilities: appBridge.getAppCapabilities(),
          });
        };


        // Connect the bridge
        await appBridge.connect(
          new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!),
        );

        if (!mounted) return;

        setBridgeConnected(true);
      } catch (err) {
        console.error('[AppFrame] Error:', err);
        if (!mounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onErrorRef.current?.(error);
      }
    };

    setup();

    return () => {
      mounted = false;
    };
  }, [sandbox.url, sandbox.csp, appBridge]);

  // Effect 2: Send HTML to sandbox when bridge is connected
  useEffect(() => {
    // Ensure we only send HTML to the correct appBridge that's currently connected
    // This prevents race conditions when switching between apps
    if (!bridgeConnected || !html || currentAppBridgeRef.current !== appBridge) return;

    const sendHtml = async () => {
      try {
        console.log('[AppFrame] Sending HTML to sandbox');
        await appBridge.sendSandboxResourceReady({
          html,
          csp: sandbox.csp,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onErrorRef.current?.(error);
      }
    };

    sendHtml();
  }, [bridgeConnected, html, appBridge, sandbox.csp]);

  // Effect 3: Send tool input when ready
  useEffect(() => {
    // Ensure we only send to the correct appBridge that's currently connected
    if (bridgeConnected && iframeReady && toolInput && currentAppBridgeRef.current === appBridge) {
      console.log('[AppFrame] Sending tool input:', toolInput);
      appBridge.sendToolInput({ arguments: toolInput });
    }
  }, [appBridge, bridgeConnected, iframeReady, toolInput]);

  // Effect 4: Send tool result when ready
  useEffect(() => {
    // Ensure we only send to the correct appBridge that's currently connected
    if (bridgeConnected && iframeReady && toolResult && currentAppBridgeRef.current === appBridge) {
      console.log('[AppFrame] Sending tool result:', toolResult);
      appBridge.sendToolResult(toolResult);
    }
  }, [appBridge, bridgeConnected, iframeReady, toolResult]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {error && <div style={{ color: 'red', padding: '1rem' }}>Error: {error.message}</div>}
    </div>
  );
};
