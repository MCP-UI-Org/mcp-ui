# AppRenderer Component

`AppRenderer` is the recommended component for rendering MCP tool UIs in your host application. It implements the [MCP Apps](../mcp-apps) standard, handling the complete lifecycle: resource fetching, sandbox setup, JSON-RPC communication, and tool input/result delivery.

For lower-level control or when you already have HTML and an `AppBridge` instance, use [`AppFrame`](../mcp-apps#appframe-component) instead.

## Quick Example

```tsx
import { AppRenderer, type AppRendererHandle } from '@mcp-ui/client';

function ToolUI({ client, toolName, toolInput, toolResult }) {
  const appRef = useRef<AppRendererHandle>(null);

  return (
    <AppRenderer
      ref={appRef}
      client={client}
      toolName={toolName}
      sandbox={{ url: new URL('http://localhost:8765/sandbox_proxy.html') }}
      toolInput={toolInput}
      toolResult={toolResult}
      hostContext={{ theme: 'dark' }}
      onOpenLink={async ({ url }) => {
        window.open(url, '_blank');
        return {};
      }}
      onMessage={async (params) => {
        console.log('Message from tool UI:', params);
        return {};
      }}
      onError={(error) => console.error('Tool UI error:', error)}
    />
  );
}
```

## Props Reference

### Core Props

| Prop | Type | Description |
|------|------|-------------|
| `client` | `Client` | Optional MCP client for automatic resource fetching and MCP request forwarding. Omit to use custom handlers instead. |
| `toolName` | `string` | Name of the MCP tool to render UI for. |
| `sandbox` | `SandboxConfig` | Sandbox configuration with the proxy URL and optional CSP. |
| `html` | `string` | Optional pre-fetched HTML. If provided, skips all resource fetching. |
| `toolResourceUri` | `string` | Optional pre-fetched resource URI. If not provided, fetched via the client. |
| `toolInput` | `Record<string, unknown>` | Tool arguments to pass to the guest UI once it initializes. |
| `toolResult` | `CallToolResult` | Tool execution result to pass to the guest UI. |
| `toolInputPartial` | `object` | Partial/streaming tool input to send progressively. |
| `toolCancelled` | `boolean` | Set to `true` to notify the guest UI that tool execution was cancelled. |
| `hostContext` | `McpUiHostContext` | Host context (theme, locale, viewport, etc.) to pass to the guest UI. |

### Event Handlers

| Prop | Type | Description |
|------|------|-------------|
| `onOpenLink` | `(params, extra) => Promise<McpUiOpenLinkResult>` | Handler for open-link requests from the guest UI. |
| `onMessage` | `(params, extra) => Promise<McpUiMessageResult>` | Handler for message requests from the guest UI. |
| `onLoggingMessage` | `(params) => void` | Handler for logging messages from the guest UI. |
| `onSizeChanged` | `(params) => void` | Handler for size change notifications from the guest UI. |
| `onError` | `(error: Error) => void` | Callback invoked when an error occurs during setup or message handling. |
| `onFallbackRequest` | `(request, extra) => Promise<Record<string, unknown>>` | Catch-all for JSON-RPC requests not handled by built-in handlers. See [Handling Custom Requests](#handling-custom-requests). |

### MCP Request Handlers

These override the automatic forwarding to the MCP client when provided:

| Prop | Type | Description |
|------|------|-------------|
| `onCallTool` | `(params, extra) => Promise<CallToolResult>` | Handler for `tools/call` requests. |
| `onListResources` | `(params, extra) => Promise<ListResourcesResult>` | Handler for `resources/list` requests. |
| `onListResourceTemplates` | `(params, extra) => Promise<ListResourceTemplatesResult>` | Handler for `resources/templates/list` requests. |
| `onReadResource` | `(params, extra) => Promise<ReadResourceResult>` | Handler for `resources/read` requests. |
| `onListPrompts` | `(params, extra) => Promise<ListPromptsResult>` | Handler for `prompts/list` requests. |

### Ref Methods

Access via `useRef<AppRendererHandle>`:

| Method | Description |
|--------|-------------|
| `sendToolListChanged()` | Notify guest UI that the server's tool list has changed. |
| `sendResourceListChanged()` | Notify guest UI that the server's resource list has changed. |
| `sendPromptListChanged()` | Notify guest UI that the server's prompt list has changed. |
| `teardownResource()` | Notify the guest UI before unmounting (graceful shutdown). |

## Using Without an MCP Client

You can use `AppRenderer` without a full MCP client by providing custom handlers:

```tsx
<AppRenderer
  // No client - use callbacks instead
  toolName="my-tool"
  toolResourceUri="ui://my-server/my-tool"
  sandbox={{ url: sandboxUrl }}
  onReadResource={async ({ uri }) => {
    return myMcpProxy.readResource({ uri });
  }}
  onCallTool={async (params) => {
    return myMcpProxy.callTool(params);
  }}
/>
```

Or provide pre-fetched HTML directly:

```tsx
<AppRenderer
  toolName="my-tool"
  sandbox={{ url: sandboxUrl }}
  html={preloadedHtml}  // Skip all resource fetching
  toolInput={args}
/>
```

## Handling Custom Requests

AppRenderer includes built-in handlers for standard MCP Apps methods (`tools/call`, `ui/message`, `ui/open-link`, etc.). The `onFallbackRequest` prop lets you handle **any JSON-RPC request that doesn't match a built-in handler**. This is useful for:

- **Experimental methods** -- prototype new capabilities (e.g., `x/clipboard/write`, `x/analytics/track`)
- **MCP methods not yet in the Apps spec** -- support standard MCP methods like `sampling/createMessage` before they're officially added to MCP Apps

Under the hood, this is wired to `AppBridge`'s `fallbackRequestHandler` from the MCP SDK `Protocol` class. The guest UI sends a standard JSON-RPC request via `postMessage`, and if AppBridge has no registered handler for the method, it delegates to `onFallbackRequest`.

### Host-side handler

```tsx
import { AppRenderer, type JSONRPCRequest } from '@mcp-ui/client';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

<AppRenderer
  client={client}
  toolName="my-tool"
  sandbox={sandboxConfig}
  onFallbackRequest={async (request, extra) => {
    switch (request.method) {
      case 'x/clipboard/write':
        await navigator.clipboard.writeText(request.params?.text as string);
        return { success: true };
      case 'sampling/createMessage':
        // Forward to MCP server
        return client.createMessage(request.params);
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown method: ${request.method}`);
    }
  }}
