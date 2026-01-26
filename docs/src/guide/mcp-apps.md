# Legacy MCP-UI Adapter

::: tip For New Apps
**Building a new app?** Use the MCP Apps patterns directly - see [Getting Started](./getting-started) for the recommended approach with `registerAppTool`, `_meta.ui.resourceUri`, and `AppRenderer`.

This page is for **migrating existing MCP-UI widgets** to work in MCP Apps hosts.
:::

The MCP Apps adapter in `@mcp-ui/server` enables **existing MCP-UI HTML widgets** to run inside MCP Apps-compliant hosts. This is a backward-compatibility layer for apps that were built using the legacy MCP-UI `postMessage` protocol.

## When to Use This Adapter

- **Existing MCP-UI widgets**: You have HTML widgets using the `ui-lifecycle-*` message format
- **Gradual migration**: You want your existing widgets to work in both legacy MCP-UI hosts and new MCP Apps hosts
- **Protocol translation**: Your widget uses `postMessage` calls that need to be translated to JSON-RPC

## Overview

The adapter automatically translates between the MCP-UI `postMessage` protocol and MCP Apps JSON-RPC, allowing your existing widgets to work in MCP Apps hosts without code changes.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Apps Host                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     Sandbox Iframe                        │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                  Tool UI Iframe                     │  │  │
│  │  │  ┌───────────────┐    ┌──────────────────────────┐  │  │  │
│  │  │  │  MCP-UI       │───▶│  MCP Apps Adapter        │  │  │  │
│  │  │  │  Widget       │◀───│  (injected script)       │  │  │  │
│  │  │  └───────────────┘    └──────────────────────────┘  │  │  │
│  │  │         │                        │                  │  │  │
│  │  │         │ MCP-UI Protocol        │ JSON-RPC         │  │  │
│  │  │         ▼                        ▼                  │  │  │
│  │  │   postMessage              postMessage              │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│                    MCP Apps SEP Protocol                         │
└─────────────────────────────────────────────────────────────────┘
```

The adapter:
1. Intercepts MCP-UI messages from your widget
2. Translates them to MCP Apps SEP JSON-RPC format
3. Sends them to the host via postMessage
4. Receives host responses and translates them back to MCP-UI format

## Quick Start

### 1. Create a UI Resource with the MCP Apps Adapter

```typescript
import { createUIResource } from '@mcp-ui/server';

const widgetUI = createUIResource({
  uri: 'ui://my-server/widget',
  encoding: 'text',
  content: {
    type: 'rawHtml',
    htmlString: `
      <html>
        <body>
          <div id="app">Loading...</div>
          <script>
            // Listen for render data from the adapter
            window.addEventListener('message', (event) => {
              if (event.data.type === 'ui-lifecycle-iframe-render-data') {
                const { toolInput, toolOutput } = event.data.payload.renderData;
                document.getElementById('app').textContent = 
                  JSON.stringify({ toolInput, toolOutput }, null, 2);
              }
            });
            
            // Signal that the widget is ready
            window.parent.postMessage({ type: 'ui-lifecycle-iframe-ready' }, '*');
          </script>
        </body>
      </html>
    `,
  },
  adapters: {
    mcpApps: {
      enabled: true,
    },
  },
});
```

### 2. Register the Resource and Tool

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createUIResource } from '@mcp-ui/server';
import { registerAppTool, registerAppResource } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';

const server = new McpServer({ name: 'my-server', version: '1.0.0' });

// Create the UI resource (from step 1)
const widgetUI = createUIResource({
  uri: 'ui://my-server/widget',
  // ... (same as above)
});

// Register the resource so the host can fetch it
registerAppResource(
  server,
  'widget_ui',           // Resource name
  widgetUI.resource.uri, // Resource URI
  {},                    // Resource metadata
  async () => ({
    contents: [widgetUI.resource]
  })
);

// Register the tool with _meta linking to the UI resource
registerAppTool(
  server,
  'my_widget',
  {
    description: 'An interactive widget',
    inputSchema: {
      query: z.string().describe('User query'),
    },
    // This tells MCP Apps hosts where to find the UI
    _meta: {
      ui: {
        resourceUri: widgetUI.resource.uri
      }
    }
  },
  async ({ query }) => {
    return {
      content: [{ type: 'text', text: `Processing: ${query}` }],
    };
  }
);
```

