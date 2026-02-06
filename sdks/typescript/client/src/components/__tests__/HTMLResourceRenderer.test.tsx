import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  HTMLResourceRenderer,
  type HTMLResourceRendererProps,
  InternalMessageType,
  ReservedUrlParams,
} from '../HTMLResourceRenderer';
import { vi } from 'vitest';
import type { EmbeddedResource } from '@modelcontextprotocol/sdk/types.js';
import { UI_METADATA_PREFIX, type UIActionResult } from '../../types.js';
import React from 'react';

describe('HTMLResource component', () => {
  const mockOnUIAction = vi.fn();

  const defaultProps: HTMLResourceRendererProps = {
    resource: { mimeType: 'text/html', text: '<p>Hello Test</p>' },
    onUIAction: mockOnUIAction,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders HTML content from text property using srcDoc', () => {
    render(<HTMLResourceRenderer {...defaultProps} />);
    const iframe = screen.getByTitle('MCP HTML Resource (Embedded Content)') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.srcdoc).toContain('<p>Hello Test</p>');
  });

  it('renders iframe with src for ui:// URI with text ', () => {
    const props: HTMLResourceRendererProps = {
      resource: {
        uri: 'ui://my-app',
        mimeType: 'text/uri-list',
        text: 'https://example.com/app',
      },
      onUIAction: mockOnUIAction,
    };
    render(<HTMLResourceRenderer {...props} />);
    const iframe = screen.getByTitle('MCP HTML Resource (URL)') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.src).toBe('https://example.com/app');
  });

  it('shows loading message initially (concept, actual timing is fast)', () => {
    // This test is more conceptual for async resources not covered by defaultProps
    // For a truly async resource, you'd mock its loading state
    const loadingProps: HTMLResourceRendererProps = {
      resource: { mimeType: 'text/html', uri: 'ui://loading-resource' }, // No text/blob means it would try to fetch
      onUIAction: mockOnUIAction,
    };
    // Simulate that it would be loading if content wasn't immediate.
    // Actual component logic might set isLoading=false very quickly if no real async fetch is triggered.
    // To test loading, you would typically mock useMcpResourceFetcher to be in a loading state.
    render(<HTMLResourceRenderer {...loadingProps} />);
    // Since our default HTMLResource resolves synchronously if text/blob is missing for ui://,
    // it might show an error or "No HTML content" instead of "Loading".
    // This assertion depends heavily on the refined async logic of HTMLResource.
    // For now, let's expect the fallback paragraph because no content is provided.
    expect(screen.getByText('HTML resource requires text or blob content.')).toBeInTheDocument();
  });

  it('displays an error message if resource mimeType is not text/html or text/uri-list', () => {
    const props: HTMLResourceRendererProps = {
      resource: { mimeType: 'application/json', text: '{}' },
      onUIAction: mockOnUIAction,
    };
    render(<HTMLResourceRenderer {...props} />);
    expect(
      screen.getByText(
        'Resource must be of type text/html (for HTML content) or text/uri-list (for URL content).',
      ),
    ).toBeInTheDocument();
  });

  it('decodes HTML from blob for ui:// resource', () => {
    const html = '<p>Blob Content</p>';
    const encodedHtml = Buffer.from(html).toString('base64');
    const props: HTMLResourceRendererProps = {
      resource: {
        uri: 'ui://blob-test',
        mimeType: 'text/html',
        blob: encodedHtml,
      },
      onUIAction: mockOnUIAction,
    };
    render(<HTMLResourceRenderer {...props} />);
    const iframe = screen.getByTitle('MCP HTML Resource (Embedded Content)') as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain(html);
  });

  it('decodes URL from blob for ui:// resource with text/uri-list mimetype', () => {
    const url = 'https://example.com/blob-app';
    const encodedUrl = Buffer.from(url).toString('base64');
    const props: HTMLResourceRendererProps = {
      resource: {
        uri: 'ui://blob-app-test',
        mimeType: 'text/uri-list',
        blob: encodedUrl,
      },
      onUIAction: mockOnUIAction,
    };
    render(<HTMLResourceRenderer {...props} />);
    const iframe = screen.getByTitle('MCP HTML Resource (URL)') as HTMLIFrameElement;
    expect(iframe.src).toBe(url);
  });

  it('handles multiple URLs in uri-list format and uses the first one', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const uriList =
      'https://example.com/first\nhttps://example.com/second\nhttps://example.com/third';
    const props: HTMLResourceRendererProps = {
      resource: {
        uri: 'ui://multi-url-test',
        mimeType: 'text/uri-list',
        text: uriList,
      },
      onUIAction: mockOnUIAction,
    };
    render(<HTMLResourceRenderer {...props} />);
    const iframe = screen.getByTitle('MCP HTML Resource (URL)') as HTMLIFrameElement;
    expect(iframe.src).toBe('https://example.com/first');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Multiple URLs found in uri-list content. Using the first URL: "https://example.com/first". Other URLs ignored:',
      ['https://example.com/second', 'https://example.com/third'],
    );
    consoleWarnSpy.mockRestore();
  });

  it('handles uri-list format with comments and empty lines', () => {
    const uriList = `# This is a comment
https://example.com/main

# Another comment
https://example.com/backup
`;
    const props: HTMLResourceRendererProps = {
      resource: {
        uri: 'ui://uri-list-with-comments',
        mimeType: 'text/uri-list',
        text: uriList,
      },
      onUIAction: mockOnUIAction,
    };
    render(<HTMLResourceRenderer {...props} />);
    const iframe = screen.getByTitle('MCP HTML Resource (URL)') as HTMLIFrameElement;
    expect(iframe.src).toBe('https://example.com/main');
  });

  it('shows error when uri-list contains no valid URLs', () => {
    const uriList = `# Only comments
# No actual URLs
`;
    const props: HTMLResourceRendererProps = {
      resource: {
        uri: 'ui://empty-uri-list',
        mimeType: 'text/uri-list',
        text: uriList,
      },
      onUIAction: mockOnUIAction,
    };
    render(<HTMLResourceRenderer {...props} />);
    expect(screen.getByText('No valid URLs found in uri-list content.')).toBeInTheDocument();
  });

  it('sets default sandbox permissions if none are provided', () => {
    const props: HTMLResourceRendererProps = {
      resource: { mimeType: 'text/html', text: '<p>Hello Test</p>' },
      onUIAction: mockOnUIAction,
    };
    render(<HTMLResourceRenderer {...props} />);
    const iframe = screen.getByTitle('MCP HTML Resource (Embedded Content)') as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
  });

  it('sets default sandbox permissions if none are provided - external URL', () => {
    const props: HTMLResourceRendererProps = {
      resource: { mimeType: 'text/uri-list', text: 'https://example.com/app' },
      onUIAction: mockOnUIAction,
    };
    render(<HTMLResourceRenderer {...props} />);
    const iframe = screen.getByTitle('MCP HTML Resource (URL)') as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
  });

  it('uses the sandbox permissions if provided', () => {
    const props: HTMLResourceRendererProps = {
      resource: { mimeType: 'text/html', text: '<p>Hello Test</p>' },
      onUIAction: mockOnUIAction,
      sandboxPermissions: 'allow-forms',
    };
    render(<HTMLResourceRenderer {...props} />);
    const iframe = screen.getByTitle('MCP HTML Resource (Embedded Content)') as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe('allow-forms allow-scripts');
  });

  it('uses the sandbox permissions if provided - external URL', () => {
    const props: HTMLResourceRendererProps = {
      resource: { mimeType: 'text/uri-list', text: 'https://example.com/app' },
      onUIAction: mockOnUIAction,
      sandboxPermissions: 'allow-forms',
    };
    render(<HTMLResourceRenderer {...props} />);
    const iframe = screen.getByTitle('MCP HTML Resource (URL)') as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe('allow-forms allow-scripts allow-same-origin');
  });
});

