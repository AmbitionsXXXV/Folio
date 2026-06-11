/**
 * Rich Text Components
 *
 * RichTextEditor embeds the Tiptap editor in a WebView via Expo DOM Components.
 * RichTextViewer renders ProseMirror JSON natively (no WebView) via Tiptap's
 * static renderer.
 */

export { default as RichTextEditor } from "./rich-text-editor"
export { default as RichTextViewer } from "./rich-text-viewer"
