import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import '@testing-library/jest-dom';
import { SANDBOX_PROXY_READY_METHOD } from '@modelcontextprotocol/ext-apps/app-bridge';

// The proxy speaks the same postMessage protocol the host bridge expects. We
// assert against the REAL imported bridge constant (not a hard-coded string) so
// this test fails if the proxy ever drifts from the SDK's wire format again.
const SANDBOX_RESOURCE_READY_METHOD = 'ui/notifications/sandbox-resource-ready';

function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Proxy script', () => {
  it('emits the bridge ready method and renders HTML sent as a resource-ready notification', async () => {
    const proxyPath = path.resolve(__dirname, '../../../scripts/proxy/index.html');
    const proxyHtml = readFileSync(proxyPath, 'utf8');

    // Create jsdom with proxy URL using contentType=rawhtml
    const dom = new JSDOM(proxyHtml, {
      url: 'http://proxy.local/?contentType=rawhtml',
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true,
    });

    const { window } = dom;

    // Capture the ready signal emitted by the proxy — must match the exact
    // method the host waits for (setupSandboxProxyIframe).
    let proxyReady = false;
    window.addEventListener('message', (event: MessageEvent) => {
      const data = event.data as { method?: string };
      if (data?.method === SANDBOX_PROXY_READY_METHOD) {
        proxyReady = true;
      }
    });

    // Allow the inline script to run and emit readiness
    await nextTick();
    expect(proxyReady).toBe(true);

    // Find the iframe created by the script
    const outerDoc = window.document;
    const innerIframe = outerDoc.querySelector('iframe');
    expect(innerIframe).toBeTruthy();

    // Verify the iframe has id="root" and src="about:blank"
    expect(innerIframe?.getAttribute('id')).toBe('root');
    expect(innerIframe?.getAttribute('src')).toBe('about:blank');

    // Send the html as the bridge does: a JSON-RPC notification with the html
    // under params (not a bespoke {type,payload} envelope).
    const html = '<!doctype html><html><body><form><input></form></body></html>';
    const MsgEvent: typeof MessageEvent = window.MessageEvent;
    window.dispatchEvent(
      new MsgEvent('message', {
        data: { method: SANDBOX_RESOURCE_READY_METHOD, params: { html } },
        source: window.parent,
      }),
    );

    // Let the proxy handle the message
    await nextTick();
    await nextTick();

    // Note: JSDOM has limitations with document.write on dynamically created
    // iframes; in a real browser the contentDocument would contain the HTML.
    // Here we verify the structure and that no srcdoc is used (document.write
    // path, which requires allow-same-origin — no sandbox attr on the inner).
    expect(innerIframe).toBeTruthy();
    expect(innerIframe?.hasAttribute('srcdoc')).toBe(false);
  });

  it('defaults to raw-HTML mode when loaded with NO query params (how AppFrame calls it)', async () => {
    // The real host component (AppFrame) sets neither ?contentType nor ?url — it
    // delivers HTML via postMessage. Before the mode-default fix, the proxy fell
    // through to "Error: missing url or html parameter" and never posted ready,
    // so AppFrame timed out with a blank card. This guards that exact failure.
    const proxyPath = path.resolve(__dirname, '../../../scripts/proxy/index.html');
    const proxyHtml = readFileSync(proxyPath, 'utf8');

    const dom = new JSDOM(proxyHtml, {
      url: 'http://proxy.local/', // no query params at all
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true,
    });
    const { window } = dom;

    let proxyReady = false;
    window.addEventListener('message', (event: MessageEvent) => {
      const data = event.data as { method?: string };
      if (data?.method === SANDBOX_PROXY_READY_METHOD) proxyReady = true;
    });

    await nextTick();
    // Must enter raw-HTML mode: post the ready signal AND create the inner
    // rawhtml iframe (id="root"). Before the fix it fell through to the error
    // branch, posting nothing and creating no iframe — so these two assertions
    // are the real guard. (We don't assert on body.textContent: in jsdom the
    // inline <script> source lives in the body, so the error-string *literal*
    // is present as source text whether or not the branch ran.)
    expect(proxyReady).toBe(true);
    expect(window.document.querySelector('iframe#root')).toBeTruthy();
  });
});
