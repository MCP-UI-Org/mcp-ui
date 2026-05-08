import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SANDBOX_PROXY_READY_METHOD } from '@modelcontextprotocol/ext-apps/app-bridge';

import { setupSandboxProxyIframe, type SandboxCancelRef } from './app-host-utils';

describe('setupSandboxProxyIframe', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects onReady when sandbox never becomes ready (timeout)', async () => {
    const cancelRef: SandboxCancelRef = {};
    const { onReady } = await setupSandboxProxyIframe(
      new URL('https://example.com/proxy'),
      cancelRef,
    );

    const assertion = expect(onReady).rejects.toThrow(
      /Timed out waiting for sandbox proxy iframe to be ready/,
    );
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it('resolves onReady when cancel is called before the sandbox handshake completes', async () => {
    const cancelRef: SandboxCancelRef = {};
    const { onReady } = await setupSandboxProxyIframe(
      new URL('https://example.com/proxy'),
      cancelRef,
    );

    expect(cancelRef.cancel).toBeTypeOf('function');
    cancelRef.cancel!();

    await expect(onReady).resolves.toBeUndefined();

    await vi.advanceTimersByTimeAsync(10_000);
  });

  it('resolves onReady when the sandbox posts the ready message', async () => {
    const { iframe, onReady } = await setupSandboxProxyIframe(new URL('https://example.com/proxy'));

    // jsdom does not attach contentWindow to programmatic iframes; the handler matches
    // event.source === iframe.contentWindow, so expose a stable mock window reference.
    const sandboxWindow = {} as Window;
    Object.defineProperty(iframe, 'contentWindow', {
      get: () => sandboxWindow,
      configurable: true,
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        source: sandboxWindow,
        data: { method: SANDBOX_PROXY_READY_METHOD },
      }),
    );

    await expect(onReady).resolves.toBeUndefined();
  });
});
