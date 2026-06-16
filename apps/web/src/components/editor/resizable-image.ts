import Image from "@tiptap/extension-image"
import { ReactNodeViewRenderer } from "@tiptap/react"

import { ResizableImageView } from "./resizable-image-view"

/**
 * Image with drag-to-resize.
 *
 * Extends `@tiptap/extension-image` with a persisted `width` attribute (px) and
 * a React NodeView that draws resize handles in the editor. The width is part of
 * the document JSON and is also emitted as a `width=""` attribute by renderHTML,
 * so static/SSR renders (share page, native static-renderer) honour it too.
 * Height is left to `auto` so the aspect ratio is preserved, and `max-width:100%`
 * (from the configured class / NodeView CSS) keeps images within the column.
 *
 * The node name stays "image", so existing content and the inherited `setImage`
 * command keep working — older image nodes simply default to `width: null`
 * (natural size, capped to the column).
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute("width") ?? element.style.width
          if (!raw) {
            return null
          }
          const parsed = Number.parseInt(raw, 10)
          return Number.isFinite(parsed) ? parsed : null
        },
        renderHTML: (attributes) =>
          attributes.width ? { width: attributes.width } : {}
      }
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  }
})
