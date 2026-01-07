import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from '@mcp-ui/server';
import { registerAppTool, registerAppResource } from '@modelcontextprotocol/ext-apps/server';

import { randomUUID } from 'crypto';
import { z } from 'zod';

const app = express();
const port = 3001;

app.use(
  cors({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['*'],
  }),
);
app.use(express.json());

// Map to store transports by session ID, as shown in the documentation.
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
      name: 'mcp-apps-demo',
      version: '1.0.0',
    });

    // Register a tool with a UI interface using the MCP Apps adapter
    const weatherDashboardUI = createUIResource({
      uri: 'ui://weather-server/dashboard-template',
      encoding: 'text',
      content: {
        type: 'rawHtml',
        htmlString: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Apps Adapter Demo</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 16px;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      color: #333;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      margin-bottom: 16px;
    }
    h1 { 
      margin: 0 0 8px 0; 
      color: #667eea;
      font-size: 24px;
    }
    h2 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 18px;
      font-weight: 600;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .data-display {
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .data-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-row:last-child { border-bottom: none; }
    .data-label { color: #64748b; font-size: 14px; }
    .data-value { color: #1e293b; font-weight: 600; }
    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover { 
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    button:active { transform: translateY(0); }
    button.secondary {
      background: #f1f5f9;
      color: #475569;
    }
    button.secondary:hover {
      background: #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .full-width { grid-column: 1 / -1; }
    .log-area {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 12px;
      color: #94a3b8;
      max-height: 150px;
      overflow-y: auto;
    }
    .log-entry { margin-bottom: 4px; }
    .log-entry.success { color: #4ade80; }
    .log-entry.info { color: #60a5fa; }
    .log-entry.warn { color: #fbbf24; }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-badge.connected {
      background: #dcfce7;
      color: #166534;
    }
    .status-badge.disconnected {
      background: #fee2e2;
      color: #991b1b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>🔌 MCP Apps Adapter Demo</h1>
      <p class="subtitle">Testing MCP-UI actions through the MCP Apps adapter</p>
      
      <div class="data-display">
        <div class="data-row">
          <span class="data-label">Status</span>
          <span id="status" class="status-badge disconnected">Waiting...</span>
        </div>
        <div class="data-row">
          <span class="data-label">Tool Input</span>
          <span id="toolInput" class="data-value">--</span>
        </div>
        <div class="data-row">
          <span class="data-label">Tool Output</span>
          <span id="toolOutput" class="data-value">--</span>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>📤 MCP-UI Actions</h2>
      <div class="actions-grid">
        <button onclick="sendNotify()">
          📢 Send Notify
        </button>
        <button onclick="sendLink()">
          🔗 Open Link
        </button>
        <button onclick="sendPrompt()">
          💬 Send Prompt
        </button>
        <button onclick="sendIntent()">
          🎯 Send Intent
        </button>
        <button onclick="sendSizeChange()" class="secondary">
          📐 Resize Widget
        </button>
        <button onclick="callTool()" class="secondary">
          🔧 Call Tool
        </button>
        <button onclick="refreshData()" class="full-width">
          🔄 Request Render Data
        </button>
      </div>
    </div>

    <div class="card">
      <h2>📋 Event Log</h2>
      <div id="log" class="log-area">
        <div class="log-entry info">Waiting for adapter initialization...</div>
      </div>
    </div>
  </div>

  <script>
    // Log helper
    function log(message, type = 'info') {
      const logEl = document.getElementById('log');
      const entry = document.createElement('div');
      entry.className = 'log-entry ' + type;
      entry.textContent = new Date().toLocaleTimeString() + ' - ' + message;
      logEl.appendChild(entry);
      logEl.scrollTop = logEl.scrollHeight;
    }

    // Update status
    function setStatus(connected) {
      const el = document.getElementById('status');
      el.textContent = connected ? 'Connected' : 'Disconnected';
      el.className = 'status-badge ' + (connected ? 'connected' : 'disconnected');
    }

    // Listen for messages from adapter
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      log('Received: ' + data.type, 'info');

      switch (data.type) {
        case 'ui-lifecycle-iframe-render-data':
          setStatus(true);
          const renderData = data.payload?.renderData || {};
          
          if (renderData.toolInput) {
            document.getElementById('toolInput').textContent = 
              JSON.stringify(renderData.toolInput).substring(0, 30) + '...';
            log('Tool input received: ' + JSON.stringify(renderData.toolInput), 'success');
          }
          
          if (renderData.toolOutput) {
            document.getElementById('toolOutput').textContent = 
              JSON.stringify(renderData.toolOutput).substring(0, 30) + '...';
            log('Tool output received', 'success');
          }
          break;

        case 'ui-message-received':
          log('Message acknowledged: ' + data.payload?.messageId, 'info');
          break;

        case 'ui-message-response':
          if (data.payload?.error) {
            log('Response error: ' + JSON.stringify(data.payload.error), 'warn');
          } else {
            log('Response received: ' + JSON.stringify(data.payload?.response || {}), 'success');
          }
          break;
      }
    });

    // Helper to send MCP-UI messages
    function sendMessage(type, payload) {
      const messageId = 'msg-' + Date.now();
      log('Sending: ' + type, 'info');
      window.parent.postMessage({ type, messageId, payload }, '*');
      return messageId;
    }

    // Action handlers
    function sendNotify() {
      sendMessage('notify', { 
        message: 'Hello from MCP-UI widget! Time: ' + new Date().toLocaleTimeString() 
      });
    }

    function sendLink() {
      sendMessage('link', { 
        url: 'https://github.com/modelcontextprotocol/ext-apps' 
      });
    }

    function sendPrompt() {
      sendMessage('prompt', { 
        prompt: 'What is the weather like today?' 
      });
    }

    function sendIntent() {
      sendMessage('intent', { 
        intent: 'get_forecast',
        params: { days: 7, location: 'San Francisco' }
      });
    }

    function sendSizeChange() {
      const height = 300 + Math.floor(Math.random() * 200);
      sendMessage('ui-size-change', { 
        width: 500,
        height: height
      });
      log('Requested size: 500x' + height, 'info');
    }

    function callTool() {
      sendMessage('tool', { 
        toolName: 'weather_dashboard',
        params: { location: 'New York' }
      });
    }

    function refreshData() {
      sendMessage('ui-request-render-data', {});
    }

    // Signal ready state
    log('Sending ready signal...', 'info');
    window.parent.postMessage({ type: 'ui-lifecycle-iframe-ready' }, '*');
  </script>
</body>
</html>
        `,
      },
      adapters: {
        // Enable the MCP Apps adapter
        mcpApps: {
          enabled: true,
        },
      },
    });

    // Register the UI resource so the host can fetch it
    registerAppResource(
      server,
      'weather_dashboard_ui',
      weatherDashboardUI.resource.uri,
      {},
      async () => ({
        contents: [weatherDashboardUI.resource],
      }),
    );

    // Register the tool with _meta linking to the UI resource
    registerAppTool(
      server,
      'weather_dashboard',
      {
        description: 'Interactive weather dashboard widget',
        inputSchema: {
          location: z.string().describe('City name'),
        },
        // This tells MCP Apps hosts where to find the UI
        _meta: {
          ui: {
            resourceUri: weatherDashboardUI.resource.uri
          }
        },
      },
      async ({ location }) => {
        // In a real app, we might fetch data here
        return {
          content: [{ type: 'text', text: `Weather dashboard for ${location}` }],
        };
      },
    );

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
  console.log('sessionId', sessionId);
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
  console.log(`MCP Apps Demo Server running at http://localhost:${port}`);
});
