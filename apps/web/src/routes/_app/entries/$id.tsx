import { Button } from "@folionote/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@folionote/ui/dropdown-menu"
import { Input } from "@folionote/ui/input"
import { Spinner } from "@folionote/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@folionote/ui/tooltip"
import {
  ArchiveIcon,
  ArrowLeft01Icon,
  Delete02Icon,
  InboxIcon,
  LockPasswordIcon,
  MoreHorizontalIcon,
  PinIcon,
  Share01Icon,
  StarIcon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { createImageCommand } from "@/components/editor/image-command"
import {
  createRefCommandWithEvent,
  getCurrentEditor,
  insertEntryRef
} from "@/components/editor/ref-command"
import { createSourceCommandWithEvent } from "@/components/editor/source-command"
import { createTagCommand } from "@/components/editor/tag-command"
import { EntryEditor } from "@/components/entry-editor"
import { EntryPasswordDialog } from "@/components/entry-password-dialog"
import { EntryPicker } from "@/components/entry-picker"
import type { EntryPickerRef } from "@/components/entry-picker"
import { EntrySources } from "@/components/entry-sources"
import type { EntrySourcesRef } from "@/components/entry-sources"
import { EntryTags } from "@/components/entry-tags"
import type { EntryTagsRef } from "@/components/entry-tags"
import { SaveStatusIndicator } from "@/components/save-status-indicator"
import { ShareDialog } from "@/components/share-dialog"
import { TableOfContents } from "@/components/table-of-contents"
import { useAutoSave } from "@/hooks/use-auto-save"
import type { SaveStatus } from "@/hooks/use-auto-save"
import { useTocPosition } from "@/hooks/use-toc-position"
import { createPageHead } from "@/lib/seo"
import { assignHeadingIds, parseTocFromContent } from "@/lib/toc"
import { cn } from "@/lib/utils"
import { orpc } from "@/utils/orpc"

export const Route = createFileRoute("/_app/entries/$id")({
  loader: async ({ params, context: { queryClient } }) => {
    if (typeof window === "undefined") {
      return { entry: undefined }
    }

    const entry = await queryClient.ensureQueryData({
      queryKey: ["entries", params.id],
      queryFn: () => orpc.entries.get.call({ id: params.id })
    })
    return { entry }
  },

  head: ({ loaderData }) =>
    createPageHead({
      title: loaderData?.entry?.title
        ? `Edit · ${loaderData.entry.title}`
        : "Edit · Untitled",
      description: loaderData?.entry?.title
        ? `Edit entry: ${loaderData.entry.title}`
        : "Edit entry"
    }),

  component: EntryEditPage
})

/**
 * 更新条目的数据类型
 */
interface UpdateEntryData {
  id: string
  title?: string
  contentJson?: string
  isInbox?: boolean
  isStarred?: boolean
  isPinned?: boolean
  expectedVersion?: string
}

/**
 * Render the entry editing UI for the current route id.
 *
 * Provides editable title and content, and actions to move the entry between inbox and library, toggle star and pin state, and delete the entry. Shows a loading spinner while fetching and a not-found fallback when the entry is missing.
 *
 * @returns The entry editor page UI element for the current entry.
 */
function EntryEditPage() {
  const { t } = useTranslation()
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const entryTagsRef = useRef<EntryTagsRef>(null)
  const entrySourcesRef = useRef<EntrySourcesRef>(null)
  const entryPickerRef = useRef<EntryPickerRef>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [tocPosition] = useTocPosition()
  const [tocRenderKey, setTocRenderKey] = useState(0)

  // Fetch entry data
  const { data: entry, isLoading } = useQuery({
    queryKey: ["entries", id],
    queryFn: () => orpc.entries.get.call({ id })
  })

  // Local state for optimistic updates
  const [localTitle, setLocalTitle] = useState<string | null>(null)
  const [localContent, setLocalContent] = useState<string | null>(null)
  // 跟踪当前版本号
  const [currentVersion, setCurrentVersion] = useState<string>("1")
  // 删除确认对话框状态
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  // 分享对话框状态
  const [showShareDialog, setShowShareDialog] = useState(false)
  // 密码保护对话框状态
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  // Debounced content for TOC (updated via autoSave debounce)
  const [debouncedContent, setDebouncedContent] = useState<string | null>(null)

  // 当 entry 加载完成时，更新版本号
  useEffect(() => {
    if (entry?.version) {
      setCurrentVersion(entry.version)
    }
  }, [entry?.version])

  // 自动保存 hook
  const { status: saveStatus, save: autoSave } = useAutoSave<UpdateEntryData>({
    onSave: async (data) => {
      const result = await orpc.entries.update.call(data)
      // 更新版本号
      if (result.version) {
        setCurrentVersion(result.version)
      }
      queryClient.invalidateQueries({ queryKey: ["entries"] })
      // Update debounced content for TOC after save completes
      if (data.contentJson) {
        setDebouncedContent(data.contentJson)
      }
    },
    debounceMs: 1000,
    savedDurationMs: 2000
  })

  // Create tag command for slash menu
  const tagCommand = useMemo(
    () =>
      createTagCommand(
        {
          getTags: () => entryTagsRef.current?.getTags() ?? [],
          onAddTag: (tagId) => {
            entryTagsRef.current?.addTag(tagId)
          }
        },
        t
      ),
    [t]
  )

  // Create source command for slash menu
  const sourceCommand = useMemo(() => createSourceCommandWithEvent(t), [t])

  // Create ref command for slash menu
  const refCommand = useMemo(() => createRefCommandWithEvent(t), [t])

  const uploadImage = useCallback(
    async (file: File) => {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const chunks: string[] = []
      for (let i = 0; i < bytes.length; i += 8192) {
        const chunk = bytes.subarray(i, i + 8192)
        chunks.push(String.fromCodePoint(...chunk))
      }
      const binary = chunks.join("")
      const base64 = btoa(binary)
      const result = await orpc.storage.uploadAttachment.call({
        fileData: base64,
        contentType: file.type as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp"
          | "image/svg+xml",
        filename: file.name,
        entryId: id
      })
      return { publicUrl: result.publicUrl }
    },
    [id]
  )

  const imageCommand = useMemo(
    () => createImageCommand({ t, uploadImage }),
    [t, uploadImage]
  )

  const additionalCommands = useMemo(
    () => [tagCommand, sourceCommand, refCommand, imageCommand],
    [tagCommand, sourceCommand, refCommand, imageCommand]
  )

  // Listen for custom events from slash commands
  useEffect(() => {
    const handleOpenSourcePicker = () => {
      entrySourcesRef.current?.openSourcePicker()
    }

    const handleOpenEntryPicker = () => {
      entryPickerRef.current?.open()
    }

    document.addEventListener(
      "folio-note:open-source-picker",
      handleOpenSourcePicker
    )
    document.addEventListener(
      "folio-note:open-entry-picker",
      handleOpenEntryPicker
    )

    return () => {
      document.removeEventListener(
        "folio-note:open-source-picker",
        handleOpenSourcePicker
      )
      document.removeEventListener(
        "folio-note:open-entry-picker",
        handleOpenEntryPicker
      )
    }
  }, [])

  // Update mutation for non-content updates (star, pin, inbox)
  const updateMutation = useMutation({
    mutationFn: (data: UpdateEntryData) => orpc.entries.update.call(data),
    onSuccess: (result) => {
      if (result.version) {
        setCurrentVersion(result.version)
      }
      queryClient.invalidateQueries({ queryKey: ["entries"] })
    },
    onError: (error) => {
      // 检查是否是版本冲突错误
      if (error.message?.includes("Version conflict")) {
        toast.error(t("entry.versionConflict"))
        // 重新获取最新数据
        queryClient.invalidateQueries({ queryKey: ["entries", id] })
      } else {
        toast.error(t("entry.saveFailed"))
      }
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (data: { id: string }) => orpc.entries.delete.call(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] })
      toast.success(t("entry.movedToTrash"))
      navigate({ to: entry?.isInbox ? "/inbox" : "/library" })
    }
  })

  // Handlers
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value
      setLocalTitle(newTitle)
      autoSave({
        id,
        title: newTitle,
        expectedVersion: currentVersion
      })
    },
    [id, autoSave, currentVersion]
  )

  const handleContentChange = useCallback(
    (_html: string, json: string) => {
      setLocalContent(json)
      autoSave({
        id,
        contentJson: json,
        expectedVersion: currentVersion
      })
    },
    [id, autoSave, currentVersion]
  )

  const handleToggleStar = useCallback(() => {
    if (!entry) {
      return
    }
    updateMutation.mutate({
      id,
      isStarred: !entry.isStarred,
      expectedVersion: currentVersion
    })
  }, [entry, id, updateMutation, currentVersion])

  const handleTogglePin = useCallback(() => {
    if (!entry) {
      return
    }
    updateMutation.mutate({
      id,
      isPinned: !entry.isPinned,
      expectedVersion: currentVersion
    })
  }, [entry, id, updateMutation, currentVersion])

  const handleMoveToLibrary = useCallback(() => {
    if (!entry) {
      return
    }
    updateMutation.mutate(
      { id, isInbox: false, expectedVersion: currentVersion },
      {
        onSuccess: () => {
          toast.success(t("entry.movedToLibrary"))
        }
      }
    )
  }, [entry, id, updateMutation, currentVersion, t])

  const handleMoveToInbox = useCallback(() => {
    if (!entry) {
      return
    }
    updateMutation.mutate(
      { id, isInbox: true, expectedVersion: currentVersion },
      {
        onSuccess: () => {
          toast.success(t("entry.movedToInbox"))
        }
      }
    )
  }, [entry, id, updateMutation, currentVersion, t])

  const handleDeleteClick = useCallback(() => {
    setShowDeleteDialog(true)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          setShowDeleteDialog(false)
        }
      }
    )
  }, [deleteMutation, id])

  const handleGoBack = useCallback(() => {
    navigate({ to: entry?.isInbox ? "/inbox" : "/library" })
  }, [entry, navigate])

  // 计算显示的保存状态
  const displaySaveStatus: SaveStatus = updateMutation.isPending
    ? "saving"
    : saveStatus

  // Parse TOC items from debounced content (uses autoSave's 1000ms debounce)
  const editorContent = localContent ?? entry?.contentJson ?? ""
  const tocContent = debouncedContent ?? entry?.contentJson ?? ""
  const tocItems = useMemo(() => parseTocFromContent(tocContent), [tocContent])

  // TipTap uses `immediatelyRender: false`, so headings may not exist in the DOM
  // when fumadocs AnchorProvider tries to observe them. We assign heading ids and
  // remount the TOC once headings are present so IntersectionObserver can attach.
  useEffect(() => {
    const container = contentRef.current
    if (!container || tocItems.length === 0) {
      return
    }

    let didRemount = false

    const assignAndMaybeRemount = () => {
      assignHeadingIds(container, tocItems)

      const hasAnyObservedHeading = tocItems.some((item) => {
        // URL is always prefixed with # by makeUniqueItems
        const id = item.url.slice(1)
        if (!id) {
          return false
        }

        const element = document.querySelector(`#${id}`)
        return element !== null && container.contains(element)
      })

      if (hasAnyObservedHeading && !didRemount) {
        didRemount = true
        setTocRenderKey((prev) => prev + 1)
        return true
      }

      return hasAnyObservedHeading
    }

    if (typeof MutationObserver === "undefined") {
      assignAndMaybeRemount()
      return
    }

    if (assignAndMaybeRemount()) {
      return
    }

    const observer = new MutationObserver(() => {
      if (assignAndMaybeRemount()) {
        observer.disconnect()
      }
    })

    observer.observe(container, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [tocItems])

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t("entry.notExist")}</p>
        <Button onClick={() => navigate({ to: "/inbox" })} variant="outline">
          {t("entry.backToInbox")}
        </Button>
      </div>
    )
  }

  const title = localTitle ?? entry.title
  const hasToc = tocItems.length > 0

  return (
    <div
      className={cn(
        "container mx-auto flex",
        hasToc ? "max-w-6xl" : "max-w-4xl"
      )}
    >
      {/* TOC on left side */}
      {hasToc && tocPosition === "left" && (
        <TableOfContents
          items={tocItems}
          key={tocRenderKey}
          position={tocPosition}
        />
      )}

      {/* Main content */}
      <div className="min-w-0 flex-1 px-4 py-6">
        {/* Header toolbar */}
        <div className="mb-6 flex items-center justify-between">
          <Button onClick={handleGoBack} size="sm" variant="ghost">
            <HugeiconsIcon className="mr-2 size-4" icon={ArrowLeft01Icon} />
            {t("common.back")}
          </Button>

          <div className="flex items-center gap-1">
            {/* Save status indicator */}
            <SaveStatusIndicator className="mr-2" status={displaySaveStatus} />

            {/* Move to library/inbox */}
            {entry.isInbox ? (
              <Tooltip>
                <TooltipTrigger
                  aria-label={t("entry.moveToLibrary")}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  onClick={handleMoveToLibrary}
                >
                  <HugeiconsIcon className="size-4" icon={ArchiveIcon} />
                </TooltipTrigger>
                <TooltipContent>{t("entry.moveToLibrary")}</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger
                  aria-label={t("entry.moveToInbox")}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  onClick={handleMoveToInbox}
                >
                  <HugeiconsIcon className="size-4" icon={InboxIcon} />
                </TooltipTrigger>
                <TooltipContent>{t("entry.moveToInbox")}</TooltipContent>
              </Tooltip>
            )}

            {/* Star */}
            <Tooltip>
              <TooltipTrigger
                aria-label={
                  entry.isStarred ? t("entry.unstar") : t("entry.star")
                }
                aria-pressed={entry.isStarred}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                onClick={handleToggleStar}
              >
                <HugeiconsIcon
                  className={cn(
                    "size-4 transition-colors",
                    entry.isStarred && "fill-amber-500 text-amber-500"
                  )}
                  icon={StarIcon}
                />
              </TooltipTrigger>
              <TooltipContent>
                {entry.isStarred ? t("entry.unstar") : t("entry.star")}
              </TooltipContent>
            </Tooltip>

            {/* Pin */}
            <Tooltip>
              <TooltipTrigger
                aria-label={entry.isPinned ? t("entry.unpin") : t("entry.pin")}
                aria-pressed={entry.isPinned}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                onClick={handleTogglePin}
              >
                <HugeiconsIcon
                  className={cn(
                    "size-4 transition-colors",
                    entry.isPinned && "fill-primary text-primary"
                  )}
                  icon={PinIcon}
                />
              </TooltipTrigger>
              <TooltipContent>
                {entry.isPinned ? t("entry.unpin") : t("entry.pin")}
              </TooltipContent>
            </Tooltip>

            {/* Delete */}
            <Tooltip>
              <TooltipTrigger
                aria-label={t("common.delete")}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-destructive/30 focus-visible:outline-none"
                onClick={handleDeleteClick}
              >
                <HugeiconsIcon className="size-4" icon={Delete02Icon} />
              </TooltipTrigger>
              <TooltipContent>{t("common.delete")}</TooltipContent>
            </Tooltip>

            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={t("common.more")}
                  size="icon"
                  variant="ghost"
                >
                  <HugeiconsIcon className="size-4" icon={MoreHorizontalIcon} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                  <HugeiconsIcon className="mr-2 size-4" icon={Share01Icon} />
                  {t("share.title")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPasswordDialog(true)}>
                  <HugeiconsIcon
                    className="mr-2 size-4"
                    icon={LockPasswordIcon}
                  />
                  {t("privacy.title")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title input */}
        <Input
          aria-label={t("entry.title")}
          autoComplete="off"
          className="mb-4 h-auto border-none bg-transparent py-2 text-2xl font-bold shadow-none transition-colors placeholder:text-muted-foreground/60 focus-visible:ring-0 md:text-3xl"
          onChange={handleTitleChange}
          placeholder={t("entry.title")}
          spellCheck={false}
          value={title}
        />

        {/* Tags */}
        <div className="mb-4">
          <EntryTags entryId={id} ref={entryTagsRef} />
        </div>

        {/* Sources */}
        <div className="mb-4">
          <EntrySources entryId={id} ref={entrySourcesRef} />
        </div>

        {/* Editor */}
        <div ref={contentRef}>
          <EntryEditor
            additionalCommands={additionalCommands}
            autoFocus
            content={editorContent}
            contentFormat="json"
            onChange={handleContentChange}
            onUploadImage={uploadImage}
            placeholder={t("editor.placeholderWithSlash")}
          />
        </div>

        {/* Metadata footer */}
        <footer className="mt-8 border-t border-border/50 pt-4">
          <dl className="space-y-1 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <dt className="sr-only">{t("entry.createdAt")}</dt>
              <dd className="flex items-center gap-1.5">
                <span className="text-muted-foreground/60">
                  {t("entry.createdAt")}
                </span>
                <time
                  className="font-mono tabular-nums"
                  dateTime={new Date(entry.createdAt).toISOString()}
                >
                  {new Intl.DateTimeFormat(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  }).format(new Date(entry.createdAt))}
                </time>
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">{t("entry.updatedAt")}</dt>
              <dd className="flex items-center gap-1.5">
                <span className="text-muted-foreground/60">
                  {t("entry.updatedAt")}
                </span>
                <time
                  className="font-mono tabular-nums"
                  dateTime={new Date(entry.updatedAt).toISOString()}
                >
                  {new Intl.DateTimeFormat(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  }).format(new Date(entry.updatedAt))}
                </time>
              </dd>
            </div>
          </dl>
        </footer>

        {/* Entry picker dialog for /ref command */}
        <EntryPicker
          excludeId={id}
          onSelect={(selectedEntry) => {
            // Get the editor instance stored by the ref command
            const editor = getCurrentEditor()
            if (editor) {
              insertEntryRef(editor, selectedEntry, t)
            }
          }}
          ref={entryPickerRef}
        />

        {/* Delete confirmation dialog */}
        <ConfirmDeleteDialog
          description={t("entry.deleteConfirmDesc")}
          isLoading={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onOpenChange={setShowDeleteDialog}
          open={showDeleteDialog}
          title={t("entry.deleteConfirmTitle")}
        />

        {/* Share dialog */}
        <ShareDialog
          entryId={id}
          entryTitle={entry.title}
          onOpenChange={setShowShareDialog}
          open={showShareDialog}
        />

        {/* Entry password dialog */}
        <EntryPasswordDialog
          entryId={id}
          onOpenChange={setShowPasswordDialog}
          open={showPasswordDialog}
        />
      </div>

      {/* TOC on right side */}
      {hasToc && tocPosition === "right" && (
        <TableOfContents
          items={tocItems}
          key={tocRenderKey}
          position={tocPosition}
        />
      )}
    </div>
  )
}
