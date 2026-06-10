import type { TOCItemType } from "fumadocs-core/toc"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { EntryEditor } from "@/components/entry-editor"
import { ShareFooter } from "@/components/share/share-footer"
import { ShareHeader } from "@/components/share/share-header"
import { TableOfContents } from "@/components/table-of-contents"
import { useTocPosition } from "@/hooks/use-toc-position"
import { assignHeadingIds, parseTocFromContent } from "@/lib/toc"
import { cn } from "@/lib/utils"
import type { ShareContentProps } from "@/types/share"

/**
 * Share content display component
 */
export function ShareContent({ entryData }: ShareContentProps) {
  const { t } = useTranslation()
  const contentRef = useRef<HTMLDivElement>(null)
  const [tocPosition] = useTocPosition()
  const [tocRenderKey, setTocRenderKey] = useState(0)

  const { entry, share } = entryData

  // Parse TOC items from content
  const tocItems = useMemo<TOCItemType[]>(() => {
    if (!entry.contentJson) {
      return []
    }
    return parseTocFromContent(entry.contentJson)
  }, [entry.contentJson])

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

  const hasToc = tocItems.length > 0

  // Header height for padding offset (py-4 = 1rem * 2 + content height)
  const HEADER_HEIGHT = 65

  return (
    <div
      className="flex min-h-svh flex-col bg-background"
      style={
        {
          "--folio-nav-height": `${HEADER_HEIGHT}px`
        } as React.CSSProperties
      }
    >
      <ShareHeader showBranding={share.showBranding} />

      {/* Content with TOC - add top padding to account for fixed header */}
      <div
        className={cn(
          "container mx-auto flex min-h-0 flex-1",
          hasToc ? "max-w-6xl" : "max-w-5xl"
        )}
        style={{ paddingTop: HEADER_HEIGHT }}
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
        <main className="min-w-0 flex-1 px-4 py-8">
          <article>
            {/* Title */}
            <h1 className="mb-6 text-3xl font-bold text-balance">
              {entry.title || t("entry.untitled")}
            </h1>

            {/* Metadata */}
            <div className="mb-8 flex items-center gap-4 text-sm text-muted-foreground tabular-nums">
              <time dateTime={entry.createdAt}>
                {new Intl.DateTimeFormat(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                }).format(new Date(entry.createdAt))}
              </time>
            </div>

            {/* Content */}
            <div
              className={cn(
                "prose prose-lg dark:prose-invert max-w-none",
                "[&_h1]:scroll-mt-(--folio-nav-height)",
                "[&_h2]:scroll-mt-(--folio-nav-height)",
                "[&_h3]:scroll-mt-(--folio-nav-height)",
                "[&_h4]:scroll-mt-(--folio-nav-height)",
                "[&_h5]:scroll-mt-(--folio-nav-height)",
                "[&_h6]:scroll-mt-(--folio-nav-height)"
              )}
              ref={contentRef}
            >
              {entry.contentJson ? (
                <EntryEditor
                  content={entry.contentJson}
                  contentFormat="json"
                  editable={false}
                />
              ) : (
                <p className="text-pretty text-muted-foreground">
                  {t("share.noContent")}
                </p>
              )}
            </div>
          </article>
        </main>

        {/* TOC on right side */}
        {hasToc && tocPosition === "right" && (
          <TableOfContents
            items={tocItems}
            key={tocRenderKey}
            position={tocPosition}
          />
        )}
      </div>

      <ShareFooter showBranding={share.showBranding} />
    </div>
  )
}
