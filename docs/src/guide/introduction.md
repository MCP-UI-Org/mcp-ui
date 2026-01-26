# Introduction

Welcome to the MCP Apps SDK documentation!

The `@mcp-ui/*` packages provide tools for building [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) - interactive UI components for Model Context Protocol (MCP) tools. This SDK implements the MCP Apps standard, enabling rich HTML interfaces within AI applications.

You can use [GitMCP](https://gitmcp.io/idosal/mcp-ui) to give your IDE access to `mcp-ui`'s latest documentation!
<a href="https://gitmcp.io/idosal/mcp-ui"><img src="https://img.shields.io/endpoint?url=https://gitmcp.io/badge/idosal/mcp-ui" alt="MCP Documentation"></a>

## Background

MCP-UI pioneered the concept of interactive UI over the Model Context Protocol. Before MCP Apps existed as a standard, this project demonstrated how MCP tools could return rich, interactive HTML interfaces instead of plain text, enabling UI components within AI applications.

The patterns and ideas explored in MCP-UI directly influenced the development of the [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps), which standardized UI delivery over MCP. Today, the `@mcp-ui/*` packages implement this standard while maintaining the project's original vision: making it simple to build beautiful, interactive experiences for AI tools.

## What are MCP Apps?

MCP Apps is a standard for attaching interactive UIs to MCP tools. When a tool has an associated UI, hosts can render it alongside the tool's results, enabling rich user experiences like forms, charts, and interactive widgets.

### The Core Pattern

The MCP Apps pattern uses three key concepts:

1. **Tool with `_meta.ui.resourceUri`** - Links a tool to its UI resource
2. **Resource Handler** - Serves the UI content when the host requests it
3. **AppRenderer** - Client component that fetches and renders the UI

```typescript
// 1. Create UI content
const widgetUI = createUIResource({
  uri: 'ui://my-server/widget',
  content: { type: 'rawHtml', htmlString: '<h1>Widget</h1>' },
  encoding: 'text',
});

// 2. Register resource handler
registerAppResource(server, 'widget_ui', widgetUI.resource.uri, {}, async () => ({
  contents: [widgetUI.resource]
}));

// 3. Register tool with _meta linking
registerAppTool(server, 'show_widget', {
  description: 'Show interactive widget',
  inputSchema: { query: z.string() },
  _meta: { ui: { resourceUri: widgetUI.resource.uri } }  // This links tool → UI
}, async ({ query }) => {
  return { content: [{ type: 'text', text: `Result: ${query}` }] };
});
```

When a host calls `show_widget`, it sees the `_meta.ui.resourceUri` and fetches the UI from that resource URI to render alongside the tool result.

## SDK Packages

The `@mcp-ui/*` packages provide everything needed to build and render MCP Apps:

### Server SDK (`@mcp-ui/server`)
- **`createUIResource`**: Creates UI resource objects with HTML content, external URLs, or Remote DOM
- Works with `registerAppTool` and `registerAppResource` from `@modelcontextprotocol/ext-apps/server`

### Client SDK (`@mcp-ui/client`)
- **`AppRenderer`**: High-level component for rendering tool UIs (fetches resources, handles lifecycle)
- **`AppFrame`**: Lower-level component for when you have pre-fetched HTML
- **`UIResourceRenderer`**: For legacy MCP-UI hosts that embed resources in tool responses

### Additional Language SDKs
- **`mcp_ui_server`** (Ruby): Helper methods for creating UI resources
- **`mcp-ui-server`** (Python): Helper methods for creating UI resources

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                          MCP Host                                │
│  1. Calls tool                                                  │
│  2. Sees _meta.ui.resourceUri in tool definition               │
│  3. Fetches resource via resources/read                        │
│  4. Renders UI in sandboxed iframe (AppRenderer)               │
└─────────────────────────────────────────────────────────────────┘
         │                                    ▲
         ▼                                    │
┌─────────────────────────────────────────────────────────────────┐
│                         MCP Server                               │
│  - registerAppTool with _meta.ui.resourceUri                    │
│  - registerAppResource to serve UI content                      │
│  - createUIResource to build UI payloads                        │
└─────────────────────────────────────────────────────────────────┘
```

### Example Flow

**Server (MCP Tool):**
::: code-group

```typescript [TypeScript]
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource } from '@modelcontextprotocol/ext-apps/server';
import { createUIResource } from '@mcp-ui/server';
import { z } from 'zod';

