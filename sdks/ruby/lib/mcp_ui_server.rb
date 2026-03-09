# frozen_string_literal: true

require_relative 'mcp_ui_server/version'
require 'base64'

# The McpUiServer module provides helper methods for creating UI resources
# compatible with the Model Context Protocol UI (mcp-ui) client.
module McpUiServer
  class Error < StandardError; end

  # MIME type for MCP Apps resources
  RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app'
  # Convenience aliases
  MIME_TYPE_HTML = RESOURCE_MIME_TYPE
  MIME_TYPE_URI_LIST = RESOURCE_MIME_TYPE

  # Content type constants
  CONTENT_TYPE_RAW_HTML = :raw_html
  CONTENT_TYPE_EXTERNAL_URL = :external_url

  # Protocol mapping (snake_case to camelCase for protocol consistency)
  PROTOCOL_CONTENT_TYPES = {
    raw_html: 'rawHtml',
    external_url: 'externalUrl'
  }.freeze

  # Required content keys for each content type
  REQUIRED_CONTENT_KEYS = {
    CONTENT_TYPE_RAW_HTML => :htmlString,
    CONTENT_TYPE_EXTERNAL_URL => :iframeUrl
  }.freeze

  # URI scheme constant
  UI_URI_SCHEME = 'ui://'

  # Creates a UIResource hash structure for an MCP response.
  # This structure can then be serialized to JSON by your web framework.
  #
  # @param uri [String] The unique identifier for the resource (e.g., 'ui://greeting/1').
  # @param content [Hash] A hash describing the UI content.
  #   - :type [Symbol] The type of content. One of :raw_html or :external_url.
  #   - :htmlString [String] The raw HTML content (required if type is :raw_html).
  #   - :iframeUrl [String] The URL for an external page (required if type is :external_url).
  # @param encoding [Symbol] The encoding method. :text for plain string, :blob for base64 encoded.
  #
  # @return [Hash] A UIResource hash ready to be included in an MCP response.
  #
  # @raise [McpUiServer::Error] if URI scheme is invalid, content type is unknown,
  #   encoding type is unknown, or required content keys are missing.
  def self.create_ui_resource(uri:, content:, encoding: :text)
    validate_uri_scheme(uri)

    resource = { uri: uri }

    content_value = process_content(content, resource)
    process_encoding(encoding, resource, content_value)

    {
      type: 'resource',
      resource: resource
    }
  end

  # private

  def self.validate_uri_scheme(uri)
    raise Error, "URI must start with '#{UI_URI_SCHEME}' but got: #{uri}" unless uri.start_with?(UI_URI_SCHEME)
  end
  private_class_method :validate_uri_scheme

  def self.validate_content_type(content_type)
    return if PROTOCOL_CONTENT_TYPES.key?(content_type)

    supported_types = PROTOCOL_CONTENT_TYPES.keys.join(', ')
    raise Error, "Unknown content type: #{content_type}. Supported types: #{supported_types}"
  end
  private_class_method :validate_content_type

  def self.process_content(content, resource)
    content_type = content.fetch(:type)
    validate_content_type(content_type)

    case content_type
    when CONTENT_TYPE_RAW_HTML
      process_raw_html_content(content, resource)
    when CONTENT_TYPE_EXTERNAL_URL
      process_external_url_content(content, resource)
    end
  end
  private_class_method :process_content

  def self.process_raw_html_content(content, resource)
    resource[:mimeType] = RESOURCE_MIME_TYPE
    required_key = REQUIRED_CONTENT_KEYS[CONTENT_TYPE_RAW_HTML]
    content.fetch(required_key) { raise Error, "Missing required key :#{required_key} for raw_html content" }
  end
  private_class_method :process_raw_html_content

  def self.process_external_url_content(content, resource)
    resource[:mimeType] = RESOURCE_MIME_TYPE
    required_key = REQUIRED_CONTENT_KEYS[CONTENT_TYPE_EXTERNAL_URL]
    content.fetch(required_key) { raise Error, "Missing required key :#{required_key} for external_url content" }
  end
  private_class_method :process_external_url_content

  def self.process_encoding(encoding, resource, content_value)
    case encoding
    when :text
      resource[:text] = content_value
    when :blob
      resource[:blob] = Base64.strict_encode64(content_value)
    else
      raise Error, "Unknown encoding type: #{encoding}. Supported types: :text, :blob"
    end
  end
  private_class_method :process_encoding
end
