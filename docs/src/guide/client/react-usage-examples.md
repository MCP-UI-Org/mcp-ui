# React Usage & Examples

::: tip MCP Apps Hosts
For MCP Apps hosts (the standard), use `AppRenderer` instead of `UIResourceRenderer`. See [MCP Apps Integration](../mcp-apps#apprenderer-component) for details.

This page covers `UIResourceRenderer`, which is for **legacy MCP-UI hosts** that embed resources in tool responses.
:::

Here's how to use the `<UIResourceRenderer />` component from `@mcp-ui/client` in a React environment.

## Installation

Make sure you have `@mcp-ui/client` and its peer dependencies installed in your project:

```bash
npm i @mcp-ui/client
```

## Rendering HTML Resources

```tsx
import React, { useState } from 'react';
import {
  UIResourceRenderer,
  UIActionResult,
  isUIResource
} from '@mcp-ui/client';

// Simulate fetching an MCP UI resource
const fetchMcpResource = async (id: string): Promise<any> => {
  if (id === 'raw') {
    return {
      type: 'resource',
      resource: {
        uri: 'ui://example/raw-html',
        mimeType: 'text/html',
        text: "<h1>raw HTML via Text</h1><p>Content loaded rawly.</p><button onclick=\"window.parent.postMessage({ type: 'tool', payload: { toolName: 'uiInteraction', params: { action: 'rawClick', value: Date.now() } } }, '*')\">Click Me (raw)</button>",
      },
    };
  } else if (id === 'blob') {
    const html =
      "<h1>HTML from Blob</h1><p>Content was Base64 encoded.</p><button onclick=\"window.parent.postMessage({ type: 'tool', payload: { toolName: 'uiInteraction', params: { action: 'blobClick', value: 'test' } } }, '*')\">Click Me (Blob)</button>";
    return {
      type: 'resource',
      resource: {
        uri: 'ui://example/blob-html',
        mimeType: 'text/html',
        blob: btoa(html),
      },
    };
  } else if (id === 'external') {
    return {
      type: 'resource',
      resource: {
        uri: 'ui://example/external-site',
        mimeType: 'text/uri-list',
        text: 'https://vitepress.dev',
      },
    };
  }
  throw new Error('Unknown resource ID');
};

const App: React.FC = () => {
  const [uiResource, setUIResource] = useState<UIResource | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<any>(null);

  const loadResource = async (id: string) => {
    setLoading(true);
    setError(null);
    setUIResource(null);
    try {
      const block = await fetchMcpResource(id);
      setUIResource(block);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleGenericMcpAction = async (result: UIActionResult) => {
    if (result.type === 'tool') {
      console.log(`Action received in host app - Tool: ${result.payload.toolName}, Params:`, result.payload.params);
      setLastAction({ tool: result.payload.toolName, params: result.payload.params });
    } else if (result.type === 'prompt') {
      console.log(`Prompt received in host app:`, result.payload.prompt);
      setLastAction({ prompt: result.payload.prompt });
    } else if (result.type === 'link') {
      console.log(`Link received in host app:`, result.payload.url);
      setLastAction({ url: result.payload.url });
    } else if (result.type === 'intent') {
      console.log(`Intent received in host app:`, result.payload.intent);
      setLastAction({ intent: result.payload.intent });
    } else if (result.type === 'notify') {
      console.log(`Notification received in host app:`, result.payload.message);
      setLastAction({ message: result.payload.message });
    }
    return {
      status: 'Action handled by host application',
    };
  };

  return (
    <div>
      <h1>MCP-UI Client Demo</h1>
      <button onClick={() => loadResource('raw')}>
        Load raw HTML (Text)
      </button>
      <button onClick={() => loadResource('blob')}>
        Load raw HTML (Blob)
      </button>
      <button onClick={() => loadResource('external')}>
        Load External App (URL)
      </button>

      {loading && <p>Loading resource...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {uiResource && uiResource.resource && (
        <div style={{ marginTop: 20, border: '2px solid blue', padding: 10 }}>
          <h2>Rendering Resource: {uiResource.resource.uri}</h2>
          <UIResourceRenderer
            resource={uiResource.resource}
            onUIAction={handleGenericMcpAction}
          />
        </div>
      )}

      {lastAction && (
        <div style={{ marginTop: 20, border: '1px solid green', padding: 10 }}>
          <h3>Last Action Received by Host:</h3>
          <pre>{JSON.stringify(lastAction, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default App;
```

---

## Using the `isUIResource` Utility

Instead of manually checking if content is a UI resource, you can use the `isUIResource()` utility function:

```tsx
import React from 'react';
import { UIResourceRenderer, isUIResource } from '@mcp-ui/client';

function ResourceList({ mcpResponses }) {
  return (
    <div>
      {mcpResponses.map((response, index) => {
        // Use isUIResource instead of manual checking
        if (isUIResource(response)) {
          return (
            <div key={index}>
              <h3>UI Resource: {response.resource.uri}</h3>
              <UIResourceRenderer 
                resource={response.resource} 
                onUIAction={handleAction}
              />
            </div>
          );
        }
        
        // Handle other response types
        return (
          <div key={index}>
            <p>Non-UI content: {response.type}</p>
          </div>
        );
      })}
    </div>
  );
}
```

This is equivalent to the manual check:
```typescript
response.type === 'resource' && response.resource.uri?.startsWith('ui://')
```

But provides better type safety and is more concise.

---

## Handling Asynchronous Actions with Message IDs

When an action from the iframe requires asynchronous processing on the host, the `messageId` property can be used to track the action's lifecycle and result. This allows the iframe to fetch data from the host, present feedback to the user (e.g., loading indicators), success messages, etc.

### Communication Flow

1.  **Iframe to Host**: The iframe sends a message with a unique `messageId`.
2.  **Host Acknowledgment**: The `UIResourceRenderer` automatically sends a `ui-message-received` message back to the iframe to acknowledge receipt.
3.  **Host Processing**: The `onUIAction` function provided to the renderer is executed. This function can be `async` and performs the long-running task.
4.  **Host Response**:
    *   If the `onUIAction` promise resolves, `UIResourceRenderer` sends a `ui-message-response` with the resolved value as the `response`.
    *   If the `onUIAction` promise rejects (throws an error), it sends a `ui-message-response` with the error details as the `error`.
5.  **Iframe Updates**: The iframe listens for these messages and updates its UI accordingly.

### Example


#### 1. In the iframe: Initiating the request

First, the iframe needs to generate a unique ID for the request and send it to the host. It should also keep track of pending requests to handle responses when they arrive.

```typescript
// A Map to store callbacks for pending requests, keyed by messageId.
const requests = new Map<string, (response: any, error?: any) => void>();

function makeRequest() {
  const messageId = crypto.randomUUID();

  // Store a callback to handle the response for this specific request.
  requests.set(messageId, (response, error) => {
    if (error) {
      console.error('Request failed:', error);
      // Update UI to show error
    } else {
      console.log('Received response:', response);
      // Update UI with the response data
    }
  });

  // Send the request to the host.
  window.parent.postMessage(
    {
      type: "ui-request-data",
      messageId,
      payload: {
        requestType: "get-payment-methods",
        params: {
          // any params needed for the request
        },
      },
    },
    "*"
  );

  // You can update the UI to a loading state here.
}

// Example: trigger the request on a button click.
button.addEventListener("click", makeRequest);
```

#### 2. In the host: Receiving and processing the request

The host listens for messages from the iframe. When it receives a request with a `messageId`, it can optionally send an acknowledgment and then starts the asynchronous work.

```typescript
window.addEventListener("message", async (event) => {
  const { type, messageId, payload } = event.data;

  // Acknowledge receipt of the message
  if (messageId && event.source) {
    (event.source as Window).postMessage(
      {
        type: "ui-message-received",
        messageId: messageId,
      },
      { targetOrigin: "*" }
    );
  }

  if (type === "ui-request-data") {
    const { requestType, params } = payload;
    if (requestType === "get-payment-methods") {
      try {
        // 3. Perform the async operation
        const paymentMethods = await fetchPaymentMethods(params);

        // 4. Send a success response
        if (event.source) {
          (event.source as Window).postMessage(
            {
              type: "ui-message-response",
              messageId: messageId,
              payload: { response: { paymentMethods } },
            },
            { targetOrigin: "*" }
          );
        }
      } catch (error) {
        // 4. Send an error response
        if (event.source) {
          (event.source as Window).postMessage(
            {
              type: "ui-message-response",
              messageId: messageId,
              payload: { error },
            },
            { targetOrigin: "*" }
          );
        }
      }
    }
  }
});
```

#### 3. In the iframe: Handling the response

The iframe needs a listener to handle messages from the host. It can use the `messageId` to match responses to the original requests.

```typescript
window.addEventListener("message", (event) => {
  const { type, messageId, payload } = event.data;

  // Check if it's a response to a request we're waiting for.
  if (!messageId || !requests.has(messageId)) {
    return;
  }

  if (type === "ui-message-received") {
    // The host has acknowledged the request. You can update the UI.
    console.log(`Request ${messageId} is being processed...`);
    // e.g., show a more specific loading indicator.
  }

  if (type === "ui-message-response") {
    const { response, error } = payload;
    
    // Retrieve the original callback.
    const callback = requests.get(messageId);
    if (callback) {
      callback(response, error);
    }
    
    // Clean up the request from the map.
    requests.delete(messageId);
  }
});
```


This pattern is crucial for building responsive and user-friendly UIs, especially when interacting with potentially slow backend operations.

---

## Custom Theming with Render Data

The `UIResourceRenderer` supports passing custom styling data to HTML iframes through the [`htmlProps.iframeRenderData`](/guide/client/resource-renderer#props-details) mechanism. This allows you to theme iframe content dynamically based on your host application's theme, user preferences, or other runtime conditions.

### How It Works

The theming flow involves several coordinated steps:

1. **Host Configuration**: The host renders `<UIResourceRenderer>` with `htmlProps.iframeRenderData` containing your custom CSS or theme data
2. **Parameter Addition**: The SDK automatically adds `?waitForRenderData=true` to the iframe URL
3. **Iframe Waiting**: The iframe recognizes this parameter and waits before rendering
4. **Data Transfer**: The SDK sends a `ui-lifecycle-iframe-render-data` message with the render data when the iframe is ready
5. **Theme Application**: The iframe receives the data and applies the custom styling

### Example: Dynamic Theme Support

Here's a complete example showing how to implement dynamic theming:

#### Host Application Setup

```tsx
import React, { useState } from 'react';
import { UIResourceRenderer } from '@mcp-ui/client';

const ThemeableApp: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  // Define your theme styles
  const themeStyles = {
    light: `
      :root {
        --bg-color: #ffffff;
        --text-color: #333333;
        --primary-color: #007bff;
        --border-color: #e0e0e0;
      }
      body {
        background-color: var(--bg-color);
        color: var(--text-color);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
    `,
    dark: `
      :root {
        --bg-color: #1a1a1a;
        --text-color: #ffffff;
        --primary-color: #4a9eff;
        --border-color: #404040;
      }
      body {
        background-color: var(--bg-color);
        color: var(--text-color);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
    `
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Themed MCP-UI Example</h1>
      
      {/* Theme switcher */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light')}
        >
          Switch to {currentTheme === 'light' ? 'Dark' : 'Light'} Theme
        </button>
      </div>

      {/* Render the themed iframe */}
      <div>
        <UIResourceRenderer
          resource={themedHtmlResource}
          onUIAction={handleUIAction}
          htmlProps={{
            iframeRenderData: {
              customCss: themeStyles[currentTheme],
              theme: currentTheme,
              // You can pass any additional data your iframe needs
              additionalConfig: {
                animations: true,
                fontSize: '16px'
              }
            }
          }}
        />
      </div>
    </div>
  );
};

export default ThemeableApp;
```

#### Iframe Script Implementation

In your iframe's HTML content, implement the render data lifecycle:

```html
<script>
// In the iframe's script
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("waitForRenderData") === "true") {
  let customRenderData = null;

  // The parent will send this message on load or when we notify it we're ready
  window.addEventListener("message", (event) => {
    // Add origin checks for security in production
    if (event.data.type === "ui-lifecycle-iframe-render-data") {
      // If the iframe has already received data, we don't need to do anything
      if (customRenderData) {
        return;
      } else {
        customRenderData = event.data.payload.renderData;
        // Now you can render the UI with the received data
        renderUI(customRenderData);
      }
    }
  });
  
  // We can let the parent know we're ready to receive data
  window.parent.postMessage({ type: "ui-lifecycle-iframe-ready" }, "*");
} else {
  // If the iframe doesn't need to wait for data, we can render the default UI immediately
  renderUI();
}

function renderUI(renderData = null) {
  const statusEl = document.getElementById('status');
  
  if (renderData) {
    // Apply custom CSS
    if (renderData.customCss) {
      const styleElement = document.createElement('style');
      styleElement.textContent = renderData.customCss;
      document.head.appendChild(styleElement);
    }
    
    // Use other render data
    if (statusEl) {
      statusEl.innerHTML = \\`
        <strong>✅ Theme Applied!</strong><br>
        Theme: \${renderData.theme || 'unknown'}<br>
        Additional config: \${JSON.stringify(renderData.additionalConfig || {}, null, 2)}
      \\`;
    }
    
    // You can access any custom data passed in iframeRenderData
    console.log('Render data received:', renderData);
  } else {
    // Default rendering without theme data
    if (statusEl) {
      statusEl.innerHTML = '<em>No theme data received - using defaults</em>';
    }
  }
}
</script>
```

#### Alternative: Using ui-request-render-data

Instead of relying on the `ui-lifecycle-iframe-ready` lifecycle event, you can explicitly request render data when needed:

```html
<script>
// Alternative approach: explicit render data request
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
async function initializeWithTheme() {
  try {
    const renderData = await requestRenderData();
    renderUI(renderData);
  } catch (error) {
    console.error('Failed to get render data:', error);
    renderUI(); // Fallback to default rendering
  }
}

// Initialize when ready
initializeWithTheme();

function renderUI(renderData = null) {
  // Same renderUI function as above
  const statusEl = document.getElementById('status');
  
  if (renderData) {
    // Apply custom CSS
    if (renderData.customCss) {
      const styleElement = document.createElement('style');
      styleElement.textContent = renderData.customCss;
      document.head.appendChild(styleElement);
    }
    
    // Use other render data
    if (statusEl) {
      statusEl.innerHTML = `
        <strong>✅ Theme Applied!</strong><br>
        Theme: ${renderData.theme || 'unknown'}<br>
        Additional config: ${JSON.stringify(renderData.additionalConfig || {}, null, 2)}
      `;
    }
    
    console.log('Render data received:', renderData);
  } else {
    // Default rendering without theme data
    if (statusEl) {
      statusEl.innerHTML = '<em>No theme data received - using defaults</em>';
    }
  }
}
</script>
```

#### Passing Multiple Theme Variables

```tsx
// In your host component
const advancedThemeData = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545'
  },
  fonts: {
    heading: 'Georgia, serif',
    body: 'Arial, sans-serif',
    mono: 'Monaco, monospace'
  },
  spacing: {
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  }
};

// Pass to iframe
<UIResourceRenderer
  resource={resource}
  onUIAction={handleUIAction}
  htmlProps={{
    iframeRenderData: { themeConfig: advancedThemeData }
  }}
/>
```

### Benefits of This Approach

- **Dynamic Theming**: Themes can change at runtime without reloading the iframe
- **Consistent Styling**: Ensures iframe content matches your host application's design
- **Performance**: CSS is injected once rather than being included in every iframe
- **Flexibility**: You can pass any styling or configuration data, not just CSS
- **Security**: The iframe explicitly opts into receiving render data

This theming system provides a powerful way to create cohesive user experiences across your host application and embedded MCP-UI content.

---

That's it! Just use `<UIResourceRenderer />` with the right props and you're ready to render interactive HTML from MCP resources in your React app. The `UIResourceRenderer` automatically detects the resource type and renders the appropriate component internally. If you need more details, check out the [UIResourceRenderer Component](./resource-renderer.md) page.
