import { TextAlignLeftIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { TOCItemType } from "fumadocs-core/toc"
import {
  TOCProvider,
  TOCScrollArea,
  useTOCItems
} from "fumadocs-ui/components/toc"
import { TOCEmpty, TOCItem, TOCItems } from "fumadocs-ui/components/toc/clerk"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

type TableOfContentsPosition = "left" | "right"

interface TableOfContentsProps {
  /** Array of TOC items to display (fumadocs format) */
  items: TOCItemType[]
  /** Additional CSS classes */
  className?: string
  /** Which side the TOC column is rendered on (call sites place it accordingly) */
  position?: TableOfContentsPosition
}

/**
 * Table of Contents sidebar using fumadocs-ui's "clerk" variant, which renders
 * the curved active-line indicator + active highlighting out of the box.
 *
 * Active tracking is driven by TOCProvider's IntersectionObserver, which finds
 * headings via document.getElementById. The heading ids come from the HeadingIds
 * editor extension (lib/heading-id-extension.ts), so they match the TOC anchors.
 *
 * Hidden on mobile (< lg breakpoint).
 */
export function TableOfContents({
  items,
  className,
  position = "right"
}: TableOfContentsProps) {
  const { t } = useTranslation()

  if (items.length === 0) {
    return null
  }

  return (
    <TOCProvider toc={items}>
      <div
        className={cn(
          // Sticky TOC column
          "sticky top-(--folio-nav-height) flex h-[calc(100dvh-var(--folio-nav-height))] w-[268px] shrink-0 flex-col p-4 pt-12",
          // Hidden on mobile, visible on lg+
          "hidden lg:flex",
          className
        )}
        data-position={position}
      >
        <h3
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground"
          id="toc-title"
        >
          <HugeiconsIcon className="size-4" icon={TextAlignLeftIcon} />
          {t("common.onThisPage")}
        </h3>

        <TocItemList />
      </div>
    </TOCProvider>
  )
}

/**
 * Renders fumadocs' clerk TOC items from the TOCProvider context. Items are read
 * via useTOCItems so the clerk thumb can match item references when computing the
 * curved path.
 */
function TocItemList() {
  const items = useTOCItems()

  return (
    <TOCScrollArea className="flex-1">
      <TOCItems>
        {items.length === 0 && <TOCEmpty />}
        {items.map((item) => (
          <TOCItem item={item} key={item.url} />
        ))}
      </TOCItems>
    </TOCScrollArea>
  )
}
