# Protocol Details

This section covers the wire protocols for MCP Apps and legacy MCP-UI.

## MCP Apps Protocol

MCP Apps uses JSON-RPC over `postMessage` for communication between host and guest UI.

### Tool → UI Linking

Tools declare their associated UI via `_meta.ui.resourceUri`:

```typescript
// Tool definition
{
  name: 'show_widget',
  description: 'Show an interactive widget',
  inputSchema: { ... },
  _meta: {
    ui: {
      resourceUri: 'ui://my-server/widget'  // Points to registered resource
    }
  }
}
```

### Host → Guest Communication

The host sends JSON-RPC notifications to the guest UI:

| Notification | Description |
|-------------|-------------|
| `ui/notifications/tool-input` | Complete tool arguments |
| `ui/notifications/tool-input-partial` | Streaming partial arguments |
| `ui/notifications/tool-result` | Tool execution result |
| `ui/notifications/host-context-changed` | Theme, locale, viewport changes |
| `ui/notifications/size-changed` | Host informs of size constraints |
| `ui/notifications/tool-cancelled` | Tool execution was cancelled |
| `ui/resource-teardown` | Host notifies UI before teardown |

### Guest → Host Communication

The guest UI sends JSON-RPC requests to the host:

| Method | Description |
|--------|-------------|
| `tools/call` | Call another MCP tool |
| `ui/message` | Send a follow-up message to the conversation |
| `ui/open-link` | Open a URL in a new tab |
| `notifications/message` | Log a message to the host |
| `ui/notifications/size-changed` | Request widget resize |

### MIME Type

MCP Apps resources use `text/html;profile=mcp-app` to indicate MCP Apps compliance.

## UIResource Wire Format

```typescript
export interface UIResource {
  type: 'resource';
  resource: {
    uri: string;
    mimeType: 'text/html' | 'text/uri-list' | 'application/vnd.mcp-ui.remote-dom';
    text?: string;
    blob?: string;
  };
}
```

## URI Schemes

- **`ui://<component-name>/<instance-id>`**

  - **Purpose**: For all UI resources. The rendering method is determined by `mimeType`.
  - **Content**: `text` or `blob` contains either HTML string or URL string.
  - **Client Action**: 
    - If `mimeType: 'text/html'` → Render in a sandboxed iframe using `srcdoc`
    - If `mimeType: 'text/uri-list'` → Render in a sandboxed iframe using `src`
    - If `mimeType: 'application/vnd.mcp-ui.remote-dom'` → Execute in sandboxed iframe and render in the tree
  - **Examples**: 
    - HTML content: A custom button, a small form, a data visualization snippet
    - URL content: Embedding a Grafana dashboard, a third-party widget, a mini-application
    - RemoteDOM content: A component to be rendered with the host's look-and-feel (component library)

## Content encoding: `text` vs. `blob`

- **`text`**: Simple, direct string. Good for smaller, less complex content.
- **`blob`**: Base64 encoded string.
  - **Pros**: Handles special characters robustly, can be better for larger payloads, ensures integrity during JSON transport.
  - **Cons**: Requires Base64 decoding on the client, slightly increases payload size.

## URI List Format Support

When using `mimeType: 'text/uri-list'`, the content follows the standard URI list format (RFC 2483). However, **MCP-UI requires a single URL** for rendering. For security reasons, the protocol must be `http/s`.

- **Single URL Requirement**: MCP-UI will use only the first valid URL found
- **Multiple URLs**: If multiple URLs are provided, the client will use the first valid URL and log a warning about the ignored alternatives
- **Comments**: Lines starting with `#` are treated as comments and ignored
- **Empty lines**: Blank lines are ignored

**Example URI List Content:**
```
# Primary dashboard URL
https://dashboard.example.com/main

# Backup dashboard URL (will be ignored but logged)
https://backup.dashboard.example.com/main
```

**Client Behavior:**
- Uses `https://dashboard.example.com/main` for rendering
- Logs: `"Multiple URLs found in uri-list content. Using the first URL: "https://dashboard.example.com/main". Other URLs ignored: ["https://backup.dashboard.example.com/main"]"`

This design allows for fallback URLs to be specified in the standard format while maintaining simple client implementation that focuses on a single primary URL.

## Recommended Client-Side Pattern

Client-side hosts should check for the `ui://` URI scheme first to identify MCP-UI resources, rather than checking mimeType:

```tsx
// ✅ Recommended: Check URI scheme first
if (
  mcpResource.type === 'resource' &&
  mcpResource.resource.uri?.startsWith('ui://')
) {
  return <UIResourceRenderer resource={mcpResource.resource} onUIAction={handleAction} />;
}

// ❌ Not recommended: Check mimeType first
if (
  mcpResource.type === 'resource' &&
  (mcpResource.resource.mimeType === 'text/html' || mcpResource.resource.mimeType === 'text/uri-list')
) {
  return <UIResourceRenderer resource={mcpResource.resource} onUIAction={handleAction} />;
}
```

