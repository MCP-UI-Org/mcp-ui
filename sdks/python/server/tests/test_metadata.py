"""Tests for UI metadata functionality."""

import pytest

from mcp_ui_server import create_ui_resource
from mcp_ui_server.types import UI_METADATA_PREFIX


@pytest.fixture
def basic_raw_html_options():
    """Fixture for basic raw HTML options."""
    return {
        "uri": "ui://test-html",
        "content": {"type": "rawHtml", "htmlString": "<p>Test</p>"},
        "encoding": "text",
    }


class TestUIMetadata:
    """Test suite for UI metadata functionality."""

    def test_create_resource_with_ui_metadata(self, basic_raw_html_options):
        """Test creating a resource with uiMetadata."""
        options = {
            **basic_raw_html_options,
            "uiMetadata": {
                "preferred-frame-size": [800, 600],
            }
        }
        resource = create_ui_resource(options)

        result = resource.model_dump()

        # Check that metadata is properly prefixed and included (meta field, serializes to _meta with by_alias=True)
        assert result["resource"]["meta"] is not None
        assert f"{UI_METADATA_PREFIX}preferred-frame-size" in result["resource"]["meta"]
        assert result["resource"]["meta"][f"{UI_METADATA_PREFIX}preferred-frame-size"] == [800, 600]

        # Also verify by_alias=True serialization produces _meta
        result_with_alias = resource.model_dump(by_alias=True)
        assert "_meta" in result_with_alias["resource"]
        assert result_with_alias["resource"]["_meta"][f"{UI_METADATA_PREFIX}preferred-frame-size"] == [800, 600]

    def test_create_resource_with_multiple_ui_metadata_fields(self, basic_raw_html_options):
        """Test creating a resource with multiple uiMetadata fields."""
        options = {
            **basic_raw_html_options,
            "uiMetadata": {
                "preferred-frame-size": ["800px", "600px"],
                "initial-render-data": {
                    "theme": "dark",
                    "chartType": "bar",
                }
            }
        }
        resource = create_ui_resource(options)

        result = resource.model_dump()

        # Check that all metadata fields are properly prefixed and included
        assert result["resource"]["meta"] is not None
        assert f"{UI_METADATA_PREFIX}preferred-frame-size" in result["resource"]["meta"]
        assert result["resource"]["meta"][f"{UI_METADATA_PREFIX}preferred-frame-size"] == ["800px", "600px"]
        assert f"{UI_METADATA_PREFIX}initial-render-data" in result["resource"]["meta"]
        assert result["resource"]["meta"][f"{UI_METADATA_PREFIX}initial-render-data"] == {
            "theme": "dark",
            "chartType": "bar",
        }

    def test_create_resource_with_custom_metadata(self, basic_raw_html_options):
        """Test creating a resource with custom metadata (non-UI)."""
        options = {
            **basic_raw_html_options,
            "metadata": {
                "customKey": "customValue",
                "anotherKey": 123,
            }
        }
        resource = create_ui_resource(options)

        result = resource.model_dump()

        # Check that custom metadata is included without prefix
        assert result["resource"]["meta"] is not None
        assert result["resource"]["meta"]["customKey"] == "customValue"
        assert result["resource"]["meta"]["anotherKey"] == 123

    def test_create_resource_with_both_ui_and_custom_metadata(self, basic_raw_html_options):
        """Test creating a resource with both uiMetadata and custom metadata."""
        options = {
            **basic_raw_html_options,
            "uiMetadata": {
                "preferred-frame-size": [800, 600],
            },
            "metadata": {
                "customKey": "customValue",
            }
        }
        resource = create_ui_resource(options)

        result = resource.model_dump()

        # Check that both types of metadata are included
        assert result["resource"]["meta"] is not None
        assert f"{UI_METADATA_PREFIX}preferred-frame-size" in result["resource"]["meta"]
        assert result["resource"]["meta"][f"{UI_METADATA_PREFIX}preferred-frame-size"] == [800, 600]
        assert result["resource"]["meta"]["customKey"] == "customValue"

    def test_metadata_override_behavior(self, basic_raw_html_options):
        """Test that custom metadata can override ui metadata if keys conflict."""
        options = {
            **basic_raw_html_options,
            "uiMetadata": {
                "preferred-frame-size": [800, 600],
            },
            "metadata": {
                f"{UI_METADATA_PREFIX}preferred-frame-size": [1024, 768],
            }
        }
        resource = create_ui_resource(options)

        result = resource.model_dump()

        # Custom metadata should override UI metadata
        assert result["resource"]["meta"] is not None
        assert result["resource"]["meta"][f"{UI_METADATA_PREFIX}preferred-frame-size"] == [1024, 768]

    def test_create_resource_without_metadata(self, basic_raw_html_options):
        """Test creating a resource without any metadata."""
        resource = create_ui_resource(basic_raw_html_options)

        result = resource.model_dump()

        # No metadata should be present
        assert result["resource"]["meta"] is None

    def test_metadata_with_external_url_content(self):
        """Test metadata with external URL content type."""
        options = {
            "uri": "ui://test-url",
            "content": {
                "type": "externalUrl",
                "iframeUrl": "https://example.com",
            },
            "encoding": "text",
            "uiMetadata": {
                "preferred-frame-size": ["100%", "500px"],
            }
        }
        resource = create_ui_resource(options)

        result = resource.model_dump()

        assert result["resource"]["meta"] is not None
        assert f"{UI_METADATA_PREFIX}preferred-frame-size" in result["resource"]["meta"]
        assert result["resource"]["meta"][f"{UI_METADATA_PREFIX}preferred-frame-size"] == ["100%", "500px"]

    def test_metadata_with_blob_encoding(self):
        """Test metadata with blob encoding."""
        options = {
            "uri": "ui://test-blob",
            "content": {"type": "rawHtml", "htmlString": "<h1>Blob</h1>"},
            "encoding": "blob",
            "uiMetadata": {
                "preferred-frame-size": [640, 480],
            }
        }
        resource = create_ui_resource(options)

        result = resource.model_dump()

        # Verify metadata is present with blob encoding
        assert result["resource"]["meta"] is not None
        assert f"{UI_METADATA_PREFIX}preferred-frame-size" in result["resource"]["meta"]
        assert result["resource"]["meta"][f"{UI_METADATA_PREFIX}preferred-frame-size"] == [640, 480]
        # Verify blob is also present
        assert "blob" in result["resource"]

    def test_empty_ui_metadata_dict(self, basic_raw_html_options):
        """Test creating a resource with empty uiMetadata dict."""
        options = {
            **basic_raw_html_options,
            "uiMetadata": {}
        }
        resource = create_ui_resource(options)

        result = resource.model_dump()

        # Empty metadata dict should not create meta field
        assert result["resource"]["meta"] is None

    def test_empty_custom_metadata_dict(self, basic_raw_html_options):
        """Test creating a resource with empty custom metadata dict."""
        options = {
            **basic_raw_html_options,
            "metadata": {}
        }
        resource = create_ui_resource(options)

        result = resource.model_dump()

        # Empty metadata dict should not create meta field
        assert result["resource"]["meta"] is None
