# Supported Hosts

The `@mcp-ui/*` packages work with both MCP Apps hosts and legacy MCP-UI hosts.

## MCP Apps Hosts

These hosts implement the [MCP Apps SEP protocol](https://github.com/modelcontextprotocol/ext-apps) and support tools with `_meta.ui.resourceUri`:

| Host | Support | Notes |
| :--- | :-------: | :---- |
| [Claude](https://www.claude.ai/) | ✅ | ✅ |
| [VSCode](https://github.com/microsoft/vscode/issues/260218) | ✅ | |
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

## Other Hosts

| Host | Rendering | UI Actions | Notes |
| :--- | :-------: | :--------: | :---- |
| [ChatGPT](https://chatgpt.com/) | ✅ | ⚠️ | [Apps SDK Guide](./apps-sdk.md) |
| [Nanobot](https://www.nanobot.ai/) | ✅ | ✅ |
| [fast-agent](https://fast-agent.ai/mcp/mcp-ui/) | ✅ | ❌ | |

## Legend

- ✅: Fully Supported
- ⚠️: Partial Support
- ❌: Not Supported (yet)
