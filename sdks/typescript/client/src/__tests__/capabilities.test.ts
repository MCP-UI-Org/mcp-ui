import { describe, it, expect } from 'vitest';
import {
  type ClientCapabilitiesWithExtensions,
  UI_EXTENSION_NAME,
  UI_EXTENSION_CONFIG,
  UI_EXTENSION_CAPABILITIES,
} from '../capabilities';
import { RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/app-bridge';

describe('UI Extension Capabilities', () => {
  it('should have correct extension name', () => {
    expect(UI_EXTENSION_NAME).toBe('io.modelcontextprotocol/ui');
  });

  it('should include RESOURCE_MIME_TYPE in mimeTypes', () => {
    expect(UI_EXTENSION_CONFIG.mimeTypes).toContain(RESOURCE_MIME_TYPE);
    expect(UI_EXTENSION_CONFIG.mimeTypes).toEqual(['text/html;profile=mcp-app']);
  });

  it('should structure capabilities with extension name as key', () => {
    expect(UI_EXTENSION_CAPABILITIES[UI_EXTENSION_NAME]).toEqual(
      UI_EXTENSION_CONFIG
    );
  });

  it('should work with ClientCapabilitiesWithExtensions type', () => {
    const capabilities: ClientCapabilitiesWithExtensions = {
      roots: { listChanged: true },
      extensions: UI_EXTENSION_CAPABILITIES,
    };

    expect(capabilities.roots).toEqual({ listChanged: true });
    expect(capabilities.extensions?.[UI_EXTENSION_NAME]).toEqual(UI_EXTENSION_CONFIG);
  });

  it('should allow combining with other MCP capabilities', () => {
    const capabilities: ClientCapabilitiesWithExtensions = {
      roots: { listChanged: true },
      sampling: {},
      extensions: {
        ...UI_EXTENSION_CAPABILITIES,
        'custom/extension': { customKey: 'customValue' },
      },
    };

    expect(capabilities.roots).toEqual({ listChanged: true });
    expect(capabilities.sampling).toEqual({});
    expect(capabilities.extensions?.[UI_EXTENSION_NAME]).toEqual(UI_EXTENSION_CONFIG);
    expect(capabilities.extensions?.['custom/extension']).toEqual({ customKey: 'customValue' });
  });

  it('should allow extensions field to be optional', () => {
    const capabilities: ClientCapabilitiesWithExtensions = {
      roots: { listChanged: true },
    };

    expect(capabilities.extensions).toBeUndefined();
  });
});
