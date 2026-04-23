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
    mimeType: 'text/html;profile=mcp-app';
    text?: string;
    blob?: string;
  };
}
```

## URI Schemes

- **`ui://<component-name>/<instance-id>`**

  - **Purpose**: For all UI resources.
  - **Content**: `text` or `blob` contains HTML content.
  - **Client Action**: Render in a sandboxed iframe
  - **Examples**: A custom button, a small form, a data visualization snippet, a fetched external page

## Content encoding: `text` vs. `blob`

- **`text`**: Simple, direct string. Good for smaller, less complex content.
- **`blob`**: Base64 encoded string.
  - **Pros**: Handles special characters robustly, can be better for larger payloads, ensures integrity during JSON transport.
  - **Cons**: Requires Base64 decoding on the client, slightly increases payload size.

## External URL Handling

When using `createUIResource` with `content.type: 'externalUrl'`, the behavior depends on the SDK:

- **TypeScript SDK**: Fetches the URL's HTML content server-side, injects a `<base>` tag so relative paths (CSS, JS, images) resolve against the original URL, and returns the resulting HTML as the resource content. It also validates the URL (http/https only, blocks private/localhost addresses) and enforces a timeout and response size limit. The SDK automatically populates `_meta.csp.baseUriDomains` with the external URL's origin, so the host's sandbox iframe can set appropriate CSP headers.
- **Python and Ruby SDKs**: Store the URL string directly as the resource content without fetching it. The host client is responsible for fetching and rendering the external page.

> **Note:** Not all hosts support `baseUriDomains`. Those that don't will ignore this field, which may cause the `<base>` tag to be blocked by the sandbox CSP.
>
> **Security:** The TypeScript SDK's server-side fetch introduces SSRF risk if the URL is derived from untrusted user input. The SDK blocks private IP ranges and localhost by default, but server developers should apply additional validation (e.g., URL allowlists) when the URL originates from user input. DNS rebinding attacks are not mitigated at the SDK level.

## Recommended Client-Side Pattern

Client-side hosts should check for the `ui://` URI scheme to identify MCP-UI resources:

```tsx
if (
  mcpResource.type === 'resource' &&
  mcpResource.resource.uri?.startsWith('ui://')
) {
  return <AppRenderer client={client} toolName={toolName} ... />;
}
```

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
