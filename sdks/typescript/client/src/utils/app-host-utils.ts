import {
  SANDBOX_PROXY_READY_METHOD,
  getToolUiResourceUri as _getToolUiResourceUri,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/app-bridge';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
const DEFAULT_SANDBOX_TIMEOUT_MS = 10000;

export async function setupSandboxProxyIframe(sandboxProxyUrl: URL): Promise<{
  iframe: HTMLIFrameElement;
  onReady: Promise<void>;
}> {
  const iframe = document.createElement('iframe');
  iframe.style.width = '100%';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.backgroundColor = 'transparent';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');

  const onReady = new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      window.removeEventListener('message', messageListener);
      iframe.removeEventListener('error', errorListener);
    };

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('Timed out waiting for sandbox proxy iframe to be ready'));
      }
    }, DEFAULT_SANDBOX_TIMEOUT_MS);

    const messageListener = (event: MessageEvent) => {
      if (event.source === iframe.contentWindow) {
        if (
          event.data &&
          event.data.method === SANDBOX_PROXY_READY_METHOD
        ) {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            cleanup();
            resolve();
          }
        }
      }
    };

    const errorListener = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        cleanup();
        reject(new Error('Failed to load sandbox proxy iframe'));
      }
    };

    window.addEventListener('message', messageListener);
    iframe.addEventListener('error', errorListener);
  });

  iframe.src = sandboxProxyUrl.href;

  return { iframe, onReady };
}

export type ToolUiResourceInfo = {
  uri: string;
};

export async function getToolUiResourceUri(
  client: Client,
  toolName: string,
): Promise<ToolUiResourceInfo | null> {
  let tool: Tool | undefined;
  let cursor: string | undefined = undefined;
  do {
    const toolsResult = await client.listTools({ cursor });
    tool = toolsResult.tools.find((t) => t.name === toolName);
    cursor = toolsResult.nextCursor;
  } while (!tool && cursor);
  if (!tool) {
    throw new Error(`tool ${toolName} not found`);
  }
  if (!tool._meta) {
    return null;
  }

  const uri = _getToolUiResourceUri(tool);
  if (!uri) {
    return null;
  }
  if (!uri.startsWith('ui://')) {
    throw new Error(`tool ${toolName} has unsupported output template URI: ${uri}`);
  }
  return { uri };
}

export async function readToolUiResourceHtml(
  client: Client,
  opts: {
    uri: string;
  },
): Promise<string> {
  const resource = await client.readResource({ uri: opts.uri });

  if (!resource) {
    throw new Error('UI resource not found: ' + opts.uri);
  }
  if (resource.contents.length !== 1) {
    throw new Error('Unsupported UI resource content length: ' + resource.contents.length);
  }
  const content = resource.contents[0];
  let html: string;
  const isHtml = (t?: string) => t === RESOURCE_MIME_TYPE;

  if ('text' in content && typeof content.text === 'string' && isHtml(content.mimeType)) {
    html = content.text;
  } else if ('blob' in content && typeof content.blob === 'string' && isHtml(content.mimeType)) {
    html = atob(content.blob);
  } else {
    throw new Error('Unsupported UI resource content format: ' + JSON.stringify(content));
  }

  return html;
}
