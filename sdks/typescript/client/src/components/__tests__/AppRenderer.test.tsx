import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

import { AppRenderer, type AppRendererProps, type AppRendererHandle } from '../AppRenderer';
import type { AppFrameProps } from '../AppFrame';
import type { AppBridge } from '@modelcontextprotocol/ext-apps/app-bridge';
import * as appHostUtils from '../../utils/app-host-utils';

// Mock AppFrame to capture props
const mockAppFrame = vi.fn();
vi.mock('../AppFrame', () => ({
  AppFrame: (props: AppFrameProps) => {
    mockAppFrame(props);
    return (
      <div
        data-testid="app-frame"
        data-html={props.html}
        data-sandbox-url={props.sandbox?.url?.href}
      >
        {props.toolInput && <span data-testid="tool-input">{JSON.stringify(props.toolInput)}</span>}
        {props.toolResult && (
          <span data-testid="tool-result">{JSON.stringify(props.toolResult)}</span>
        )}
      </div>
    );
  },
}));

// Mock app-host-utils
vi.mock('../../utils/app-host-utils', () => ({
  getToolUiResourceUri: vi.fn(),
  readToolUiResourceHtml: vi.fn(),
}));

// Store mock bridge instance for test access
let mockBridgeInstance: Partial<AppBridge> | null = null;

// Mock AppBridge constructor
vi.mock('@modelcontextprotocol/ext-apps/app-bridge', () => {
  return {
    AppBridge: vi.fn().mockImplementation(function () {
      mockBridgeInstance = {
        onmessage: undefined,
        onopenlink: undefined,
        onloggingmessage: undefined,
        oncalltool: undefined,
        onlistresources: undefined,
        onlistresourcetemplates: undefined,
        onreadresource: undefined,
        onlistprompts: undefined,
        setHostContext: vi.fn(),
        sendToolInputPartial: vi.fn(),
        sendToolCancelled: vi.fn(),
        sendToolListChanged: vi.fn(),
        sendResourceListChanged: vi.fn(),
        sendPromptListChanged: vi.fn(),
        teardownResource: vi.fn(),
      };
      return mockBridgeInstance;
    }),
    RESOURCE_MIME_TYPE: 'text/html',
  };
});

// Mock MCP Client
const mockClient = {
  getServerCapabilities: vi.fn().mockReturnValue({
    tools: {},
    resources: {},
  }),
};

