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
    const weatherDashboardUI = await createUIResource({
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
      <h1>🔌 MCP Apps Demo</h1>
      <p class="subtitle">Testing the current MCP Apps protocol</p>
      
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
      <h2>📤 MCP Apps Actions</h2>
      <div class="actions-grid">
        <button id="sendLog">
          📢 Send Log
        </button>
        <button id="openLink">
          🔗 Open Link
        </button>
        <button id="sendMessage">
          💬 Send Message
        </button>
        <button id="requestFullscreen">
          🖥️ Fullscreen
        </button>
        <button id="sendSizeChange" class="secondary">
          📐 Resize Widget
        </button>
        <button id="callTool" class="secondary">
          🔧 Call Tool
        </button>
        <button id="refreshContext" class="full-width">
          🔄 Refresh Host Context
        </button>
      </div>
    </div>

    <div class="card">
      <h2>📋 Event Log</h2>
      <div id="log" class="log-area">
        <div class="log-entry info">Waiting for MCP Apps initialization...</div>
      </div>
    </div>
  </div>

  <script type="module">
    import { App } from 'https://esm.sh/@modelcontextprotocol/ext-apps@0.2.2';

    const app = new App({ name: 'weather-dashboard', version: '1.0.0' });

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

    /**
     * 将任意协议数据格式化为适合卡片展示的短文本。
     *
     * @param {unknown} value MCP Apps 协议传入的数据。
     * @returns {string} 最多保留 60 个字符的 JSON 文本。
     */
    function formatValue(value) {
      const text = JSON.stringify(value) ?? String(value);
      return text.length > 60 ? text.substring(0, 60) + '...' : text;
    }

    /**
     * 执行用户触发的 MCP Apps 操作，并统一记录成功或失败状态。
     *
     * @param {string} name 展示在事件日志中的操作名称。
     * @param {() => Promise<unknown>} action 实际执行的异步操作。
     * @returns {Promise<unknown | undefined>} 操作结果；失败时返回 undefined。
     */
    async function runAction(name, action) {
      log('Sending: ' + name, 'info');
      try {
        const result = await action();
        log(name + ' succeeded', 'success');
        return result;
      } catch (error) {
        log(name + ' failed: ' + String(error), 'warn');
      }
    }

    /**
     * 将当前 Host Context 写入事件日志，便于验证初始化握手结果。
     *
     * @returns {void}
     */
    function renderHostContext() {
      const context = app.getHostContext();
      log('Host context: ' + formatValue(context || {}), context ? 'success' : 'warn');
    }

    app.ontoolinput = (params) => {
      document.getElementById('toolInput').textContent = formatValue(params.arguments || {});
      log('Tool input received', 'success');
    };

    app.ontoolresult = (params) => {
      document.getElementById('toolOutput').textContent = formatValue(params);
      log('Tool output received', 'success');
    };

    document.getElementById('sendLog').addEventListener('click', () => {
      void runAction('notifications/message', () => app.sendLog({
        level: 'info',
        data: 'Hello from the MCP Apps widget!',
        logger: 'weather-dashboard',
      }));
    });

    document.getElementById('openLink').addEventListener('click', () => {
      void runAction('ui/open-link', () => app.openLink({
        url: 'https://github.com/modelcontextprotocol/ext-apps',
      }));
    });

    document.getElementById('sendMessage').addEventListener('click', () => {
      void runAction('ui/message', () => app.sendMessage({
        role: 'user',
        content: [{ type: 'text', text: 'What is the weather like today?' }],
      }));
    });

    document.getElementById('requestFullscreen').addEventListener('click', () => {
      void runAction('ui/request-display-mode', async () => {
        const modes = app.getHostContext()?.availableDisplayModes || [];
        if (!modes.includes('fullscreen')) {
          throw new Error('The host does not advertise fullscreen support');
        }
        return app.requestDisplayMode({ mode: 'fullscreen' });
      });
    });

    document.getElementById('sendSizeChange').addEventListener('click', () => {
      const height = 300 + Math.floor(Math.random() * 200);
      void runAction('ui/notifications/size-changed', () =>
        app.sendSizeChanged({ width: 500, height })
      );
    });

    document.getElementById('callTool').addEventListener('click', () => {
      void runAction('tools/call', () => app.callServerTool({
        name: 'weather_dashboard',
        arguments: { location: 'New York' },
      }));
    });

    document.getElementById('refreshContext').addEventListener('click', renderHostContext);

    try {
      await app.connect();
      setStatus(true);
      log('MCP Apps initialization completed', 'success');
      renderHostContext();
    } catch (error) {
      setStatus(false);
      log('MCP Apps initialization failed: ' + String(error), 'warn');
    }
  </script>
</body>
</html>
        `,
      },
    });

    // Register the UI resource so the host can fetch it
    registerAppResource(
      server,
      'weather_dashboard_ui',
      weatherDashboardUI.resource.uri,
      {
        _meta: {
          ui: {
            csp: {
              resourceDomains: ['https://esm.sh'],
            },
            prefersBorder: true,
          },
        },
      },
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
            resourceUri: weatherDashboardUI.resource.uri,
          },
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
