import type { A2uiMessage } from '@a2ui/web_core/v0_9';

export const A2UI_MIME_TYPE = 'application/a2ui+json';
export const A2UI_LEGACY_MIME_TYPE = 'application/json+a2ui';
export const A2UI_MIME_TYPES: readonly string[] = [A2UI_MIME_TYPE, A2UI_LEGACY_MIME_TYPE];

interface ResourceBlockLike {
  type?: unknown;
  resource?: {
    mimeType?: unknown;
    text?: unknown;
    blob?: unknown;
  };
}

/**
 * Collects and parses every A2UI embedded resource from a tool result's
 * content blocks. Each resource may hold a single message or an array of
 * messages; text and base64 blob contents are both accepted.
 */
export function extractA2uiMessages(content: unknown): A2uiMessage[] {
  if (!Array.isArray(content)) return [];
  const messages: A2uiMessage[] = [];
  for (const block of content as ResourceBlockLike[]) {
    if (!block || block.type !== 'resource') continue;
    const resource = block.resource;
    if (!resource || !A2UI_MIME_TYPES.includes(resource.mimeType as string)) continue;

    let text: string;
    if (typeof resource.text === 'string') {
      text = resource.text;
    } else if (typeof resource.blob === 'string') {
      try {
        text = atob(resource.blob);
      } catch (err) {
        console.error('Failed to decode A2UI payload blob:', err);
        continue;
      }
    } else {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        messages.push(...((Array.isArray(parsed) ? parsed : [parsed]) as A2uiMessage[]));
      }
    } catch (err) {
      console.error('Failed to parse A2UI payload:', err);
    }
  }
  return messages;
}