The key requirement for MCP Apps hosts is that the tool's `_meta.ui.resourceUri` points to the UI resource URI. This tells the host where to fetch the widget HTML.

### 3. Add the MCP-UI Embedded Resource to Tool Responses

To support **MCP-UI hosts** (which expect embedded resources in tool responses), also return a `createUIResource` result:

```typescript
registerAppTool(
  server,
  'my_widget',
  {
    description: 'An interactive widget',
    inputSchema: {
      query: z.string().describe('User query'),
    },
    // For MCP Apps hosts - points to the registered resource
    _meta: {
      ui: {
        resourceUri: widgetUI.resource.uri
      }
    }
  },
  async ({ query }) => {
    // Create an embedded UI resource for MCP-UI hosts (no adapter)
    const embeddedResource = createUIResource({
      uri: `ui://my-server/widget/${query}`,
      encoding: 'text',
      content: {
        type: 'rawHtml',
        htmlString: renderWidget(query),  // Your widget HTML
      },
      // No adapters - this is for MCP-UI hosts
    });

    return {
      content: [
        { type: 'text', text: `Processing: ${query}` },
        embeddedResource  // Include for MCP-UI hosts
      ],
    };
  }
);
```

> **Important:** The embedded MCP-UI resource should **not** enable the MCP Apps adapter. It is for hosts that expect embedded resources in tool responses. MCP Apps hosts will ignore the embedded resource and instead fetch the UI from the registered resource URI in `_meta`.

## Protocol Translation Reference

### Widget → Host (Outgoing)

| MCP-UI Action | MCP Apps Method | Description |
|--------------|-----------------|-------------|
| `tool` | `tools/call` | Call another tool |
| `prompt` | `ui/message` | Send a follow-up message to the conversation |
| `link` | `ui/open-link` | Open a URL in a new tab |
| `notify` | `notifications/message` | Log a message to the host |
| `intent` | `ui/message` | Send an intent (translated to message) |
| `ui-size-change` | `ui/notifications/size-changed` | Request widget resize |

### Host → Widget (Incoming)

| MCP Apps Notification | MCP-UI Message | Description |
|----------------------|----------------|-------------|
| `ui/notifications/tool-input` | `ui-lifecycle-iframe-render-data` | Complete tool arguments |
| `ui/notifications/tool-input-partial` | `ui-lifecycle-iframe-render-data` | Streaming partial arguments |
| `ui/notifications/tool-result` | `ui-lifecycle-iframe-render-data` | Tool execution result |
| `ui/notifications/host-context-changed` | `ui-lifecycle-iframe-render-data` | Theme, locale, viewport changes |
| `ui/notifications/size-changed` | `ui-lifecycle-iframe-render-data` | Host informs of size constraints |
| `ui/notifications/tool-cancelled` | `ui-lifecycle-tool-cancelled` | Tool execution was cancelled |
| `ui/resource-teardown` | `ui-lifecycle-teardown` | Host notifies UI before teardown |

## Configuration Options

```typescript
createUIResource({
  // ...
  adapters: {
    mcpApps: {
      enabled: true,
      config: {
        // Timeout for async operations (default: 30000ms)
        timeout: 60000,
      },
    },
  },
});
```

## MIME Type

When the MCP Apps adapter is enabled, the resource MIME type is automatically set to `text/html;profile=mcp-app`, the MCP Apps equivalent to `text/html`.

## Receiving Data in Your Widget

The adapter sends data to your widget via the standard MCP-UI `ui-lifecycle-iframe-render-data` message:

```typescript
window.addEventListener('message', (event) => {
  if (event.data.type === 'ui-lifecycle-iframe-render-data') {
    const { renderData } = event.data.payload;
    
    // Tool input arguments
    const toolInput = renderData.toolInput;
    
    // Tool execution result (if available)
    const toolOutput = renderData.toolOutput;
    
    // Widget state (if supported by host)
    const widgetState = renderData.widgetState;
    
    // Host context
    const theme = renderData.theme;      // 'light' | 'dark' | 'system'
    const locale = renderData.locale;    // e.g., 'en-US'
    const displayMode = renderData.displayMode; // 'inline' | 'fullscreen' | 'pip'
    const maxHeight = renderData.maxHeight;
    
    // Update your UI with the data
    updateWidget(renderData);
  }
});
```

## Sending Actions from Your Widget

Use standard MCP-UI postMessage calls - the adapter translates them automatically:

```typescript
// Send a prompt to the conversation
window.parent.postMessage({
  type: 'prompt',
  payload: { prompt: 'What is the weather like today?' }
}, '*');