describe('HTMLResource iframe communication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockResourceBaseForUIActionTests: Partial<EmbeddedResource['resource']> = {
    mimeType: 'text/html',
    text: '<html><body><h1>Test Content</h1><script>console.log("iframe script loaded for onUIAction tests")</script></body></html>',
  };

  const mockOnUIAction = vi.fn<[UIActionResult], Promise<unknown>>();
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  const renderComponentForUIActionTests = (props: Partial<HTMLResourceRendererProps> = {}) => {
    return render(
      <HTMLResourceRenderer
        resource={props.resource || mockResourceBaseForUIActionTests}
        onUIAction={'onUIAction' in props ? props.onUIAction : mockOnUIAction}
        style={props.style}
      />,
    );
  };

  it('should call onUIAction with tool and params when a valid message is received from the iframe', async () => {
    renderComponentForUIActionTests();
    const iframe = (await screen.findByTitle(
      'MCP HTML Resource (Embedded Content)',
    )) as HTMLIFrameElement;

    const eventData = {
      type: 'tool',
      payload: { toolName: 'testTool', params: { foo: 'bar' } },
    };
    dispatchMessage(iframe.contentWindow, eventData);

    expect(mockOnUIAction).toHaveBeenCalledTimes(1);
    expect(mockOnUIAction).toHaveBeenCalledWith(eventData);
  });

  it('should use empty params if event.data.params is missing', async () => {
    renderComponentForUIActionTests();
    const iframe = (await screen.findByTitle(
      'MCP HTML Resource (Embedded Content)',
    )) as HTMLIFrameElement;

    const eventData = {
      type: 'tool',
      payload: { toolName: 'testTool' },
    }; // No params
    dispatchMessage(iframe.contentWindow, eventData);

    expect(mockOnUIAction).toHaveBeenCalledTimes(1);
    expect(mockOnUIAction).toHaveBeenCalledWith(eventData);
  });

  it('should not call onUIAction if the message event is not from the iframe', async () => {
    renderComponentForUIActionTests();
    // Ensure iframe is rendered before dispatching an event from the wrong source
    await screen.findByTitle('MCP HTML Resource (Embedded Content)');

    const eventData = {
      type: 'tool',
      payload: { toolName: 'testTool', params: { foo: 'bar' } },
    };
    dispatchMessage(window, eventData); // Source is the main window

    expect(mockOnUIAction).not.toHaveBeenCalled();
  });

  it('should not call onUIAction if event.data is null', async () => {
    renderComponentForUIActionTests();
    const iframe = (await screen.findByTitle(
      'MCP HTML Resource (Embedded Content)',
    )) as HTMLIFrameElement;

    dispatchMessage(iframe.contentWindow, null);

    expect(mockOnUIAction).not.toHaveBeenCalled();
  });

  it('should work correctly and not throw if onUIAction is undefined', async () => {
    // Pass undefined directly to onUIAction for this specific test
    renderComponentForUIActionTests({
      onUIAction: undefined,
      resource: mockResourceBaseForUIActionTests,
    });
    const iframe = (await screen.findByTitle(
      'MCP HTML Resource (Embedded Content)',
    )) as HTMLIFrameElement;

    const eventData = { tool: 'testTool', params: { foo: 'bar' } };

    expect(() => {
      dispatchMessage(iframe.contentWindow, eventData);
    }).not.toThrow();
    // mockOnUIAction (the one from the describe block scope) should not be called
    // as it was effectively replaced by 'undefined' for this render.
    expect(mockOnUIAction).not.toHaveBeenCalled();
  });

  it('should log an error if onUIAction returns a rejected promise', async () => {
    const errorMessage = 'Async action failed';
    const specificMockForThisTest = vi
      .fn<[UIActionResult], Promise<unknown>>()
      .mockRejectedValue(new Error(errorMessage));
    renderComponentForUIActionTests({
      onUIAction: specificMockForThisTest,
      resource: mockResourceBaseForUIActionTests,
    });

    const iframe = (await screen.findByTitle(
      'MCP HTML Resource (Embedded Content)',
    )) as HTMLIFrameElement;
    const eventData = { tool: 'testTool', params: { foo: 'bar' } };
    dispatchMessage(iframe.contentWindow, eventData);

    await waitFor(() => {
      expect(specificMockForThisTest).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error handling UI action result in HTMLResourceRenderer:',
        expect.objectContaining({ message: errorMessage }),
      );
    });
  });

  it('should pass ref to iframe', () => {
    const ref = React.createRef<HTMLIFrameElement>();
    render(
      <HTMLResourceRenderer resource={mockResourceBaseForUIActionTests} iframeProps={{ ref }} />,
    );
    expect(ref.current).toBeInTheDocument();
  });

  it('should not attempt to call onUIAction if iframeRef.current is null (e.g. resource error)', async () => {
    // Render with a resource that will cause an error and prevent iframe rendering
    const localMockOnUIAction = vi.fn<[UIActionResult], Promise<unknown>>();
    render(
      <HTMLResourceRenderer
        resource={{ mimeType: 'text/plain', text: 'not html' }} // Invalid mimeType
        onUIAction={localMockOnUIAction}
      />,
    );

    // Iframe should not be present
    expect(screen.queryByTitle('MCP HTML Resource (Embedded Content)')).not.toBeInTheDocument();
    // Error message should be displayed
    expect(
      await screen.findByText(
        'Resource must be of type text/html (for HTML content) or text/uri-list (for URL content).',
      ),
    ).toBeInTheDocument();

    const eventData = { tool: 'testTool', params: { foo: 'bar' } };
    dispatchMessage(window, eventData);

    expect(localMockOnUIAction).not.toHaveBeenCalled();
    expect(mockOnUIAction).not.toHaveBeenCalled(); // also check the describe-scoped one
  });

  it('should hang the proper query params in the iframe src', async () => {
    const resource = {
      mimeType: 'text/uri-list',
      text: 'https://example.com/app',
    };
    const iframeRenderData = { foo: 'bar' };
    const ref = React.createRef<HTMLIFrameElement>();
    render(
      <HTMLResourceRenderer
        resource={resource}
        iframeProps={{ ref }}
        iframeRenderData={iframeRenderData}
      />,
    );
    expect(ref.current).toBeInTheDocument();
    expect(ref.current?.src).toContain(`${ReservedUrlParams.WAIT_FOR_RENDER_DATA}=true`);
    const iframeWindow = ref.current?.contentWindow as Window;
    const spy = vi.spyOn(iframeWindow, 'postMessage');
    dispatchMessage(iframeWindow, {
      type: InternalMessageType.UI_LIFECYCLE_IFRAME_READY,
    });
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        {
          type: InternalMessageType.UI_LIFECYCLE_IFRAME_RENDER_DATA,
          payload: { renderData: iframeRenderData },
          messageId: undefined,
        },
        '*',
      );
    });
  });

  it('should hang the proper query params in the iframe src from resource metadata', async () => {
    const resource = {
      mimeType: 'text/uri-list',
      text: 'https://example.com/app',
      _meta: {
        [`${UI_METADATA_PREFIX}preferred-frame-size`]: ['100px', '100px'],
        [`${UI_METADATA_PREFIX}initial-render-data`]: { foo: 'baz' },
      },
    };
    const ref = React.createRef<HTMLIFrameElement>();
    render(<HTMLResourceRenderer resource={resource} iframeProps={{ ref }} />);
    expect(ref.current).toBeInTheDocument();
    expect(ref.current?.src).toContain(`${ReservedUrlParams.WAIT_FOR_RENDER_DATA}=true`);
  });

  it('shouldnt hang the query param if there is no render data', async () => {
    const resource = {
      mimeType: 'text/uri-list',
      text: 'https://example.com/app',
    };
    const ref = React.createRef<HTMLIFrameElement>();
    render(
      <HTMLResourceRenderer
        resource={resource}
        iframeProps={{ ref }}
        iframeRenderData={undefined}
      />,
    );
    expect(ref.current).toBeInTheDocument();
    expect(ref.current?.src).not.toContain(`${ReservedUrlParams.WAIT_FOR_RENDER_DATA}=true`);
  });
});