/>
```

### Guest-side (inside tool UI HTML)

```ts
import { sendExperimentalRequest } from '@mcp-ui/server';

// Send a custom request to the host -- returns a Promise with the response
const result = await sendExperimentalRequest('x/clipboard/write', { text: 'hello' });
```

The `sendExperimentalRequest` helper sends a properly formatted JSON-RPC request via `window.parent.postMessage`. The full request/response cycle flows through `PostMessageTransport` and the sandbox proxy, just like built-in methods.

::: tip Method Naming Convention
Use the `x/<namespace>/<action>` prefix for experimental methods (e.g., `x/clipboard/write`). Standard MCP methods not yet in the Apps spec (e.g., `sampling/createMessage`) should use their canonical method names. When an experimental method proves useful, it can be promoted to a standard method in the [ext-apps spec](https://github.com/modelcontextprotocol/ext-apps).
:::

## Sandbox Proxy

AppRenderer requires a sandbox proxy HTML file to be served. This provides security isolation for the guest UI by running it inside a double-iframe architecture. The sandbox proxy URL should point to a page that loads the MCP Apps sandbox proxy script.

See the [Client SDK Walkthrough](./walkthrough#_3-set-up-a-sandbox-proxy) for setup instructions.

## Related

- [Client SDK Walkthrough](./walkthrough) -- Step-by-step guide to building an MCP Apps client
- [MCP Apps Overview](../mcp-apps) -- Protocol details and server-side setup
- [Protocol Details](../protocol-details) -- Wire format reference
- [AppFrame Component](../mcp-apps#appframe-component) -- Lower-level rendering component
