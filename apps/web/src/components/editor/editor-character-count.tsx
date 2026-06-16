import { cn } from "@folionote/ui/lib/utils"
import type { Editor } from "@tiptap/react"
import { useEditorState } from "@tiptap/react"
import { useTranslation } from "react-i18next"

const WHITESPACE = /\s+/

/**
 * Word and character count footer for the entry editor, mirroring the
 * CharacterCount slot of HeroUI Pro's RichTextEditor. Counts are derived from
 * the editor text and only re-render when the totals change.
 */
export function EditorCharacterCount({
  editor,
  className
}: {
  editor: Editor
  className?: string
}) {
  const { t } = useTranslation()

  const stats = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      const text = instance.getText()
      const trimmed = text.trim()
      return {
        characters: text.length,
        words: trimmed ? trimmed.split(WHITESPACE).length : 0
      }
    }
  })

  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 pt-2 text-muted-foreground text-xs tabular-nums",
        className
      )}
    >
      <span>{t("editor.toolbar.words", { count: stats.words })}</span>
      <span>{t("editor.toolbar.characters", { count: stats.characters })}</span>
    </div>
  )
}