describe('HTMLResource metadata', () => {
  it('should respect a preferred-frame-size metadata', () => {
    const resource = {
      mimeType: 'text/uri-list',
      text: 'https://example.com/app',
      _meta: { [`${UI_METADATA_PREFIX}preferred-frame-size`]: ['100px', '100px'] },
    };
    const ref = React.createRef<HTMLIFrameElement>();
    render(<HTMLResourceRenderer resource={resource} iframeProps={{ ref }} />);
    expect(ref.current).toBeInTheDocument();
    expect(ref.current?.style.width).toBe('100px');
    expect(ref.current?.style.height).toBe('100px');
  });

  it('should merge inline style with preferred-frame-size metadata', () => {
    const resource = {
      mimeType: 'text/uri-list',
      text: 'https://example.com/app',
      _meta: { [`${UI_METADATA_PREFIX}preferred-frame-size`]: ['100px', '100px'] },
    };
    const ref = React.createRef<HTMLIFrameElement>();
    render(
      <HTMLResourceRenderer
        resource={resource}
        iframeProps={{ ref }}
        style={{ height: '200px' }}
      />,
    );
    expect(ref.current).toBeInTheDocument();
    expect(ref.current?.style.width).toBe('100px');
    expect(ref.current?.style.height).toBe('200px');
  });

  it('should pass correct initial render data to the iframe', () => {
    const renderData = { foo: 'baz' };
    const resource = {
      mimeType: 'text/uri-list',
      text: 'https://example.com/app',
      _meta: { [`${UI_METADATA_PREFIX}initial-render-data`]: renderData },
    };
    const ref = React.createRef<HTMLIFrameElement>();
    render(<HTMLResourceRenderer resource={resource} iframeProps={{ ref }} />);
    expect(ref.current).toBeInTheDocument();
    expect(ref.current?.src).toContain(`${ReservedUrlParams.WAIT_FOR_RENDER_DATA}=true`);
    const iframeWindow = ref.current?.contentWindow as Window;
    const spy = vi.spyOn(iframeWindow, 'postMessage');
    dispatchMessage(iframeWindow, {
      type: InternalMessageType.UI_LIFECYCLE_IFRAME_READY,
    });
    expect(spy).toHaveBeenCalledWith(
      {
        type: InternalMessageType.UI_LIFECYCLE_IFRAME_RENDER_DATA,
        payload: { renderData },
        messageId: undefined,
      },
      '*',
    );
  });

  it('should merge iframeRenderData and metadataInitialRenderData', () => {
    const iframeRenderData = { priority: 'high', foo: 'bar' };
    const metadataInitialRenderData = { priority: 'low', baz: 'qux' };
    const resource = {
      mimeType: 'text/uri-list',
      text: 'https://example.com/app',
      _meta: { [`${UI_METADATA_PREFIX}initial-render-data`]: metadataInitialRenderData },
    };
    const ref = React.createRef<HTMLIFrameElement>();
    render(
      <HTMLResourceRenderer
        resource={resource}
        iframeProps={{ ref }}
        iframeRenderData={iframeRenderData}
      />,
    );
    expect(ref.current).toBeInTheDocument();
    expect(ref.current?.src).toContain(`${ReservedUrlParams.WAIT_FOR_RENDER_DATA}=true`);
    const iframeWindow = ref.current?.contentWindow as Window;
    const spy = vi.spyOn(iframeWindow, 'postMessage');
    dispatchMessage(iframeWindow, {
      type: InternalMessageType.UI_LIFECYCLE_IFRAME_READY,
    });
    expect(spy).toHaveBeenCalledWith(
      {
        type: InternalMessageType.UI_LIFECYCLE_IFRAME_RENDER_DATA,
        payload: {
          renderData: {
            priority: 'high',
            foo: 'bar',
            baz: 'qux',
          },
        },
        messageId: undefined,
      },
      '*',
    );
  });

  it('should respond to ui-request-render-data with render data', () => {
    const iframeRenderData = { theme: 'dark', user: { id: '123' } };
    const resource = {
      mimeType: 'text/uri-list',
      text: 'https://example.com/app',
    };
    const ref = React.createRef<HTMLIFrameElement>();
    render(
      <HTMLResourceRenderer
        resource={resource}
        iframeProps={{ ref }}
        iframeRenderData={iframeRenderData}
      />,
    );
    expect(ref.current).toBeInTheDocument();
    const iframeWindow = ref.current?.contentWindow as Window;
    const spy = vi.spyOn(iframeWindow, 'postMessage');

    const messageId = 'test-message-id';
    dispatchMessage(iframeWindow, {
      type: InternalMessageType.UI_REQUEST_RENDER_DATA,
      messageId,
    });

    expect(spy).toHaveBeenCalledWith(
      {
        type: InternalMessageType.UI_LIFECYCLE_IFRAME_RENDER_DATA,
        payload: { renderData: iframeRenderData },
        messageId,
      },
      '*',
    );
  });

  it('should respond to ui-request-render-data with undefined when no render data', () => {
    const resource = {
      mimeType: 'text/uri-list',
      text: 'https://example.com/app',
    };
    const ref = React.createRef<HTMLIFrameElement>();
    render(<HTMLResourceRenderer resource={resource} iframeProps={{ ref }} />);
    expect(ref.current).toBeInTheDocument();
    const iframeWindow = ref.current?.contentWindow as Window;
    const spy = vi.spyOn(iframeWindow, 'postMessage');

    const messageId = 'test-message-id-2';
    dispatchMessage(iframeWindow, {
      type: InternalMessageType.UI_REQUEST_RENDER_DATA,
      messageId,
    });

    expect(spy).toHaveBeenCalledWith(
      {
        type: InternalMessageType.UI_LIFECYCLE_IFRAME_RENDER_DATA,
        payload: { renderData: undefined },
        messageId,
      },
      '*',
    );
  });
});

// Helper to dispatch a message event
const dispatchMessage = (source: Window | null, data: Record<string, unknown> | null) => {
  fireEvent(
    window,
    new MessageEvent('message', {
      data,
      source,
    }),
  );
};
