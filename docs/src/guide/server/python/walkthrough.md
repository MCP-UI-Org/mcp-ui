# Python Server Walkthrough

This guide provides a step-by-step walkthrough for creating an MCP server with UI resources using `mcp-ui-server` and FastMCP.

For a complete, runnable example, see the [`python-server-demo`](https://github.com/idosal/mcp-ui/tree/main/examples/python-server-demo).

## 1. Set up Your Python Environment

First, create a new Python project and set up your dependencies:

```bash
# Create a new directory
mkdir my-mcp-server
cd my-mcp-server

# Initialize with uv (recommended) or pip
uv init
# or: python -m venv venv && source venv/bin/activate
```

## 2. Install Dependencies

Install the necessary packages:

```bash
uv add mcp mcp-ui-server
```

Or with pip:

```bash
pip install mcp mcp-ui-server
```

The `mcp` package provides FastMCP and core MCP functionality, while `mcp-ui-server` includes helpers for creating UI resources.

## 3. Create Your MCP Server

Create a file called `server.py`:

```python
import argparse
from mcp.server.fastmcp import FastMCP
from mcp_ui_server import create_ui_resource
from mcp_ui_server.core import UIResource

# Create FastMCP instance
mcp = FastMCP("my-mcp-server")

@mcp.tool()
def greet() -> list[UIResource]:
    """A simple greeting tool that returns a UI resource."""
    ui_resource = create_ui_resource({
        "uri": "ui://greeting/simple",
        "content": {
            "type": "rawHtml",
            "htmlString": """
                <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
                    <h1 style="color: #2563eb;">Hello from Python MCP Server!</h1>
                    <p>This UI resource was generated server-side using mcp-ui-server.</p>
                </div>
            """
        },
        "encoding": "text"
    })
    return [ui_resource]

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="My MCP Server")
    parser.add_argument("--http", action="store_true", help="Use HTTP transport instead of stdio")
    parser.add_argument("--port", type=int, default=3000, help="Port for HTTP transport (default: 3000)")
    args = parser.parse_args()

    if args.http:
        print("🚀 Starting MCP server on HTTP (SSE transport)")
        mcp.settings.port = args.port
        mcp.run(transport="sse")
    else:
        print("🚀 Starting MCP server with stdio transport")
        mcp.run()
```

## 4. Add More UI Tools

Let's add more sophisticated tools with different types of UI resources:

```python
@mcp.tool()
def show_dashboard() -> list[UIResource]:
    """Display a sample dashboard with metrics."""
    dashboard_html = """
    <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1>Server Dashboard</h1>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 20px;">
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 16px;">
                <h3 style="margin-top: 0; color: #0369a1;">Active Connections</h3>
                <p style="font-size: 24px; font-weight: bold; margin: 0; color: #0c4a6e;">42</p>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px;">
                <h3 style="margin-top: 0; color: #15803d;">CPU Usage</h3>
                <p style="font-size: 24px; font-weight: bold; margin: 0; color: #14532d;">23%</p>
            </div>
            <div style="background: #fefce8; border: 1px solid #eab308; border-radius: 8px; padding: 16px;">
                <h3 style="margin-top: 0; color: #a16207;">Memory Usage</h3>
                <p style="font-size: 24px; font-weight: bold; margin: 0; color: #713f12;">67%</p>
            </div>
        </div>
    </div>
    """
    
    ui_resource = create_ui_resource({
        "uri": "ui://dashboard/main",
        "content": {
            "type": "rawHtml",
            "htmlString": dashboard_html
        },
        "encoding": "text"
    })
    return [ui_resource]

@mcp.tool()
def show_external_site() -> list[UIResource]:
    """Display an external website in an iframe."""
    ui_resource = create_ui_resource({
        "uri": "ui://external/example",
        "content": {
            "type": "externalUrl",
            "iframeUrl": "https://example.com"
        },
        "encoding": "text"
    })
    return [ui_resource]

@mcp.tool()
def show_interactive_demo() -> list[UIResource]:
    """Show an interactive demo with buttons that send intents."""
    interactive_html = """
    <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h2>Interactive Demo</h2>
        <p>Click the buttons below to send different types of actions back to the parent:</p>
        
        <div style="margin: 10px 0;">
            <button onclick="sendIntent('user_action', {type: 'button_click', id: 'demo'})" 
                    style="background: #2563eb; color: white; padding: 8px 16px; border: none; border-radius: 4px; margin: 5px; cursor: pointer;">
                Send Intent
            </button>
            <button onclick="sendToolCall('get_data', {source: 'ui'})" 
                    style="background: #059669; color: white; padding: 8px 16px; border: none; border-radius: 4px; margin: 5px; cursor: pointer;">
                Call Tool
            </button>
        </div>
        
        <div id="status" style="margin-top: 20px; padding: 10px; background: #f3f4f6; border-radius: 4px;">
            Ready - click a button to see the action
        </div>
    </div>
    
    <script>
        function sendIntent(intent, params) {
            const status = document.getElementById('status');
            status.innerHTML = `<strong>Intent sent:</strong> ${intent}<br><strong>Params:</strong> ${JSON.stringify(params)}`;
            
            if (window.parent) {
                window.parent.postMessage({
                    type: 'intent',
                    payload: { intent: intent, params: params }
                }, '*');
            }
        }
        
        function sendToolCall(toolName, params) {
            const status = document.getElementById('status');
            status.innerHTML = `<strong>Tool call:</strong> ${toolName}<br><strong>Params:</strong> ${JSON.stringify(params)}`;
            
            if (window.parent) {
                window.parent.postMessage({
                    type: 'tool',
                    payload: { toolName: toolName, params: params }
                }, '*');
            }
        }
    </script>
    """
    
    ui_resource = create_ui_resource({
        "uri": "ui://demo/interactive",
        "content": {
            "type": "rawHtml",
            "htmlString": interactive_html
        },
        "encoding": "text"
    })
    return [ui_resource]
```

## 5. Complete Server Example

Here's your complete `server.py` file:

```python
import argparse
from mcp.server.fastmcp import FastMCP
from mcp_ui_server import create_ui_resource
from mcp_ui_server.core import UIResource

# Create FastMCP instance
mcp = FastMCP("my-mcp-server")

@mcp.tool()
def greet() -> list[UIResource]:
    """A simple greeting tool that returns a UI resource."""
    ui_resource = create_ui_resource({
        "uri": "ui://greeting/simple",
        "content": {
            "type": "rawHtml",
            "htmlString": """
                <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
                    <h1 style="color: #2563eb;">Hello from Python MCP Server!</h1>
                    <p>This UI resource was generated server-side using mcp-ui-server.</p>
                </div>
            """
        },
        "encoding": "text"
    })
    return [ui_resource]

@mcp.tool()
def show_dashboard() -> list[UIResource]:
    """Display a sample dashboard with metrics."""
    dashboard_html = """
    <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1>Server Dashboard</h1>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 20px;">
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 16px;">
                <h3 style="margin-top: 0; color: #0369a1;">Active Connections</h3>
                <p style="font-size: 24px; font-weight: bold; margin: 0; color: #0c4a6e;">42</p>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px;">
                <h3 style="margin-top: 0; color: #15803d;">CPU Usage</h3>
                <p style="font-size: 24px; font-weight: bold; margin: 0; color: #14532d;">23%</p>
            </div>
        </div>
    </div>
    """
    
    ui_resource = create_ui_resource({
        "uri": "ui://dashboard/main",
        "content": {
            "type": "rawHtml",
            "htmlString": dashboard_html
        },
        "encoding": "text"
    })
    return [ui_resource]

@mcp.tool()
def show_external_site() -> list[UIResource]:
    """Display an external website in an iframe."""
    ui_resource = create_ui_resource({
        "uri": "ui://external/example",
        "content": {
            "type": "externalUrl",
            "iframeUrl": "https://example.com"
        },
        "encoding": "text"
    })
    return [ui_resource]

@mcp.tool()
def show_interactive_demo() -> list[UIResource]:
    """Show an interactive demo with buttons that send intents."""
    interactive_html = """
    <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h2>Interactive Demo</h2>
        <p>Click the button below to send an intent back to the parent:</p>
        
        <button onclick="sendIntent()" 
                style="background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
            Send Intent
        </button>
        
        <div id="status" style="margin-top: 20px; padding: 10px; background: #f3f4f6; border-radius: 4px;">
            Ready
        </div>
    </div>
    
    <script>
        function sendIntent() {
            const status = document.getElementById('status');
            status.innerHTML = 'Intent sent!';
            
            if (window.parent) {
                window.parent.postMessage({
                    type: 'intent',
                    payload: {
                        intent: 'demo_interaction',
                        params: { source: 'python-server', timestamp: new Date().toISOString() }
                    }
                }, '*');
            }
        }
    </script>
    """
    
    ui_resource = create_ui_resource({
        "uri": "ui://demo/interactive",
        "content": {
            "type": "rawHtml",
            "htmlString": interactive_html
        },
        "encoding": "text"
    })
    return [ui_resource]

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="My MCP Server")
    parser.add_argument("--http", action="store_true", help="Use HTTP transport instead of stdio")
    parser.add_argument("--port", type=int, default=3000, help="Port for HTTP transport (default: 3000)")
    args = parser.parse_args()

    if args.http:
        print("🚀 Starting MCP server on HTTP (SSE transport)")
        print("📡 Server will use SSE transport settings")
        mcp.settings.port = args.port
        mcp.run(transport="sse")
    else:
        print("🚀 Starting MCP server with stdio transport")
        mcp.run()
```

## 6. Run Your Server

You can run your server in two modes:

**Stdio Mode (for command-line clients):**
```bash
python server.py
```

**HTTP Mode (for web clients):**
```bash
python server.py --http --port 3000
```

## 7. Test with UI Inspector

To test your server with a visual interface:

1. Go to the [ui-inspector repository](https://github.com/idosal/ui-inspector) and run it locally
2. Open the inspector in your browser (usually `http://localhost:6274`)
3. Configure the connection:
   - **Transport Type**: "SSE" (for HTTP mode) or "Stdio" (for stdio mode)
   - **Server URL**: `http://localhost:3000/sse` (for HTTP mode)
4. Click "Connect"

The inspector will show your tools:
- **greet**: Simple HTML greeting
- **show_dashboard**: Dashboard with metrics
- **show_external_site**: External website iframe
- **show_interactive_demo**: Interactive buttons with intents

When you call these tools, the UI resources will be rendered in the inspector's Tool Results panel.

## 8. Next Steps

Now that you have a working MCP server with UI resources, you can:

1. **Add more tools** with different types of content
2. **Handle user interactions** by implementing tools that respond to intents
3. **Create dynamic content** based on tool parameters
4. **Integrate with external APIs** to display live data
5. **Use blob encoding** for larger or binary content

For more examples and advanced usage, see the [Usage Examples](./usage-examples.md) documentation.

## Tips for Development

- Use `encoding: "text"` for simple HTML content
- Use `encoding: "blob"` for larger content or when you need Base64 encoding
- Always prefix URIs with `ui://` followed by your component identifier
- Test both stdio and HTTP transports depending on your use case
- Use the ui-inspector for visual testing and debugging

You've successfully created a Python MCP server with UI resources! The FastMCP framework makes it easy to create tools that return rich, interactive UI content to MCP clients.