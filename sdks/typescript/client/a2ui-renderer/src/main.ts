/**
 * Generic A2UI renderer for MCP Apps, bundled into @mcp-ui/client.
 *
 * Contains zero server-specific logic. Any MCP server can drive this app
 * if it follows two conventions:
 *  1. A2UI payloads are embedded resources with mimeType
 *     application/a2ui+json (or legacy application/json+a2ui) in tool
 *     results, including the entry tool's.
 *  2. Each A2UI action maps to an app-visible tool by the action's own
 *     name, and the action's resolved context becomes the tool arguments.
 */

import { App } from '@modelcontextprotocol/ext-apps';
import { ContextProvider } from '@lit/context';
import { A2uiSurface, Context, basicCatalog, type LitComponentApi } from '@a2ui/lit/v0_9';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { renderMarkdown } from '@a2ui/markdown-it';
import { extractA2uiMessages } from './extract-a2ui-messages';

// Reference the class so the a2ui-surface custom-element registration
// side effect is never tree-shaken away.
void A2uiSurface;

const root = document.getElementById('root')!;

const statusEl = document.createElement('p');
statusEl.style.cssText = 'padding: 8px; color: #666;';
root.appendChild(statusEl);

const surfacesEl = document.createElement('div');
root.appendChild(surfacesEl);

function setStatus(text: string) {
  statusEl.textContent = text;
  statusEl.style.display = text ? '' : 'none';
}
setStatus('Connecting to MCP host…');

// The Text component consumes the markdown renderer via @lit/context;
// provide it once at the root so every surface inherits it.
new ContextProvider(root, { context: Context.markdown, initialValue: renderMarkdown });

const app = new App({ name: 'mcp-ui-generic-a2ui-renderer', version: '1.0.0' });

const processor = new MessageProcessor<LitComponentApi>([basicCatalog], (action) => {
  // A2UI action name = server tool name; resolved context = tool arguments.
  app
    .callServerTool({
      name: action.name,
      arguments: (action.context ?? {}) as Record<string, unknown>,
    })
    .then((result) => {
      // Apply the response incrementally — no surface reset.
      const messages = extractA2uiMessages(result.content);
      if (messages.length > 0) {
        processor.processMessages(messages);
      }
    })
    .catch((err) => {
      console.error(`Tool call '${action.name}' failed:`, err);
    });
});

const surfaceElements = new Map<string, A2uiSurface>();

processor.onSurfaceCreated((surface) => {
  const el = document.createElement('a2ui-surface') as A2uiSurface;
  el.surface = surface;
  surfaceElements.set(surface.id, el);
  surfacesEl.appendChild(el);
  setStatus('');
});

processor.onSurfaceDeleted((id) => {
  surfaceElements.get(id)?.remove();
  surfaceElements.delete(id);
});

// Each tool result from the host is a full render: reset all surfaces first.
app.ontoolresult = (params) => {
  Array.from(processor.model.surfacesMap.keys()).forEach((id) => {
    processor.model.deleteSurface(id);
  });
  const messages = extractA2uiMessages(params.content);
  if (messages.length > 0) {
    processor.processMessages(messages);
  } else {
    setStatus('Tool result contained no A2UI payload.');
  }
};

app
  .connect()
  .then(() => {
    if (surfaceElements.size === 0) {
      setStatus('Connected. Waiting for tool result…');
    }
  })
  .catch((err) => {
    setStatus(`Failed to connect to host: ${err}`);
  });
