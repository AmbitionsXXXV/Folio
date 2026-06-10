import type { FileUIPart } from "ai"
import { useCallback } from "react"

import {
  PromptInputAttachments,
  PromptInputButton,
  PromptInputHeader,
  usePromptInputAttachments
} from "@/components/ai-elements/prompt-input"

export function AttachmentDisplay() {
  const attachments = usePromptInputAttachments()

  if (attachments.files.length === 0) {
    return null
  }

  return (
    <PromptInputHeader className="gap-2 px-3 pt-2">
      <PromptInputAttachments>
        {(file) => (
          <FileAttachmentChip file={file} onRemove={attachments.remove} />
        )}
      </PromptInputAttachments>
    </PromptInputHeader>
  )
}

interface FileAttachmentChipProps {
  file: FileUIPart & { id: string }
  onRemove: (id: string) => void
}

function FileAttachmentChip({ file, onRemove }: FileAttachmentChipProps) {
  const handleRemove = useCallback(() => {
    onRemove(file.id)
  }, [onRemove, file.id])

  const isImage = file.mediaType?.startsWith("image/") && file.url
  const label = file.filename || (isImage ? "Image" : "Attachment")

  return (
    <PromptInputButton
      className="gap-1.5 rounded-lg px-2 text-xs"
      onClick={handleRemove}
      size="sm"
      variant="outline"
    >
      {isImage ? (
        <img
          alt={label}
          className="size-4 rounded-sm object-cover"
          height={16}
          src={file.url}
          width={16}
        />
      ) : null}
      <span className="max-w-24 truncate">{label}</span>
      <span className="text-muted-foreground">&times;</span>
    </PromptInputButton>
  )
}
