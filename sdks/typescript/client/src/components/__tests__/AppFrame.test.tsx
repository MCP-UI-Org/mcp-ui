import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

import { AppFrame, type AppFrameProps } from '../AppFrame';
import * as appHostUtils from '../../utils/app-host-utils';
import type { AppBridge } from '@modelcontextprotocol/ext-apps/app-bridge';

// Mock the ext-apps module
vi.mock('@modelcontextprotocol/ext-apps/app-bridge', () => {
  // Create a mock constructor for PostMessageTransport
  const MockPostMessageTransport = vi.fn().mockImplementation(function(this: unknown) {
    return this;
  });

  return {
    AppBridge: vi.fn(),
    PostMessageTransport: MockPostMessageTransport,
  };
});

// Track registered handlers
let registeredOninitialized: (() => void) | null = null;
let registeredOnsizechange: ((params: { width?: number; height?: number }) => void) | null = null;

// Mock AppBridge factory
const createMockAppBridge = () => {
  const bridge = {
    connect: vi.fn().mockResolvedValue(undefined),
    sendSandboxResourceReady: vi.fn().mockResolvedValue(undefined),
    sendToolInput: vi.fn(),
    sendToolResult: vi.fn(),
    getAppVersion: vi.fn().mockReturnValue({ name: 'TestApp', version: '1.0.0' }),
    getAppCapabilities: vi.fn().mockReturnValue({ tools: {} }),
    _oninitialized: null as (() => void) | null,
    _onsizechange: null as ((params: { width?: number; height?: number }) => void) | null,
  };

  Object.defineProperty(bridge, 'oninitialized', {
    set: (fn) => {
      bridge._oninitialized = fn;
      registeredOninitialized = fn;
    },
    get: () => bridge._oninitialized,
  });
  Object.defineProperty(bridge, 'onsizechange', {
    set: (fn) => {
      bridge._onsizechange = fn;
      registeredOnsizechange = fn;
    },
    get: () => bridge._onsizechange,
  });

  return bridge;
};

// Mock the app-host-utils module
vi.mock('../../utils/app-host-utils', () => ({
  setupSandboxProxyIframe: vi.fn(),
}));

