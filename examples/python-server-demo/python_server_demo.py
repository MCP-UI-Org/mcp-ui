#!/usr/bin/env python3
"""Python MCP server demo inspired by the TypeScript version.

This server demonstrates how to create an MCP server with UI resources
using FastMCP for both stdio and HTTP transports.

Usage:
    python python_server_demo.py                    # stdio transport  
    python python_server_demo.py --http --port 3000 # HTTP transport
"""

import argparse
from mcp.server.fastmcp import FastMCP

from mcp_ui_server import create_ui_resource, UIMetadataKey
from mcp_ui_server.core import UIResource

# Create FastMCP instance
mcp = FastMCP("python-server-demo")

@mcp.tool()
def show_external_url() -> list[UIResource]:
    """Creates a UI resource displaying an external URL (example.com) with preferred frame size."""
    ui_resource = create_ui_resource({
        "uri": "ui://greeting",
        "content": {
            "type": "externalUrl",
            "iframeUrl": "https://example.com"
        },
        "encoding": "text",
        "uiMetadata": {
            UIMetadataKey.PREFERRED_FRAME_SIZE: ["800px", "600px"]  # CSS dimension strings (can be px, %, vh, etc.)
        }
    })
    return [ui_resource]


@mcp.tool()
def show_raw_html() -> list[UIResource]:
    """Creates a UI resource displaying raw HTML."""
    ui_resource = create_ui_resource({
        "uri": "ui://raw-html-demo",
        "content": {
            "type": "rawHtml",
            "htmlString": "<h1>Hello from Raw HTML</h1>"
        },
        "encoding": "text"
    })
    return [ui_resource]


@mcp.tool()
def show_action_html() -> list[UIResource]:
    """Creates a UI resource with interactive buttons that demonstrate intent actions."""
    interactive_html = """
    <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h2>Intent Action Demo</h2>
        <p>Click the buttons below to trigger different intent actions:</p>
        
        <div style="margin: 10px 0;">
            <button onclick="sendIntent('user_profile', {userId: '123', action: 'view'})" 
                    style="background: #007cba; color: white; padding: 8px 16px; border: none; border-radius: 4px; margin: 5px; cursor: pointer;">
                View User Profile
            </button>
        </div>
        
        <div style="margin: 10px 0;">
            <button onclick="sendIntent('navigation', {page: 'dashboard', section: 'analytics'})" 
                    style="background: #28a745; color: white; padding: 8px 16px; border: none; border-radius: 4px; margin: 5px; cursor: pointer;">
                Navigate to Dashboard
            </button>
        </div>
        
        <div style="margin: 10px 0;">
            <button onclick="sendIntent('data_export', {format: 'csv', dateRange: '30days'})" 
                    style="background: #ffc107; color: black; padding: 8px 16px; border: none; border-radius: 4px; margin: 5px; cursor: pointer;">
                Export Data
            </button>
        </div>
        
        <div style="margin: 10px 0;">
            <button onclick="sendIntent('notification_settings', {type: 'email', enabled: true})" 
                    style="background: #dc3545; color: white; padding: 8px 16px; border: none; border-radius: 4px; margin: 5px; cursor: pointer;">
                Update Notifications
            </button>
        </div>
        
        <div id="status" style="margin-top: 20px; padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">
            Click a button to see the intent action in action!
        </div>
    </div>
    
    <script>
        function sendIntent(intent, params) {
            const status = document.getElementById('status');
            status.innerHTML = `<strong>Intent Sent:</strong> ${intent}<br><strong>Parameters:</strong> ${JSON.stringify(params, null, 2)}`;
            
            // Send the intent to the parent frame
            if (window.parent) {
                window.parent.postMessage({
                    type: 'intent',
                    payload: {
                        intent: intent,
                        params: params
                    }
                }, '*');
            }
        }
    </script>
    """

    ui_resource = create_ui_resource({
        "uri": "ui://action-html-demo",
        "content": {
            "type": "rawHtml",
            "htmlString": interactive_html
        },
        "encoding": "text"
    })

    return [ui_resource]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Python MCP Server Demo")
    parser.add_argument("--http", action="store_true", help="Use HTTP transport instead of stdio")
    parser.add_argument("--port", type=int, default=3000, help="Port for HTTP transport (default: 3000)")
    args = parser.parse_args()

    if args.http:
        print("🚀 Starting Python MCP server on HTTP (SSE transport)")
        print("📡 Server will use SSE transport settings")
        mcp.settings.port=args.port
        mcp.run(transport="sse")
    else:
        print("🚀 Starting Python MCP server with stdio transport")
        mcp.run()
