# mcp_ui_server Overview

The `mcp_ui_server` gem provides server-side utilities in Ruby to help construct `UIResource` objects, which can then be sent to a client as part of an MCP response.

::: tip MCP Apps Compatibility
The `create_ui_resource` method creates UIResource objects that work with both MCP Apps hosts (via `_meta.ui.resourceUri`) and legacy MCP-UI hosts.

For the recommended MCP Apps pattern with TypeScript, see [Getting Started](../../getting-started).
:::

## Key Methods

- **`McpUiServer.create_ui_resource(options)`**:
  The primary method for creating UI snippets. It takes an options hash to define the URI, content (direct HTML or external URL), and encoding method.

## Purpose

- **Ease of Use**: Simplifies the creation of valid `UIResource` objects in Ruby.
- **Validation**: Includes basic validation (e.g., URI prefixes matching content type).
- **Encoding**: Handles Base64 encoding automatically.

## Installation

Add this line to your application's Gemfile:

```ruby
gem 'mcp_ui_server'
```

And then execute:

```bash
$ bundle install
```

Or install it yourself as:

```bash
$ gem install mcp_ui_server
```

See the [Server SDK Usage & Examples](./usage-examples.md) page for practical examples.
