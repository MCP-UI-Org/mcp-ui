import { type RemoteReceiver } from '@remote-dom/core/receivers';
import type React from 'react';

export type UIActionType = 'tool' | 'prompt' | 'link' | 'intent' | 'notify';

export const ALL_RESOURCE_CONTENT_TYPES = ['rawHtml', 'externalUrl', 'remoteDom'] as const;
export type ResourceContentType = (typeof ALL_RESOURCE_CONTENT_TYPES)[number];

type GenericActionMessage = {
  messageId?: string;
};

export type UIActionResultToolCall = GenericActionMessage & {
  type: 'tool';
  payload: {
    toolName: string;
    params: Record<string, unknown>;
  };
};

export type UIActionResultPrompt = GenericActionMessage & {
  type: 'prompt';
  payload: {
    prompt: string;
  };
};

export type UIActionResultLink = GenericActionMessage & {
  type: 'link';
  payload: {
    url: string;
  };
};

export type UIActionResultIntent = GenericActionMessage & {
  type: 'intent';
  payload: {
    intent: string;
    params: Record<string, unknown>;
  };
};

export type UIActionResultNotification = GenericActionMessage & {
  type: 'notify';
  payload: {
    message: string;
  };
};

export type UIActionResult =
  | UIActionResultToolCall
  | UIActionResultPrompt
  | UIActionResultLink
  | UIActionResultIntent
  | UIActionResultNotification;

/**
 * This is the API that the remote environment (iframe) exports to the host.
 * The host can call these methods on the thread.
 */
export interface SandboxAPI {
  render: (options: RenderOptions, receiver: RemoteReceiver) => void | Promise<void>;
}

export interface RemoteElementConfiguration {
  tagName: string;
  remoteAttributes?: string[];
  remoteEvents?: string[];
}
export interface RenderOptions {
  code: string;
  componentLibrary?: string;
  useReactRenderer?: boolean;
  remoteElements?: RemoteElementConfiguration[];
}

export interface ComponentLibraryElement {
  tagName: string;
  component: React.ComponentType<Record<string, unknown>>;
  propMapping?: Record<string, string>;
  eventMapping?: Record<string, string>;
}

export interface ComponentLibrary {
  name: string;
  elements: ComponentLibraryElement[];
}

export const UIMetadataKey = {
  PREFERRED_FRAME_SIZE: 'preferred-frame-size',
  INITIAL_RENDER_DATA: 'initial-render-data',
} as const;

export const UI_METADATA_PREFIX = 'mcpui.dev/ui-';

export type UIResourceMetadata = {
  [UIMetadataKey.PREFERRED_FRAME_SIZE]?: [string, string];
  [UIMetadataKey.INITIAL_RENDER_DATA]?: Record<string, unknown>;
};
