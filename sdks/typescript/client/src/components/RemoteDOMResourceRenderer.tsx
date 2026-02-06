import type React from 'react';
import { useMemo, useEffect, useRef, useState } from 'react';
import { DOMRemoteReceiver } from '@remote-dom/core/receivers';
import {
  createRemoteComponentRenderer,
  RemoteRootRenderer,
  RemoteReceiver,
} from '@remote-dom/react/host';
import type { EmbeddedResource } from '@modelcontextprotocol/sdk/types.js';
import { IFRAME_SRC_DOC } from '../remote-dom/iframe-bundle';
import { ThreadIframe } from '@quilted/threads';
import type {
  SandboxAPI,
  RemoteElementConfiguration,
  UIActionResult,
  ComponentLibrary,
  ComponentLibraryElement,
} from '../types';
import { basicComponentLibrary } from '../remote-dom/component-libraries/basic';
import { RemoteDOMRenderer } from './RemoteDOMRenderer';
import { processRemoteDOMResource } from '../utils/processResource';

export type RemoteDOMResourceProps = {
  resource: Partial<EmbeddedResource['resource']>;
  library?: ComponentLibrary;
  remoteElements?: RemoteElementConfiguration[];
  onUIAction?: (result: UIActionResult) => Promise<unknown>;
};

export const RemoteDOMResourceRenderer: React.FC<RemoteDOMResourceProps> = ({
  resource,
  library,
  remoteElements = [],
  onUIAction,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const threadRef = useRef<ThreadIframe<SandboxAPI> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const framework = useMemo(() => {
    const mimeType = resource.mimeType || '';
    if (mimeType.includes('framework=react')) {
      return 'react';
    }
    // Default to webcomponents for legacy or unspecified
    return 'webcomponents';
  }, [resource.mimeType]);

  const componentKey = `${library?.name}-${framework}`;

  const { receiver, components } = useMemo(() => {
    switch (framework) {
      case 'react': {
        const reactReceiver = new RemoteReceiver();
        const componentLibrary = library || basicComponentLibrary;

        const componentMap = new Map();

        if (componentLibrary) {
          componentLibrary.elements.forEach((elementDef: ComponentLibraryElement) => {
            const WrappedComponent = createRemoteComponentRenderer(elementDef.component);
            componentMap.set(elementDef.tagName, WrappedComponent);
          });
        }

        return {
          receiver: reactReceiver,
          components: componentMap,
        };
      }
      case 'webcomponents':
      default: {
        const domReceiver = new DOMRemoteReceiver();
        return {
          receiver: domReceiver,
          components: null,
        };
      }
    }
  }, [resource, library, remoteElements]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
        const uiActionResult = event.data as UIActionResult;
        if (!uiActionResult) {
          return;
        }
        onUIAction?.(uiActionResult)?.catch((err) => {
          console.error('Error handling UI action result in RemoteDOMResourceRenderer:', err);
        });
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onUIAction]);

  useEffect(() => {
    // This effect runs when the iframe is remounted due to a key change.
    // It's responsible for cleaning up the old thread from the previous render.
    const threadToCleanUp = threadRef.current;

    // We must reset the ref for the new render cycle *before* the new iframe's
    // onLoad can fire.
    threadRef.current = null;

    return () => {
      // This cleanup function will be called when the component unmounts
      // or before the effect runs again, ensuring the old thread is closed.
      threadToCleanUp?.close();
    };
  }, [componentKey]);

  const handleIframeLoad = () => {
    const iframe = iframeRef.current;

    if (!iframe || threadRef.current) {
      return;
    }

    const thread = new ThreadIframe<SandboxAPI>(iframe);
    threadRef.current = thread;

    const { code, error: processingError } = processRemoteDOMResource(resource);

    if (processingError) {
      setError(processingError);
      return;
    }

    if (code && receiver?.connection) {
      const options = {
        code,
        remoteElements,
        useReactRenderer: framework === 'react',
        componentLibrary: library?.name,
      };
      thread.imports
        .render(options, receiver.connection)
        .catch((error: Error) => console.error('Error calling remote render:', error));
    }
  };

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <>
      <iframe
        key={componentKey}
        ref={iframeRef}
        srcDoc={IFRAME_SRC_DOC}
        sandbox="allow-scripts"
        style={{ display: 'none' }}
        title="Remote DOM Sandbox"
        onLoad={handleIframeLoad}
      />

      {framework === 'react' && components ? (
        <RemoteRootRenderer receiver={receiver as RemoteReceiver} components={components} />
      ) : (
        <RemoteDOMRenderer receiver={receiver as DOMRemoteReceiver} />
      )}
    </>
  );
};