describe('<AppRenderer />', () => {
  const defaultProps: AppRendererProps = {
    client: mockClient as unknown as Client,
    toolName: 'test-tool',
    sandbox: { url: new URL('http://localhost:8081/sandbox.html') },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockBridgeInstance = null;
    mockAppFrame.mockClear();

    // Default mock implementations
    vi.mocked(appHostUtils.getToolUiResourceUri).mockResolvedValue({
      uri: 'ui://test-tool',
    });
    vi.mocked(appHostUtils.readToolUiResourceHtml).mockResolvedValue(
      '<html><body>Test Tool UI</body></html>',
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('should render AppFrame after fetching HTML', async () => {
      render(<AppRenderer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
      });
    });

    it('should fetch resource URI for the tool', async () => {
      render(<AppRenderer {...defaultProps} />);

      await waitFor(() => {
        expect(appHostUtils.getToolUiResourceUri).toHaveBeenCalledWith(mockClient, 'test-tool');
      });
    });

    it('should read HTML from resource URI', async () => {
      render(<AppRenderer {...defaultProps} />);

      await waitFor(() => {
        expect(appHostUtils.readToolUiResourceHtml).toHaveBeenCalledWith(mockClient, {
          uri: 'ui://test-tool',
        });
      });
    });

    it('should pass fetched HTML to AppFrame', async () => {
      render(<AppRenderer {...defaultProps} />);

      await waitFor(() => {
        const appFrame = screen.getByTestId('app-frame');
        expect(appFrame).toHaveAttribute('data-html', '<html><body>Test Tool UI</body></html>');
      });
    });

    it('should use provided toolResourceUri instead of fetching', async () => {
      const props: AppRendererProps = {
        ...defaultProps,
        toolResourceUri: 'ui://custom-uri',
      };

      render(<AppRenderer {...props} />);

      await waitFor(() => {
        expect(appHostUtils.getToolUiResourceUri).not.toHaveBeenCalled();
        expect(appHostUtils.readToolUiResourceHtml).toHaveBeenCalledWith(mockClient, {
          uri: 'ui://custom-uri',
        });
      });
    });

    it('should use provided HTML directly without fetching', async () => {
      const props: AppRendererProps = {
        ...defaultProps,
        html: '<html><body>Pre-fetched HTML</body></html>',
      };

      render(<AppRenderer {...props} />);

      await waitFor(() => {
        expect(appHostUtils.getToolUiResourceUri).not.toHaveBeenCalled();
        expect(appHostUtils.readToolUiResourceHtml).not.toHaveBeenCalled();
        expect(screen.getByTestId('app-frame')).toHaveAttribute(
          'data-html',
          '<html><body>Pre-fetched HTML</body></html>',
        );
      });
    });

    it('should pass sandbox config to AppFrame', async () => {
      render(<AppRenderer {...defaultProps} />);

      await waitFor(() => {
        const appFrame = screen.getByTestId('app-frame');
        expect(appFrame).toHaveAttribute('data-sandbox-url', 'http://localhost:8081/sandbox.html');
      });
    });

    it('should pass toolInput to AppFrame', async () => {
      const toolInput = { query: 'test query' };
      const props: AppRendererProps = {
        ...defaultProps,
        toolInput,
      };

      render(<AppRenderer {...props} />);

      await waitFor(() => {
        const toolInputEl = screen.getByTestId('tool-input');
        expect(toolInputEl).toHaveTextContent(JSON.stringify(toolInput));
      });
    });

    it('should pass toolResult to AppFrame', async () => {
      const toolResult = { content: [{ type: 'text' as const, text: 'result' }] };
      const props: AppRendererProps = {
        ...defaultProps,
        toolResult,
      };

      render(<AppRenderer {...props} />);

      await waitFor(() => {
        const toolResultEl = screen.getByTestId('tool-result');
        expect(toolResultEl).toHaveTextContent(JSON.stringify(toolResult));
      });
    });

    it('should display error when tool has no UI resource', async () => {
      vi.mocked(appHostUtils.getToolUiResourceUri).mockResolvedValue(null);

      render(<AppRenderer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
        expect(screen.getByText(/has no UI resource/)).toBeInTheDocument();
      });
    });

    it('should call onError when resource fetch fails', async () => {
      const onError = vi.fn();
      const error = new Error('Fetch failed');
      vi.mocked(appHostUtils.readToolUiResourceHtml).mockRejectedValue(error);

      render(<AppRenderer {...defaultProps} onError={onError} />);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });

    it('should return null while loading', () => {
      // Make the promise never resolve
      vi.mocked(appHostUtils.getToolUiResourceUri).mockReturnValue(new Promise(() => {}));

      const { container } = render(<AppRenderer {...defaultProps} />);

      // Should render nothing while loading
      expect(container.firstChild).toBeNull();
    });
  });

  describe('hostContext prop', () => {
    it('should call setHostContext when hostContext is provided', async () => {
      const hostContext = { theme: 'dark' as const };

      render(<AppRenderer {...defaultProps} hostContext={hostContext} />);

      await waitFor(() => {
        expect(mockBridgeInstance?.setHostContext).toHaveBeenCalledWith(hostContext);
      });
    });

    it('should update hostContext when prop changes', async () => {
      const { rerender } = render(
        <AppRenderer {...defaultProps} hostContext={{ theme: 'light' as const }} />,
      );

      await waitFor(() => {
        expect(mockBridgeInstance?.setHostContext).toHaveBeenCalledWith({ theme: 'light' });
      });

      rerender(<AppRenderer {...defaultProps} hostContext={{ theme: 'dark' as const }} />);

      await waitFor(() => {
        expect(mockBridgeInstance?.setHostContext).toHaveBeenCalledWith({ theme: 'dark' });
      });
    });
  });

  describe('toolInputPartial prop', () => {
    it('should call sendToolInputPartial when toolInputPartial is provided', async () => {
      const toolInputPartial = { arguments: { delta: 'partial data' } };

      render(<AppRenderer {...defaultProps} toolInputPartial={toolInputPartial} />);

      await waitFor(() => {
        expect(mockBridgeInstance?.sendToolInputPartial).toHaveBeenCalledWith(toolInputPartial);
      });
    });
  });

  describe('toolCancelled prop', () => {
    it('should call sendToolCancelled when toolCancelled is true', async () => {
      render(<AppRenderer {...defaultProps} toolCancelled={true} />);

      await waitFor(() => {
        expect(mockBridgeInstance?.sendToolCancelled).toHaveBeenCalledWith({});
      });
    });

    it('should not call sendToolCancelled when toolCancelled is false', async () => {
      render(<AppRenderer {...defaultProps} toolCancelled={false} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
      });

      expect(mockBridgeInstance?.sendToolCancelled).not.toHaveBeenCalled();
    });
  });

  describe('ref methods', () => {
    it('should expose sendToolListChanged via ref', async () => {
      const ref = React.createRef<AppRendererHandle>();

      render(<AppRenderer ref={ref} {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(ref.current).not.toBeNull();
      });

      act(() => {
        ref.current?.sendToolListChanged();
      });

      expect(mockBridgeInstance?.sendToolListChanged).toHaveBeenCalled();
    });

    it('should expose sendResourceListChanged via ref', async () => {
      const ref = React.createRef<AppRendererHandle>();

      render(<AppRenderer ref={ref} {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(ref.current).not.toBeNull();
      });

      act(() => {
        ref.current?.sendResourceListChanged();
      });

      expect(mockBridgeInstance?.sendResourceListChanged).toHaveBeenCalled();
    });

    it('should expose sendPromptListChanged via ref', async () => {
      const ref = React.createRef<AppRendererHandle>();

      render(<AppRenderer ref={ref} {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(ref.current).not.toBeNull();
      });

      act(() => {
        ref.current?.sendPromptListChanged();
      });

      expect(mockBridgeInstance?.sendPromptListChanged).toHaveBeenCalled();
    });

    it('should expose teardownResource via ref', async () => {
      const ref = React.createRef<AppRendererHandle>();

      render(<AppRenderer ref={ref} {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(ref.current).not.toBeNull();
      });

      act(() => {
        ref.current?.teardownResource();
      });

      expect(mockBridgeInstance?.teardownResource).toHaveBeenCalledWith({});
    });
  });

  describe('MCP request handler props', () => {
    it('should register onCallTool handler on AppBridge', async () => {
      const onCallTool = vi.fn().mockResolvedValue({ content: [] });

      render(<AppRenderer {...defaultProps} onCallTool={onCallTool} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
      });

      // The handler should be registered
      expect(mockBridgeInstance?.oncalltool).toBeDefined();
    });

    it('should register onListResources handler on AppBridge', async () => {
      const onListResources = vi.fn().mockResolvedValue({ resources: [] });

      render(<AppRenderer {...defaultProps} onListResources={onListResources} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
      });

      expect(mockBridgeInstance?.onlistresources).toBeDefined();
    });

    it('should register onListResourceTemplates handler on AppBridge', async () => {
      const onListResourceTemplates = vi.fn().mockResolvedValue({ resourceTemplates: [] });

      render(<AppRenderer {...defaultProps} onListResourceTemplates={onListResourceTemplates} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
      });

      expect(mockBridgeInstance?.onlistresourcetemplates).toBeDefined();
    });

    it('should register onReadResource handler on AppBridge', async () => {
      const onReadResource = vi.fn().mockResolvedValue({ contents: [] });

      render(<AppRenderer {...defaultProps} onReadResource={onReadResource} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
      });

      expect(mockBridgeInstance?.onreadresource).toBeDefined();
    });

    it('should register onListPrompts handler on AppBridge', async () => {
      const onListPrompts = vi.fn().mockResolvedValue({ prompts: [] });

      render(<AppRenderer {...defaultProps} onListPrompts={onListPrompts} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
      });

      expect(mockBridgeInstance?.onlistprompts).toBeDefined();
    });
  });

  describe('callback props', () => {
    it('should pass onSizeChanged to AppFrame', async () => {
      const onSizeChanged = vi.fn();

      render(<AppRenderer {...defaultProps} onSizeChanged={onSizeChanged} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
      });

      expect(mockAppFrame).toHaveBeenCalledWith(
        expect.objectContaining({
          onSizeChanged: expect.any(Function),
        }),
      );
    });

    it('should pass onError to AppFrame', async () => {
      const onError = vi.fn();

      render(<AppRenderer {...defaultProps} onError={onError} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
      });

      expect(mockAppFrame).toHaveBeenCalledWith(
        expect.objectContaining({
          onError,
        }),
      );
    });
  });

  describe('no client', () => {
    it('should work without client when html is provided', async () => {
      const props: AppRendererProps = {
        // client omitted - using html prop instead
        toolName: 'test-tool',
        sandbox: { url: new URL('http://localhost:8081/sandbox.html') },
        html: '<html><body>Static HTML</body></html>',
      };

      render(<AppRenderer {...props} />);

      await waitFor(() => {
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
        expect(screen.getByTestId('app-frame')).toHaveAttribute(
          'data-html',
          '<html><body>Static HTML</body></html>',
        );
      });
    });

    it('should show error without client and no html', async () => {
      const props: AppRendererProps = {
        // client omitted, no html provided
        toolName: 'test-tool',
        sandbox: { url: new URL('http://localhost:8081/sandbox.html') },
      };

      render(<AppRenderer {...props} />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });
    });

    it('should work with onReadResource and toolResourceUri instead of client', async () => {
      const mockReadResource = vi.fn().mockResolvedValue({
        contents: [
          {
            uri: 'ui://test/tool',
            mimeType: 'text/html',
            text: '<html><body>Custom fetched HTML</body></html>',
          },
        ],
      });

      const props: AppRendererProps = {
        // client omitted - using onReadResource + toolResourceUri instead
        toolName: 'test-tool',
        sandbox: { url: new URL('http://localhost:8081/sandbox.html') },
        toolResourceUri: 'ui://test/tool',
        onReadResource: mockReadResource,
      };

      render(<AppRenderer {...props} />);

      await waitFor(() => {
        expect(mockReadResource).toHaveBeenCalledWith({ uri: 'ui://test/tool' }, expect.anything());
        expect(screen.getByTestId('app-frame')).toBeInTheDocument();
        expect(screen.getByTestId('app-frame')).toHaveAttribute(
          'data-html',
          '<html><body>Custom fetched HTML</body></html>',
        );
      });
    });
  });
});
