# UIResourceRenderer Component

::: tip For MCP Apps Hosts
If your host supports MCP Apps (the standard), use [`AppRenderer`](../mcp-apps#apprenderer-component) instead. It fetches resources, handles the lifecycle, and provides a complete MCP Apps experience.

`UIResourceRenderer` is for **legacy MCP-UI hosts** that embed UI resources directly in tool responses.
:::

The `UIResourceRenderer` component renders MCP-UI resources embedded in tool responses. It automatically detects the resource type and renders the appropriate component internally.
It is available as a React component and as a Web Component.

## React Component

React applications may use the `<UIResourceRenderer />` component.

## Web Component

For developers using frameworks other than React, a Web Component version is available. It can be used as a standard HTML element (`<ui-resource-renderer>`) and styled with regular CSS.

[**» See the Web Component Usage & Examples for more details**](./wc-usage-examples.md)

## Why use `UIResourceRenderer`?

- **Automatic Type Detection**: Inspects the resource's `mimeType` and `contentType` to determine the appropriate rendering method
- **Future-Proof**: Handles new resource types as they're added to the MCP-UI specification
- **Unified API**: Single component interface for all resource types
- **Security**: Maintains sandboxing and security features across all resource types

## Supported Resource Types

`UIResourceRenderer` automatically handles:

- **HTML Resources** (`text/html;profile=mcp-app`): Direct HTML content rendered in sandboxed iframes
- **External URLs**: External URLs now use `text/html;profile=mcp-app` - hosts that support external URLs will detect URL content

## Metadata Integration

The `UIResourceRenderer` automatically detects and uses metadata from resources created with the server SDK's `createUIResource()` function. It looks for MCP-UI specific metadata keys prefixed with `mcpui.dev/ui-` in the resource's `_meta` property:

### Automatic Frame Sizing
- **`mcpui.dev/ui-preferred-frame-size`**: When present, this metadata is used as the initial size for iframe-based resources, overriding any default sizing behavior.

### Automatic Data Passing
- **`mcpui.dev/ui-initial-render-data`**: When present, this data is automatically merged with the `iframeRenderData` prop (if provided) and passed to the iframe using the `ui-lifecycle-iframe-render-data` mechanism.

## Props

```typescript
import type { Resource } from '@modelcontextprotocol/sdk/types';

interface UIResourceRendererProps {
  resource: Partial<Resource>;
  onUIAction?: (result: UIActionResult) => Promise<unknown>;
  supportedContentTypes?: ResourceContentType[];
  htmlProps?: Omit<HTMLResourceRendererProps, 'resource' | 'onUIAction'>;
}
```

### Props Details

- **`resource`**: The resource object from an MCP response. Should include `uri`, `mimeType`, and content (`text`, `blob`, or `content`)
- **`onUIAction`**: Optional callback for handling UI actions from the resource:
  ```typescript
  { type: 'tool', payload: { toolName: string, params: Record<string, unknown> }, messageId?: string } |
  { type: 'intent', payload: { intent: string, params: Record<string, unknown> }, messageId?: string } |
  { type: 'prompt', payload: { prompt: string }, messageId?: string } |
  { type: 'notify', payload: { message: string }, messageId?: string } |
  { type: 'link', payload: { url: string }, messageId?: string }
  ```
  
  **Asynchronous Communication**: When actions include a `messageId`, the iframe automatically receives response messages (`ui-message-received`, `ui-message-response`). See [Protocol Details](../protocol-details.md#asynchronous-communication-with-message-ids) for examples.
- **`supportedContentTypes`**: Optional array to restrict which content types are allowed (`['rawHtml', 'externalUrl']`)
- **`htmlProps`**: Optional props for the `<HTMLResourceRenderer>`
  - **`style`**: Optional custom styles for iframe-based resources
  - **`proxy`**: Optional. A URL to a static "proxy" script for rendering external URLs. See [Using a Proxy for External URLs](./using-a-proxy.md) for details.
  - **`sandboxPermissions`**: Optional string to add additional iframe sandbox permissions. These are added to the default sandbox permissions:
    - For external URLs: `'allow-scripts allow-same-origin'`
    - For raw HTML iframes: `'allow-scripts'`
  - **`iframeProps`**: Optional props passed to iframe elements (for HTML/URL resources)
    - **`ref`**: Optional React ref to access the underlying iframe element
  - **`iframeRenderData`**: Optional `Record<string, unknown>` to pass data to the iframe upon rendering. This enables advanced use cases where the parent application needs to provide initial state or configuration to the sandboxed iframe content.
  - **`autoResizeIframe`**: Optional `boolean | { width?: boolean; height?: boolean }` to automatically resize the iframe to the size of the content.

## Basic Usage

```tsx
import React from 'react';
import { UIResourceRenderer, UIActionResult, isUIResource } from '@mcp-ui/client';

function App({ mcpResource }) {
  const handleUIAction = async (result: UIActionResult) => {
    switch (result.type) {
      case 'tool':
        console.log('Tool call:', result.payload.toolName, result.payload.params);
        // Handle tool execution
        break;
      case 'prompt':
        console.log('Prompt:', result.payload.prompt);
        // Handle prompt display
        break;
      case 'link':
        console.log('Link:', result.payload.url);
        // Handle link navigation
        break;
      case 'intent':
        console.log('Intent:', result.payload.intent, result.payload.params);
        // Handle intent processing
        break;
      case 'notify':
        console.log('Notification:', result.payload.message);
        // Handle notification display
        break;
    }
    return { status: 'handled' };
  };

  if (isUIResource(mcpResource)) {
    return (
      <UIResourceRenderer
        resource={mcpResource.resource}
        onUIAction={handleUIAction}
      />
    );
  }
  
  return <p>Unsupported resource</p>;
}
```

## Metadata Usage Examples

When a resource is created on the server with metadata, the `UIResourceRenderer` automatically applies the configuration:

```tsx
// Server-side resource creation (for reference)
// const serverResource = createUIResource({
//   uri: 'ui://chart/dashboard',
//   content: { type: 'externalUrl', iframeUrl: 'https://charts.example.com' },
//   encoding: 'text',
//   uiMetadata: {
//     'preferred-frame-size': [ '800px', '600px' ],
//     'initial-render-data': { theme: 'dark', userId: '123' }
//   }
// });

// Client-side rendering - metadata is automatically applied
function Dashboard({ mcpResource }) {
  const handleUIAction = async (result: UIActionResult) => {
    // Handle UI actions
    return { status: 'handled' };
  };

  return (
    <UIResourceRenderer
      resource={mcpResource.resource} // Contains metadata from server
      htmlProps={{
        // Additional render data can be merged with metadata
        iframeRenderData: { 
          sessionId: 'abc123',
          permissions: ['read', 'write']
        }
      }}
      onUIAction={handleUIAction}
    />
  );
}

// The UIResourceRenderer will:
// 1. Use ['800px', '600px'] as the initial iframe size
// 2. Merge server metadata with prop data:
//    { theme: 'dark', userId: '123', sessionId: 'abc123', permissions: ['read', 'write'] }
// 3. Pass the combined data to the iframe via ui-lifecycle-iframe-render-data
```

### Metadata Precedence

When both server metadata and component props provide similar data:
- **Frame sizing**: Server `preferred-frame-size` is used as the initial size, but can be overridden by component styling
- **Render data**: Server `initial-render-data` is merged with the `iframeRenderData` prop, with prop values taking precedence for duplicate keys

## Utility Functions

### `isUIResource()`

The `isUIResource()` utility function is a convenient way to check if content from an MCP response is a UI resource. Instead of manually checking:

```typescript
content.type === 'resource' && content.resource.uri?.startsWith('ui://')
```

You can simply use:

```typescript
import { isUIResource } from '@mcp-ui/client';

if (isUIResource(content)) {
  // This is a UI resource, safe to render
}
```

The function provides type narrowing, so TypeScript will understand that `content.resource` is available after the check.

## Advanced Usage

### Content Type Restrictions

```tsx
// Only allow HTML resources (block external URLs and Remote DOM)
<UIResourceRenderer
  resource={mcpResource.resource}
  supportedContentTypes={['rawHtml']}
  onUIAction={handleUIAction}
/>
```

### Custom Styling

```tsx
<UIResourceRenderer
  resource={mcpResource.resource}
  htmlProps={{
    style: { 
      border: '2px solid #007acc',
      borderRadius: '8px',
      minHeight: '400px'
    },
    iframeProps: {
      title: 'Custom MCP Resource',
      className: 'mcp-resource-frame'
    }
  }}
  onUIAction={handleUIAction}
/>
```

### Passing Render-Time Data to Iframes

The `iframeRenderData` prop allows you to send a data payload to an iframe as it renders. This is useful for initializing the iframe with dynamic data from the parent application.

When `iframeRenderData` is provided:
1. The iframe's URL will automatically include `?waitForRenderData=true`. The iframe's internal script can use this to know it should wait for data instead of immediately rendering.
2. The data is sent to the iframe via `postMessage` using a dual-mechanism approach to ensure reliable delivery:
    - **On Load**: A `ui-lifecycle-iframe-render-data` message is sent as soon as the iframe's `onLoad` event fires.
    - **On Ready**: If the iframe sends a `ui-lifecycle-iframe-ready` message, the parent will respond with the same `ui-lifecycle-iframe-render-data` payload.

This ensures the data is delivered whether the iframe is ready immediately or needs to perform setup work first.

```tsx
<UIResourceRenderer
  resource={mcpResource.resource}
  htmlProps={{
    iframeRenderData: {
      theme: 'dark',
      user: { id: '123', name: 'John Doe' }
    }
  }}
  onUIAction={handleUIAction}
/>
```

Inside the iframe, you can listen for this data:

```javascript
// In the iframe's script

// If the iframe needs to do async work, it can tell the parent when it's ready
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('waitForRenderData') === 'true') {
  let customRenderData = null;

  // The parent will send this message on load or when we notify it we're ready
  window.addEventListener('message', (event) => {
    // Add origin checks for security
    if (event.data.type === 'ui-lifecycle-iframe-render-data') {
      // If the iframe has already received data, we don't need to do anything
      if(customRenderData) {
        return;
      } else {
        customRenderData = event.data.payload.renderData;
        // Now you can render the UI with the received data
        renderUI(customRenderData);
      }
    }
  });
  // We can let the parent know we're ready to receive data
  window.parent.postMessage({ type: 'ui-lifecycle-iframe-ready' }, '*');
} else {
  // If the iframe doesn't need to wait for data, we can render the default UI immediately
  renderUI();
}
```

#### Alternative: Explicit Render Data Requests

Instead of relying on the `ui-lifecycle-iframe-ready` lifecycle event, iframes can explicitly request render data when needed using the `ui-request-render-data` message type:

```javascript
// In the iframe's script - explicit render data request
async function requestRenderData() {
  return new Promise((resolve, reject) => {
    const messageId = crypto.randomUUID();
    
    window.parent.postMessage(
      { type: 'ui-request-render-data', messageId },
      '*'
    );

    function handleMessage(event) {
      if (event.data?.type !== 'ui-lifecycle-iframe-render-data') return;
      if (event.data.messageId !== messageId) return;
      
      window.removeEventListener('message', handleMessage);
      
      const { renderData, error } = event.data.payload;
      if (error) return reject(error);
      return resolve(renderData);
    }

    window.addEventListener('message', handleMessage);
  });
}

// Use it when your iframe is ready
const renderData = await requestRenderData();
renderUI(renderData);
```

### Automatically Resizing the Iframe

The `autoResizeIframe` prop allows you to automatically resize the iframe to the size of the content.

```tsx
<UIResourceRenderer
  resource={mcpResource.resource}
  htmlProps={{
    autoResizeIframe: true,
  }}
  onUIAction={handleUIAction}
/>
```

The `autoResizeIframe` prop can be a boolean or an object with the following properties:

- **`width`**: Optional boolean to automatically resize the iframe's width to the size of the content.
- **`height`**: Optional boolean to automatically resize the iframe's height to the size of the content.

If `autoResizeIframe` is a boolean, the iframe will be resized to the size of the content.

Inside the iframe, you can listen for the `ui-size-change` message and resize the iframe to the size of the content.

```javascript
const resizeObserver = new ResizeObserver((entries) => {
  entries.forEach((entry) => {
    window.parent.postMessage(
      {
        type: "ui-size-change",
        payload: {
          height: entry.contentRect.height,
        },
      },
      "*",
    );
  });
});

resizeObserver.observe(document.documentElement)
```

See [Automatically Resizing the Iframe](./html-resource.md#automatically-resizing-the-iframe) for a more detailed example.

### Accessing the Iframe Element

You can pass a ref through `iframeProps` to access the underlying iframe element:

```tsx
import React, { useRef } from 'react';

function MyComponent({ mcpResource }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleFocus = () => {
    // Access the iframe element directly
    if (iframeRef.current) {
      iframeRef.current.focus();
    }
  };

  return (
    <div>
      <button onClick={handleFocus}>Focus Iframe</button>
      <UIResourceRenderer
        resource={mcpResource.resource}
        htmlProps={{
          iframeProps: {
            ref: iframeRef,
            title: 'MCP Resource'
          }
        }}
        onUIAction={handleUIAction}
      />
    </div>
  );
}
```

## Resource Type Detection

`UIResourceRenderer` determines the resource type using this logic:

1. **Explicit `contentType`**: If `resource.contentType` is set, use it directly
2. **MIME Type Detection**:
   - `text/html` or `text/html;profile=mcp-app` → content is inspected to determine if it's HTML or a URL
3. **Fallback**: Show unsupported resource error

## Error Handling

```tsx
function App({ mcpResource }) {
  if (
    mcpResource.type === 'resource' &&
    mcpResource.resource.uri?.startsWith('ui://')
  ) {
    return (
      <div>
        <h3>MCP Resource: {mcpResource.resource.uri}</h3>
        <UIResourceRenderer
          resource={mcpResource.resource}
          onUIAction={handleUIAction}
          supportedContentTypes={['rawHtml', 'externalUrl']} // Restrict types
        />
      </div>
    );
  }
  
  return <p>This resource is not a UI resource</p>;
}
```

When unsupported content types are encountered, `UIResourceRenderer` will display appropriate error messages:
- `"Unsupported content type: {type}."`
- `"Unsupported resource type."`

## Security Considerations

- **Sandboxing**: HTML and URL resources are rendered in sandboxed iframes
- **Content Restrictions**: Use `supportedContentTypes` to limit allowed resource types
- **Origin Validation**: Always validate `postMessage` origins in production
- **Content Sanitization**: Consider sanitizing HTML content for untrusted sources

## Examples

See [Client SDK Usage & Examples](./react-usage-examples.md) for complete working examples.
