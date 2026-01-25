# mcp-ui-server Overview

The `mcp-ui-server` package provides utilities to generate UI resources (`UIResource`) on your MCP server. It allows you to define UI snippets on the server-side, which can then be seamlessly and securely rendered on the client.

::: tip MCP Apps Compatibility
The `create_ui_resource` function creates UIResource objects that work with both MCP Apps hosts (via `_meta.ui.resourceUri`) and legacy MCP-UI hosts.

For the recommended MCP Apps pattern with TypeScript, see [Getting Started](../../getting-started).
:::

For a complete example, see the [`python-server-demo`](https://github.com/idosal/mcp-ui/tree/main/examples/python-server-demo).

## Key Exports

- **`create_ui_resource(options_dict: dict[str, Any]) -> UIResource`**:
  The primary function for creating UI snippets. It takes a dictionary of options to define the URI, content (direct HTML or external URL), and encoding method (text or blob).

## Purpose

- **Ease of Use**: Simplifies the creation of valid `UIResource` objects.
- **Validation**: Includes basic validation (e.g., URI prefixes matching content type).
- **Encoding**: Handles Base64 encoding when `encoding: 'blob'` is specified.
- **MCP Integration**: Proper integration with the MCP Python SDK using `EmbeddedResource`.

## Installation

Install the package using pip or your preferred package manager:

```bash
pip install mcp-ui-server
```

Or with uv:

```bash
uv add mcp-ui-server
```

## Building

This package is built using Python's standard build tools and distributed via PyPI. It includes full type annotations and is compatible with Python 3.10+.

To build the package from source:

```bash
uv build
```

See the [Server SDK Usage & Examples](./usage-examples.md) page for practical examples.