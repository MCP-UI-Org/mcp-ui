---
layout: home

hero:
  name: MCP-UI -> MCP Apps
  text: Interactive UI Components over MCP
  tagline: Build rich, dynamic interfaces for AI tools using the MCP Apps standard.
  image:
    light: /logo-lg-black.png
    dark: /logo-lg.png
    alt: MCP-UI Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: GitHub
      link: https://github.com/idosal/mcp-ui
    - theme: alt
      text: Live Demo
      link: https://scira-mcp-chat-git-main-idosals-projects.vercel.app/
    - theme: alt
      text: About
      link: /about

features:
  - title: 🌐 MCP Apps Standard
    details: MCP Apps is the official standard for interactive UI in MCP. The MCP-UI packages implement the spec, and serve as a community playground for future enhancements.
  - title: 🛠️ Client & Server SDKs
    details: The recommended MCP Apps Client SDK, with components for seamless integration. Includes server SDK with utilities.
  - title: 🔒 Secure
    details: All remote code executes in sandboxed iframes, ensuring host and user security while maintaining rich interactivity.
  - title: 🎨 Flexible
    details: Supports HTML content. Works with MCP Apps hosts and legacy MCP-UI hosts alike.
---

<!-- ## See MCP-UI in Action -->
<div style="display: flex; flex-direction: column; align-items: center; margin: 3rem 0 2rem 0;">
<span class="text animated-gradient-text" style="font-size: 30px; font-family: var(--vp-font-family-base); font-weight: 600;
    letter-spacing: -0.01em; margin-bottom: 0.5rem; text-align: center; line-height: 1.2;">See it in action</span>
<div class="video-container" style="display: flex; justify-content: center; align-items: center;">
  <video controls width="100%" style="max-width: 800px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
    <source src="https://github.com/user-attachments/assets/7180c822-2dd9-4f38-9d3e-b67679509483" type="video/mp4">
    Your browser does not support the video tag.
  </video>
</div>
</div>

## Quick Example

**Client Side** - Render tool UIs with `AppRenderer`:

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
      onOpenLink={async ({ url }) => {
        // Validate URL scheme before opening
        if (url.startsWith('https://') || url.startsWith('http://')) {
          window.open(url);
        }
      }}
      onMessage={async (params) => console.log('Message:', params)}
    />
  );
}
```

**Server Side** - Create a tool with an interactive UI using `_meta.ui.resourceUri`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource } from '@modelcontextprotocol/ext-apps/server';
import { createUIResource } from '@mcp-ui/server';
import { z } from 'zod';

const server = new McpServer({ name: 'my-server', version: '1.0.0' });

// Create the UI resource
const widgetUI = createUIResource({
  uri: 'ui://my-server/widget',
  content: { type: 'rawHtml', htmlString: '<h1>Interactive Widget</h1>' },
  encoding: 'text',
});

// Register the resource handler
registerAppResource(server, 'widget_ui', widgetUI.resource.uri, {}, async () => ({
  contents: [widgetUI.resource]
}));

// Register the tool with _meta.ui.resourceUri
registerAppTool(server, 'show_widget', {
  description: 'Show interactive widget',
  inputSchema: { query: z.string() },
  _meta: { ui: { resourceUri: widgetUI.resource.uri } }  // Links tool to UI
}, async ({ query }) => {
  return { content: [{ type: 'text', text: `Query: ${query}` }] };
});
```

::: tip Legacy MCP-UI Support
For existing MCP-UI apps or hosts that don't support MCP Apps yet, see the [Legacy MCP-UI Adapter](./guide/mcp-apps) guide.
:::


<style>
.video-container {
  text-align: center;
  margin: 2rem 0;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 2rem 0;
  flex-wrap: wrap;
}

.action-button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
}

.action-button.primary {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
}

.action-button.primary:hover {
  background: var(--vp-c-brand-2);
}

.action-button.secondary {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.action-button.secondary:hover {
  background: var(--vp-c-bg-mute);
}

@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .action-button {
    width: 200px;
    text-align: center;
  }
}

a.VPButton.medium[href="/about"] {
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

a.VPButton.medium[href="/about"]:hover {
  background-color: var(--vp-c-bg-mute);
}
</style>
