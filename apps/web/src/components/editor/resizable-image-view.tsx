import type { NodeViewProps } from "@tiptap/react"
import { NodeViewWrapper } from "@tiptap/react"
import type { PointerEvent as ReactPointerEvent } from "react"
import { useCallback, useRef, useState } from "react"

/** Smallest width a user can shrink an image to, in px. */
const MIN_WIDTH = 80

/**
 * NodeView for the resizable image.
 *
 * Renders the image inside a sized frame with two side handles. Dragging a
 * handle previews the new width locally (smooth, no history churn) and commits
 * it to the node's `width` attribute on release, where it persists in the
 * document JSON. Height stays auto, so the aspect ratio is preserved, and the
 * frame is capped to the column width via CSS.
 */
export function ResizableImageView({
  editor,
  node,
  selected,
  updateAttributes
}: NodeViewProps) {
  const src = node.attrs.src as string
  const alt = (node.attrs.alt as string | null) ?? ""
  const title = (node.attrs.title as string | null) ?? undefined
  const width = node.attrs.width as number | null

  const frameRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  // Live width while dragging; null means "use the persisted attribute".
  const [draftWidth, setDraftWidth] = useState<number | null>(null)

  const startResize = useCallback(
    (side: "left" | "right") => (event: ReactPointerEvent) => {
      // Don't let the drag move the text cursor or start an image drag.
      event.preventDefault()
      event.stopPropagation()

      const frame = frameRef.current
      if (!frame) {
        return
      }

      const startX = event.clientX
      const startWidth = frame.offsetWidth
      const maxWidth =
        frame.parentElement?.getBoundingClientRect().width ?? startWidth
      const direction = side === "right" ? 1 : -1

      setIsResizing(true)

      const onMove = (moveEvent: PointerEvent) => {
        const delta = direction * (moveEvent.clientX - startX)
        const next = Math.round(
          Math.min(maxWidth, Math.max(MIN_WIDTH, startWidth + delta))
        )
        setDraftWidth(next)
      }

      const onUp = () => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
        setIsResizing(false)
        setDraftWidth((current) => {
          if (current != null) {
            updateAttributes({ width: current })
          }
          return null
        })
      }

      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    },
    [updateAttributes]
  )

  const appliedWidth = draftWidth ?? width
  const isEditable = editor.isEditable

  return (
    <NodeViewWrapper className="resizable-image">
      <div
        className="resizable-image__frame"
        data-resizing={isResizing || undefined}
        data-selected={selected || undefined}
        ref={frameRef}
      >
        <img
          alt={alt}
          className="resizable-image__img"
          draggable={false}
          loading="lazy"
          src={src}
          style={appliedWidth ? { width: `${appliedWidth}px` } : undefined}
          title={title}
        />

        {isEditable && (
          <>
            <span
              aria-hidden="true"
              className="resizable-image__handle resizable-image__handle--left"
              onPointerDown={startResize("left")}
            />
            <span
              aria-hidden="true"
              className="resizable-image__handle resizable-image__handle--right"
              onPointerDown={startResize("right")}
            />
            {appliedWidth ? (
              <span className="resizable-image__badge">{appliedWidth}px</span>
            ) : null}
          </>
        )}
      </div>
    </NodeViewWrapper>
  )
}
