import { Extension } from "@tiptap/core"
import type { Editor } from "@tiptap/core"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

/**
 * Foldable headings.
 *
 * Adds a `collapsed` attribute to heading nodes and a plugin that:
 *  - renders a fold toggle (▾) in the heading's left gutter, and
 *  - hides every following block until the next heading of equal/higher level
 *    while a heading is collapsed (via `display: none` node decorations).
 *
 * The attribute lives on the node, so the fold state persists with the document.
 * Implemented with `addGlobalAttributes` so it composes with StarterKit's
 * heading without replacing it.
 */

const foldableHeadingsKey = new PluginKey("foldableHeadings")

/** Build the fold-toggle button DOM for a heading at `headingPos`. */
function createFoldToggle(
  editor: Editor,
  headingPos: number,
  collapsed: boolean
): HTMLButtonElement {
  const button = document.createElement("button")
  button.type = "button"
  button.className = `heading-fold-toggle${collapsed ? " is-collapsed" : ""}`
  button.contentEditable = "false"
  button.setAttribute(
    "aria-label",
    collapsed ? "Expand section" : "Collapse section"
  )
  button.setAttribute("aria-expanded", collapsed ? "false" : "true")
  button.addEventListener("mousedown", (event) => {
    // Toggle without moving the selection or stealing focus from the editor.
    event.preventDefault()
    event.stopPropagation()
    const node = editor.state.doc.nodeAt(headingPos)
    if (node && node.type.name === "heading") {
      editor.view.dispatch(
        editor.state.tr.setNodeAttribute(
          headingPos,
          "collapsed",
          !node.attrs.collapsed
        )
      )
    }
  })
  return button
}

/** Collect the top-level children of the document with their positions. */
function topLevelBlocks(doc: ProseMirrorNode) {
  const blocks: { node: ProseMirrorNode; offset: number }[] = []
  let offset = 0
  for (let i = 0; i < doc.childCount; i++) {
    const node = doc.child(i)
    blocks.push({ node, offset })
    offset += node.nodeSize
  }
  return blocks
}

function buildDecorations(editor: Editor): DecorationSet {
  const { doc } = editor.state
  const blocks = topLevelBlocks(doc)
  const decorations: Decoration[] = []

  for (const [i, block] of blocks.entries()) {
    if (block.node.type.name !== "heading") {
      continue
    }

    const collapsed = block.node.attrs.collapsed === true

    // Fold toggle, rendered at the start of the heading's text.
    decorations.push(
      Decoration.widget(
        block.offset + 1,
        () => createFoldToggle(editor, block.offset, collapsed),
        {
          side: -1,
          key: `heading-fold-${block.offset}-${collapsed}`,
          ignoreSelection: true,
          stopEvent: () => true
        }
      )
    )

    if (!collapsed) {
      continue
    }

    // Hide following blocks until the next heading of equal/higher level.
    const level = block.node.attrs.level as number
    for (const next of blocks.slice(i + 1)) {
      if (
        next.node.type.name === "heading" &&
        (next.node.attrs.level as number) <= level
      ) {
        break
      }
      decorations.push(
        Decoration.node(next.offset, next.offset + next.node.nodeSize, {
          class: "pm-folded-hidden"
        })
      )
    }
  }

  return DecorationSet.create(doc, decorations)
}

export const FoldableHeadings = Extension.create({
  name: "foldableHeadings",

  addGlobalAttributes() {
    return [
      {
        types: ["heading"],
        attributes: {
          collapsed: {
            default: false,
            keepOnSplit: false,
            parseHTML: (element) => element.dataset.collapsed === "true",
            renderHTML: (attributes) =>
              attributes.collapsed ? { "data-collapsed": "true" } : {}
          }
        }
      }
    ]
  },

  addProseMirrorPlugins() {
    const { editor } = this
    return [
      new Plugin({
        key: foldableHeadingsKey,
        props: {
          decorations: () => buildDecorations(editor)
        }
      })
    ]
  }
})
