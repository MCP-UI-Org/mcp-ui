import r2wc from '@r2wc/react-to-web-component';
import { UIResourceRenderer, type UIResourceRendererProps } from './UIResourceRenderer';
import { type FC, useCallback, useRef } from 'react';
import { type UIActionResult } from '../types';
import type { EmbeddedResource } from '@modelcontextprotocol/sdk/types.js';

type UIResourceRendererWCProps = Omit<UIResourceRendererProps, 'resource' | 'onUIAction'> & {
  resource?: EmbeddedResource['resource'] | string;
};

function normalizeJsonProp(prop: unknown): Record<string, unknown> | undefined {
  if (typeof prop === 'object' && prop !== null) {
    return prop as Record<string, unknown>;
  }
  if (typeof prop === 'string' && prop.trim() !== '') {
    try {
      return JSON.parse(prop);
    } catch (e) {
      console.error('Failed to parse JSON prop:', { prop, error: e });
      return undefined;
    }
  }
}

export const UIResourceRendererWCWrapper: FC<UIResourceRendererWCProps> = (props) => {
  const {
    resource: rawResource,
    supportedContentTypes: rawSupportedContentTypes,
    htmlProps: rawHtmlProps,
    remoteDomProps: rawRemoteDomProps,
  } = props;

  const resource = normalizeJsonProp(rawResource) as
    | Partial<EmbeddedResource['resource']>
    | undefined;
  const supportedContentTypes = normalizeJsonProp(rawSupportedContentTypes);
  const htmlProps = normalizeJsonProp(rawHtmlProps);
  const remoteDomProps = normalizeJsonProp(rawRemoteDomProps);

  const ref = useRef<HTMLDivElement>(null);

  const onUIActionCallback = useCallback(async (event: UIActionResult): Promise<void> => {
    if (ref.current) {
      const customEvent = new CustomEvent('onUIAction', {
        detail: event,
        composed: true,
        bubbles: true,
      });
      ref.current.dispatchEvent(customEvent);
    }
  }, []);

  if (!resource) {
    return <p style={{ color: 'red' }}>Resource not provided.</p>;
  }

  return (
    <div ref={ref}>
      <UIResourceRenderer
        resource={resource}
        supportedContentTypes={
          supportedContentTypes as unknown as UIResourceRendererProps['supportedContentTypes']
        }
        htmlProps={htmlProps}
        remoteDomProps={remoteDomProps}
        onUIAction={onUIActionCallback}
      />
    </div>
  );
};

// Get the base web component class from r2wc
const BaseUIResourceRendererWC = r2wc(UIResourceRendererWCWrapper, {
  props: {
    resource: 'json',
    supportedContentTypes: 'json',
    htmlProps: 'json',
    remoteDomProps: 'json',
    /* `onUIAction` is intentionally omitted as the WC implements its own event dispatching mechanism for UI actions.
     * Consumers should listen for the `onUIAction` CustomEvent on the element instead of passing an `onUIAction` prop.
     */
  },
});

/**
 * Extended web component class that implements connectedMoveCallback.
 *
 * When an element is moved in the DOM using moveBefore(), browsers that support
 * the "atomic move" feature (https://developer.chrome.com/blog/movebefore-api)
 * will call connectedMoveCallback instead of disconnectedCallback/connectedCallback.
 *
 * By implementing an empty connectedMoveCallback, we signal that the component
 * should preserve its internal state (including iframe content) when moved,
 * rather than being fully torn down and recreated.
 */
class UIResourceRendererWC extends BaseUIResourceRendererWC {
  /**
   * Called when the element is moved via moveBefore() in browsers that support atomic moves.
   * By implementing this method (even as a no-op), we prevent the element from being
   * disconnected and reconnected, which would cause iframes to reload and lose state.
   */
  connectedMoveCallback() {
    // Intentionally empty - by implementing this callback, we opt into atomic move behavior
    // and prevent the iframe from reloading when the element is repositioned in the DOM.
  }
}

customElements.define('ui-resource-renderer', UIResourceRendererWC);
