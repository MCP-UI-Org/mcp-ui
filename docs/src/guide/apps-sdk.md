# OpenAI Apps SDK Integration

::: warning ChatGPT-Specific
This page covers the **OpenAI Apps SDK** adapter for **ChatGPT** integration. This is separate from the **MCP Apps** standard.

- **MCP Apps**: The open standard for tool UIs (`_meta.ui.resourceUri`) - see [Getting Started](./getting-started)
- **Apps SDK**: ChatGPT's proprietary protocol (`openai/outputTemplate`) - covered on this page
:::

The Apps SDK adapter in `@mcp-ui/server` enables your MCP-UI HTML widget to run inside ChatGPT. However, for now, you still need to manually serve the resource according to the Apps SDK spec. This guide walks through the manual flow the adapter expects today to support both MCP-UI hosts and ChatGPT.

## Why two resources?

- **Static template for Apps SDK** – referenced from your tool descriptor via `_meta["openai/outputTemplate"]`. This version must enable the Apps SDK adapter so ChatGPT injects the bridge script and uses the `text/html+skybridge` MIME type.
- **Embedded resource in tool results** – returned each time your tool runs. This version should *not* enable the adapter so MCP-native hosts continue to receive standard MCP-UI HTML.

## Step-by-step walkthrough

### 1. Register the Apps SDK template

Use `createUIResource` with `adapters.appsSdk.enabled: true` and expose it through the MCP Resources API so both Apps SDK and traditional MCP hosts can fetch it.

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createUIResource } from '@mcp-ui/server';

const server = new McpServer({ name: 'weather-bot', version: '1.0.0' });
const TEMPLATE_URI = 'ui://widgets/weather';

const appsSdkTemplate = createUIResource({
  uri: TEMPLATE_URI,
  encoding: 'text',
  adapters: {
    appsSdk: {
      enabled: true,
      config: { intentHandling: 'prompt' },
    },
  },
  content: {
    type: 'rawHtml',
    htmlString: renderForecastWidget(),
  },
  metadata: {
    'openai/widgetDescription': widget.description,
    'openai/widgetPrefersBorder': true,
  },
});

server.registerResource(TEMPLATE_URI, async () => appsSdkTemplate.resource);
```

> **Note:** The adapter switches the MIME type to `text/html+skybridge` and injects the Apps bridge script automatically. The bridge translates MCP-UI primitives to Apps SDK compatible code so no HTML changes are required.

### Add Apps SDK widget metadata

Apps SDK surfaces a handful of `_meta` keys on the resource itself (description, CSP, borders, etc.). Provide them via the `metadata` option when you build the template so ChatGPT can present the widget correctly. For example:

```ts
const appsSdkTemplate = createUIResource({
  uri: TEMPLATE_URI,
  encoding: 'text',
  adapters: { appsSdk: { enabled: true } },
  content: {
    type: 'rawHtml',
    htmlString: renderForecastWidget(),
  },
  metadata: {
    'openai/widgetDescription': 'Interactive calculator',
    'openai/widgetCSP': {
      connect_domains: [],
      resource_domains: [],
    },
    'openai/widgetPrefersBorder': true,
  },
});
```

### 2. Reference the template in your tool descriptor

The Apps SDK looks for `_meta["openai/outputTemplate"]` to know which resource to render. Mirror the rest of the Apps-specific metadata you need (status text, accessibility hints, security schemes, etc.).

```ts
// Partial example (see Step 3 for complete example)
server.registerTool(
  'forecast',
  {
    title: 'Get the forecast',
    description: 'Returns a UI that displays the current weather.',
    inputSchema: {
      type: 'object',
      properties: { city: { type: 'string' } },
      required: ['city'],
    },
    _meta: {
      'openai/outputTemplate': TEMPLATE_URI,
      'openai/toolInvocation/invoking': 'Fetching forecast…',
      'openai/toolInvocation/invoked': 'Forecast ready',
      'openai/widgetAccessible': true,
    },
  },
  async ({ city }) => {
    const forecast = await fetchForecast(city);

    return {
      content: [
        {
          type: 'text',
          text: `Forecast prepared for ${city}.`,
        },
      ],
      structuredContent: {
        forecast,
      },
    };
  },
);
```

### 3. Add the MCP-UI embedded resource to the tool response

To support MCP-UI hosts, also return a standard `createUIResource` result (without the Apps adapter) alongside the Apps SDK payloads.

```ts
server.registerTool(
  'forecast',
  {
    title: 'Get the forecast',
    description: 'Returns a UI that displays the current weather.',
    inputSchema: {
      type: 'object',
      properties: { city: { type: 'string' } },
      required: ['city'],
    },
    _meta: {
      'openai/outputTemplate': TEMPLATE_URI,
      'openai/toolInvocation/invoking': 'Fetching forecast…',
      'openai/toolInvocation/invoked': 'Forecast ready',
      'openai/widgetAccessible': true,
    },
  },
  async ({ city }) => {
    const forecast = await fetchForecast(city);

    // MCP-UI embedded UI resource
    const uiResource = createUIResource({
        uri: `ui://widgets/weather/${city}`,
        encoding: 'text',
        content: {
        type: 'rawHtml',
        htmlString: renderForecastWidget(forecast),
        },
    });

    return {
      content: [
        {
          type: 'text',
          text: `Forecast prepared for ${city}.`,
        },
        uiResource
      ],
      structuredContent: {
        forecast,
      },
    };
  },
);
```

> **Important:** The MCP-UI resource should **not** enable the Apps SDK adapter. It is for hosts that expect embedded resources. ChatGPT will ignore it and use the template registered in step 1 instead.

For the complete list of supported metadata fields, refer to the official documentation. [Apps SDK Reference](https://developers.openai.com/apps-sdk/reference)

