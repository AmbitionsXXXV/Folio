import type { useEditor } from "@tiptap/react"
import { useCallback } from "react"

/**
 * Provide memoized editor command functions for toolbar controls.
 *
 * Note: We use type assertions for editor commands because the base Editor type
 * doesn't include extension-specific commands (like toggleBold from StarterKit).
 * These commands are dynamically added by extensions at runtime.
 *
 * @param editor - The TipTap editor instance returned from `useEditor`.
 * @returns An object containing command functions for formatting.
 */
export function useEditorCommands(editor: ReturnType<typeof useEditor>) {
  const toggleBold = useCallback(() => {
    // biome-ignore lint/suspicious/noExplicitAny: extension commands are dynamically typed
    ;(editor?.chain().focus() as any).toggleBold().run()
  }, [editor])

  const toggleItalic = useCallback(() => {
    // biome-ignore lint/suspicious/noExplicitAny: extension commands are dynamically typed
    ;(editor?.chain().focus() as any).toggleItalic().run()
  }, [editor])

  const toggleHeading = useCallback(
    (level: 1 | 2 | 3) => {
      // biome-ignore lint/suspicious/noExplicitAny: extension commands are dynamically typed
      ;(editor?.chain().focus() as any).toggleHeading({ level }).run()
    },
    [editor]
  )

  const toggleBulletList = useCallback(() => {
    // biome-ignore lint/suspicious/noExplicitAny: extension commands are dynamically typed
    ;(editor?.chain().focus() as any).toggleBulletList().run()
  }, [editor])

  const toggleOrderedList = useCallback(() => {
    // biome-ignore lint/suspicious/noExplicitAny: extension commands are dynamically typed
    ;(editor?.chain().focus() as any).toggleOrderedList().run()
  }, [editor])

  const toggleBlockquote = useCallback(() => {
    // biome-ignore lint/suspicious/noExplicitAny: extension commands are dynamically typed
    ;(editor?.chain().focus() as any).toggleBlockquote().run()
  }, [editor])

  const toggleCode = useCallback(() => {
    // biome-ignore lint/suspicious/noExplicitAny: extension commands are dynamically typed
    ;(editor?.chain().focus() as any).toggleCode().run()
  }, [editor])

  const toggleCodeBlock = useCallback(() => {
    // biome-ignore lint/suspicious/noExplicitAny: extension commands are dynamically typed
    ;(editor?.chain().focus() as any).toggleCodeBlock().run()
  }, [editor])

  const setLink = useCallback(
    (href: string) => {
      // biome-ignore lint/suspicious/noExplicitAny: extension commands are dynamically typed
      ;(editor?.chain().focus() as any).setLink({ href }).run()
    },
    [editor]
  )

  const unsetLink = useCallback(() => {
    // biome-ignore lint/suspicious/noExplicitAny: extension commands are dynamically typed
    ;(editor?.chain().focus() as any).unsetLink().run()
  }, [editor])

  return {
    toggleBold,
    toggleItalic,
    toggleHeading,
    toggleBulletList,
    toggleOrderedList,
    toggleBlockquote,
    toggleCode,
    toggleCodeBlock,
    setLink,
    unsetLink,
    isActive: (name: string, attributes?: Record<string, unknown>) =>
      editor?.isActive(name, attributes) ?? false
  }
}
