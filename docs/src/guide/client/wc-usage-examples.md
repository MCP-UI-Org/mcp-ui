# Web Component Usage & Examples

::: tip MCP Apps Hosts
For MCP Apps hosts (the standard), use `AppRenderer` or `AppFrame` React components. See [MCP Apps Integration](../mcp-apps#apprenderer-component) for details.

The `UIResourceRenderer` Web Component is for **legacy MCP-UI hosts** that embed resources in tool responses.
:::

`UIResourceRenderer` is available as a Web Component and serves as a powerful tool for integrating MCP-UI resources into non-React frameworks such as Vue, Svelte, or vanilla JavaScript. It offers the same core functionality as its React counterpart but is used as a standard HTML element.

A full, working example is available in the `examples/wc-demo` directory of the repository, demonstrating the recommended property-based approach.

## 1. Install the package

```bash
npm install @mcp-ui/client
```

## 2. Import the Web Component

In your project's main JavaScript or TypeScript file, import the Web Component script. This will register the `<ui-resource-renderer>` custom element, making it available throughout your application.

```javascript
import '@mcp-ui/client/ui-resource-renderer.wc.js';
```

Your build tool (e.g., Vite, Webpack, etc.) will automatically resolve this path from `node_modules`.

## 3. Use the Custom Element

Once the script is imported, you can use the `<ui-resource-renderer>` custom element in your HTML.

```html
<ui-resource-renderer id="my-renderer"></ui-resource-renderer>
```

## 4. Styling

You can style the Web Component directly with CSS, just like any other HTML element. The internal `<iframe>` is designed to fill 100% of the custom element's dimensions, so you can control its size and appearance by styling the `<ui-resource-renderer>` tag.

```css
ui-resource-renderer {
  display: block;
  width: 100%;
  height: 400px;
  border: 1px solid #ccc;
  border-radius: 8px;
}
```

## 5. Passing Data and Handling Actions

There are two ways to pass data to the Web Component: as JavaScript **properties** or as HTML **attributes**.

### Method 1: Using JavaScript Properties (Recommended)

The standard and most powerful way to pass complex data (like objects and arrays) is by setting the component's JavaScript properties. This is the recommended approach for applications, especially when using frameworks like Vue or Svelte which handle this automatically.

```javascript
// This object would typically come from an MCP response
const resourceObject = {
  uri: 'ui://some-resource/1',
  mimeType: 'text/uri-list',
  text: 'https://example.com'
};

const renderer = document.getElementById('my-renderer');

// Set the 'resource' property directly with the object
// No stringification is needed
renderer.resource = resourceObject;

// Listen for events
renderer.addEventListener('onUIAction', (event) => {
  console.log('Action received:', event.detail);
});
```

When using a framework like Vue or Svelte, you can bind to the property directly in your template:

```vue
<!-- Vue.js Example -->
<ui-resource-renderer :resource="myResourceObject"></ui-resource-renderer>
```

### Method 2: Using HTML Attributes (for Static Data)

If you need to set the initial data directly in your HTML, you can use attributes. Since HTML attributes can only be strings, you must provide a **stringified JSON** for any prop that is an object.

This method is less common for dynamic data but can be useful for static content or simple examples.

```html
<ui-resource-renderer
  resource='{ "mimeType": "text/uri-list", "text": "https://example.com" }'
></ui-resource-renderer>
```

Our component wrapper will automatically parse these stringified attributes back into objects.

### Available Properties/Attributes

The Web Component accepts the same properties as the [`<UIResourceRenderer />` React component](./resource-renderer.md#props). For detailed information on all available props and their usage, please refer to the main component documentation.
