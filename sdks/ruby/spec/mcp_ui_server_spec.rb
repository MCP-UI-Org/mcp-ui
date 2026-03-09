# frozen_string_literal: true

require 'mcp_ui_server'
require 'base64'

RSpec.describe McpUiServer do
  it 'has a version number' do
    expect(McpUiServer::VERSION).not_to be_nil
  end

  describe '.create_ui_resource' do
    let(:uri) { 'ui://test/1' }

    context 'with raw_html content' do
      let(:content) { { type: :raw_html, htmlString: '<h1>Hello</h1>' } }

      it 'creates a resource with text/html mimetype and text encoding' do
        resource = described_class.create_ui_resource(uri: uri, content: content)
        expect(resource[:type]).to eq('resource')
        expect(resource[:resource][:uri]).to eq(uri)
        expect(resource[:resource][:mimeType]).to eq('text/html')
        expect(resource[:resource][:text]).to eq('<h1>Hello</h1>')
      end

      it 'creates a resource with blob encoding' do
        resource = described_class.create_ui_resource(uri: uri, content: content, encoding: :blob)
        expect(resource[:resource][:blob]).to eq(Base64.strict_encode64('<h1>Hello</h1>'))
      end
    end

    context 'with external_url content' do
      let(:content) { { type: :external_url, iframeUrl: 'https://example.com' } }

      it 'creates a resource with text/uri-list mimetype' do
        resource = described_class.create_ui_resource(uri: uri, content: content)
        expect(resource[:resource][:mimeType]).to eq('text/uri-list')
        expect(resource[:resource][:text]).to eq('https://example.com')
      end

      it 'creates a resource with blob encoding' do
        resource = described_class.create_ui_resource(uri: uri, content: content, encoding: :blob)
        expect(resource[:resource][:blob]).to eq(Base64.strict_encode64('https://example.com'))
      end
    end

    context 'with invalid input' do
      it 'raises McpUiServer::Error for invalid URI scheme' do
        invalid_uri = 'http://test/1'
        content = { type: :raw_html, htmlString: '<h1>Hello</h1>' }
        expect do
          described_class.create_ui_resource(uri: invalid_uri, content: content)
        end.to raise_error(McpUiServer::Error, "URI must start with 'ui://' but got: #{invalid_uri}")
      end

      it 'raises McpUiServer::Error for unknown content type' do
        content = { type: :invalid, data: 'foo' }
        expect do
          described_class.create_ui_resource(uri: uri, content: content)
        end.to raise_error(McpUiServer::Error, /Unknown content type: invalid/)
      end

      it 'raises McpUiServer::Error for camelCase string content type' do
        content = { type: 'rawHtml', htmlString: '<h1>Hello</h1>' }
        expect do
          described_class.create_ui_resource(uri: uri, content: content)
        end.to raise_error(McpUiServer::Error, /Unknown content type: rawHtml/)
      end

      it 'raises McpUiServer::Error for unknown encoding type' do
        content = { type: :raw_html, htmlString: '<h1>Hello</h1>' }
        expect do
          described_class.create_ui_resource(uri: uri, content: content, encoding: :invalid)
        end.to raise_error(McpUiServer::Error, /Unknown encoding type: invalid/)
      end

      it 'raises McpUiServer::Error if htmlString is missing' do
        content = { type: :raw_html }
        expect do
          described_class.create_ui_resource(uri: uri, content: content)
        end.to raise_error(McpUiServer::Error, /Missing required key :htmlString for raw_html content/)
      end

      it 'raises McpUiServer::Error if iframeUrl is missing' do
        content = { type: :external_url }
        expect do
          described_class.create_ui_resource(uri: uri, content: content)
        end.to raise_error(McpUiServer::Error, /Missing required key :iframeUrl for external_url content/)
      end
    end

    context 'with constants' do
      it 'defines expected MIME type constants' do
        expect(McpUiServer::MIME_TYPE_HTML).to eq('text/html')
        expect(McpUiServer::MIME_TYPE_URI_LIST).to eq('text/uri-list')
      end

      it 'defines expected content type constants' do
        expect(McpUiServer::CONTENT_TYPE_RAW_HTML).to eq(:raw_html)
        expect(McpUiServer::CONTENT_TYPE_EXTERNAL_URL).to eq(:external_url)
      end

      it 'defines protocol content type mapping' do
        expect(McpUiServer::PROTOCOL_CONTENT_TYPES).to include(
          raw_html: 'rawHtml',
          external_url: 'externalUrl'
        )
      end

      it 'defines URI scheme constant' do
        expect(McpUiServer::UI_URI_SCHEME).to eq('ui://')
      end
    end
  end
end
