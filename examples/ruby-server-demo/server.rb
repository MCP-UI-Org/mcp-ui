require 'mcp'
require 'mcp_ui_server'
require 'webrick'
require 'json'

# --- Define MCP Tools ---
class ExternalUrlTool < MCP::Tool
  description 'A simple tool that returns an external URL resource'
  input_schema(
    type: 'object',
    properties: {}
  )

  class << self
    def call(server_context:)
      # create_ui_resource returns a UI Resource object of the form:
      # { type: 'resource', resource: { ... } }
      ui_resource_object = McpUiServer.create_ui_resource(
        uri: 'ui://my-external-site',
        content: { type: :external_url, iframeUrl: 'https://example.com' },
        encoding: :text
      )

      MCP::Tool::Response.new([ui_resource_object])
    end
  end
end

class RawHtmlTool < MCP::Tool
  description 'A simple tool that returns a raw HTML resource'
  input_schema(
    type: 'object',
    properties: {}
  )

  class << self
    def call(server_context:)
      ui_resource_object = McpUiServer.create_ui_resource(
        uri: 'ui://my-raw-html',
        content: { type: :raw_html, htmlString: '<p>This is some raw HTML content.</p>' },
        encoding: :text
      )

      MCP::Tool::Response.new([ui_resource_object])
    end
  end
end

# --- MCP Server Setup ---
mcp_server = MCP::Server.new(tools: [ExternalUrlTool, RawHtmlTool])

# --- WEBrick HTTP Server Setup ---
http_server = WEBrick::HTTPServer.new(Port: 8081)

# Create a servlet to handle requests to /mcp
class MCPServlet < WEBrick::HTTPServlet::AbstractServlet
  def initialize(server, mcp_instance)
    super(server)
    @mcp = mcp_instance
  end

  def do_OPTIONS(_request, response)
    response.status = 200
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  end

  def do_POST(request, response)
    response['Access-Control-Allow-Origin'] = '*'
    response.status = 200
    response['Content-Type'] = 'application/json'
    response.body = @mcp.handle_json(request.body)
  end
end

# Mount the servlet at the /mcp endpoint
http_server.mount('/mcp', MCPServlet, mcp_server)

# Start the server and handle shutdown
trap('INT') { http_server.shutdown }
puts 'MCP server running on http://localhost:8081/mcp'
http_server.start