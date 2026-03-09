"""Core functionality for MCP UI Server SDK."""

import base64
from typing import Any

from mcp.types import BlobResourceContents, EmbeddedResource, TextResourceContents
from pydantic import AnyUrl

from .exceptions import InvalidContentError, InvalidURIError
from .types import (
    UI_METADATA_PREFIX,
    CreateUIResourceOptions,
    ExternalUrlPayload,
    MimeType,
    RawHtmlPayload,
    UIActionResultIntent,
    UIActionResultLink,
    UIActionResultNotification,
    UIActionResultPrompt,
    UIActionResultToolCall,
)


class UIResource(EmbeddedResource):
    """Represents a UI resource that can be included in tool results."""

    def __init__(self, resource: TextResourceContents | BlobResourceContents, **kwargs: Any):
        # Initialize with resource content
        super().__init__(
            type="resource",
            resource=resource,
            **kwargs
        )


def _get_additional_resource_props(options: CreateUIResourceOptions) -> dict[str, Any]:
    """Get additional resource properties including metadata.

    Prefixes UI-specific metadata with the UI metadata prefix to be recognized by the client.

    Args:
        options: The UI resource options

    Returns:
        Dictionary of additional properties to merge into the resource
    """
    additional_props: dict[str, Any] = {}

    # Prefix ui specific metadata with the prefix to be recognized by the client
    if options.uiMetadata or options.metadata:
        ui_prefixed_metadata: dict[str, Any] = {}

        if options.uiMetadata:
            for key, value in options.uiMetadata.items():
                ui_prefixed_metadata[f"{UI_METADATA_PREFIX}{key}"] = value

        # Allow user defined metadata to override ui metadata
        _meta: dict[str, Any] = {
            **ui_prefixed_metadata,
            **(options.metadata or {}),
        }

        if _meta:
            additional_props["_meta"] = _meta

    return additional_props


def create_ui_resource(options_dict: dict[str, Any]) -> UIResource:
    """Create a UIResource.

    This is the object that should be included in the 'content' array of a toolResult.

    Args:
        options_dict: Configuration dictionary for the interactive resource. Keys:
            - uri (str): Resource identifier starting with 'ui://'
            - content (dict): Content payload (type: rawHtml or externalUrl)
            - encoding (str): 'text' or 'blob'
            - uiMetadata (dict, optional): UI metadata. Use UIMetadataKey constants:
                * UIMetadataKey.PREFERRED_FRAME_SIZE: list[str, str] - CSS dimensions like ["800px", "600px"]
                * UIMetadataKey.INITIAL_RENDER_DATA: dict - Initial data for the UI
            - metadata (dict, optional): Custom metadata (not prefixed)

    Returns:
        A UIResource instance ready to be included in tool results

    Raises:
        InvalidURIError: If the URI doesn't start with 'ui://'
        InvalidContentError: If content validation fails
        MCPUIServerError: For other errors

    Example:
        >>> from mcp_ui_server import create_ui_resource, UIMetadataKey
        >>> resource = create_ui_resource({
        ...     "uri": "ui://my-widget",
        ...     "content": {"type": "rawHtml", "htmlString": "<h1>Hello</h1>"},
        ...     "encoding": "text",
        ...     "uiMetadata": {
        ...         UIMetadataKey.PREFERRED_FRAME_SIZE: ["800px", "600px"]
        ...     }
        ... })
    """
    options = CreateUIResourceOptions.model_validate(options_dict)
    # Validate URI
    if not options.uri.startswith("ui://"):
        raise InvalidURIError(f"URI must start with 'ui://' but got: {options.uri}")

    content = options.content
    content_type = content.type

    # Determine content string and MIME type based on content type
    if content_type == "rawHtml":
        if not isinstance(content, RawHtmlPayload):
            raise InvalidContentError("Content must be RawHtmlPayload when type is 'rawHtml'")
        htmlString = content.htmlString
        if not htmlString:
            raise InvalidContentError(
                "htmlString must be provided as a non-empty string when content.type is 'rawHtml'"
            )
        actual_content_string = htmlString
        mime_type: MimeType = "text/html"

    elif content_type == "externalUrl":
        if not isinstance(content, ExternalUrlPayload):
            raise InvalidContentError("Content must be ExternalUrlPayload when type is 'externalUrl'")
        iframe_url = content.iframeUrl
        if not iframe_url:
            raise InvalidContentError(
                "content.iframeUrl must be provided as a non-empty string when content.type is 'externalUrl'"
            )
        actual_content_string = iframe_url
        mime_type = "text/uri-list"

    else:
        # This should be prevented by TypeScript/mypy, but handle gracefully
        raise InvalidContentError(f"Invalid content.type specified: {content_type}")

    # Create resource based on encoding type
    encoding = options.encoding

    # Get additional properties including metadata
    additional_props = _get_additional_resource_props(options)

    if encoding == "text":
        resource: TextResourceContents | BlobResourceContents = TextResourceContents(
            uri=AnyUrl(options.uri),
            mimeType=mime_type,
            text=actual_content_string,
            **additional_props,
        )
    elif encoding == "blob":
        resource = BlobResourceContents(
            uri=AnyUrl(options.uri),
            mimeType=mime_type,
            blob=base64.b64encode(actual_content_string.encode('utf-8')).decode('ascii'),
            **additional_props,
        )
    else:
        raise InvalidContentError(f"Invalid encoding type: {encoding}")

    return UIResource(resource=resource)



# UI Action Result Helper Functions

def ui_action_result_tool_call(
    tool_name: str, params: dict[str, Any]
) -> UIActionResultToolCall:
    """Create a tool call UI action result.

    Args:
        tool_name: Name of the tool to call
        params: Parameters for the tool call

    Returns:
        UIActionResultToolCall instance
    """
    return UIActionResultToolCall(
        type="tool",
        payload=UIActionResultToolCall.ToolCallPayload(
            toolName=tool_name,
            params=params,
        ),
    )


def ui_action_result_prompt(prompt: str) -> UIActionResultPrompt:
    """Create a prompt UI action result.

    Args:
        prompt: The prompt message

    Returns:
        UIActionResultPrompt instance
    """
    return UIActionResultPrompt(
        type="prompt",
        payload=UIActionResultPrompt.PromptPayload(
            prompt=prompt,
        ),
    )


def ui_action_result_link(url: str) -> UIActionResultLink:
    """Create a link UI action result.

    Args:
        url: The URL to link to

    Returns:
        UIActionResultLink instance
    """
    return UIActionResultLink(
        type="link",
        payload=UIActionResultLink.LinkPayload(
            url=url,
        ),
    )


def ui_action_result_intent(
    intent: str, params: dict[str, Any]
) -> UIActionResultIntent:
    """Create an intent UI action result.

    Args:
        intent: The intent identifier
        params: Parameters for the intent

    Returns:
        UIActionResultIntent instance
    """
    return UIActionResultIntent(
        type="intent",
        payload=UIActionResultIntent.IntentPayload(
            intent=intent,
            params=params,
        ),
    )


def ui_action_result_notification(message: str) -> UIActionResultNotification:
    """Create a notification UI action result.

    Args:
        message: The notification message

    Returns:
        UIActionResultNotification instance
    """
    return UIActionResultNotification(
        type="notify",
        payload=UIActionResultNotification.NotificationPayload(
            message=message,
        ),
    )
