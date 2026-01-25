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

// 2. Create the UI resource
const widgetUI = createUIResource({
  uri: 'ui://my-server/widget',
  content: {
    type: 'rawHtml',
    htmlString: `
      <html>
        <body>
          <h1>Interactive Widget</h1>
          <button onclick="sendMessage()">Send Message</button>
          <script>
            // Listen for tool data
            window.addEventListener('message', (e) => {
              if (e.data.type === 'ui-lifecycle-iframe-render-data') {
                console.log('Tool data:', e.data.payload.renderData);
              }
            });

            // Send a prompt to the conversation
            function sendMessage() {
              window.parent.postMessage({
                type: 'prompt',
                payload: { prompt: 'Tell me more about this widget' }
              }, '*');
            }

            // Signal ready
            window.parent.postMessage({ type: 'ui-lifecycle-iframe-ready' }, '*');
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
        window.open(url);
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

### 2. External URLs (`text/uri-list`)

External applications embedded via iframe:

```typescript
const urlResource = createUIResource({
  uri: 'ui://my-tool/external',
  content: { type: 'externalUrl', iframeUrl: 'https://example.com' },
  encoding: 'text',
});
```

### 3. Remote DOM (`application/vnd.mcp-ui.remote-dom`)

JavaScript-defined UI using host-native components:

```typescript
const remoteDomResource = createUIResource({
  uri: 'ui://my-tool/remote',
  content: {
    type: 'remoteDom',
    script: `
      const button = document.createElement('ui-button');
      button.setAttribute('label', 'Click me!');
      button.addEventListener('press', () => {
        window.parent.postMessage({
          type: 'tool',
          payload: { toolName: 'handleClick', params: {} }
        }, '*');
      });
      root.appendChild(button);
    `,
    framework: 'react',
  },
  encoding: 'text',
});
```

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
