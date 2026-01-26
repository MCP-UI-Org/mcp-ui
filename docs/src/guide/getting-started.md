# Getting Started

This guide will help you get started with building MCP Apps using the `@mcp-ui/*` packages.

## Prerequisites

- Node.js (v22.x recommended for the TypeScript SDK)
- pnpm (v9 or later recommended for the TypeScript SDK)
- Ruby (v3.x recommended for the Ruby SDK)
- Python (v3.10+ recommended for the Python SDK)

## Installation

### For TypeScript

```bash
# Server SDK
npm install @mcp-ui/server @modelcontextprotocol/ext-apps

# Client SDK
npm install @mcp-ui/client
```

### For Ruby

```bash
gem install mcp_ui_server
```

### For Python

```bash
pip install mcp-ui-server
```

## Quick Start: MCP Apps Pattern

### Server Side

Create a tool with an interactive UI using `registerAppTool` and `_meta.ui.resourceUri`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource } from '@modelcontextprotocol/ext-apps/server';
import { createUIResource } from '@mcp-ui/server';
import { z } from 'zod';

// 1. Create your MCP server
const server = new McpServer({ name: 'my-server', version: '1.0.0' });

// 2. Create the UI resource with interactive HTML
const widgetUI = createUIResource({
  uri: 'ui://my-server/widget',
  content: {
    type: 'rawHtml',
    htmlString: `
      <html>
        <body>
          <h1>Interactive Widget</h1>
          <button onclick="sendMessage()">Send Message</button>
          <div id="status">Ready</div>
          <script type="module">
            import { App } from 'https://esm.sh/@modelcontextprotocol/ext-apps@0.4.1';

            // Initialize the MCP Apps client
            const app = new App({ name: 'widget', version: '1.0.0' });

            // Listen for tool input
            app.ontoolinput = (params) => {
              document.getElementById('status').textContent =
                'Received: ' + JSON.stringify(params.input);
            };

            // Send a message to the conversation
            window.sendMessage = async () => {
              await app.sendMessage({
                role: 'user',
                content: [{ type: 'text', text: 'Tell me more about this widget' }]
              });
            };

            // Connect to the host
            await app.connect();
          </script>
        </body>
      </html>
    `,
  },
  encoding: 'text',
});

// 3. Register the resource handler
registerAppResource(
  server,
  'widget_ui',
  widgetUI.resource.uri,
  {},
  async () => ({
    contents: [widgetUI.resource]
  })
);

// 4. Register the tool with _meta.ui.resourceUri
registerAppTool(
  server,
  'show_widget',
  {
    description: 'Show an interactive widget',
    inputSchema: {
      query: z.string().describe('User query'),
    },
    _meta: {
      ui: {
        resourceUri: widgetUI.resource.uri  // Links tool to UI
      }
    }
  },
  async ({ query }) => {
    return {
      content: [{ type: 'text', text: `Processing: ${query}` }]
    };
  }
);
```

::: tip MCP Apps Protocol
The example above uses the [`@modelcontextprotocol/ext-apps`](https://github.com/modelcontextprotocol/ext-apps) `App` class for communication. This is the recommended approach for MCP Apps hosts. See [Protocol Details](./protocol-details) for the full JSON-RPC API.

For legacy MCP-UI hosts, you can use the simpler postMessage protocol with the [MCP Apps Adapter](./mcp-apps).
:::

### Client Side

Render tool UIs with `AppRenderer`:

```tsx
import { AppRenderer } from '@mcp-ui/client';

function ToolUI({ client, toolName, toolInput, toolResult }) {
  return (
    <AppRenderer
      client={client}
      toolName={toolName}
      sandbox={{ url: new URL('/sandbox_proxy.html', window.location.origin) }}
      toolInput={toolInput}
      toolResult={toolResult}
      onOpenLink={async ({ url }) => {
        // Validate URL scheme before opening
        if (url.startsWith('https://') || url.startsWith('http://')) {
          window.open(url);
        }
        return { isError: false };
      }}
      onMessage={async (params) => {
        console.log('Message from UI:', params);
        // Handle the message (e.g., send to AI conversation)
        return { isError: false };
      }}
      onError={(error) => console.error('UI error:', error)}
    />
  );
}
```

### Using Without an MCP Client

You can use `AppRenderer` without a full MCP client by providing callbacks:

```tsx
<AppRenderer
  toolName="show_widget"
  toolResourceUri="ui://my-server/widget"
  sandbox={{ url: sandboxUrl }}
  onReadResource={async ({ uri }) => {
    // Fetch resource from your backend
    return myBackend.readResource({ uri });
  }}
  onCallTool={async (params) => {
    return myBackend.callTool(params);
  }}
  toolInput={{ query: 'hello' }}
