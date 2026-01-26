# @mcp-ui/client Overview

The `@mcp-ui/client` package provides components for rendering MCP tool UIs in your host application. It supports both MCP Apps (the standard) and legacy MCP-UI hosts.

## What's Included?

### MCP Apps Components (Recommended)
- **`<AppRenderer />`**: High-level component for MCP Apps hosts. Fetches resources, handles lifecycle, renders tool UIs.
- **`<AppFrame />`**: Lower-level component for when you have pre-fetched HTML and an AppBridge instance.
- **`AppBridge`**: Handles JSON-RPC communication between host and guest UI.

### Legacy MCP-UI Components
- **`<UIResourceRenderer />`**: For legacy hosts that embed resources in tool responses. Inspects `mimeType` and renders `<HTMLResourceRenderer />` or `<RemoteDOMResourceRenderer />` internally.
- **`<HTMLResourceRenderer />`**: Internal component for HTML/URL resources
- **`<RemoteDOMResourceRenderer />`**: Internal component for remote DOM resources
- **`isUIResource()`**: Utility function to check if content is a UI resource

### Utility Functions
- **`getResourceMetadata(resource)`**: Extracts the resource's `_meta` content (standard MCP metadata)
- **`getUIResourceMetadata(resource)`**: Extracts only the MCP-UI specific metadata keys (prefixed with `mcpui.dev/ui-`) from the resource's `_meta` content
- **`UI_EXTENSION_CAPABILITIES`**: Declares UI extension support for your MCP client

## Purpose
- **MCP Apps Compliance**: Implements the MCP Apps standard for UI over MCP
- **Simplified Rendering**: AppRenderer handles resource fetching, lifecycle, and rendering automatically
- **Security**: All UIs render in sandboxed iframes
- **Interactivity**: JSON-RPC communication between host and guest UI

## Quick Example: AppRenderer

For MCP Apps hosts (recommended):

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
        if (url.startsWith('https://') || url.startsWith('http://')) {
          window.open(url);
        }
      }}
      onMessage={async (params) => console.log('Message:', params)}
    />
  );
}
```

For legacy MCP-UI hosts:

```tsx
import { UIResourceRenderer } from '@mcp-ui/client';

<UIResourceRenderer
  resource={mcpResource.resource}
  onUIAction={(action) => console.log('Action:', action)}
/>
```

## Building

This package uses Vite in library mode. It outputs ESM (`.mjs`) and UMD (`.js`) formats, plus TypeScript declarations (`.d.ts`). `react` is externalized.

To build just this package from the monorepo root:

```bash
pnpm build --filter @mcp-ui/client
```

## Utility Functions Reference

### `getResourceMetadata(resource)`

Extracts the standard MCP metadata from a resource's `_meta` property.

```typescript
import { getResourceMetadata } from '@mcp-ui/client';

const resource = {
  uri: 'ui://example/demo',
  mimeType: 'text/html',
  text: '<div>Hello</div>',
  _meta: {
    title: 'Demo Component',
    version: '1.0.0',
    'mcpui.dev/ui-preferred-frame-size': ['800px', '600px'],
    'mcpui.dev/ui-initial-render-data': { theme: 'dark' },
    author: 'Development Team'
  }
};

const metadata = getResourceMetadata(resource);
console.log(metadata);
// Output: {
//   title: 'Demo Component',
//   version: '1.0.0',
//   'mcpui.dev/ui-preferred-frame-size': ['800px', '600px'],
//   'mcpui.dev/ui-initial-render-data': { theme: 'dark' },
//   author: 'Development Team'
// }
```

### `getUIResourceMetadata(resource)`

Extracts only the MCP-UI specific metadata keys (those prefixed with `mcpui.dev/ui-`) from a resource's `_meta` property, with the prefixes removed for easier access.

```typescript
import { getUIResourceMetadata } from '@mcp-ui/client';

const resource = {
  uri: 'ui://example/demo',
  mimeType: 'text/html',
  text: '<div>Hello</div>',
  _meta: {
    title: 'Demo Component',
    version: '1.0.0',
    'mcpui.dev/ui-preferred-frame-size': ['800px', '600px'],
    'mcpui.dev/ui-initial-render-data': { theme: 'dark' },
    author: 'Development Team'
  }
};

const uiMetadata = getUIResourceMetadata(resource);
console.log(uiMetadata);
// Output: {
//   'preferred-frame-size': ['800px', '600px'],
//   'initial-render-data': { theme: 'dark' },
// }
```

### Usage Examples

These utility functions are particularly useful when you need to access metadata programmatically:

```typescript
import { getUIResourceMetadata, UIResourceRenderer } from '@mcp-ui/client';

function SmartResourceRenderer({ resource }) {
  const uiMetadata = getUIResourceMetadata(resource);
  
  // Use metadata to make rendering decisions
  const initialRenderData = uiMetadata['initial-render-data'];
  const containerClass = initialRenderData.preferredContext === 'hero' ? 'hero-container' : 'default-container';
  
  return (
    <div className={containerClass}>
      {preferredContext === 'hero' && (
        <h2>Featured Component</h2>
      )}
      <UIResourceRenderer resource={resource} />
    </div>
  );
}
```

## See More

See the following pages for more details:

- [Client SDK Walkthrough](./walkthrough.md) - **Step-by-step guide to building an MCP Apps client**
- [UIResourceRenderer Component](./resource-renderer.md) - Legacy MCP-UI renderer
- [HTMLResourceRenderer Component](./html-resource.md)
- [RemoteDOMResourceRenderer Component](./remote-dom-resource.md)
- [React Usage & Examples](./react-usage-examples.md)
- [Web Component Usage & Examples](./wc-usage-examples.md)
