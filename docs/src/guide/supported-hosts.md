# Supported Hosts

The `@mcp-ui/*` packages work with both MCP Apps hosts and legacy MCP-UI hosts.

## MCP Apps Hosts

These hosts implement the [MCP Apps SEP protocol](https://github.com/modelcontextprotocol/ext-apps) and support tools with `_meta.ui.resourceUri`:

| Host | Support | Notes |
| :--- | :-------: | :---- |
| [VSCode](https://github.com/microsoft/vscode/issues/260218) | ✅ | Internals (as of January) |
| [Postman](https://www.postman.com/) | ✅ | |
| [Goose](https://block.github.io/goose/) | ✅ | |
| [MCPJam](https://www.mcpjam.com/) | ✅ | |
| [LibreChat](https://www.librechat.ai/) | ✅ | |
| [mcp-use](https://mcp-use.com/) | ✅ | |
| [Smithery](https://smithery.ai/playground) | ✅ | |

For MCP Apps hosts, use `AppRenderer` on the client side:

```tsx
import { AppRenderer } from '@mcp-ui/client';

<AppRenderer
  client={client}
  toolName={toolName}
  sandbox={{ url: sandboxUrl }}
  toolInput={toolInput}
  toolResult={toolResult}
/>
```

## Legacy MCP-UI Hosts

These hosts expect UI resources embedded directly in tool responses:

| Host | Rendering | UI Actions | Notes |
| :--- | :-------: | :--------: | :---- |
| [Nanobot](https://www.nanobot.ai/) | ✅ | ✅ |
| [MCPJam](https://www.mcpjam.com/) | ✅ | ✅ |
| [Postman](https://www.postman.com/) | ✅ | ⚠️ | |
| [Goose](https://block.github.io/goose/) | ✅ | ⚠️ | |
| [LibreChat](https://www.librechat.ai/) | ✅ | ⚠️ | |
| [Smithery](https://smithery.ai/playground) | ✅ | ❌ | |
| [fast-agent](https://fast-agent.ai/mcp/mcp-ui/) | ✅ | ❌ | |

For legacy hosts, use `UIResourceRenderer` on the client side:

```tsx
import { UIResourceRenderer } from '@mcp-ui/client';

<UIResourceRenderer
  resource={mcpResource.resource}
  onUIAction={handleAction}
/>
```

## Hosts Requiring Adapters

These hosts use different protocols but can render MCP-UI widgets via adapters:

| Host | Protocol | Rendering | UI Actions | Guide |
| :--- | :------: | :-------: | :--------: | :---: |
| [ChatGPT](https://chatgpt.com/) | Apps SDK | ✅ | ⚠️ | [Apps SDK Guide](./apps-sdk.md) |

### Adapter Overview

MCP-UI provides adapters to bridge protocol differences:

- **Apps SDK Adapter**: For ChatGPT and other Apps SDK hosts. Uses `text/html+skybridge` MIME type.
- **MCP Apps Adapter**: For legacy MCP-UI widgets to work in MCP Apps hosts. See [Legacy MCP-UI Adapter](./mcp-apps).

Both adapters are automatically injected into your HTML when enabled, translating between protocols.

## Supporting Both Host Types

To support both MCP Apps and legacy hosts, register both the resource handler and embed the resource in tool responses:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource } from '@modelcontextprotocol/ext-apps/server';
import { createUIResource } from '@mcp-ui/server';

const widgetUI = createUIResource({
  uri: 'ui://my-server/widget',
  content: { type: 'rawHtml', htmlString: '<h1>Widget</h1>' },
  encoding: 'text',
});

// For MCP Apps hosts
registerAppResource(server, 'widget_ui', widgetUI.resource.uri, {}, async () => ({
  contents: [widgetUI.resource]
}));

// Tool with _meta for MCP Apps + embedded resource for legacy hosts
registerAppTool(server, 'show_widget', {
  description: 'Show widget',
  inputSchema: { query: z.string() },
  _meta: { ui: { resourceUri: widgetUI.resource.uri } }
}, async ({ query }) => {
  return {
    content: [
      { type: 'text', text: `Query: ${query}` },
      widgetUI  // Embedded for legacy hosts
    ]
  };
});
```

## Legend

- ✅: Fully Supported
- ⚠️: Partial Support
- ❌: Not Supported (yet)
