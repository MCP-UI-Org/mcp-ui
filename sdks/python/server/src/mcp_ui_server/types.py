"""Type definitions for MCP UI Server SDK."""

from typing import Any, Literal

from pydantic import BaseModel

# Primary identifier for the resource. Starts with ui://
URI = str  # In TypeScript: `ui://${string}`, but Python doesn't have template literal types

# MIME types for different content types
MimeType = Literal[
    "text/html",
    "text/uri-list",
]

UIActionType = Literal["tool", "prompt", "link", "intent", "notify"]


class RawHtmlPayload(BaseModel):
    """Raw HTML content payload."""
    type: Literal["rawHtml"]
    htmlString: str


class ExternalUrlPayload(BaseModel):
    """External URL content payload."""
    type: Literal["externalUrl"]
    iframeUrl: str


ResourceContentPayload = RawHtmlPayload | ExternalUrlPayload


# UI Metadata constants
UI_METADATA_PREFIX = "mcpui.dev/ui-"


class UIMetadataKey:
    """Keys for UI metadata with their expected value types.

    These constants should be used as keys in the uiMetadata dictionary to avoid typos
    and improve code maintainability.

    Attributes:
        PREFERRED_FRAME_SIZE: Key for specifying preferred iframe dimensions.
            - Expected value type: list[str, str] or tuple[str, str]
            - Format: [width, height] as CSS dimension strings
            - Examples:
                * ["800px", "600px"] - Fixed pixel dimensions
                * ["100%", "50vh"] - Responsive with percentage and viewport height
                * ["50rem", "80%"] - Relative and percentage units
            - Important: Must be strings with CSS units (px, %, vh, vw, rem, em, etc.)
            - Applied directly to iframe's CSS width and height properties

        INITIAL_RENDER_DATA: Key for passing initial data to the UI component.
            - Expected value type: dict[str, Any]
            - Format: Any JSON-serializable dictionary
            - Examples:
                * {"user": {"id": "123", "name": "John"}}
                * {"config": {"theme": "dark", "language": "en"}}
            - Data is passed to the iframe on initial render

    Example usage:
        ```python
        from mcp_ui_server import create_ui_resource, UIMetadataKey

        ui_resource = create_ui_resource({
            "uri": "ui://my-component",
            "content": {"type": "rawHtml", "htmlString": "<h1>Hello</h1>"},
            "encoding": "text",
            "uiMetadata": {
                UIMetadataKey.PREFERRED_FRAME_SIZE: ["800px", "600px"],
                UIMetadataKey.INITIAL_RENDER_DATA: {"user": {"id": "123"}}
            }
        })
        ```
    """
    PREFERRED_FRAME_SIZE = "preferred-frame-size"
    INITIAL_RENDER_DATA = "initial-render-data"


class CreateUIResourceOptions(BaseModel):
    """Options for creating a UI resource.

    Attributes:
        uri: The resource identifier. Must start with 'ui://'
        content: The resource content payload (rawHtml or externalUrl)
        encoding: Whether to encode as 'text' or 'blob' (base64)
        uiMetadata: UI-specific metadata that will be prefixed with 'mcpui.dev/ui-'
            Use UIMetadataKey constants for type-safe keys:
            - UIMetadataKey.PREFERRED_FRAME_SIZE: list[str, str] - CSS dimensions
            - UIMetadataKey.INITIAL_RENDER_DATA: dict[str, Any] - Initial data
        metadata: Custom metadata (not prefixed). Merged with prefixed uiMetadata.
            Example: {"custom.author": "Server Name", "custom.version": "1.0.0"}
    """
    uri: URI
    content: ResourceContentPayload
    encoding: Literal["text", "blob"]
    uiMetadata: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None


class GenericActionMessage(BaseModel):
    """Base message structure for UI actions."""
    messageId: str | None = None


class UIActionResultToolCall(GenericActionMessage):
    """Tool call action result."""

    class ToolCallPayload(BaseModel):
        """Payload for tool call actions."""
        toolName: str

        params: dict[str, Any]

    type: Literal["tool"]
    payload: ToolCallPayload


class UIActionResultPrompt(GenericActionMessage):
    """Prompt action result."""

    class PromptPayload(BaseModel):
        """Payload for prompt actions."""
        prompt: str

    type: Literal["prompt"]
    payload: PromptPayload


class UIActionResultLink(GenericActionMessage):
    """Link action result."""

    class LinkPayload(BaseModel):
        """Payload for link actions."""
        url: str

    type: Literal["link"]
    payload: LinkPayload


class UIActionResultIntent(GenericActionMessage):
    """Intent action result."""

    class IntentPayload(BaseModel):
        """Payload for intent actions."""
        intent: str
        params: dict[str, Any]

    type: Literal["intent"]
    payload: IntentPayload


class UIActionResultNotification(GenericActionMessage):
    """Notification action result."""

    class NotificationPayload(BaseModel):
        """Payload for notification actions."""
        message: str

    type: Literal["notify"]
    payload: NotificationPayload


UIActionResult = (
    UIActionResultToolCall
    | UIActionResultPrompt
    | UIActionResultLink
    | UIActionResultIntent
    | UIActionResultNotification
)