// Open a link
window.parent.postMessage({
  type: 'link',
  payload: { url: 'https://example.com' }
}, '*');

// Call another tool
window.parent.postMessage({
  type: 'tool',
  payload: { 
    toolName: 'get_weather',
    params: { city: 'San Francisco' }
  }
}, '*');

// Send a notification
window.parent.postMessage({
  type: 'notify',
  payload: { message: 'Widget loaded successfully' }
}, '*');

// Request resize
window.parent.postMessage({
  type: 'ui-size-change',
  payload: { width: 500, height: 400 }
}, '*');
```

## Mutual Exclusivity with Apps SDK Adapter

Only one adapter can be enabled at a time. The TypeScript types enforce this:

```typescript
// ✅ Valid: MCP Apps adapter only
adapters: { mcpApps: { enabled: true } }

// ✅ Valid: Apps SDK adapter only (for ChatGPT)
adapters: { appsSdk: { enabled: true } }

// ❌ TypeScript error: Cannot enable both
adapters: { mcpApps: { enabled: true }, appsSdk: { enabled: true } }
```

If you need to support both MCP Apps hosts and ChatGPT, create separate resources:

```typescript
// For MCP Apps hosts
const mcpAppsResource = createUIResource({
  uri: 'ui://my-server/widget-mcp-apps',
  content: { type: 'rawHtml', htmlString: widgetHtml },
  adapters: { mcpApps: { enabled: true } },
});

// For ChatGPT/Apps SDK hosts
const appsSdkResource = createUIResource({
  uri: 'ui://my-server/widget-apps-sdk',
  content: { type: 'rawHtml', htmlString: widgetHtml },
  adapters: { appsSdk: { enabled: true } },
});
```

## Complete Example

See the [mcp-apps-demo](https://github.com/idosal/mcp-ui/tree/main/examples/mcp-apps-demo) example for a complete working implementation.

```typescript
import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createUIResource } from '@mcp-ui/server';
import { registerAppTool, registerAppResource } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';

const app = express();
app.use(cors({ origin: '*', exposedHeaders: ['Mcp-Session-Id'] }));
app.use(express.json());

// ... (transport setup)

const server = new McpServer({ name: 'demo', version: '1.0.0' });

const graphUI = createUIResource({
  uri: 'ui://demo/graph',
  encoding: 'text',
  content: {
    type: 'rawHtml',
    htmlString: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: system-ui; padding: 20px; }
          .data { background: #f5f5f5; padding: 10px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>graph</h1>
        <div class="data" id="data">Waiting for data...</div>
        <button onclick="sendPrompt()">Ask Follow-up</button>
        
        <script>
          window.addEventListener('message', (e) => {
            if (e.data.type === 'ui-lifecycle-iframe-render-data') {
              document.getElementById('data').textContent = 
                JSON.stringify(e.data.payload.renderData, null, 2);
            }
          });
          
          function sendPrompt() {
            window.parent.postMessage({
              type: 'prompt',
              payload: { prompt: 'Tell me more about this data' }
            }, '*');
          }
          
          window.parent.postMessage({ type: 'ui-lifecycle-iframe-ready' }, '*');
        </script>
      </body>
      </html>
    `,
  },
  adapters: {
    mcpApps: { enabled: true },
  },
});

// Register the UI resource
registerAppResource(
  server,
  'graph_ui',
  graphUI.resource.uri,
  {},
  async () => ({
    contents: [graphUI.resource]
  })
);

// Register the tool with _meta linking to the UI resource
registerAppTool(
  server,
  'show_graph',
  {
    description: 'Display an interactive graph',
    inputSchema: {
      title: z.string().describe('Graph title'),
    },
    // For MCP Apps hosts - points to the registered resource
    _meta: {
      ui: {
        resourceUri: graphUI.resource.uri
      }
    }
  },
  async ({ title }) => {
    // Create embedded resource for MCP-UI hosts (no adapter)
    const embeddedResource = createUIResource({
      uri: `ui://demo/graph/${encodeURIComponent(title)}`,
      encoding: 'text',
      content: {
        type: 'rawHtml',
        htmlString: `<html><body><h1>Graph: ${title}</h1></body></html>`,
      },
      // No adapters - for MCP-UI hosts only
    });

    return {
      content: [
        { type: 'text', text: `Graph: ${title}` },
        embeddedResource  // Included for MCP-UI hosts
      ],
    };
  }
);

