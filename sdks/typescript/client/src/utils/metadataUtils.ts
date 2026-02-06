import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import { UI_METADATA_PREFIX, type UIResourceMetadata } from '../types';

export function getResourceMetadata(resource: Partial<Resource>): Record<string, unknown> {
  return resource._meta ?? {};
}

export function getUIResourceMetadata(
  resource: Partial<Resource>,
): UIResourceMetadata & Record<string, unknown> {
  const metadata = getResourceMetadata(resource);
  const uiMetadata: UIResourceMetadata & Record<string, unknown> = {};
  Object.entries(metadata).forEach(([key, value]) => {
    if (key.startsWith(UI_METADATA_PREFIX)) {
      uiMetadata[key.slice(UI_METADATA_PREFIX.length)] = value;
    }
  });
  return uiMetadata;
}
