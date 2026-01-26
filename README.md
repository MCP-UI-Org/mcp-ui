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

**`mcp-ui`** pioneered the concept of interactive UI over [MCP](https://modelcontextprotocol.io/introduction), enabling rich web interfaces for AI tools. Alongside Apps SDK, the patterns developed here directly influenced the [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) specification, which standardized UI delivery over the protocol.

The `@mcp-ui/*` packages implement the MCP Apps standard. `@mcp-ui/client` is the recommended SDK for MCP Apps Hosts.

> *The @mcp-ui/* packages are fully compliant with the MCP Apps specification and ready for production use.*

<p align="center">
  <video src="https://github.com/user-attachments/assets/7180c822-2dd9-4f38-9d3e-b67679509483"></video>
</p>

## 💡 What's `mcp-ui`?

`mcp-ui` is an SDK implementing the [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) standard for UI over MCP. It provides:

* **`@mcp-ui/server` (TypeScript)**: Create UI resources with `createUIResource`. Works with `registerAppTool` and `registerAppResource` from `@modelcontextprotocol/ext-apps/server`.
* **`@mcp-ui/client` (TypeScript)**: Render tool UIs with `AppRenderer` (MCP Apps) or `UIResourceRenderer` (legacy MCP-UI hosts).
* **`mcp_ui_server` (Ruby)**: Create UI resources in Ruby.
* **`mcp-ui-server` (Python)**: Create UI resources in Python.

The MCP Apps pattern links tools to their UIs via `_meta.ui.resourceUri`. Hosts fetch and render the UI alongside tool results.

## ✨ Core Concepts

### MCP Apps Pattern (Recommended)

The MCP Apps standard links tools to their UIs via `_meta.ui.resourceUri`:

```ts
import { registerAppTool, registerAppResource } from '@modelcontextprotocol/ext-apps/server';
import { createUIResource } from '@mcp-ui/server';

// 1. Create UI resource
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
  description: 'Show widget',
  inputSchema: { query: z.string() },
  _meta: { ui: { resourceUri: widgetUI.resource.uri } }  // Links tool → UI
}, async ({ query }) => {
  return { content: [{ type: 'text', text: `Query: ${query}` }] };
});
```

Hosts detect `_meta.ui.resourceUri`, fetch the UI via `resources/read`, and render it with `AppRenderer`.

### UIResource (Wire Format)

The underlying payload for UI content:

```ts
interface UIResource {
  type: 'resource';
  resource: {
    uri: string;       // e.g., ui://component/id
    mimeType: 'text/html' | 'text/uri-list' | 'application/vnd.mcp-ui.remote-dom';
    text?: string;      // Inline HTML, external URL, or remote-dom script
    blob?: string;      // Base64-encoded content
  };
}
```

* **`uri`**: Unique identifier using `ui://` scheme
* **`mimeType`**: `text/html` for HTML, `text/uri-list` for URLs, `text/html;profile=mcp-app` for MCP Apps
* **`text` vs. `blob`**: Plain text or Base64-encoded content

### Client Components

#### AppRenderer (MCP Apps)

For MCP Apps hosts, use `AppRenderer` to render tool UIs:

```tsx
import { AppRenderer } from '@mcp-ui/client';

function ToolUI({ client, toolName, toolInput, toolResult }) {
  return (
    <AppRenderer
      client={client}
      toolName={toolName}
      sandbox={{ url: sandboxUrl }}
      toolInput={toolInput}
      toolResult={toolResult}
      onOpenLink={async ({ url }) => window.open(url)}
      onMessage={async (params) => console.log('Message:', params)}
    />
  );
}
```

Key props:
- **`client`**: Optional MCP client for automatic resource fetching
- **`toolName`**: Tool name to render UI for
- **`sandbox`**: Sandbox configuration with proxy URL
- **`toolInput`** / **`toolResult`**: Tool arguments and results
- **`onOpenLink`** / **`onMessage`**: Handlers for UI requests

#### UIResourceRenderer (Legacy MCP-UI)

For legacy hosts that embed resources in tool responses:

```tsx
import { UIResourceRenderer } from '@mcp-ui/client';

<UIResourceRenderer
  resource={mcpResource.resource}
  onUIAction={(action) => console.log('Action:', action)}
/>
```

Props:
- **`resource`**: Resource object with `uri`, `mimeType`, and content (`text`/`blob`)
- **`onUIAction`**: Callback for handling tool, prompt, link, notify, and intent actions

Also available as a Web Component:
```html
<ui-resource-renderer
  resource='{ "mimeType": "text/html", "text": "<h2>Hello!</h2>" }'
></ui-resource-renderer>
```

### Supported Resource Types

#### HTML (`text/html;profile=mcp-app`)

Rendered using the internal `<HTMLResourceRenderer />` component, which displays content inside an `<iframe>`. This is suitable for self-contained HTML.

*   **`mimeType`**: `text/html;profile=mcp-app` (MCP Apps standard)

### UI Action

UI snippets must be able to interact with the agent. In `mcp-ui`, this is done by hooking into events sent from the UI snippet and reacting to them in the host (see `onUIAction` prop). For example, an HTML may trigger a tool call when a button is clicked by sending an event which will be caught handled by the client.


### Platform Adapters

MCP-UI SDKs includes adapter support for host-specific implementations, enabling your open MCP-UI widgets to work seamlessly regardless of host. Adapters automatically translate between MCP-UI's `postMessage` protocol and host-specific APIs. Over time, as hosts become compatible with the open spec, these adapters wouldn't be needed.

#### Available Adapters

##### Apps SDK Adapter

For Apps SDK environments (e.g., ChatGPT), this adapter translates MCP-UI protocol to Apps SDK API calls (e.g., `window.openai`).

**How it Works:**
- Intercepts MCP-UI `postMessage` calls from your widgets
- Translates them to appropriate Apps SDK API calls
- Handles bidirectional communication (tools, prompts, state management)
- Works transparently - your existing MCP-UI code continues to work without changes

**Usage:**

```ts
import { createUIResource } from '@mcp-ui/server';

const htmlResource = createUIResource({
  uri: 'ui://greeting/1',
  content: { 
    type: 'rawHtml', 
    htmlString: `
      <button onclick="window.parent.postMessage({ type: 'tool', payload: { toolName: 'myTool', params: {} } }, '*')">
        Call Tool
      </button>
    ` 
  },
  encoding: 'text',
  // Enable adapters
  adapters: {
    appsSdk: {
      enabled: true,
      config: ...
    }
    // Future adapters can be enabled here
  }
});
```

The adapter scripts are automatically injected into your HTML content and handle all protocol translation.

**Supported Actions:**
- ✅ **Tool calls** - `{ type: 'tool', payload: { toolName, params } }`
- ✅ **Prompts** - `{ type: 'prompt', payload: { prompt } }`
- ✅ **Intents** - `{ type: 'intent', payload: { intent, params } }` (converted to prompts)
- ✅ **Notifications** - `{ type: 'notify', payload: { message } }`
- ✅ **Render data** - Access to `toolInput`, `toolOutput`, `widgetState`, `theme`, `locale`
- ⚠️ **Links** - `{ type: 'link', payload: { url } }` (may not be supported, returns error in some environments)

#### Advanced Usage

You can manually wrap HTML with adapters or access adapter scripts directly:

```ts
import { wrapHtmlWithAdapters, getAppsSdkAdapterScript } from '@mcp-ui/server';

// Manually wrap HTML with adapters
const wrappedHtml = wrapHtmlWithAdapters(
  '<button>Click me</button>',
  {
    appsSdk: {
      enabled: true,
      config: { intentHandling: 'ignore' }
    }
  }
);

// Get a specific adapter script
const appsSdkScript = getAppsSdkAdapterScript({ timeout: 60000 });
```

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

### TypeScript (MCP Apps Pattern)

1. **Server-side**: Create a tool with UI using `_meta.ui.resourceUri`

   ```ts
   import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
   import { registerAppTool, registerAppResource } from '@modelcontextprotocol/ext-apps/server';
   import { createUIResource } from '@mcp-ui/server';
   import { z } from 'zod';

   const server = new McpServer({ name: 'my-server', version: '1.0.0' });

   // Create UI resource
   const widgetUI = createUIResource({
     uri: 'ui://my-server/widget',
     content: { type: 'rawHtml', htmlString: '<h1>Interactive Widget</h1>' },
     encoding: 'text',
   });

   // Register resource handler
   registerAppResource(server, 'widget_ui', widgetUI.resource.uri, {}, async () => ({
     contents: [widgetUI.resource]
   }));

   // Register tool with _meta linking
   registerAppTool(server, 'show_widget', {
     description: 'Show widget',
     inputSchema: { query: z.string() },
     _meta: { ui: { resourceUri: widgetUI.resource.uri } }
   }, async ({ query }) => {
     return { content: [{ type: 'text', text: `Query: ${query}` }] };
   });
   ```

2. **Client-side**: Render tool UIs with `AppRenderer`

   ```tsx
   import { AppRenderer } from '@mcp-ui/client';

   function ToolUI({ client, toolName, toolInput, toolResult }) {
     return (
       <AppRenderer
         client={client}
         toolName={toolName}
         sandbox={{ url: sandboxUrl }}
         toolInput={toolInput}
         toolResult={toolResult}
         onOpenLink={async ({ url }) => window.open(url)}
         onMessage={async (params) => console.log('Message:', params)}
       />
     );
   }
   ```

### Legacy MCP-UI Pattern

For hosts that don't support MCP Apps yet:

   ```tsx
   import { UIResourceRenderer } from '@mcp-ui/client';

   <UIResourceRenderer
     resource={mcpResource.resource}
     onUIAction={(action) => console.log('Action:', action)}
   />
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

   # remote-dom
   remote_dom_resource = McpUiServer.create_ui_resource(
     uri: 'ui://remote-component/action-button',
     content: {
       type: :remote_dom,
       script: "
        const button = document.createElement('ui-button');
        button.setAttribute('label', 'Click me from Ruby!');
        button.addEventListener('press', () => {
          window.parent.postMessage({ type: 'tool', payload: { toolName: 'uiInteraction', params: { action: 'button-click', from: 'ruby-remote-dom' } } }, '*');
        });
        root.appendChild(button);
        ",
       framework: :react,
     },
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
* MCP-UI RemoteDOM Playground (`examples/remote-dom-demo`) - local demo app to test RemoteDOM resources
* MCP-UI Web Component Demo (`examples/wc-demo`) - local demo app to test the Web Component integration in hosts

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

The `@mcp-ui/*` packages work with both MCP Apps hosts and legacy MCP-UI hosts.

### MCP Apps Hosts

These hosts implement the [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps) and support tools with `_meta.ui.resourceUri`:

| Host | Notes |
| :--- | :---- |
| [VSCode](https://github.com/microsoft/vscode/issues/260218) | Internals (as of January) |
| [Postman](https://www.postman.com/) | |
| [Goose](https://block.github.io/goose/) | |
| [MCPJam](https://www.mcpjam.com/) | |
| [LibreChat](https://www.librechat.ai/) | |
| [mcp-use](https://mcp-use.com/) | |
| [Smithery](https://smithery.ai/playground) | |

### Legacy MCP-UI Hosts

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

### Hosts Requiring Adapters

| Host | Protocol | Notes |
| :--- | :------: | :---- |
| [ChatGPT](https://chatgpt.com/) | Apps SDK | [Guide](https://mcpui.dev/guide/apps-sdk) |

**Legend:** ✅ Supported · ⚠️ Partial · ❌ Not yet supported

## 🔒 Security
Host and user security is one of `mcp-ui`'s primary concerns. In all content types, the remote code is executed in a sandboxed iframe.

## 🛣️ Roadmap

- [X] Add online playground
- [X] Expand UI Action API (beyond tool calls)
- [X] Support Web Components
- [X] Support Remote-DOM
- [ ] Add component libraries (in progress)
- [ ] Add SDKs for additional programming languages (in progress; Ruby, Python available)
- [ ] Support additional frontend frameworks
- [ ] Explore providing a UI SDK (in addition to the client and server one)
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
