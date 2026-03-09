# MCP UI Server SDK for Ruby

This is the Ruby server-side SDK for MCP UI. It provides helper methods to create UI resources that can be sent to the mcp-ui client.

## Installation

Add this line to your application's Gemfile:

```ruby
gem 'mcp_ui_server', git: 'https://github.com/idosal/mcp-ui'
```

And then execute:

    $ bundle install

## Usage

The main method is `McpUiServer.create_ui_resource`. It helps you construct a valid UIResource hash.

### URI Requirements

All UI resources must use the `ui://` URI scheme. The SDK will validate it and raise a `McpUiServer::Error` if an invalid URI is provided.

```ruby
# Valid URI
McpUiServer.create_ui_resource(uri: 'ui://my-app/greeting', ...)

# Invalid URI - will raise McpUiServer::Error
McpUiServer.create_ui_resource(uri: 'http://example.com', ...)
```

### Content Type Support

The Ruby SDK follows Ruby conventions by using snake_case symbols for content types:

- `:raw_html` - Raw HTML content
- `:external_url` - External URL content  
- `:remote_dom` - Remote DOM content

The SDK maintains protocol consistency by internally mapping these to the camelCase format used in the MCP-UI specification.

### Creating a `raw_html` resource

```ruby
require 'mcp_ui_server'

resource = McpUiServer.create_ui_resource(
  uri: 'ui://my-app/greeting',
  content: {
    type: :raw_html,
    htmlString: '<h1>Hello, World!</h1>'
  }
)

# The resulting resource hash can be serialized to JSON and sent in your API response.
# {
#   "type": "resource",
#   "resource": {
#     "uri": "ui://my-app/greeting",
#     "mimeType": "text/html;profile=mcp-app",
#     "text": "<h1>Hello, World!</h1>"
#   }
# }
```

### Creating an `external_url` resource

```ruby
require 'mcp_ui_server'

resource = McpUiServer.create_ui_resource(
  uri: 'ui://my-app/external-page',
  content: {
    type: :external_url,
    iframeUrl: 'https://example.com'
  }
)

# Results in:
# {
#   "type": "resource",
#   "resource": {
#     "uri": "ui://my-app/external-page",
#     "mimeType": "text/html;profile=mcp-app",
#     "text": "https://example.com"
#   }
# }
```

### Creating a `remote_dom` resource

```ruby
require 'mcp_ui_server'

script = "..." # Your javascript bundle for the remote-dom

resource = McpUiServer.create_ui_resource(
  uri: 'ui://my-app/complex-view',
  content: {
    type: :remote_dom,
    script: script,
    framework: :react # or :webcomponents
  }
)
```

### Using `blob` encoding

For binary content or to avoid encoding issues, you can use `blob` encoding, which will Base64 encode the content.

```ruby
resource = McpUiServer.create_ui_resource(
  uri: 'ui://my-app/greeting',
  content: {
    type: :raw_html,
    htmlString: '<h1>Hello, World!</h1>'
  },
  encoding: :blob
)
```

## Error Handling

The SDK uses a custom `McpUiServer::Error` class for all SDK-specific errors. This makes it easy to rescue and handle SDK errors separately from other application errors.

```ruby
begin
  resource = McpUiServer.create_ui_resource(
    uri: 'http://invalid-scheme',
    content: { type: :raw_html, htmlString: '<h1>Hello</h1>' }
  )
rescue McpUiServer::Error => e
  puts "MCP UI SDK Error: #{e.message}"
  # Handle SDK-specific errors
rescue => e
  puts "Other error: #{e.message}"
  # Handle other errors
end
```

Common error scenarios:
- Invalid URI scheme (not starting with `ui://`)
- Unknown content type (only `:raw_html`, `:external_url`, `:remote_dom` are supported)
- Missing required content keys (e.g., `htmlString` for `raw_html`)
- Unknown encoding type

## Constants

The SDK provides constants for MIME types and content types:

```ruby
# MIME type constant (MCP Apps standard; used for both HTML and URL content)
McpUiServer::RESOURCE_MIME_TYPE     # 'text/html;profile=mcp-app'
McpUiServer::MIME_TYPE_HTML          # alias for RESOURCE_MIME_TYPE
McpUiServer::MIME_TYPE_URI_LIST      # alias for RESOURCE_MIME_TYPE
McpUiServer::MIME_TYPE_REMOTE_DOM    # 'application/vnd.mcp-ui.remote-dom; framework=%s'

# Content type constants (Ruby snake_case)
McpUiServer::CONTENT_TYPE_RAW_HTML      # :raw_html
McpUiServer::CONTENT_TYPE_EXTERNAL_URL  # :external_url
McpUiServer::CONTENT_TYPE_REMOTE_DOM    # :remote_dom

# Protocol mapping (for internal use)
McpUiServer::PROTOCOL_CONTENT_TYPES     # { raw_html: 'rawHtml', ... }

# URI scheme constant
McpUiServer::UI_URI_SCHEME           # 'ui://'
```

## Development

After checking out the repo, run `bundle install` to install dependencies. Then, run `bundle exec rspec` to run the tests. You can also run `bundle exec rubocop` to check for code style.

To install this gem onto your local machine, run `bundle exec rake install`.

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/idosal/mcp-ui.

## License

The gem is available as open source under the terms of the [Apache-2.0 License](https://www.apache.org/licenses/LICENSE-2.0). 