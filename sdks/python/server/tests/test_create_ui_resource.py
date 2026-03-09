"""Tests for create_ui_resource functionality."""

import base64

import pytest
from pydantic import AnyUrl, ValidationError

from mcp_ui_server import create_ui_resource
from mcp_ui_server.exceptions import InvalidContentError, InvalidURIError


@pytest.fixture
def raw_html_text_options():
    """Fixture for raw HTML text-based options."""
    return {
        "uri": "ui://test-html",
        "content": {"type": "rawHtml", "htmlString": "<p>Test</p>"},
        "encoding": "text",
    }


@pytest.fixture
def raw_html_blob_options():
    """Fixture for raw HTML blob-based options."""
    return {
        "uri": "ui://test-html-blob",
        "content": {"type": "rawHtml", "htmlString": "<h1>Blob</h1>"},
        "encoding": "blob",
    }


@pytest.fixture
def external_url_text_options():
    """Fixture for external URL text-based options."""
    return {
        "uri": "ui://test-url",
        "content": {
            "type": "externalUrl",
            "iframeUrl": "https://example.com",
        },
        "encoding": "text",
    }


@pytest.fixture
def external_url_blob_options():
    """Fixture for external URL blob-based options."""
    return {
        "uri": "ui://test-url-blob",
        "content": {
            "type": "externalUrl",
            "iframeUrl": "https://example.com/blob",
        },
        "encoding": "blob",
    }


class TestCreateUIResource:
    """Test suite for create_ui_resource function."""

    def test_create_text_based_raw_html_resource(self, raw_html_text_options):
        """Test creating a text-based raw HTML resource."""
        resource = create_ui_resource(raw_html_text_options)
        expected = {
            "meta": None,
            "annotations": None,
            "type": "resource",
            "resource": {
                "meta": None,
                "uri": AnyUrl("ui://test-html"),
                "mimeType": "text/html",
                "text": "<p>Test</p>",
            }
        }
        assert resource.model_dump() == expected

    def test_create_blob_based_raw_html_resource(self, raw_html_blob_options):
        """Test creating a blob-based raw HTML resource."""
        resource = create_ui_resource(raw_html_blob_options)
        expected = {
            "meta": None,
            "annotations": None,
            "type": "resource",
            "resource": {
                "meta": None,
                "uri": AnyUrl("ui://test-html-blob"),
                "mimeType": "text/html",
                "blob": base64.b64encode(b"<h1>Blob</h1>").decode("ascii"),
            }
        }
        assert resource.model_dump() == expected

    def test_create_text_based_external_url_resource(self, external_url_text_options):
        """Test creating a text-based external URL resource."""
        resource = create_ui_resource(external_url_text_options)
        expected = {
            "meta": None,
            "annotations": None,
            "type": "resource",
            "resource": {
                "meta": None,
                "uri": AnyUrl("ui://test-url"),
                "mimeType": "text/uri-list",
                "text": "https://example.com",
            }
        }
        assert resource.model_dump() == expected

    def test_create_blob_based_external_url_resource(self, external_url_blob_options):
        """Test creating a blob-based external URL resource."""
        resource = create_ui_resource(external_url_blob_options)
        expected = {
            "meta": None,
            "annotations": None,
            "type": "resource",
            "resource": {
                "meta": None,
                "uri": AnyUrl("ui://test-url-blob"),
                "mimeType": "text/uri-list",
                "blob": base64.b64encode(b"https://example.com/blob").decode("ascii"),
            }
        }
        assert resource.model_dump() == expected


class TestCreateUIResourceValidationErrors:
    """Test suite for create_ui_resource validation errors."""

    def test_invalid_uri_prefix_with_raw_html(self):
        """Test error for invalid URI prefix with rawHtml."""
        options = {
            "uri": "invalid://test-html",
            "content": {"type": "rawHtml", "htmlString": "<p>Test</p>"},
            "encoding": "text",
        }
        with pytest.raises(InvalidURIError, match="URI must start with 'ui://'"):
            create_ui_resource(options)

    def test_invalid_uri_prefix_with_external_url(self):
        """Test error for invalid URI prefix with externalUrl."""
        options = {
            "uri": "invalid://test-url",
            "content": {
                "type": "externalUrl",
                "iframeUrl": "https://example.com",
            },
            "encoding": "text",
        }
        with pytest.raises(InvalidURIError, match="URI must start with 'ui://'"):
            create_ui_resource(options)

    def test_empty_html_string_error(self):
        """Test error when htmlString is empty for rawHtml."""
        options = {
            "uri": "ui://test",
            "content": {"type": "rawHtml", "htmlString": ""},
            "encoding": "text",
        }
        with pytest.raises(InvalidContentError, match="htmlString must be provided as a non-empty string"):
            create_ui_resource(options)

    def test_empty_iframe_url_error(self):
        """Test error when iframeUrl is empty for externalUrl."""
        options = {
            "uri": "ui://test",
            "content": {"type": "externalUrl", "iframeUrl": ""},
            "encoding": "text",
        }
        with pytest.raises(InvalidContentError, match="content.iframeUrl must be provided as a non-empty string"):
            create_ui_resource(options)

    def test_invalid_encoding_error(self):
        """Test error when encoding is invalid."""
        options = {
            "uri": "ui://test",
            "content": {"type": "rawHtml", "htmlString": "<p>Test</p>"},
            "encoding": "base64",
        }
        with pytest.raises(ValidationError, match="Input should be 'text' or 'blob'"):
            create_ui_resource(options)
