import { describe, it, expect } from 'vitest';
import { createUIResource } from '../../index';
import { wrapHtmlWithAdapters, getAdapterMimeType } from '../../utils';

describe('Adapter Integration', () => {
  describe('Apps SDK Adapter', () => {
    describe('createUIResource with adapters', () => {
      it('should create UI resource without adapter by default', () => {
        const resource = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'rawHtml',
            htmlString: '<div>Test</div>',
          },
          encoding: 'text',
        });

        expect(resource.resource.text).toBe('<div>Test</div>');
        expect(resource.resource.text).not.toContain('MCPUIAppsSdkAdapter');
      });

      it('should wrap HTML with Apps SDK adapter when enabled', () => {
        const resource = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'rawHtml',
            htmlString: '<div>Test</div>',
          },
          encoding: 'text',
          adapters: {
            appsSdk: {
              enabled: true,
            },
          },
        });

        expect(resource.resource.text).toContain('<script>');
        expect(resource.resource.text).toContain('</script>');
        expect(resource.resource.text).toContain('<div>Test</div>');
      });

      it('should pass adapter config to the wrapper', () => {
        const resource = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'rawHtml',
            htmlString: '<div>Test</div>',
          },
          encoding: 'text',
          adapters: {
            appsSdk: {
              enabled: true,
              config: {
                timeout: 5000,
                intentHandling: 'ignore',
                hostOrigin: 'https://custom.com',
              },
            },
          },
        });

        const html = resource.resource.text as string;
        expect(html).toContain('5000');
        expect(html).toContain('ignore');
        expect(html).toContain('https://custom.com');
      });

      it('should not wrap when adapter is disabled', () => {
        const resource = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'rawHtml',
            htmlString: '<div>Test</div>',
          },
          encoding: 'text',
          adapters: {
            appsSdk: {
              enabled: false,
            },
          },
        });

        expect(resource.resource.text).toBe('<div>Test</div>');
      });

      it('should work with HTML containing head tag', () => {
        const resource = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'rawHtml',
            htmlString: '<html><head><title>Test</title></head><body>Content</body></html>',
          },
          encoding: 'text',
          adapters: {
            appsSdk: {
              enabled: true,
            },
          },
        });

        const html = resource.resource.text as string;
        expect(html).toContain('<head>');
        expect(html).toContain('<script>');
        // Script should be injected after <head> tag
        const headIndex = html.indexOf('<head>');
        const scriptIndex = html.indexOf('<script>');
        expect(scriptIndex).toBeGreaterThan(headIndex);
      });

      it('should work with HTML without head tag', () => {
        const resource = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'rawHtml',
            htmlString: '<div>Simple content</div>',
          },
          encoding: 'text',
          adapters: {
            appsSdk: {
              enabled: true,
            },
          },
        });

        const html = resource.resource.text as string;
        expect(html).toContain('<script>');
        expect(html).toContain('<div>Simple content</div>');
      });

      it('should not affect external URL resources', () => {
        const resource = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'externalUrl',
            iframeUrl: 'https://example.com',
          },
          encoding: 'text',
          adapters: {
            appsSdk: {
              enabled: true,
            },
          },
        });

        // External URLs should not be wrapped, even with adapters enabled
        expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
        expect(resource.resource.text).toBe('https://example.com');
        expect(resource.resource.text).not.toContain('<script>');
      });

      it('should not affect external URL resources when adapter is disabled', () => {
        const resource = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'externalUrl',
            iframeUrl: 'https://example.com',
          },
          encoding: 'text',
          // No adapters
        });

        // External URLs without adapters should remain as-is (synchronous)
        expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
        expect(resource.resource.text).toBe('https://example.com');
        expect(resource.resource.text).not.toContain('<script>');
      });

    });

    describe('wrapHtmlWithAdapters', () => {
      it('should return original HTML when no adapters provided', () => {
        const html = '<div>Test</div>';
        const result = wrapHtmlWithAdapters(html);
        expect(result).toBe(html);
      });

      it('should return original HTML when adapters config is empty', () => {
        const html = '<div>Test</div>';
        const result = wrapHtmlWithAdapters(html, {});
        expect(result).toBe(html);
      });

      it('should wrap HTML with Apps SDK adapter', () => {
        const html = '<div>Test</div>';
        const result = wrapHtmlWithAdapters(html, {
          appsSdk: {
            enabled: true,
          },
        });

        expect(result).toContain('<script>');
        expect(result).toContain('</script>');
        expect(result).toContain(html);
      });

      it('should inject script in head tag if present', () => {
        const html = '<html><head></head><body><div>Test</div></body></html>';
        const result = wrapHtmlWithAdapters(html, {
          appsSdk: {
            enabled: true,
          },
        });

        const headIndex = result.indexOf('<head>');
        const scriptIndex = result.indexOf('<script>');
        expect(scriptIndex).toBeGreaterThan(headIndex);
        expect(scriptIndex).toBeLessThan(result.indexOf('</head>'));
      });

      it('should create head tag if html tag present but no head', () => {
        const html = '<html><body><div>Test</div></body></html>';
        const result = wrapHtmlWithAdapters(html, {
          appsSdk: {
            enabled: true,
          },
        });

        expect(result).toContain('<head>');
        expect(result).toContain('<script>');
      });

      it('should prepend script if no html structure', () => {
        const html = '<div>Test</div>';
        const result = wrapHtmlWithAdapters(html, {
          appsSdk: {
            enabled: true,
          },
        });

        expect(result.indexOf('<script>')).toBe(0);
      });

      it('should handle multiple adapter configurations', () => {
        const html = '<div>Test</div>';

        // Even though we only have appsSdk now, test that the structure supports multiple
        const result = wrapHtmlWithAdapters(html, {
          appsSdk: {
            enabled: true,
            config: {
              timeout: 5000,
            },
          },
          // Future adapters would go here
        });

        expect(result).toContain('<script>');
        expect(result).toContain('5000');
      });

      it('should pass config to adapter script', () => {
        const html = '<div>Test</div>';
        const result = wrapHtmlWithAdapters(html, {
          appsSdk: {
            enabled: true,
            config: {
              timeout: 10000,
              intentHandling: 'ignore',
              hostOrigin: 'https://test.com',
            },
          },
        });

        expect(result).toContain('10000');
        expect(result).toContain('ignore');
        expect(result).toContain('https://test.com');
      });
    });

    describe('getAdapterMimeType', () => {
      it('should return undefined when no adapters provided', () => {
        const result = getAdapterMimeType();
        expect(result).toBeUndefined();
      });

      it('should return undefined when adapters config is empty', () => {
        const result = getAdapterMimeType({});
        expect(result).toBeUndefined();
      });

      it('should return default mime type for Apps SDK adapter', () => {
        const result = getAdapterMimeType({
          appsSdk: {
            enabled: true,
          },
        });

        expect(result).toBe('text/html+skybridge');
      });

      it('should return custom mime type when provided', () => {
        const result = getAdapterMimeType({
          appsSdk: {
            enabled: true,
            mimeType: 'text/html+custom',
          },
        });

        expect(result).toBe('text/html+custom');
      });
    });

    describe('Type Safety', () => {
      it('should enforce valid adapter configuration', () => {
        // This test verifies TypeScript compilation
        const validConfig = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'rawHtml',
            htmlString: '<div>Test</div>',
          },
          encoding: 'text',
          adapters: {
            appsSdk: {
              enabled: true,
              config: {
                timeout: 5000,
                intentHandling: 'prompt',
                hostOrigin: 'https://example.com',
              },
            },
          },
        });

        expect(validConfig).toBeDefined();
      });

      it('should handle optional adapter config', () => {
        const minimalConfig = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'rawHtml',
            htmlString: '<div>Test</div>',
          },
          encoding: 'text',
          adapters: {
            appsSdk: {
              enabled: true,
              // config is optional
            },
          },
        });

        expect(minimalConfig).toBeDefined();
      });
    });
  });

  describe('MCP Apps Adapter', () => {
    describe('createUIResource with MCP Apps adapter', () => {
      it('should wrap HTML with MCP Apps adapter when enabled', () => {
        const resource = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'rawHtml',
            htmlString: '<div>Test</div>',
          },
          encoding: 'text',
          adapters: {
            mcpApps: {
              enabled: true,
            },
          },
        });

        expect(resource.resource.text).toContain('<script>');
        expect(resource.resource.text).toContain('</script>');
        expect(resource.resource.text).toContain('<div>Test</div>');
        expect(resource.resource.text).toContain('McpAppsAdapter');
      });

      it('should pass adapter config to the wrapper', () => {
        const resource = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'rawHtml',
            htmlString: '<div>Test</div>',
          },
          encoding: 'text',
          adapters: {
            mcpApps: {
              enabled: true,
              config: {
                timeout: 5000,
              },
            },
          },
        });

        const html = resource.resource.text as string;
        expect(html).toContain('5000');
      });

      it('should not wrap when adapter is disabled', () => {
        const resource = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'rawHtml',
            htmlString: '<div>Test</div>',
          },
          encoding: 'text',
          adapters: {
            mcpApps: {
              enabled: false,
            },
          },
        });

        expect(resource.resource.text).toBe('<div>Test</div>');
      });

      it('should not affect external URL resources', () => {
        const resource = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'externalUrl',
            iframeUrl: 'https://example.com',
          },
          encoding: 'text',
          adapters: {
            mcpApps: {
              enabled: true,
            },
          },
        });

        // External URLs should not be wrapped, even with adapters enabled
        expect(resource.resource.mimeType).toBe('text/html;profile=mcp-app');
        expect(resource.resource.text).toBe('https://example.com');
        expect(resource.resource.text).not.toContain('<script>');
      });
    });

    describe('wrapHtmlWithAdapters with MCP Apps', () => {
      it('should wrap HTML with MCP Apps adapter', () => {
        const html = '<div>Test</div>';
        const result = wrapHtmlWithAdapters(html, {
          mcpApps: {
            enabled: true,
          },
        });

        expect(result).toContain('<script>');
        expect(result).toContain('</script>');
        expect(result).toContain(html);
        expect(result).toContain('McpAppsAdapter');
      });

      it('should pass config to MCP Apps adapter script', () => {
        const html = '<div>Test</div>';
        const result = wrapHtmlWithAdapters(html, {
          mcpApps: {
            enabled: true,
            config: {
              timeout: 10000,
            },
          },
        });

        expect(result).toContain('10000');
      });
    });

    describe('getAdapterMimeType with MCP Apps', () => {
      it('should return text/html;profile=mcp-app for MCP Apps adapter', () => {
        const result = getAdapterMimeType({
          mcpApps: {
            enabled: true,
          },
        });

        expect(result).toBe('text/html;profile=mcp-app');
      });
    });

    describe('Type Safety', () => {
      it('should enforce valid MCP Apps adapter configuration', () => {
        const validConfig = createUIResource({
          uri: 'ui://test',
          content: {
            type: 'rawHtml',
            htmlString: '<div>Test</div>',
          },
          encoding: 'text',
          adapters: {
            mcpApps: {
              enabled: true,
              config: {
                timeout: 5000,
              },
            },
          },
        });

        expect(validConfig).toBeDefined();
      });
    });
  });

  describe('Adapter Mutual Exclusivity', () => {
    it('should not allow both adapters to be enabled (TypeScript enforced)', () => {
      // This test documents the expected behavior - TypeScript should prevent this
      // The AdaptersConfig type is a discriminated union that prevents both adapters

      // Valid: only appsSdk
      const appsSdkOnly = createUIResource({
        uri: 'ui://test',
        content: { type: 'rawHtml', htmlString: '<div>Test</div>' },
        encoding: 'text',
        adapters: { appsSdk: { enabled: true } },
      });
      expect(appsSdkOnly).toBeDefined();

      // Valid: only mcpApps
      const mcpAppsOnly = createUIResource({
        uri: 'ui://test',
        content: { type: 'rawHtml', htmlString: '<div>Test</div>' },
        encoding: 'text',
        adapters: { mcpApps: { enabled: true } },
      });
      expect(mcpAppsOnly).toBeDefined();

      // Valid: neither
      const neitherAdapter = createUIResource({
        uri: 'ui://test',
        content: { type: 'rawHtml', htmlString: '<div>Test</div>' },
        encoding: 'text',
        adapters: {},
      });
      expect(neitherAdapter).toBeDefined();
    });

    it('should return correct MIME type based on which adapter is enabled', () => {
      // Apps SDK adapter
      expect(getAdapterMimeType({ appsSdk: { enabled: true } })).toBe('text/html+skybridge');

      // MCP Apps adapter
      expect(getAdapterMimeType({ mcpApps: { enabled: true } })).toBe('text/html;profile=mcp-app');

      // No adapter
      expect(getAdapterMimeType({})).toBeUndefined();
    });
  });
});
