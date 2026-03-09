# mcp_ui_server Usage & Examples

This page provides practical examples for using the `mcp_ui_server` gem.

For a complete, runnable server implementation that demonstrates how to use these resources within an MCP tool, see the Ruby server demo (`/examples/ruby-server-demo/server.rb`).

## Basic Setup

First, ensure you have `mcp_ui_server` available in your project by adding it to your Gemfile and running `bundle install`.

```ruby
require 'mcp_ui_server'
require 'json'

# Example 1: Direct HTML, delivered as text
resource1 = McpUiServer.create_ui_resource(
  uri: 'ui://my-component/instance-1',
  content: { type: :raw_html, htmlString: '<p>Hello World</p>' },
  encoding: :text
)
puts "Resource 1: #{JSON.pretty_generate(resource1)}"
# Output for Resource 1:
# {
#   "type": "resource",
#   "resource": {
#     "uri": "ui://my-component/instance-1",
#     "mimeType": "text/html;profile=mcp-app",
#     "text": "<p>Hello World</p>"
#   }
# }

# Example 2: Direct HTML, delivered as a Base64 blob
resource2 = McpUiServer.create_ui_resource(
  uri: 'ui://my-component/instance-2',
  content: { type: :raw_html, htmlString: '<h1>Complex HTML</h1>' },
  encoding: :blob
)
puts "Resource 2 (blob will be Base64): #{JSON.pretty_generate(resource2)}"
# Output for Resource 2:
# {
#   "type": "resource",
#   "resource": {
#     "uri": "ui://my-component/instance-2",
#     "mimeType": "text/html;profile=mcp-app",
#     "blob": "PGgxPkNvbXBsZXggSFRNTDwvaDE+"
#   }
# }

# Example 3: External URL, text encoding
dashboard_url = 'https://my.analytics.com/dashboard/123'
resource3 = McpUiServer.create_ui_resource(
  uri: 'ui://analytics-dashboard/main',
  content: { type: :external_url, iframeUrl: dashboard_url },
  encoding: :text
)
puts "Resource 3: #{JSON.pretty_generate(resource3)}"
# Output for Resource 3:
# {
#   "type": "resource",
#   "resource": {
#     "uri": "ui://analytics-dashboard/main",
#     "mimeType": "text/html;profile=mcp-app",
#     "text": "https://my.analytics.com/dashboard/123"
#   }
# }

# Example 4: External URL, blob encoding (URL is Base64 encoded)
chart_api_url = 'https://charts.example.com/api?type=pie&data=1,2,3'
resource4 = McpUiServer.create_ui_resource(
  uri: 'ui://live-chart/session-xyz',
  content: { type: :external_url, iframeUrl: chart_api_url },
  encoding: :blob
)
puts "Resource 4 (blob will be Base64 of URL): #{JSON.pretty_generate(resource4)}"
# Output for Resource 4:
# {
#   "type": "resource",
#   "resource": {
#     "uri": "ui://live-chart/session-xyz",
#     "mimeType": "text/html;profile=mcp-app",
#     "blob": "aHR0cHM6Ly9jaGFydHMuZXhhbXBsZS5jb20vYXBpP3R5cGU9cGllJmRhdGE9MSwyLDM="
#   }
# }

# These resource objects would then be included in the 'content' array
# of a toolResult in an MCP interaction.
```

## Error Handling

The `create_ui_resource` method will raise an `ArgumentError` if invalid combinations are provided.

```ruby
begin
  McpUiServer.create_ui_resource(
    uri: 'invalid://should-be-ui',
    content: { type: :external_url, iframeUrl: 'https://example.com' },
    encoding: :text
  )
rescue ArgumentError => e
  puts "Caught expected error: #{e.message}"
  # => Caught expected error: URI must start with 'ui://' for externalUrl content type.
end
```
