# Ruby Server Walkthrough

This guide provides a step-by-step walkthrough for creating a barebones MCP UI server using Ruby's built-in WEBrick library.

For a complete, runnable example, see the [`ruby-server-demo`](https://github.com/idosal/mcp-ui/tree/main/examples/ruby-server-demo).

## 1. Project Setup

First, set up your project directory and dependencies.

Create a `Gemfile` with the necessary gems:

```ruby
source "https://rubygems.org"

gem "mcp", git: "https://github.com/modelcontextprotocol/ruby-sdk"
gem "mcp_ui_server"
```

The `mcp` gem is the core Model Context Protocol SDK, while `mcp_ui_server` provides helpers for creating UI resources.

Install the dependencies:

```sh
bundle install
```

Create an empty `server.rb` file. We will add code to it in the next steps.

```sh
touch server.rb
```

## 2. Create an MCP Tool

In MCP, a "tool" is a class that can be invoked by a client. For this example, we'll create a tool that returns a `UIResource` containing an external URL.

Add the following to your `server.rb`:

```ruby
require 'mcp'
require 'mcp_ui_server'
require 'webrick'
require 'json'

class ExternalUrlTool < MCP::Tool
  description 'A simple tool that returns an external URL resource'
  input_schema(
    type: 'object',
    properties: {}
  )

  def self.call(server_context:)
    ui_resource_object = McpUiServer.create_ui_resource(
      uri: 'ui://my-external-site',
      content: { type: :external_url, iframeUrl: 'https://example.com' },
      encoding: :text
    )

    MCP::Tool::Response.new([ui_resource_object])
  end
end
```

The `require 'mcp_ui_server'` line imports the mcp-ui library. The `ExternalUrlTool` is a standard MCP `Tool`, but it uses `McpUiServer.create_ui_resource` to return a `UIResource`, which is the primary integration point with `mcp-ui`. The following sections describe how to set up a standard MCP server and expose it over HTTP.

## 3. Set Up the MCP Server

Next, instantiate the MCP server and register the tool with it.

Add this to `server.rb`:

```ruby
# --- MCP Server Setup ---
mcp_server = MCP::Server.new(tools: [ExternalUrlTool])
```

## 4. Set Up an HTTP Server

We'll use WEBrick to create a simple HTTP server to handle MCP requests.

Add the following to `server.rb` to create an HTTP server that listens on port 8081 and handles requests at the `/mcp` endpoint:

```ruby
# --- WEBrick HTTP Server Setup ---
http_server = WEBrick::HTTPServer.new(Port: 8081)

# Create a servlet to handle requests to /mcp
class MCPServlet < WEBrick::HTTPServlet::AbstractServlet
  def initialize(server, mcp_instance)
    super(server)
    @mcp = mcp_instance
  end

  # Handle pre-flight CORS requests
  def do_OPTIONS(_request, response)
    response.status = 200
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  end

  def do_POST(request, response)
    response['Access-control-Allow-Origin'] = '*'
    response.status = 200
    response['Content-Type'] = 'application/json'
    response.body = @mcp.handle_json(request.body)
  end
end

# Mount the servlet at the /mcp endpoint
http_server.mount('/mcp', MCPServlet, mcp_server)
```

The `MCPServlet` processes incoming `POST` requests, passes them to the MCP server instance, and returns the JSON response. It also handles CORS `OPTIONS` requests to allow cross-origin communication with a web client.

## 5. Run and Test

Finally, add the code to start the server.

```ruby
# Start the server and handle shutdown
trap('INT') { http_server.shutdown }
puts 'MCP server running on http://localhost:8081/mcp'
http_server.start
```

Your `server.rb` is now complete. You can run it with:

```sh
ruby server.rb
```

The server will be available at `http://localhost:8081/mcp`.

To test your new endpoint, you can use the [`ui-inspector`](https://github.com/idosal/ui-inspector):

1. Go to the [ui-inspector repo](https://github.com/idosal/ui-inspector/) and run locally.
2. Open the local client in a browser (usually `http://localhost:6274`)
3. Change the Transport Type to "Streamable HTTP".
4. Enter your server's MCP endpoint URL: `http://localhost:8081/mcp`.
5. Click "Connect".

The inspector will show tools for the different content types. When you call them, the UI resource will be rendered in the inspector's Tool Results.

You've now successfully integrated `mcp-ui` into your Ruby server! You can now create more complex tools that return different types of UI resources. 