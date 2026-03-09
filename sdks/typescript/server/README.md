## 📦 Model Context Protocol UI SDK

<p align="center">
  <img width="250" alt="image" src="https://github.com/user-attachments/assets/65b9698f-990f-4846-9b2d-88de91d53d4d" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@mcp-ui/server"><img src="https://img.shields.io/npm/v/@mcp-ui/server?label=server&color=green" alt="Server Version"></a>
  <a href="https://www.npmjs.com/package/@mcp-ui/client"><img src="https://img.shields.io/npm/v/@mcp-ui/client?label=client&color=blue" alt="Client Version"></a>
  <a href="https://rubygems.org/gems/mcp_ui_server"><img src="https://img.shields.io/gem/v/mcp_ui_server" alt="Ruby Server SDK Version"></a>
  <a href="https://pypi.org/project/mcp-ui-server/"><img src="https://img.shields.io/pypi/v/mcp-ui-server?label=python&color=yellow" alt="Python Server SDK Version"></a>
  <a href="https://discord.gg/CEAG4KW7ZH"><img src="https://img.shields.io/discord/1401195140436983879?logo=discord&label=discord" alt="Discord"></a>
  <a href="https://gitmcp.io/idosal/mcp-ui"><img src="https://img.shields.io/endpoint?url=https://gitmcp.io/badge/idosal/mcp-ui" alt="MCP Documentation"></a>
</p>

<p align="center">
  <a href="#-whats-mcp-ui">What's mcp-ui?</a> •
  <a href="#-core-concepts">Core Concepts</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-walkthrough">Walkthrough</a> •
  <a href="#-examples">Examples</a> •
  <a href="#-supported-hosts">Supported Hosts</a> •
  <a href="#-security">Security</a> •
  <a href="#-roadmap">Roadmap</a> •
  <a href="#-contributing">Contributing</a> •
  <a href="#-license">License</a>
</p>

----

