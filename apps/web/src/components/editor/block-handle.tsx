import {
  ArrowDown01Icon,
  CodeIcon,
  Comment01Icon,
  Copy01Icon,
  Delete01Icon,
  DragDropVerticalIcon,
  File01Icon,
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  InsertRowDownIcon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  LinkSquare01Icon,
  QuoteUpIcon,
  Scissor01Icon,
  Share08Icon,
  TextColorIcon,
  TextFontIcon,
  TextIndent01Icon,
  TranslateIcon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import type { Editor } from "@tiptap/core"
import { DOMSerializer } from "@tiptap/pm/model"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { TextSelection } from "@tiptap/pm/state"
import { useCallback, useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import { useTranslation } from "react-i18next"

const cx = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ")

type TranslateFn = (key: string) => string

interface BlockHandleProps {
  editor: Editor | null
  containerRef: RefObject<HTMLDivElement | null>
}

interface HandleState {
  top: number
  /** The hovered block's DOM element; positions are derived fresh from it so a
   *  doc mutation while the menu is open can't desync a cached offset. */
  blockEl: HTMLElement
}

/** Block types the handle can convert the current block into. */
type BlockKind =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "orderedList"
  | "bulletList"
  | "codeBlock"
  | "quote"

interface TypeOption {
  kind: BlockKind
  icon: IconSvgElement
  labelKey: string
}

/**
 * The "turn into" grid, ordered to mirror Lark's block menu: text + headings on
 * the first row, lists + code + quote on the second.
 */
const TYPE_OPTIONS: TypeOption[] = [
  {
    kind: "paragraph",
    icon: TextFontIcon,
    labelKey: "editor.block.types.text"
  },
  {
    kind: "heading1",
    icon: Heading01Icon,
    labelKey: "editor.block.types.heading1"
  },
  {
    kind: "heading2",
    icon: Heading02Icon,
    labelKey: "editor.block.types.heading2"
  },
  {
    kind: "heading3",
    icon: Heading03Icon,
    labelKey: "editor.block.types.heading3"
  },
  {
    kind: "orderedList",
    icon: LeftToRightListNumberIcon,
    labelKey: "editor.block.types.orderedList"
  },
  {
    kind: "bulletList",
    icon: LeftToRightListBulletIcon,
    labelKey: "editor.block.types.bulletList"
  },
  {
    kind: "codeBlock",
    icon: CodeIcon,
    labelKey: "editor.block.types.codeBlock"
  },
  { kind: "quote", icon: QuoteUpIcon, labelKey: "editor.block.types.quote" }
]

/** Extension commands are augmented onto the chain at runtime by StarterKit. */
interface BlockCommandsChain {
  setHeading: (attrs: { level: number }) => BlockCommandsChain
  toggleBulletList: () => BlockCommandsChain
  toggleOrderedList: () => BlockCommandsChain
  toggleCodeBlock: () => BlockCommandsChain
  toggleBlockquote: () => BlockCommandsChain
  run: () => boolean
}

/** The top-level block element (direct child of `.ProseMirror`) containing `el`. */
function topLevelBlock(root: HTMLElement, el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el
  while (node && node.parentElement !== root) {
    node = node.parentElement
  }
  return node && node.parentElement === root ? node : null
}

/** Map a node to the `BlockKind` it currently is (for the active highlight). */
function currentKind(node: ProseMirrorNode): BlockKind | null {
  switch (node.type.name) {
    case "paragraph":
      return "paragraph"
    case "heading": {
      const level = node.attrs.level as number
      if (level === 1) {
        return "heading1"
      }
      if (level === 2) {
        return "heading2"
      }
      return "heading3"
    }
    case "bulletList":
      return "bulletList"
    case "orderedList":
      return "orderedList"
    case "codeBlock":
      return "codeBlock"
    case "blockquote":
      return "quote"
    default:
      return null
  }
}

/** Short label shown on the hover badge (e.g. "H1", "T"). */
function badgeLabel(node: ProseMirrorNode): string {
  switch (node.type.name) {
    case "heading":
      return `H${node.attrs.level}`
    case "bulletList":
      return "•"
    case "orderedList":
      return "1."
    case "codeBlock":
      return "{}"
    case "blockquote":
      return "❝"
    default:
      return "T"
  }
}

interface TypeGridProps {
  activeKind: BlockKind | null
  onPick: (kind: BlockKind) => void
  t: TranslateFn
}

function TypeGrid({ activeKind, onPick, t }: TypeGridProps) {
  return (
    <div className="block-handle-type-grid">
      {TYPE_OPTIONS.map((opt) => (
        <button
          aria-label={t(opt.labelKey)}
          aria-pressed={opt.kind === activeKind}
          className={cx(
            "block-handle-type-cell",
            opt.kind === activeKind && "is-active"
          )}
          key={opt.kind}
          onClick={() => onPick(opt.kind)}
          title={t(opt.labelKey)}
          type="button"
        >
          <HugeiconsIcon className="size-4" icon={opt.icon} />
        </button>
      ))}
    </div>
  )
}

interface MenuItemProps {
  icon: IconSvgElement
  label: string
  onClick?: () => void
  disabled?: boolean
  danger?: boolean
  chevron?: boolean
  title?: string
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
  danger,
  chevron,
  title
}: MenuItemProps) {
  return (
    <button
      className={cx(
        "block-handle-menu-item",
        danger && "block-handle-menu-item-danger",
        disabled && "block-handle-menu-item-disabled"
      )}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      <HugeiconsIcon className="size-4" icon={icon} />
      <span>{label}</span>
      {chevron ? (
        <span className="block-handle-menu-item-chevron">›</span>
      ) : null}
    </button>
  )
}

/**
 * Notion/Lark-style block handle: hovering a block reveals a left-gutter handle
 * with a type badge and a drag/menu button. The badge opens a "turn into" type
 * picker; the drag button opens the full block menu.
 */
export function BlockHandle({ editor, containerRef }: BlockHandleProps) {
  const { t } = useTranslation()
  const [state, setState] = useState<HandleState | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const handleRef = useRef<HTMLDivElement>(null)

  // Refs let the editor's mouse listeners read the latest open state without
  // re-subscribing, so an open menu isn't repositioned or torn down on hover.
  const menuOpenRef = useRef(false)
  const typeOpenRef = useRef(false)
  menuOpenRef.current = menuOpen
  typeOpenRef.current = typeOpen

  const closeMenus = useCallback(() => {
    setMenuOpen(false)
    setTypeOpen(false)
  }, [])

  useEffect(() => {
    if (!editor) {
      return
    }
    const editorDom = editor.view.dom as HTMLElement
    const container = containerRef.current
    if (!container) {
      return
    }

    const handleMove = (event: MouseEvent) => {
      // Keep the handle anchored while a popover is open.
      if (menuOpenRef.current || typeOpenRef.current) {
        return
      }
      const target = event.target as HTMLElement | null
      if (!target) {
        return
      }
      const blockEl = topLevelBlock(editorDom, target)
      if (!blockEl) {
        return
      }
      // Tables carry their own corner handle, so hide the gutter handle there.
      // Check for a contained <table> too, since the node view may wrap it.
      if (
        blockEl.classList.contains("table-node-wrapper") ||
        blockEl.querySelector("table")
      ) {
        setState(null)
        return
      }
      const containerRect = container.getBoundingClientRect()
      const blockRect = blockEl.getBoundingClientRect()
      setState({
        top: blockRect.top - containerRect.top,
        blockEl
      })
    }

    const handleLeave = (event: MouseEvent) => {
      if (menuOpenRef.current || typeOpenRef.current) {
        return
      }
      const related = event.relatedTarget as HTMLElement | null
      if (related && handleRef.current?.contains(related)) {
        return
      }
      setState(null)
    }

    editorDom.addEventListener("mousemove", handleMove)
    container.addEventListener("mouseleave", handleLeave)
    return () => {
      editorDom.removeEventListener("mousemove", handleMove)
      container.removeEventListener("mouseleave", handleLeave)
    }
  }, [editor, containerRef])

  // Close popovers on an outside click or Escape.
  useEffect(() => {
    if (!(menuOpen || typeOpen)) {
      return
    }
    const onDown = (event: MouseEvent) => {
      if (
        handleRef.current &&
        !handleRef.current.contains(event.target as Node)
      ) {
        closeMenus()
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenus()
      }
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [menuOpen, typeOpen, closeMenus])

  /** Resolve the hovered top-level block's range and node. */
  const resolveBlock = useCallback(() => {
    if (!(editor && state)) {
      return null
    }
    const { doc } = editor.state
    // Derive the position fresh from the DOM element each call, so it stays
    // correct even if the document mutated since the block was hovered.
    let pos: number
    try {
      pos = editor.view.posAtDOM(state.blockEl, 0)
    } catch {
      return null
    }
    if (pos < 0 || pos > doc.content.size) {
      return null
    }
    const $pos = doc.resolve(pos)
    if ($pos.depth < 1) {
      return null
    }
    const start = $pos.before(1)
    const node = $pos.node(1)
    return { start, end: start + node.nodeSize, node }
  }, [editor, state])

  /** Serialize a node to clipboard HTML + plain text. */
  const copyNode = useCallback(
    async (node: ProseMirrorNode) => {
      if (!editor) {
        return
      }
      const serializer = DOMSerializer.fromSchema(editor.schema)
      const dom = serializer.serializeNode(node) as HTMLElement
      const wrapper = document.createElement("div")
      wrapper.append(dom)
      const html = wrapper.innerHTML
      const text = node.textContent
      try {
        if (
          typeof ClipboardItem !== "undefined" &&
          navigator.clipboard?.write
        ) {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([html], { type: "text/html" }),
              "text/plain": new Blob([text], { type: "text/plain" })
            })
          ])
        } else {
          await navigator.clipboard?.writeText(text)
        }
      } catch {
        // Clipboard may be unavailable (insecure context / denied permission).
      }
    },
    [editor]
  )

  const turnInto = useCallback(
    (kind: BlockKind) => {
      if (!editor) {
        return
      }
      const block = resolveBlock()
      if (!block) {
        return
      }
      // Re-picking the current type would toggle it back off (flattening a list,
      // unwrapping a quote, stripping a code block), so make it a no-op.
      if (currentKind(block.node) === kind) {
        closeMenus()
        return
      }
      // Select the whole block and lift any list/quote wrappers via clearNodes,
      // so the conversion targets the block itself — not a nested leaf paragraph
      // (which would silently no-op for lists and blockquotes).
      const chain = editor
        .chain()
        .focus()
        .command(({ tr, dispatch }) => {
          if (dispatch) {
            const from = Math.max(0, block.start)
            const to = Math.min(tr.doc.content.size, block.end)
            tr.setSelection(
              TextSelection.between(tr.doc.resolve(from), tr.doc.resolve(to))
            )
          }
          return true
        })
        .clearNodes() as unknown as BlockCommandsChain
      switch (kind) {
        case "paragraph":
          // clearNodes already normalized the block to a paragraph.
          break
        case "heading1":
          chain.setHeading({ level: 1 })
          break
        case "heading2":
          chain.setHeading({ level: 2 })
          break
        case "heading3":
          chain.setHeading({ level: 3 })
          break
        case "orderedList":
          chain.toggleOrderedList()
          break
        case "bulletList":
          chain.toggleBulletList()
          break
        case "codeBlock":
          chain.toggleCodeBlock()
          break
        case "quote":
          chain.toggleBlockquote()
          break
        default:
          break
      }
      chain.run()
      closeMenus()
    },
    [editor, resolveBlock, closeMenus]
  )

  const handleAdd = useCallback(() => {
    if (!editor) {
      return
    }
    const block = resolveBlock()
    if (!block) {
      return
    }
    // Insert an empty paragraph below and open the slash menu inside it.
    editor
      .chain()
      .insertContentAt(block.end, { type: "paragraph" })
      .focus(block.end + 1)
      .insertContent("/")
      .run()
    closeMenus()
    setState(null)
  }, [editor, resolveBlock, closeMenus])

  const handleCopy = useCallback(() => {
    const block = resolveBlock()
    if (block) {
      void copyNode(block.node)
    }
    closeMenus()
  }, [resolveBlock, copyNode, closeMenus])

  const handleCut = useCallback(() => {
    if (!editor) {
      return
    }
    const block = resolveBlock()
    if (block) {
      void copyNode(block.node)
      editor.view.dispatch(editor.state.tr.delete(block.start, block.end))
    }
    closeMenus()
    setState(null)
  }, [editor, resolveBlock, copyNode, closeMenus])

  const handleDelete = useCallback(() => {
    if (!editor) {
      return
    }
    const block = resolveBlock()
    if (block) {
      editor.view.dispatch(editor.state.tr.delete(block.start, block.end))
    }
    closeMenus()
    setState(null)
  }, [editor, resolveBlock, closeMenus])

  if (!(editor && state)) {
    return null
  }

  const block = resolveBlock()
  const node = block?.node
  const isHeading = node?.type.name === "heading"
  const activeKind = node ? currentKind(node) : null
  const badge = node ? badgeLabel(node) : "T"
  const comingSoon = t("editor.block.comingSoon")

  return (
    <div
      className="block-handle"
      ref={handleRef}
      // Headings render a fold triangle just left of the text, so shift the
      // handle further left on headings to sit beside it rather than overlap.
      style={{ top: state.top, ...(isHeading ? { left: "-4.5rem" } : {}) }}
    >
      <button
        aria-label={t("editor.block.turnInto")}
        className="block-handle-type"
        onClick={() => {
          setMenuOpen(false)
          setTypeOpen((open) => !open)
        }}
        title={t("editor.block.turnInto")}
        type="button"
      >
        <span className="block-handle-type-label">{badge}</span>
        <HugeiconsIcon
          className="block-handle-type-caret"
          icon={ArrowDown01Icon}
        />
      </button>
      <button
        aria-label={t("editor.block.options")}
        className="block-handle-btn"
        onClick={() => {
          setTypeOpen(false)
          setMenuOpen((open) => !open)
        }}
        title={t("editor.block.options")}
        type="button"
      >
        <HugeiconsIcon className="size-4" icon={DragDropVerticalIcon} />
      </button>

      {typeOpen ? (
        <div className="block-handle-menu block-handle-typeswitch">
          <div className="block-handle-menu-label">
            {t("editor.block.turnInto")}
          </div>
          <TypeGrid activeKind={activeKind} onPick={turnInto} t={t} />
        </div>
      ) : null}

      {menuOpen ? (
        <div className="block-handle-menu block-handle-fullmenu">
          <div className="block-handle-menu-section">
            <TypeGrid activeKind={activeKind} onPick={turnInto} t={t} />
          </div>

          <div className="block-handle-menu-divider" />

          <div className="block-handle-menu-section">
            <MenuItem
              chevron
              disabled
              icon={TextIndent01Icon}
              label={t("editor.block.indentAndAlign")}
              title={comingSoon}
            />
            <MenuItem
              chevron
              disabled
              icon={TextColorIcon}
              label={t("editor.block.color")}
              title={comingSoon}
            />
          </div>

          <div className="block-handle-menu-divider" />

          <div className="block-handle-menu-section">
            <MenuItem
              disabled
              icon={Comment01Icon}
              label={t("editor.block.comment")}
              title={comingSoon}
            />
            <MenuItem
              icon={Scissor01Icon}
              label={t("editor.block.cut")}
              onClick={handleCut}
            />
            <MenuItem
              icon={Copy01Icon}
              label={t("editor.block.copy")}
              onClick={handleCopy}
            />
            <MenuItem
              disabled
              icon={TranslateIcon}
              label={t("editor.block.translate")}
              title={comingSoon}
            />
            <MenuItem
              danger
              icon={Delete01Icon}
              label={t("editor.block.delete")}
              onClick={handleDelete}
            />
          </div>

          <div className="block-handle-menu-divider" />

          <div className="block-handle-menu-section">
            <MenuItem
              disabled
              icon={Share08Icon}
              label={t("editor.block.share")}
              title={comingSoon}
            />
            <MenuItem
              disabled
              icon={File01Icon}
              label={t("editor.block.saveAsTemplate")}
              title={comingSoon}
            />
            <MenuItem
              disabled
              icon={LinkSquare01Icon}
              label={t("editor.block.copyLink")}
              title={comingSoon}
            />
          </div>

          <div className="block-handle-menu-divider" />

          <div className="block-handle-menu-section">
            <MenuItem
              icon={InsertRowDownIcon}
              label={t("editor.block.add")}
              onClick={handleAdd}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
