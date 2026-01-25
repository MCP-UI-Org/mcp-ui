# Client SDK Walkthrough

This guide provides a step-by-step walkthrough for building an MCP Apps client that can render tool UIs using the `@mcp-ui/client` package.

For a complete example, see the [`mcp-apps-demo`](https://github.com/idosal/mcp-ui/tree/main/examples/mcp-apps-demo) (server) and test it with the [ui-inspector](https://github.com/idosal/ui-inspector) (client).

## Prerequisites

- Node.js (v18+)
- An MCP server with tools that have `_meta.ui.resourceUri` (see [Server Walkthrough](../server/typescript/walkthrough))
- A React project (this guide uses Vite)

## 1. Set up a React Project

If you don't have an existing React project, create one with Vite:

```bash
npm create vite@latest my-mcp-client -- --template react-ts
cd my-mcp-client
npm install
```

## 2. Install Dependencies

Install the MCP SDK, client package, and ext-apps:

```bash
npm install @mcp-ui/client @modelcontextprotocol/sdk @modelcontextprotocol/ext-apps
```

## 3. Set Up a Sandbox Proxy

MCP Apps renders tool UIs in sandboxed iframes for security. You need a sandbox proxy HTML file that will host the guest content. Create `public/sandbox_proxy.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sandbox Proxy</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <script>
    // Sandbox proxy implementation for MCP Apps
    // This receives HTML content from the host and renders it securely

    // Listen for messages from the host
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      // Handle resource ready notification (HTML content to render)
      if (data.method === 'ui/notifications/sandbox-resource-ready') {
        const { html } = data.params || {};
        if (html) {
          // Replace the entire document with the received HTML
          document.open();
          document.write(html);
          document.close();
        }
      }
    });

    // Signal that the sandbox proxy is ready
    window.parent.postMessage({
      method: 'ui/notifications/sandbox-proxy-ready',
      params: {}
    }, '*');
  </script>
</body>
</html>
```

::: tip Production Setup
For production, consider implementing Content Security Policy (CSP) headers and additional security measures. See [@modelcontextprotocol/ext-apps](https://github.com/modelcontextprotocol/ext-apps) for more details on secure sandbox proxy implementation.
:::

## 4. Create an MCP Client

Create a file `src/mcp-client.ts` to handle the MCP connection:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  type ClientCapabilitiesWithExtensions,
  UI_EXTENSION_CAPABILITIES,
} from '@mcp-ui/client';

export async function createMcpClient(serverUrl: string): Promise<Client> {
  // Create the client with UI extension capabilities
  const capabilities: ClientCapabilitiesWithExtensions = {
    roots: { listChanged: true },
    extensions: UI_EXTENSION_CAPABILITIES,
  };

  const client = new Client(
    { name: 'my-mcp-client', version: '1.0.0' },
    { capabilities }
  );

  // Connect to the MCP server
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
  await client.connect(transport);

  console.log('Connected to MCP server');
  return client;
}
```

## 5. Create the Tool UI Component

Create a component that uses `AppRenderer` to render tool UIs. Create `src/ToolUI.tsx`:

```tsx
import { useState, useEffect, useRef } from 'react';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { AppRenderer, type AppRendererHandle } from '@mcp-ui/client';

interface ToolUIProps {
  client: Client;
  toolName: string;
  toolInput?: Record<string, unknown>;
}

export function ToolUI({ client, toolName, toolInput }: ToolUIProps) {
  const [toolResult, setToolResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const appRef = useRef<AppRendererHandle>(null);

  // Call the tool when input changes
  useEffect(() => {
    if (!toolInput) return;

    const callTool = async () => {
      try {
        const result = await client.callTool({
          name: toolName,
          arguments: toolInput,
        });
        setToolResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    callTool();
  }, [client, toolName, toolInput]);

  // Get the sandbox URL
  const sandboxUrl = new URL('/sandbox_proxy.html', window.location.origin);

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <AppRenderer
        ref={appRef}
        client={client}
        toolName={toolName}
        sandbox={{ url: sandboxUrl }}
        toolInput={toolInput}
        toolResult={toolResult}
        onOpenLink={async ({ url }) => {
          // Handle link requests from the UI
          window.open(url, '_blank');
          return { isError: false };
        }}
        onMessage={async (params) => {
          // Handle message requests from the UI (e.g., follow-up prompts)
          console.log('Message from UI:', params);
          return { isError: false };
        }}
        onSizeChanged={(params) => {
          // Handle size change notifications
          console.log('Size changed:', params);
        }}
        onError={(error) => {
          console.error('UI Error:', error);
          setError(error.message);
        }}
      />
    </div>
  );
}
```

## 6. Create the Main App

Update `src/App.tsx` to connect to the MCP server and render tool UIs:

```tsx
import { useState, useEffect } from 'react';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createMcpClient } from './mcp-client';
import { ToolUI } from './ToolUI';
import './App.css';

function App() {
  const [client, setClient] = useState<Client | null>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [toolInput, setToolInput] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  // Connect to MCP server on mount
  useEffect(() => {
    const connect = async () => {
      try {
        // Replace with your MCP server URL
        const mcpClient = await createMcpClient('http://localhost:3001/mcp');
        setClient(mcpClient);

        // List available tools
        const toolsResult = await mcpClient.listTools({});
        setTools(toolsResult.tools);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    connect();
  }, []);

  // Filter tools that have UI resources
  const toolsWithUI = tools.filter((tool) =>
    tool._meta?.ui?.resourceUri
  );

  if (error) {
    return <div style={{ color: 'red', padding: '20px' }}>Error: {error}</div>;
  }

  if (!client) {
    return <div style={{ padding: '20px' }}>Connecting to MCP server...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>MCP Apps Client Demo</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>Available Tools with UI</h2>
        {toolsWithUI.length === 0 ? (
          <p>No tools with UI found. Make sure your server has tools with _meta.ui.resourceUri.</p>
        ) : (
          <ul>
            {toolsWithUI.map((tool) => (
              <li key={tool.name}>
                <button
                  onClick={() => {
                    setSelectedTool(tool.name);
                    setToolInput({ query: 'Hello from client!' });
                  }}
                  style={{
                    fontWeight: selectedTool === tool.name ? 'bold' : 'normal',
                  }}
                >
                  {tool.name}
                </button>
                <span style={{ marginLeft: '10px', color: '#666' }}>
                  {tool.description}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedTool && client && (
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
          <h2>Tool UI: {selectedTool}</h2>
          <ToolUI
            client={client}
            toolName={selectedTool}
            toolInput={toolInput}
          />
        </div>
      )}
    </div>
  );
}

export default App;
```

## 7. Run the Application

Start your React development server:

```bash
npm run dev
```

Make sure your MCP server is running (e.g., the `mcp-apps-demo` example on port 3001):

```bash
# In the mcp-apps-demo directory
npm run build && npm start
```

Open your browser to `http://localhost:5173` (or the Vite dev server URL). You should see:
1. A list of tools with UI from the connected MCP server
2. Click a tool to render its UI in the sandboxed iframe
3. The UI can send messages back to your client via the `onMessage` callback

## 8. Handle Custom Tool Calls from UI

Tool UIs can request to call other tools. Add a custom handler:

```tsx
<AppRenderer
  client={client}
  toolName={selectedTool}
  sandbox={{ url: sandboxUrl }}
  // ... other props
  onCallTool={async (params) => {
    // Custom handling for tool calls from the UI
    console.log('UI requested tool call:', params);

    // You can filter, modify, or intercept tool calls here
    const result = await client.callTool(params);
    return result;
  }}
/>
```

## 9. Using AppRenderer Without a Client

If you don't have direct access to an MCP client (e.g., the MCP connection is managed by a backend), you can use callbacks instead:

```tsx
<AppRenderer
  toolName="my-tool"
  toolResourceUri="ui://my-server/widget"
  sandbox={{ url: sandboxUrl }}
  onReadResource={async ({ uri }) => {
    // Fetch the resource from your backend
    const response = await fetch(`/api/mcp/resources?uri=${encodeURIComponent(uri)}`);
    return response.json();
  }}
  onCallTool={async (params) => {
    // Proxy tool calls through your backend
    const response = await fetch('/api/mcp/tools/call', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return response.json();
  }}
  toolInput={{ query: 'hello' }}
/>
```

Or provide pre-fetched HTML directly:

```tsx
<AppRenderer
  toolName="my-tool"
  sandbox={{ url: sandboxUrl }}
  html={preloadedHtml}  // Skip resource fetching entirely
  toolInput={{ query: 'hello' }}
/>
```

## Next Steps

- [AppRenderer Props Reference](./resource-renderer.md) - Complete API documentation
- [Protocol Details](../protocol-details.md) - Understanding the MCP Apps protocol
- [Legacy MCP-UI Support](../mcp-apps.md) - Supporting older MCP-UI hosts
- [Supported Hosts](../supported-hosts.md) - See which hosts support MCP Apps
