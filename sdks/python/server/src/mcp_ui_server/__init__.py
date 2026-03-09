"""MCP UI Server SDK for Python.

This package provides server-side functionality for creating MCP UI resources.
"""

from .core import (
    UIResource,
    create_ui_resource,
    ui_action_result_intent,
    ui_action_result_link,
    ui_action_result_notification,
    ui_action_result_prompt,
    ui_action_result_tool_call,
)
from .types import (
    URI,
    CreateUIResourceOptions,
    MimeType,
    RESOURCE_MIME_TYPE,
    ResourceContentPayload,
    UIActionResult,
    UIActionResultIntent,
    UIActionResultLink,
    UIActionResultNotification,
    UIActionResultPrompt,
    UIActionResultToolCall,
    UIActionType,
    UIMetadataKey,
)

__version__ = "5.2.0"

__all__ = [
    "URI",
    "MimeType",
    "RESOURCE_MIME_TYPE",
    "ResourceContentPayload",
    "CreateUIResourceOptions",
    "UIActionType",
    "UIActionResult",
    "UIActionResultToolCall",
    "UIActionResultPrompt",
    "UIActionResultLink",
    "UIActionResultIntent",
    "UIActionResultNotification",
    "UIMetadataKey",
    "UIResource",
    "create_ui_resource",
    "ui_action_result_tool_call",
    "ui_action_result_prompt",
    "ui_action_result_link",
    "ui_action_result_intent",
    "ui_action_result_notification",
]