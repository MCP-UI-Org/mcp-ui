import type React from 'react';
import { useEffect, useRef } from 'react';
import { type DOMRemoteReceiver } from '@remote-dom/core/receivers';

export type RemoteDOMRendererProps = {
  receiver: DOMRemoteReceiver;
};

export const RemoteDOMRenderer: React.FC<RemoteDOMRendererProps> = ({ receiver }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      receiver.connect(containerRef.current);

      return () => {
        receiver.disconnect();
      };
    }
  }, [receiver]);

  return <div ref={containerRef} data-testid="standard-dom-renderer-container" />;
};
