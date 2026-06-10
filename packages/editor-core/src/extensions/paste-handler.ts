import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"

/**
 * Paste handling strategy
 */
export type PasteStrategy = "preserve" | "plain"

/**
 * Paste handler extension options
 */
export interface PasteHandlerOptions {
  /**
   * Paste strategy
   * - 'preserve': Keep rich text structure (default)
   * - 'plain': Convert to plain text
   */
  strategy: PasteStrategy
}

/**
 * Check if text is a URL
 */
function isUrl(text: string): boolean {
  try {
    const url = new URL(text.trim())
    return ["http:", "https:"].includes(url.protocol)
  } catch {
    return false
  }
}

/**
 * Custom paste handler extension
 *
 * Features:
 * 1. Auto-convert pasted URLs to clickable links
 * 2. Support preserve or plain text paste strategy
 */
export const PasteHandler = Extension.create<PasteHandlerOptions>({
  name: "pasteHandler",

  addOptions() {
    return {
      strategy: "preserve" as PasteStrategy
    }
  },

  addProseMirrorPlugins() {
    const { strategy } = this.options
    const { editor } = this

    return [
      new Plugin({
        key: new PluginKey("pasteHandler"),
        props: {
          handlePaste: (_view, event, _slice) => {
            const { clipboardData } = event
            if (!clipboardData) {
              return false
            }

            // Let image files pass through to the imageUpload plugin
            const hasImageFile = [...clipboardData.files].some((f) =>
              f.type.startsWith("image/")
            )
            if (hasImageFile) {
              return false
            }

            const plainText = clipboardData.getData("text/plain")
            const htmlText = clipboardData.getData("text/html")

            // If pasting a pure URL, convert to link
            if (plainText && isUrl(plainText) && !htmlText) {
              event.preventDefault()
              const url = plainText.trim()

              // Get current selection
              const { from, to } = editor.state.selection
              const hasSelection = from !== to

              if (hasSelection) {
                // If text is selected, convert selection to link
                editor.chain().focus().setLink({ href: url }).run()
              } else {
                // If no selection, insert URL as link text
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "text",
                    text: url,
                    marks: [
                      {
                        type: "link",
                        attrs: { href: url, target: "_blank" }
                      }
                    ]
                  })
                  .run()
              }

              return true
            }

            // If strategy is plain, convert rich text to plain text
            if (strategy === "plain" && htmlText && plainText) {
              event.preventDefault()
              editor.chain().focus().insertContent(plainText).run()
              return true
            }

            // Default behavior: preserve rich text structure
            return false
          }
        }
      })
    ]
  }
})