**Benefits of URI-first checking:**
- Future-proof: Works with new content types like `application/javascript`
- Semantic clarity: `ui://` clearly indicates this is a UI resource
- Simpler logic: Let the `UIResourceRenderer` component handle mimeType-based rendering internally

## Communication (Client <-> Iframe)

For `ui://` resources, you can use `window.parent.postMessage` to send data or actions from the iframe back to the host client application. The client application should set up an event listener for `message` events.

### Basic Communication

**Iframe Script Example:**

```html
<button onclick="handleAction()">Submit Data</button>
<script>
  function handleAction() {
    const data = { action: 'formData', value: 'someValue' };
    // IMPORTANT: Always specify the targetOrigin for security!
    // Use '*' only if the parent origin is unknown or variable and security implications are understood.
    window.parent.postMessage(
      { type: 'tool', payload: { toolName: 'myCustomTool', params: data } },
      '*',
    );
  }
</script>
```

**Client-Side Handler:**

```typescript
window.addEventListener('message', (event) => {
  // Add origin check for security: if (event.origin !== "expectedOrigin") return;
  if (event.data && event.data.tool) {
    // Call the onUIAction prop of UIResourceRenderer
  }
});
```

### Asynchronous Communication with Message IDs

For iframe content that needs to handle asynchronous responses, you can include a `messageId` field in your UI action messages. When the host provides an `onUIAction` callback, the iframe will receive acknowledgment and response messages.

**Message Flow:**

1. **Iframe sends message with `messageId`:**
   ```javascript
   window.parent.postMessage({
     type: 'tool',
     messageId: 'unique-request-id-123',
     payload: { toolName: 'myAsyncTool', params: { data: 'some data' } }
   }, '*');
   ```

2. **Host responds with acknowledgment:**
   ```javascript
   // The iframe receives this message back
   {
     type: 'ui-message-received',
     messageId: 'unique-request-id-123',
   }
   ```

3. **When `onUIAction` completes successfully:**
   ```javascript
   // The iframe receives the actual response
   {
     type: 'ui-message-response',
     messageId: 'unique-request-id-123',
     payload: {
       response: { /* the result from onUIAction */ }
     }
   }
   ```

4. **If `onUIAction` encounters an error:**
   ```javascript
   // The iframe receives the error
   {
     type: 'ui-message-response',
     messageId: 'unique-request-id-123',
     payload: {
       error: { /* the error object */ }
     }
   }
   ```

**Complete Iframe Example with Async Handling:**

```html
<button onclick="handleAsyncAction()">Async Action</button>
<div id="status">Ready</div>
<div id="result"></div>

<script>
  let messageCounter = 0;
  const pendingRequests = new Map();

  function generateMessageId() {
    return `msg-${Date.now()}-${++messageCounter}`;
  }

  function handleAsyncAction() {
    const messageId = generateMessageId();
    const statusEl = document.getElementById('status');
    const resultEl = document.getElementById('result');
    
    statusEl.textContent = 'Sending request...';
    
    // Store the request context
    pendingRequests.set(messageId, { 
      startTime: Date.now(),
      action: 'async-tool-call'
    });
    
    // Send the message with messageId
    window.parent.postMessage({
      type: 'tool',
      messageId: messageId,
      payload: { 
        toolName: 'processData', 
        params: { data: 'example data', timestamp: Date.now() }
      }
    }, '*');
  }

  // Listen for responses from the host
  window.addEventListener('message', (event) => {
    const message = event.data;
    
    if (!message.messageId || !pendingRequests.has(message.messageId)) {
      return; // Not for us or unknown request
    }
    
    const statusEl = document.getElementById('status');
    const resultEl = document.getElementById('result');
    const request = pendingRequests.get(message.messageId);
    
    switch (message.type) {
      case 'ui-message-received':
        statusEl.textContent = 'Request acknowledged, processing...';
        break;
        
      case 'ui-message-response':
        if (message.payload.error) {
          statusEl.textContent = 'Error occurred!';
          resultEl.innerHTML = `<div style="color: red;">Error: ${JSON.stringify(message.payload.error)}</div>`;
          pendingRequests.delete(message.messageId);
          break;
        }
        statusEl.textContent = 'Completed successfully!';
        resultEl.innerHTML = `<pre>${JSON.stringify(message.payload.response, null, 2)}</pre>`;
        pendingRequests.delete(message.messageId);
        break;
    }
  });
</script>
```

### Message Types

The following internal message types are available as constants:

- `InternalMessageType.UI_MESSAGE_RECEIVED` (`'ui-message-received'`)
- `InternalMessageType.UI_MESSAGE_RESPONSE` (`'ui-message-response'`)

These types are exported from both `@mcp-ui/client` and `@mcp-ui/server` packages.

**Important Notes:**

- **Message ID is optional**: If you don't provide a `messageId`, the iframe will not receive response messages.
- **Only with `onUIAction`**: Response messages are only sent when the host provides an `onUIAction` callback.
- **Unique IDs**: Ensure `messageId` values are unique to avoid conflicts between multiple pending requests.
- **Cleanup**: Always clean up pending request tracking when you receive responses to avoid memory leaks.