describe('<AppFrame />', () => {
  let mockIframe: Partial<HTMLIFrameElement>;
  let mockContentWindow: { postMessage: ReturnType<typeof vi.fn> };
  let onReadyResolve: () => void;
  let mockAppBridge: ReturnType<typeof createMockAppBridge>;

  beforeEach(() => {
    vi.clearAllMocks();
    registeredOninitialized = null;
    registeredOnsizechange = null;
    mockAppBridge = createMockAppBridge();

    // Create mock contentWindow
    mockContentWindow = {
      postMessage: vi.fn(),
    };

    // Create a real iframe element and mock contentWindow via defineProperty
    const realIframe = document.createElement('iframe');
    Object.defineProperty(realIframe, 'contentWindow', {
      get: () => mockContentWindow as unknown as Window,
      configurable: true,
    });
    mockIframe = realIframe;

    // Setup mock for setupSandboxProxyIframe
    const onReadyPromise = new Promise<void>((resolve) => {
      onReadyResolve = resolve;
    });

    vi.mocked(appHostUtils.setupSandboxProxyIframe).mockResolvedValue({
      iframe: mockIframe as HTMLIFrameElement,
      onReady: onReadyPromise,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps: Omit<AppFrameProps, 'appBridge'> = {
    html: '<html><body>Test</body></html>',
    sandbox: { url: new URL('http://localhost:8081/sandbox.html') },
  };

  const getPropsWithBridge = (overrides: Partial<AppFrameProps> = {}): AppFrameProps => ({
    ...defaultProps,
    appBridge: mockAppBridge as unknown as AppBridge,
    ...overrides,
  });

  it('should render without crashing', () => {
    render(<AppFrame {...getPropsWithBridge()} />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should call setupSandboxProxyIframe with sandbox URL', async () => {
    render(<AppFrame {...getPropsWithBridge()} />);

    await waitFor(() => {
      expect(appHostUtils.setupSandboxProxyIframe).toHaveBeenCalledWith(defaultProps.sandbox.url);
    });
  });

  it('should connect AppBridge when provided', async () => {
    render(<AppFrame {...getPropsWithBridge()} />);

    await act(() => {
      onReadyResolve();
    });

    await waitFor(() => {
      expect(mockAppBridge.connect).toHaveBeenCalled();
    });
  });

  it('should send HTML via AppBridge.sendSandboxResourceReady', async () => {
    render(<AppFrame {...getPropsWithBridge()} />);

    await act(() => {
      onReadyResolve();
    });

    // Trigger initialization
    await act(() => {
      registeredOninitialized?.();
    });

    await waitFor(() => {
      expect(mockAppBridge.sendSandboxResourceReady).toHaveBeenCalledWith({
        html: defaultProps.html,
        csp: undefined,
      });
    });
  });

  it('should call onInitialized with app info when app initializes', async () => {
    const onInitialized = vi.fn();

    render(<AppFrame {...getPropsWithBridge({ onInitialized })} />);

    await act(() => {
      onReadyResolve();
    });

    await act(() => {
      registeredOninitialized?.();
    });

    await waitFor(() => {
      expect(onInitialized).toHaveBeenCalledWith({
        appVersion: { name: 'TestApp', version: '1.0.0' },
        appCapabilities: { tools: {} },
      });
    });
  });

  it('should send tool input after initialization', async () => {
    const toolInput = { foo: 'bar' };

    render(<AppFrame {...getPropsWithBridge({ toolInput })} />);

    await act(() => {
      onReadyResolve();
    });

    await act(() => {
      registeredOninitialized?.();
    });

    await waitFor(() => {
      expect(mockAppBridge.sendToolInput).toHaveBeenCalledWith({
        arguments: toolInput,
      });
    });
  });

  it('should send tool result after initialization', async () => {
    const toolResult = { content: [{ type: 'text' as const, text: 'result' }] };

    render(<AppFrame {...getPropsWithBridge({ toolResult })} />);

    await act(() => {
      onReadyResolve();
    });

    await act(() => {
      registeredOninitialized?.();
    });

    await waitFor(() => {
      expect(mockAppBridge.sendToolResult).toHaveBeenCalledWith(toolResult);
    });
  });

  it('should call onSizeChanged when size changes', async () => {
    const onSizeChanged = vi.fn();

    render(<AppFrame {...getPropsWithBridge({ onSizeChanged })} />);

    await act(() => {
      onReadyResolve();
    });

    await act(() => {
      registeredOnsizechange?.({ width: 800, height: 600 });
    });

    expect(onSizeChanged).toHaveBeenCalledWith({ width: 800, height: 600 });
  });

  it('should forward CSP to sandbox', async () => {
    const csp = {
      connectDomains: ['api.example.com'],
      resourceDomains: ['cdn.example.com'],
    };

    render(<AppFrame {...getPropsWithBridge({ sandbox: { ...defaultProps.sandbox, csp } })} />);

    await act(() => {
      onReadyResolve();
    });

    await act(() => {
      registeredOninitialized?.();
    });

    await waitFor(() => {
      expect(mockAppBridge.sendSandboxResourceReady).toHaveBeenCalledWith({
        html: defaultProps.html,
        csp,
      });
    });
  });

  it('should call onError when setup fails', async () => {
    const onError = vi.fn();
    const error = new Error('Setup failed');

    vi.mocked(appHostUtils.setupSandboxProxyIframe).mockRejectedValue(error);

    render(<AppFrame {...getPropsWithBridge({ onError })} />);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it('should display error message when error occurs', async () => {
    const error = new Error('Test error');
    vi.mocked(appHostUtils.setupSandboxProxyIframe).mockRejectedValue(error);

    render(<AppFrame {...getPropsWithBridge()} />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Test error/)).toBeInTheDocument();
    });
  });

  describe('lifecycle', () => {
    it('should preserve iframe across re-renders', async () => {
      const { rerender } = render(<AppFrame {...getPropsWithBridge()} />);

      await act(() => {
        onReadyResolve();
      });

      await act(() => {
        registeredOninitialized?.();
      });

      // setupSandboxProxyIframe should be called once on initial mount
      expect(appHostUtils.setupSandboxProxyIframe).toHaveBeenCalledTimes(1);

      // Re-render with same props (simulating React StrictMode remount or parent re-render)
      rerender(<AppFrame {...getPropsWithBridge()} />);

      // Should NOT call setupSandboxProxyIframe again - iframe is preserved
      expect(appHostUtils.setupSandboxProxyIframe).toHaveBeenCalledTimes(1);
    });

    it('should recreate iframe when sandbox URL changes', async () => {
      const { rerender } = render(<AppFrame {...getPropsWithBridge()} />);

      await act(() => {
        onReadyResolve();
      });

      await act(() => {
        registeredOninitialized?.();
      });

      expect(appHostUtils.setupSandboxProxyIframe).toHaveBeenCalledTimes(1);

      // Create new mock for second iframe
      const secondOnReadyPromise = new Promise<void>((resolve) => {
        onReadyResolve = resolve;
      });
      vi.mocked(appHostUtils.setupSandboxProxyIframe).mockResolvedValue({
        iframe: mockIframe as HTMLIFrameElement,
        onReady: secondOnReadyPromise,
      });

      // Re-render with DIFFERENT sandbox URL
      const newSandboxUrl = new URL('http://localhost:9999/different-sandbox.html');
      rerender(<AppFrame {...getPropsWithBridge({ sandbox: { url: newSandboxUrl } })} />);

      // Should call setupSandboxProxyIframe again with new URL
      await waitFor(() => {
        expect(appHostUtils.setupSandboxProxyIframe).toHaveBeenCalledTimes(2);
        expect(appHostUtils.setupSandboxProxyIframe).toHaveBeenLastCalledWith(newSandboxUrl);
      });
    });

    it('should update HTML content without recreating iframe', async () => {
      const { rerender } = render(<AppFrame {...getPropsWithBridge()} />);

      await act(() => {
        onReadyResolve();
      });

      await act(() => {
        registeredOninitialized?.();
      });

      // Initial HTML sent
      await waitFor(() => {
        expect(mockAppBridge.sendSandboxResourceReady).toHaveBeenCalledTimes(1);
        expect(mockAppBridge.sendSandboxResourceReady).toHaveBeenCalledWith({
          html: defaultProps.html,
          csp: undefined,
        });
      });

      // Re-render with new HTML
      const newHtml = '<html><body>Updated Content</body></html>';
      rerender(<AppFrame {...getPropsWithBridge({ html: newHtml })} />);

      // Should send new HTML without recreating iframe
      await waitFor(() => {
        expect(mockAppBridge.sendSandboxResourceReady).toHaveBeenCalledTimes(2);
        expect(mockAppBridge.sendSandboxResourceReady).toHaveBeenLastCalledWith({
          html: newHtml,
          csp: undefined,
        });
      });

      // Iframe should NOT be recreated
      expect(appHostUtils.setupSandboxProxyIframe).toHaveBeenCalledTimes(1);
    });

    it('should update toolInput without recreating iframe', async () => {
      const { rerender } = render(
        <AppFrame {...getPropsWithBridge({ toolInput: { initial: true } })} />,
      );

      await act(() => {
        onReadyResolve();
      });

      await act(() => {
        registeredOninitialized?.();
      });

      await waitFor(() => {
        expect(mockAppBridge.sendToolInput).toHaveBeenCalledWith({ arguments: { initial: true } });
      });

      // Re-render with new toolInput
      rerender(<AppFrame {...getPropsWithBridge({ toolInput: { updated: true } })} />);

      await waitFor(() => {
        expect(mockAppBridge.sendToolInput).toHaveBeenCalledWith({ arguments: { updated: true } });
      });

      // Iframe should NOT be recreated
      expect(appHostUtils.setupSandboxProxyIframe).toHaveBeenCalledTimes(1);
    });
  });
});
