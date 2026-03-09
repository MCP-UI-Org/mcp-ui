# TypeScript Server Walkthrough

This guide provides a step-by-step walkthrough for integrating `@mcp-ui/server` into a an existing Node.js server using the [Express.js](https://expressjs.com) framework.

For a complete, runnable example, see the [`typescript-server-demo`](https://github.com/idosal/mcp-ui/tree/main/examples/typescript-server-demo).

## 1. Set up an Express Server

If you don't have an existing server, you can create a simple one.

First, install the necessary dependencies:

```bash
npm install express cors @types/express @types/cors
```

Then, create a basic server file (e.g., `server.ts`):

```typescript
import express from 'express';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
```

## 2. Install MCP and mcp-ui Dependencies

Next, add the Model Context Protocol SDK and the `mcp-ui` server package to your project:

```bash
npm install @modelcontextprotocol/sdk @mcp-ui/server
```

The `@modelcontextprotocol/sdk` package provides the core functionality for creating an MCP server, while `@mcp-ui/server` includes helpers specifically for creating UI resources.

## 3. Set up the MCP Server Handler

In MCP, tools are functions that the client can invoke. For this example, we'll create a tool that returns a `UIResource`.
Now, let's create an MCP server instance and an endpoint to handle MCP requests using a streaming transport. This allows for more complex, stateful interactions.

Modify your `server.ts` file to include the following:

```typescript
import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from '@mcp-ui/server';
import { randomUUID } from 'crypto';

const app = express();
const port = 3000;

app.use(cors({
  origin: '*',
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'mcp-session-id'],
}));
app.use(express.json());

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Handle POST requests for client-to-server communication.
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // A session already exists; reuse the existing transport.
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // This is a new initialization request. Create a new transport.
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports[sid] = transport;
        console.log(`MCP Session initialized: ${sid}`);
      },
    });

    // Clean up the transport from our map when the session closes.
    transport.onclose = () => {
      if (transport.sessionId) {
        console.log(`MCP Session closed: ${transport.sessionId}`);
        delete transports[transport.sessionId];
      }
    };
    
    // Create a new server instance for this specific session.
    const server = new McpServer({
      name: "typescript-server-walkthrough",
      version: "1.0.0"
    });

    // Register our MCP-UI tool on the new server instance.
    server.registerTool('greet', {
      title: 'Greet',
      description: 'A simple tool that returns a UI resource.',
      inputSchema: {},
    }, async () => {
      // Create the UI resource to be returned to the client (this is the only part specific to MCP-UI)
      // For externalUrl, the SDK fetches the page HTML and injects a <base> tag
      const uiResource = await createUIResource({
        uri: 'ui://greeting',
        content: { type: 'externalUrl', iframeUrl: 'https://example.com' },
        encoding: 'text',
      });

      return {
        content: [uiResource],
      };
    });
  
    // Connect the server instance to the transport for this session.
    await server.connect(transport);
  } else {
    return res.status(400).json({
      error: { message: 'Bad Request: No valid session ID provided' },
    });
  }

  // Handle the client's request using the session's transport.
  await transport.handleRequest(req, res, req.body);
});

// A separate, reusable handler for GET and DELETE requests.
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    return res.status(404).send('Session not found');
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// GET handles the long-lived stream for server-to-client messages.
app.get('/mcp', handleSessionRequest);

// DELETE handles explicit session termination from the client.
app.delete('/mcp', handleSessionRequest);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log(`MCP endpoint available at http://localhost:${port}/mcp`);
});
```

## 4. Run and Test

You can now run your server:

```bash
npx ts-node server.ts
```

To test your new endpoint, you can use the [`ui-inspector`](https://github.com/idosal/ui-inspector):

1. Go to the [ui-inspector repo](https://github.com/idosal/ui-inspector/) and run locally.
2. Open the local client in a browser (usually `http://localhost:6274`)
3. Change the Transport Type to "Streamable HTTP".
4. Enter your server's MCP endpoint URL: `http://localhost:3000/mcp`.
5. Click "Connect".

The inspector will show the "Greet" tool. When you call it, the UI resource will be rendered in the inspector's Tool Results.

You've now successfully integrated `mcp-ui` into your TypeScript server! You can now create more complex tools that return different types of UI resources.
