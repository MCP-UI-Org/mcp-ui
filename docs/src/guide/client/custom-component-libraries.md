# Custom Component Libraries

::: danger Deprecated
Remote DOM support has been removed from MCP-UI. This documentation is preserved for historical reference only.
:::

The `UIResourceRenderer` component previously allowed hosts to provide their own component libraries and custom element definitions for `remoteDom` resources.

You can provide your own library and elements through the `remoteDomProps` prop.

## `remoteDomProps`

The `remoteDomProps` prop is an object that accepts two optional properties:
- `library`: A `ComponentLibrary` object that maps remote element tag names to your React components.
- `remoteElements`: An array of `RemoteElementConfiguration` objects that define the properties and events for your custom elements.

### `ComponentLibrary`

A `ComponentLibrary` is an object with two properties:
- `name`: A string that identifies your library.
- `elements`: An array of objects that map element tag names to your components.

Each element object has the following properties:
- `tagName`: The name of the remote element (e.g., `my-button`).
- `component`: The React component to render for this element.
- `propMapping`: An object that maps remote element attributes to your component's props.
- `eventMapping`: An object that maps remote element events to your component's event handlers.

### `RemoteElementConfiguration`

A `RemoteElementConfiguration` object defines the properties and events for a custom element. It has the following properties:
- `tagName`: The name of the remote element.
- `properties`: An object that defines the properties for the element.
- `events`: An object that defines the events for the element.

## Example: Custom React Components

Let's walk through an example of how to create and use a custom component library with `UIResourceRenderer`. We'll create a simple library with a custom button and text component.

### 1. Define Your Components

First, create your React components. These can be any valid React component.

```tsx
// MyButton.tsx
import React from 'react';

interface MyButtonProps {
  label: string;
  onCustomPress: () => void;
}

export const MyButton: React.FC<MyButtonProps> = ({ label, onCustomPress }) => {
  return <button onClick={onCustomPress}>{label}</button>;
};

// MyText.tsx
import React from 'react';

interface MyTextProps {
  text: string;
}

export const MyText: React.FC<MyTextProps> = ({ text }) => {
  return <p>{text}</p>;
};
```

### 2. Create the Component Library

Next, create a `ComponentLibrary` object that maps your remote element tag names to your components.

```ts
// my-library.ts
import { MyButton } from './MyButton';
import { MyText } from './MyText';

export const myLibrary = {
  name: 'my-library',
  elements: [
    {
      tagName: 'my-button',
      component: MyButton,
      propMapping: {
        label: 'label',
      },
      eventMapping: {
        press: 'onCustomPress',
      },
    },
    {
      tagName: 'my-text',
      component: MyText,
      propMapping: {
        content: 'text',
      },
    },
  ],
};
```

### 3. Define the Remote Elements

Now, define the `RemoteElementConfiguration` for your custom elements.

```ts
// my-elements.ts
export const myElements = [
  {
    tagName: 'my-button',
    properties: {
      label: { type: String },
    },
    events: {
      press: {},
    },
  },
  {
    tagName: 'my-text',
    properties: {
      content: { type: String },
    },
  },
];
```

### 4. Use in `UIResourceRenderer`

Finally, pass your custom library and elements to `UIResourceRenderer` via the `remoteDomProps` prop.

```tsx
// App.tsx
import React from 'react';
import { UIResourceRenderer } from '@mcp-ui/client';
import { myLibrary } from './my-library';
import { myElements } from './my-elements';

function App({ resource }) {
  return (
    <UIResourceRenderer
      resource={resource}
      remoteDomProps={{
        library: myLibrary,
        remoteElements: myElements,
      }}
    />
  );
}
```

### 5. Server-Side Script

The server can now send a script that uses your custom elements.

```js
const button = document.createElement('my-button');
button.setAttribute('label', 'Click Me');
button.addEventListener('press', () => {
  console.log('Button pressed!');
});

const text = document.createElement('my-text');
text.setAttribute('content', 'Hello from a custom library!');

root.appendChild(text);
root.appendChild(button);
```

When `UIResourceRenderer` renders this resource, it will use your `MyButton` and `MyText` components, mapping the attributes and events as you defined.

## Integration with Web Components

`@mcp-ui/client` also supports rendering `remoteDom` resources as [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_Components). This allows you to use standard HTML elements in your host application, which can be useful for interoperability or for use in frameworks other than React.

To use Web Components, you need to specify `framework=webcomponents` in the `mimeType` of the resource.

### 1. Define Your Web Components

First, define your custom elements as Web Components.

```ts
// my-web-components.ts
class MyButton extends HTMLElement {
  // ... implementation ...
}

class MyText extends HTMLElement {
  // ... implementation ...
}

export function defineWebComponents() {
  if (!customElements.get('my-button')) {
    customElements.define('my-button', MyButton);
  }
  if (!customElements.get('my-text')) {
    customElements.define('my-text', MyText);
  }
}
```

### 2. Register Web Components in Your App

In your application's entry point, call the function to register the Web Components.

```tsx
// main.tsx
import { defineWebComponents } from './my-web-components';

defineWebComponents();
```

### 3. Server-Side Script

The server-side script remains the same, but the `mimeType` of the resource must be updated.

```ts
const resource = {
  mimeType: 'application/vnd.mcp-ui.remote-dom+javascript; framework=webcomponents',
  text: `
    const button = document.createElement('my-button');
    button.setAttribute('label', 'Click Me');
    button.addEventListener('press', () => {
      console.log('Button pressed!');
    });
    
    const text = document.createElement('my-text');
    text.setAttribute('content', 'Hello from a Web Component!');
    
    root.appendChild(text);
    root.appendChild(button);
  `,
};
```

### 4. Use in `UIResourceRenderer`

When using Web Components, you can often use the `basicComponentLibrary` provided by `@mcp-ui/client` as it doesn't need to do any special rendering. `UIResourceRenderer` will detect the `webcomponents` framework in the mime type and will render the elements as standard HTML elements.

```tsx
// App.tsx
import React from 'react';
import { UIResourceRenderer, basicComponentLibrary } from '@mcp-ui/client';
import { myElements } from './my-elements'; // Same element definitions as before

function App({ resource }) {
  return (
    <UIResourceRenderer
      resource={resource}
      remoteDomProps={{
        library: basicComponentLibrary,
        remoteElements: myElements,
      }}
    />
  );
}
```

## Examples in MCP-UI

You can find a complete, working example of custom component libraries in the `remote-dom-demo` directory in the `examples` folder of this repository.

- **Demo Application**: `examples/remote-dom-demo/src/App.tsx`
- **Radix UI Library**: `examples/remote-dom-demo/src/libraries/radix.tsx`
- **Web Components Library**: `examples/remote-dom-demo/src/libraries/webcomponents.ts`

## Further Reading

For more information on the underlying technology, see the official `remote-dom` repository:

- [Shopify/remote-dom on GitHub](https://github.com/Shopify/remote-dom) 