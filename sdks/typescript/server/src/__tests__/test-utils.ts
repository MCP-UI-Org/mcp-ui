import { vi } from 'vitest';

/**
 * Stubs the global `fetch` to return a successful response with a streaming body
 * containing the given text. Useful for testing code that reads via `response.body.getReader()`.
 */
export function mockFetchWithBody(body: string, headers?: Record<string, string>) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(body);
  let readCalled = false;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(headers ?? {}),
      body: {
        getReader: () => ({
          read: () => {
            if (!readCalled) {
              readCalled = true;
              return Promise.resolve({ done: false, value: encoded });
            }
            return Promise.resolve({ done: true, value: undefined });
          },
          cancel: vi.fn(),
        }),
      },
    }),
  );
}
