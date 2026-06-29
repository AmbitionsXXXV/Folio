import { cn } from "@folionote/ui/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@folionote/ui/tooltip"
import { AiBrain01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef } from "react"
import type { ChangeEvent } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import {
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger
} from "@/components/ai-elements/context-usage"
import { AiModelSelector } from "@/components/ai-elements/model-selector"
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments
} from "@/components/ai-elements/prompt-input"
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input"
import type { Entry } from "@/types"
import { orpc } from "@/utils/orpc"

import { FileAttachment } from "./file-attachment"
import type { MentionItem } from "./mention-popover"
import {
  findAtIndex,
  MentionPopover,
  useMentionPopover
} from "./mention-popover"
import { NoteAttachment } from "./note-attachment"
import type { ChatInputProps } from "./types"

const FILE_ATTACHMENT_ACCEPT = "image/*,application/pdf"
const FILE_ATTACHMENT_MAX_FILES = 5
const FILE_ATTACHMENT_MAX_BYTES = 5_242_880
const FILE_SIZE_KB = 1024
const FILE_SIZE_MB = FILE_SIZE_KB * 1024
const MENTION_QUERY_LIMIT = 100

const EMPTY_NOTES: NonNullable<ChatInputProps["attachedNotes"]> = []

interface AttachmentError {
  code: "max_files" | "max_file_size" | "accept"
  message: string
}

// ============================================================================
// Internal sub-components
// ============================================================================

interface ChatInputAttachmentsHeaderProps {
  attachedNotes: NonNullable<ChatInputProps["attachedNotes"]>
  onRemoveNoteAttachment?: ChatInputProps["onRemoveNoteAttachment"]
}

function ChatInputAttachmentsHeader({
  attachedNotes,
  onRemoveNoteAttachment
}: ChatInputAttachmentsHeaderProps) {
  const attachments = usePromptInputAttachments()
  const hasAttachments =
    attachments.files.length > 0 || attachedNotes.length > 0

  if (!hasAttachments) {
    return null
  }

  return (
    <PromptInputHeader className="gap-2 px-3 pt-2">
      {attachedNotes.map((note) => (
        <NoteAttachment
          key={`note-${note.id}`}
          note={note}
          onRemove={onRemoveNoteAttachment}
        />
      ))}
      <PromptInputAttachments>
        {(file) => <FileAttachment file={file} onRemove={attachments.remove} />}
      </PromptInputAttachments>
    </PromptInputHeader>
  )
}

interface ChatInputSubmitButtonProps {
  disabled: boolean
  hasApiKey: boolean
  isPending: boolean
  value: string
}

function ChatInputSubmitButton({
  disabled,
  hasApiKey,
  isPending,
  value
}: ChatInputSubmitButtonProps) {
  const { t } = useTranslation()
  const attachments = usePromptInputAttachments()
  const canSend =
    !disabled &&
    hasApiKey &&
    (Boolean(value.trim()) || attachments.files.length > 0)

  return (
    <PromptInputSubmit
      aria-label={t("knowledge.send")}
      className={cn(
        "transition-colors duration-200 motion-reduce:transition-none",
        isPending
          ? "animate-pulse motion-reduce:animate-none"
          : "hover:bg-primary/90"
      )}
      disabled={!canSend}
      status={isPending ? "submitted" : "ready"}
    />
  )
}

function formatFileSize(bytes: number): string {
  if (bytes >= FILE_SIZE_MB) {
    return `${Math.round(bytes / FILE_SIZE_MB)}\u00A0MB`
  }
  if (bytes >= FILE_SIZE_KB) {
    return `${Math.round(bytes / FILE_SIZE_KB)}\u00A0KB`
  }
  return `${bytes}\u00A0B`
}

function getAttachmentErrorMessage(
  t: ReturnType<typeof useTranslation>["t"],
  error: AttachmentError
): string {
  if (error.code === "max_files") {
    return t("knowledge.attachments.errorMaxFiles", {
      count: FILE_ATTACHMENT_MAX_FILES
    })
  }
  if (error.code === "max_file_size") {
    return t("knowledge.attachments.errorMaxFileSize", {
      size: formatFileSize(FILE_ATTACHMENT_MAX_BYTES)
    })
  }
  return t("knowledge.attachments.errorInvalidType")
}

interface ChatInputThinkingToggleProps {
  hasToggleableReasoning: boolean | undefined
  onThinkingToggle: (enabled: boolean) => void
  thinkingActive: boolean
  thinkingEnabled: boolean
}