/>
```

Or provide pre-fetched HTML directly:

```tsx
<AppRenderer
  toolName="show_widget"
  sandbox={{ url: sandboxUrl }}
  html={preloadedHtml}  // Skip resource fetching
  toolInput={{ query: 'hello' }}
/>
```

## Resource Types

MCP Apps supports several UI content types:

### 1. HTML Resources (`text/html`)

Direct HTML content rendered in a sandboxed iframe:

```typescript
const htmlResource = createUIResource({
  uri: 'ui://my-tool/widget',
  content: { type: 'rawHtml', htmlString: '<h1>Hello World</h1>' },
  encoding: 'text',
});
```

### 2. External URLs (Legacy)

External applications embedded via iframe:

```typescript
const urlResource = createUIResource({
  uri: 'ui://my-tool/external',
  content: { type: 'externalUrl', iframeUrl: 'https://example.com' },
  encoding: 'text',
});
```

::: warning External URLs
External URLs now use the same MIME type (`text/html;profile=mcp-app`) as raw HTML. Host support for external URLs varies - some hosts may detect URL content and embed it in an iframe, while others may not support this content type.
:::

## Declaring UI Extension Support

When creating your MCP client, declare UI extension support:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  type ClientCapabilitiesWithExtensions,
  UI_EXTENSION_CAPABILITIES,
} from '@mcp-ui/client';

const capabilities: ClientCapabilitiesWithExtensions = {
  roots: { listChanged: true },
  extensions: UI_EXTENSION_CAPABILITIES,
};

const client = new Client(
  { name: 'my-app', version: '1.0.0' },
  { capabilities }
);
```

## Legacy MCP-UI Pattern

For hosts that don't yet support MCP Apps, you can embed UI resources directly in tool responses:

### Server Side (Legacy)

```typescript
import { createUIResource } from '@mcp-ui/server';

// Create resource
const resource = createUIResource({
  uri: 'ui://my-tool/widget',
  content: { type: 'rawHtml', htmlString: '<h1>Widget</h1>' },
  encoding: 'text',
});

// Return embedded in tool response
return { content: [resource] };
```

### Client Side (Legacy)

```tsx
import { UIResourceRenderer } from '@mcp-ui/client';

function LegacyToolUI({ mcpResponse }) {
  return (
    <div>
      {mcpResponse.content.map((item) => {
        if (item.type === 'resource' && item.resource.uri?.startsWith('ui://')) {
          return (
            <UIResourceRenderer
              key={item.resource.uri}
              resource={item.resource}
              onUIAction={(result) => {
                console.log('Action:', result);
                return { status: 'handled' };
              }}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
```

For more on supporting both MCP Apps and legacy hosts, see [Legacy MCP-UI Adapter](./mcp-apps).

## Building from Source

### Clone and Install

```bash
git clone https://github.com/idosal/mcp-ui.git
cd mcp-ui
pnpm install
```

### Build All Packages

```bash
pnpm --filter=!@mcp-ui/docs build
```

### Run Tests

```bash
pnpm test
```

## Next Steps

- **Server SDKs**: Learn how to create resources with our server-side packages.
  - [TypeScript SDK Usage & Examples](./server/typescript/usage-examples.md)
  - [Ruby SDK Usage & Examples](./server/ruby/usage-examples.md)
  - [Python SDK Usage & Examples](./server/python/usage-examples.md)
- **Client SDK**: Learn how to render resources.
  - [Client Overview](./client/overview.md)
  - [AppRenderer Component](./client/resource-renderer.md)
- **Protocol & Components**:
  - [Protocol Details](./protocol-details.md)
  - [Legacy MCP-UI Adapter](./mcp-apps.md)