const server = new McpServer({ name: 'my-server', version: '1.0.0' });

const dashboardUI = createUIResource({
  uri: 'ui://my-tool/dashboard',
  content: { type: 'rawHtml', htmlString: '<h1>Dashboard</h1>' },
  encoding: 'text'
});

registerAppResource(server, 'dashboard_ui', dashboardUI.resource.uri, {}, async () => ({
  contents: [dashboardUI.resource]
}));

registerAppTool(server, 'show_dashboard', {
  description: 'Show dashboard',
  inputSchema: {},
  _meta: { ui: { resourceUri: dashboardUI.resource.uri } }
}, async () => {
  return { content: [{ type: 'text', text: 'Dashboard loaded' }] };
});
```

```ruby [Ruby]
require 'mcp_ui_server'

resource = McpUiServer.create_ui_resource(
  uri: 'ui://my-tool/dashboard',
  content: { type: :raw_html, htmlString: '<h1>Dashboard</h1>' },
  encoding: :text
)

# Return in MCP response
{ content: [resource] }
```

:::

**Client (Frontend App):**
```tsx
import { AppRenderer } from '@mcp-ui/client';

function ToolUI({ client, toolName, toolInput, toolResult }) {
  return (
    <AppRenderer
      client={client}
      toolName={toolName}
      sandbox={{ url: new URL('http://localhost:8765/sandbox_proxy.html') }}
      toolInput={toolInput}
      toolResult={toolResult}
      onOpenLink={async ({ url }) => {
        if (url.startsWith('https://') || url.startsWith('http://')) {
          window.open(url);
        }
      }}
      onMessage={async (params) => {
        console.log('Message from UI:', params);
        return { isError: false };
      }}
    />
  );
}
```

## Key Benefits

- **Standardized**: Implements the MCP Apps specification for consistent behavior across hosts
- **Secure**: Sandboxed iframe execution prevents malicious code from affecting the host
- **Interactive**: Two-way communication between UI and host via JSON-RPC
- **Flexible**: Supports HTML content with the MCP Apps standard MIME type
- **Backward Compatible**: Adapters available for legacy MCP-UI hosts

## Wire Format: UIResource

The underlying data format for UI content is the `UIResource` object:

```typescript
interface UIResource {
  type: 'resource';
  resource: {
    uri: string;       // ui://component/id
    mimeType: 'text/html;profile=mcp-app';  // MCP Apps standard
    text?: string;      // Inline HTML content
    blob?: string;      // Base64-encoded content
  };
}
```

The MIME type `text/html;profile=mcp-app` is the MCP Apps standard for UI resources.

### Key Field Details:

- **`uri`**: Unique identifier using `ui://` scheme (e.g., `ui://my-tool/widget-01`)
- **`mimeType`**: Content type
  - `text/html` → HTML content rendered via `<iframe srcdoc>`
  - `text/uri-list` → URL content rendered via `<iframe src>`
  - `text/html;profile=mcp-app` → MCP Apps-compliant HTML
- **`text` or `blob`**: The actual content, either as plain text or Base64 encoded

## Legacy MCP-UI Pattern

For hosts that don't support MCP Apps yet, you can embed UI resources directly in tool responses:

```typescript
// Legacy pattern: embed resource in tool response
const resource = createUIResource({
  uri: 'ui://my-tool/widget',
  content: { type: 'rawHtml', htmlString: '<h1>Widget</h1>' },
  encoding: 'text'
});

return { content: [resource] };  // Resource embedded in response
```

The client renders these with `UIResourceRenderer`:

```tsx
import { UIResourceRenderer } from '@mcp-ui/client';

<UIResourceRenderer
  resource={mcpResource.resource}
  onUIAction={(action) => console.log('Action:', action)}
/>
```

For a full guide on supporting both patterns, see the [Legacy MCP-UI Adapter](./mcp-apps) documentation.

## Next Steps

- [Getting Started](./getting-started.md) - Set up your development environment
- [Server Walkthroughs](./server/typescript/walkthrough.md) - Step-by-step guides
- [Client SDK](./client/overview.md) - Learn to render tool UIs with AppRenderer
- [TypeScript Server SDK](./server/typescript/overview.md) - Create tools with UI
- [Ruby Server SDK](./server/ruby/overview.md) - Ruby implementation
- [Protocol Details](./protocol-details.md) - Understand the underlying protocol