**`mcp-ui`** brings interactive web components to the [Model Context Protocol](https://modelcontextprotocol.io/introduction) (MCP). Deliver rich, dynamic UI resources directly from your MCP server to be rendered by the client. Take AI interaction to the next level!

> *This project is an experimental community playground for MCP UI ideas. Expect rapid iteration and enhancements!*

<p align="center">
  <video src="https://github.com/user-attachments/assets/7180c822-2dd9-4f38-9d3e-b67679509483"></video>
</p>

## 💡 What's `mcp-ui`?

`mcp-ui` is a playground for the open spec of UI over MCP. It offers a collection of community SDKs comprising:

* **`@mcp-ui/server` (TypeScript)**: Utilities to generate UI resources (`UIResource`) on your MCP server.
* **`@mcp-ui/client` (TypeScript)**: UI components (e.g., `<AppRenderer />`) to render the UI resources and handle their events.
* **`mcp_ui_server` (Ruby)**: Utilities to generate UI resources on your MCP server in a Ruby environment.
* **`mcp-ui-server` (Python)**: Utilities to generate UI resources on your MCP server in a Python environment.

Together, they let you define reusable UI snippets on the server side, seamlessly and securely render them in the client, and react to their actions in the MCP host environment.

## ✨ Core Concepts

In essence, by using `mcp-ui` SDKs, servers and hosts can agree on contracts that enable them to create and render interactive UI snippets (as a path to a standardized UI approach in MCP).

### UI Resource
The primary payload returned from the server to the client is the `UIResource`:

```ts
interface UIResource {
  type: 'resource';
  resource: {
    uri: string;       // e.g., ui://component/id
    mimeType: 'text/html;profile=mcp-app';
    text?: string;      // HTML content
    blob?: string;      // Base64-encoded HTML content
  };
}
```

* **`uri`**: Unique identifier for caching and routing
  * `ui://…` — UI resources
* **`mimeType`**: `text/html;profile=mcp-app` — the MCP Apps standard MIME type
* **`text` vs. `blob`**: Choose `text` for simple strings; use `blob` for larger or encoded content.

## 🏗️ Installation

### TypeScript

```bash
# using npm
npm install @mcp-ui/server @mcp-ui/client

# or pnpm
pnpm add @mcp-ui/server @mcp-ui/client

# or yarn
yarn add @mcp-ui/server @mcp-ui/client
```

### Ruby

```bash
gem install mcp_ui_server
```

### Python

```bash
# using pip
pip install mcp-ui-server

# or uv
uv add mcp-ui-server
```

## 🚀 Getting Started

You can use [GitMCP](https://gitmcp.io/idosal/mcp-ui) to give your IDE access to `mcp-ui`'s latest documentation! 

### TypeScript

1. **Server-side**: Build your UI resources

   ```ts
   import { createUIResource } from '@mcp-ui/server';

   // Inline HTML
   const htmlResource = await createUIResource({
     uri: 'ui://greeting/1',
     content: { type: 'rawHtml', htmlString: '<p>Hello, MCP UI!</p>' },
     encoding: 'text',
   });

   // External URL (fetches the page HTML and injects a <base> tag)
   const externalUrlResource = await createUIResource({
     uri: 'ui://greeting/1',
     content: { type: 'externalUrl', iframeUrl: 'https://example.com' },
     encoding: 'text',
   });
   ```

2. **Client-side**: Render in your MCP host

   ```tsx
   import React from 'react';
   import { AppRenderer } from '@mcp-ui/client';

   function ToolUI({ client, toolName, toolInput, toolResult }) {
     return (
       <AppRenderer
         client={client}
         toolName={toolName}
         sandbox={{ url: sandboxUrl }}
         toolInput={toolInput}
         toolResult={toolResult}
       />
     );
   }
   ```

### Python

**Server-side**: Build your UI resources

   ```python
   from mcp_ui_server import create_ui_resource

   # Inline HTML
   html_resource = create_ui_resource({
     "uri": "ui://greeting/1",
     "content": { "type": "rawHtml", "htmlString": "<p>Hello, from Python!</p>" },
     "encoding": "text",
   })

   # External URL
   external_url_resource = create_ui_resource({
     "uri": "ui://greeting/2",
     "content": { "type": "externalUrl", "iframeUrl": "https://example.com" },
     "encoding": "text",
   })
   ```

### Ruby

**Server-side**: Build your UI resources

   ```ruby
   require 'mcp_ui_server'

   # Inline HTML
   html_resource = McpUiServer.create_ui_resource(
     uri: 'ui://greeting/1',
     content: { type: :raw_html, htmlString: '<p>Hello, from Ruby!</p>' },
     encoding: :text
   )

   # External URL
   external_url_resource = McpUiServer.create_ui_resource(
     uri: 'ui://greeting/2',
     content: { type: :external_url, iframeUrl: 'https://example.com' },
     encoding: :text
   )

   ```

## 🚶 Walkthrough

For a detailed, simple, step-by-step guide on how to integrate `mcp-ui` into your own server, check out the full server walkthroughs on the [mcp-ui documentation site](https://mcpui.dev):

- **[TypeScript Server Walkthrough](https://mcpui.dev/guide/server/typescript/walkthrough)**
- **[Ruby Server Walkthrough](https://mcpui.dev/guide/server/ruby/walkthrough)**
- **[Python Server Walkthrough](https://mcpui.dev/guide/server/python/walkthrough)**

These guides will show you how to add a `mcp-ui` endpoint to an existing server, create tools that return UI resources, and test your setup with the `ui-inspector`!

## 🌍 Examples

**Client Examples**
* [Goose](https://github.com/block/goose) - open source AI agent that supports `mcp-ui`.
* [LibreChat](https://github.com/danny-avila/LibreChat) - enhanced ChatGPT clone that supports `mcp-ui`.
* [ui-inspector](https://github.com/idosal/ui-inspector) - inspect local `mcp-ui`-enabled servers.
* [MCP-UI Chat](https://github.com/idosal/scira-mcp-ui-chat) - interactive chat built with the `mcp-ui` client. Check out the [hosted version](https://scira-mcp-chat-git-main-idosals-projects.vercel.app/)!
**Server Examples**
* **TypeScript**: A [full-featured server](examples/server) that is deployed to a hosted environment for easy testing.
  * **[`typescript-server-demo`](./examples/typescript-server-demo)**: A simple Typescript server that demonstrates how to generate UI resources.
  * **server**: A [full-featured Typescript server](examples/server) that is deployed to a hosted Cloudflare environment for easy testing.
    * **HTTP Streaming**: `https://remote-mcp-server-authless.idosalomon.workers.dev/mcp`
    * **SSE**: `https://remote-mcp-server-authless.idosalomon.workers.dev/sse`
* **Ruby**: A barebones [demo server](/examples/ruby-server-demo) that shows how to use `mcp_ui_server` and `mcp` gems together.
* **Python**: A simple [demo server](/examples/python-server-demo) that shows how to use the `mcp-ui-server` Python package.
* [XMCP](https://github.com/basementstudio/xmcp/tree/main/examples/mcp-ui) - Typescript MCP framework with `mcp-ui` starter example.

Drop those URLs into any MCP-compatible host to see `mcp-ui` in action. For a supported local inspector, see the [ui-inspector](https://github.com/idosal/ui-inspector).

## 💻 Supported Hosts

`mcp-ui` is supported by a growing number of MCP-compatible clients. Feature support varies by host:

| Host      | Rendering | UI Actions | Notes
| :-------- | :-------: | :--------: | :--------: |
| [Nanobot](https://www.nanobot.ai/)    |     ✅    |     ✅     |
| [ChatGPT](https://chatgpt.com/)    |     ✅    |     ⚠️     | [Guide](https://mcpui.dev/guide/apps-sdk)
| [Postman](https://www.postman.com/)   |     ✅    |     ⚠️      |
| [Goose](https://block.github.io/goose/)     |     ✅    |     ⚠️      |
| [LibreChat](https://www.librechat.ai/)    |     ✅    |     ⚠️     |
| [Smithery](https://smithery.ai/playground)  |     ✅    |     ❌     |
| [MCPJam](https://www.mcpjam.com/)    |     ✅    |     ❌     |
| [fast-agent](https://fast-agent.ai/mcp/mcp-ui/) | ✅ | ❌ |
| [VSCode](https://github.com/microsoft/vscode/issues/260218) (TBA)    |    ?    |    ?     |

**Legend:**
- ✅: Supported
- ⚠️: Partial Support
- ❌: Not Supported (yet)

## 🔒 Security
Host and user security is one of `mcp-ui`'s primary concerns. In all content types, the remote code is executed in a sandboxed iframe.

## 🛣️ Roadmap

- [X] Add online playground
- [X] Expand UI Action API (beyond tool calls)
- [ ] Add component libraries (in progress)
- [ ] Add SDKs for additional programming languages (in progress; Ruby, Python available)
- [ ] Support additional frontend frameworks
- [ ] Add declarative UI content type
- [ ] Support generative UI?
      
## Core Team
`mcp-ui` is a project by [Ido Salomon](https://x.com/idosal1), in collaboration with [Liad Yosef](https://x.com/liadyosef).

## 🤝 Contributing

Contributions, ideas, and bug reports are welcome! See the [contribution guidelines](https://github.com/idosal/mcp-ui/blob/main/.github/CONTRIBUTING.md) to get started.

## 📄 License

Apache License 2.0 © [The MCP-UI Authors](LICENSE)

## Disclaimer

This project is provided "as is", without warranty of any kind. The `mcp-ui` authors and contributors shall not be held liable for any damages, losses, or issues arising from the use of this software. Use at your own risk.