function ChatInputThinkingToggle({
  hasToggleableReasoning,
  onThinkingToggle,
  thinkingActive,
  thinkingEnabled
}: ChatInputThinkingToggleProps) {
  const { t } = useTranslation()

  const getThinkingTooltip = () => {
    if (!hasToggleableReasoning) {
      return t("knowledge.thinkingBuiltIn")
    }
    return thinkingEnabled
      ? t("knowledge.thinkingEnabled")
      : t("knowledge.enableThinking")
  }

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={t("knowledge.toggleThinking")}
        aria-pressed={thinkingActive}
        className={cn(
          "relative inline-flex size-8 items-center justify-center rounded-lg",
          "text-muted-foreground hover:bg-surface-secondary hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "transition-all duration-200 ease-out active:scale-95 motion-reduce:transition-none",
          thinkingActive &&
            "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
        )}
        disabled={!hasToggleableReasoning}
        onClick={() =>
          hasToggleableReasoning && onThinkingToggle(!thinkingEnabled)
        }
        type="button"
      >
        <HugeiconsIcon className="size-4" icon={AiBrain01Icon} />
        {thinkingActive && (
          <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-primary" />
        )}
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{getThinkingTooltip()}</p>
      </TooltipContent>
    </Tooltip>
  )
}

interface ChatInputContextUsageProps {
  contextUsage: NonNullable<ChatInputProps["contextUsage"]>
}

function ChatInputContextUsage({ contextUsage }: ChatInputContextUsageProps) {
  return (
    <Context
      maxTokens={contextUsage.maxTokens}
      modelId={contextUsage.modelId}
      usage={contextUsage.sessionUsage}
      usedTokens={contextUsage.usedTokens}
    >
      <ContextTrigger
        className="h-8 gap-1.5 rounded-lg px-2 text-xs"
        size="sm"
      />
      <ContextContent align="start" side="top">
        <ContextContentHeader />
        <ContextContentBody className="space-y-1.5">
          <ContextInputUsage />
          <ContextOutputUsage />
          <ContextReasoningUsage />
          <ContextCacheUsage />
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  )
}