// ... (server setup)
```

## Debugging

The adapter logs debug information to the browser console. Look for messages prefixed with `[MCP Apps Adapter]`:

```
[MCP Apps Adapter] Initializing adapter...
[MCP Apps Adapter] Sending ui/initialize request
[MCP Apps Adapter] Received JSON-RPC message: {...}
[MCP Apps Adapter] Intercepted MCP-UI message: prompt
```

## Host-Side Rendering (Client SDK)

The `@mcp-ui/client` package provides React components for rendering MCP Apps tool UIs in your host application.

### AppRenderer Component

`AppRenderer` is the high-level component that handles the complete lifecycle of rendering an MCP tool's UI:

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
        if (url.startsWith('https://') || url.startsWith('http://')) {
          window.open(url);
        }
      }}
      onMessage={async (params) => {
        console.log('Message from tool UI:', params);
        return { isError: false };
      }}
      onError={(error) => console.error('Tool UI error:', error)}
    />
  );
}
```

**Key Props:**
- `client` - Optional MCP client for automatic resource fetching and MCP request forwarding
- `toolName` - Name of the tool to render UI for
- `sandbox` - Sandbox configuration with the sandbox proxy URL
- `html` - Optional pre-fetched HTML (skips resource fetching)
- `toolResourceUri` - Optional pre-fetched resource URI
- `toolInput` / `toolResult` - Tool arguments and results to pass to the UI
- `hostContext` - Theme, locale, viewport info for the guest UI
- `onOpenLink` / `onMessage` / `onLoggingMessage` - Handlers for guest UI requests

**Ref Methods:**
- `sendToolListChanged()` - Notify guest when tools change
- `sendResourceListChanged()` - Notify guest when resources change
- `sendPromptListChanged()` - Notify guest when prompts change
- `teardownResource()` - Clean up before unmounting

### Using Without an MCP Client

You can use `AppRenderer` without a full MCP client by providing custom handlers:

```tsx
<AppRenderer
  // No client - use callbacks instead
  toolName="my-tool"
  toolResourceUri="ui://my-server/my-tool"
  sandbox={{ url: sandboxUrl }}
  onReadResource={async ({ uri }) => {
    // Proxy to your MCP client in a different context
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

### AppFrame Component

`AppFrame` is the lower-level component for when you already have the HTML content and an `AppBridge` instance:

```tsx
import { AppFrame, AppBridge } from '@mcp-ui/client';

function LowLevelToolUI({ html, client }) {
  const bridge = useMemo(() => new AppBridge(client, hostInfo, capabilities), [client]);

  return (
    <AppFrame
      html={html}
      sandbox={{ url: sandboxUrl }}
      appBridge={bridge}
      toolInput={{ query: 'test' }}
      onSizeChanged={(size) => console.log('Size changed:', size)}
    />
  );
}
```

### Sandbox Proxy

Both components require a sandbox proxy HTML file to be served. This provides security isolation for the guest UI. The sandbox proxy URL should point to a page that loads the MCP Apps sandbox proxy script.

## Declaring UI Extension Support

When creating your MCP client, declare UI extension support using the provided type and capabilities:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  type ClientCapabilitiesWithExtensions,
  UI_EXTENSION_CAPABILITIES,
} from '@mcp-ui/client';

const capabilities: ClientCapabilitiesWithExtensions = {
  // Standard capabilities
  roots: { listChanged: true },
  // UI extension support (SEP-1724 pattern)
  extensions: UI_EXTENSION_CAPABILITIES,
};

const client = new Client(
  { name: 'my-app', version: '1.0.0' },
  { capabilities }
);
```

This tells MCP servers that your client can render UI resources with MIME type `text/html;profile=mcp-app`.

> **Note:** This uses the `extensions` field pattern from [SEP-1724](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1724), which is not yet part of the official MCP protocol.

## Related Resources

- [Getting Started](./getting-started) - Recommended patterns for new MCP Apps
- [MCP Apps SEP Specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx)
- [@modelcontextprotocol/ext-apps](https://github.com/modelcontextprotocol/ext-apps)
- [Apps SDK Integration](./apps-sdk.md) - For ChatGPT integration (separate from MCP Apps)
- [Protocol Details](./protocol-details.md) - MCP-UI wire format reference