// ============================================================================
// Main component
// ============================================================================

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  isPending = false,
  placeholder,
  className,
  selectedProvider,
  selectedModel,
  onModelChange,
  hasApiKey,
  catalogProviders,
  catalogModels,
  thinkingEnabled = false,
  onThinkingToggle,
  isImageMode = false,
  attachedNotes = EMPTY_NOTES,
  onAddNoteAttachment,
  onRemoveNoteAttachment,
  contextUsage
}: ChatInputProps) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // ---- Model info ----

  const providerModels = useMemo(
    () =>
      catalogModels.filter(
        (model) => model.providerId === selectedProvider && model.enabled
      ),
    [catalogModels, selectedProvider]
  )

  const selectedModelInfo = useMemo(
    () => providerModels.find((m) => m.id === selectedModel),
    [providerModels, selectedModel]
  )

  const supportsThinking = Boolean(selectedModelInfo?.reasoning)
  const hasToggleableReasoning =
    selectedModelInfo?.settings?.extendParams?.includes("enableReasoning")
  const thinkingActive = hasToggleableReasoning ? thinkingEnabled : true

  const isDisabled = disabled || isPending

  // ---- Mention system ----

  const attachedNoteIds = useMemo(
    () => new Set(attachedNotes.map((note) => note.id)),
    [attachedNotes]
  )

  const { data: entriesData } = useQuery({
    queryKey: ["entries", "library", "mention"],
    queryFn: () =>
      orpc.entries.list.call({
        filter: "all",
        limit: MENTION_QUERY_LIMIT
      })
  })

  const mentionCandidates = useMemo<MentionItem[]>(() => {
    const entries = (entriesData?.items ?? []) as Entry[]
    const items: MentionItem[] = []

    for (const entry of entries) {
      if (entry.isInbox) {
        continue
      }
      if (attachedNoteIds.has(entry.id)) {
        continue
      }

      const rawTitle = entry.title?.trim() ?? ""
      const title = rawTitle.length > 0 ? rawTitle : t("entryPicker.untitled")
      items.push({ id: entry.id, title })
    }

    return items
  }, [entriesData, attachedNoteIds, t])

  // Stable refs for the mention select callback to avoid stale closures
  const callbackRefs = useRef({ value, onChange, onAddNoteAttachment })
  callbackRefs.current = { value, onChange, onAddNoteAttachment }

  const handleMentionSelect = useCallback((item: MentionItem) => {
    callbackRefs.current.onAddNoteAttachment?.({
      id: item.id,
      title: item.title
    })

    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    const cursorPos = textarea.selectionStart
    const currentValue = callbackRefs.current.value
    const atIndex = findAtIndex(currentValue, cursorPos)

    if (atIndex >= 0) {
      const before = currentValue.slice(0, atIndex)
      const after = currentValue.slice(cursorPos)
      const inserted = `@${item.title} `
      const newValue = before + inserted + after
      callbackRefs.current.onChange(newValue)

      const newCursorPos = before.length + inserted.length
      requestAnimationFrame(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      })
    }
  }, [])

  const mentionEmptyText =
    mentionCandidates.length === 0
      ? t("entryPicker.noEntriesAvailable")
      : t("entryPicker.noMatchingEntries")

  const mention = useMentionPopover({
    items: mentionCandidates,
    onSelect: handleMentionSelect,
    emptyText: mentionEmptyText,
    anchorRef: textareaRef
  })

  // Wire handleKey to a ref so the native keydown listener reads the latest
  const handleKeyRef = useRef(mention.handleKey)
  handleKeyRef.current = mention.handleKey

  // Attach a native keydown listener in capture phase to intercept mention
  // navigation keys BEFORE PromptInputTextarea's internal Enter/Backspace handler
  useEffect(() => {
    const node = textareaRef.current
    if (!node) {
      return
    }

    const handler = (e: KeyboardEvent) => {
      if (handleKeyRef.current(e.key)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    node.addEventListener("keydown", handler, { capture: true })
    return () => node.removeEventListener("keydown", handler, { capture: true })
  })

  // ---- Textarea change handler ----

  const handleTextareaChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.currentTarget.value
      const cursorPos = e.currentTarget.selectionStart
      onChange(newValue)
      mention.detectMention(newValue, cursorPos)
    },
    [onChange, mention.detectMention]
  )

  // ---- Form submission ----

  const handlePromptSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (isDisabled || !hasApiKey) {
        return
      }
      const hasContent =
        Boolean(message.text.trim()) || message.files.length > 0
      if (!hasContent) {
        return
      }
      mention.close()
      onSubmit(message)
    },
    [isDisabled, hasApiKey, mention.close, onSubmit]
  )

  const resolvedPlaceholder = hasApiKey
    ? placeholder ||
      (isImageMode
        ? t("knowledge.imagePromptPlaceholder", {
            defaultValue: "Describe the image you want to create\u2026"
          })
        : t("knowledge.inputPlaceholder"))
    : t("knowledge.configureApiKeyFirst")

  return (
    <div className="relative">
      <MentionPopover {...mention.popoverProps} />
      <PromptInput
        accept={FILE_ATTACHMENT_ACCEPT}
        className={cn(
          "rounded-xl transition-shadow duration-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-2 focus-within:ring-offset-background motion-reduce:transition-none",
          className
        )}
        globalDrop
        layout="stacked"
        maxFileSize={FILE_ATTACHMENT_MAX_BYTES}
        maxFiles={FILE_ATTACHMENT_MAX_FILES}
        multiple
        onError={(error) => {
          toast.error(getAttachmentErrorMessage(t, error))
        }}
        onSubmit={handlePromptSubmit}
        variant="primary"
      >
        {/* Attachments (Notes + Files) */}
        <ChatInputAttachmentsHeader
          attachedNotes={attachedNotes}
          onRemoveNoteAttachment={onRemoveNoteAttachment}
        />

        <PromptInputBody>
          <PromptInputTextarea
            disabled={isDisabled || !hasApiKey}
            onChange={handleTextareaChange}
            placeholder={resolvedPlaceholder}
            ref={textareaRef}
            value={value}
          />
        </PromptInputBody>

        <PromptInputFooter className="px-3">
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger
                aria-label={t("knowledge.addAttachments")}
                disabled={isDisabled || !hasApiKey}
              />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments
                  label={t("knowledge.addAttachments")}
                />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>

            {/* Model Selector */}
            <AiModelSelector
              catalogModels={catalogModels}
              catalogProviders={catalogProviders}
              className="h-8 w-auto gap-2 rounded-lg border-0 px-3 text-xs shadow-none transition-colors duration-200 hover:bg-surface-secondary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
              disabled={isDisabled || !hasApiKey}
              onValueChange={onModelChange}
              placeholder={t("knowledge.selectModel")}
              value={selectedModel}
            />

            {/* Thinking Toggle (hidden in image mode) */}
            {!isImageMode && supportsThinking && onThinkingToggle && (
              <ChatInputThinkingToggle
                hasToggleableReasoning={hasToggleableReasoning}
                onThinkingToggle={onThinkingToggle}
                thinkingActive={thinkingActive}
                thinkingEnabled={thinkingEnabled}
              />
            )}
          </PromptInputTools>

          <div className="flex items-center gap-1">
            {/* Context Usage (hidden in image mode) */}
            {!isImageMode && contextUsage && contextUsage.usedTokens > 0 && (
              <ChatInputContextUsage contextUsage={contextUsage} />
            )}

            <ChatInputSubmitButton
              disabled={isDisabled}
              hasApiKey={hasApiKey}
              isPending={isPending}
              value={value}
            />
          </div>
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
