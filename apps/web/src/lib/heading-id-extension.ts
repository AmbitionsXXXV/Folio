import { Extension } from "@tiptap/core"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

import { slugifyHeading } from "@/lib/toc"

// Only H1-H3 appear in the TOC (see parseTocFromContent); match that scope and
// ordering so the generated ids line up with the TOC item anchors.
const MAX_TOC_HEADING_LEVEL = 3

/**
 * Build node decorations that give each H1-H3 heading a stable slug `id`,
 * matching the ids produced by parseTocFromContent (slugifyHeading + a numeric
 * suffix for duplicates).
 *
 * Decorations are re-applied by ProseMirror on every redraw, so the ids persist
 * even while the editor is editable — which the old imperative DOM mutation
 * (assignHeadingIds) could not guarantee, because ProseMirror owns and resets
 * its DOM. The fumadocs TOC locates headings via document.getElementById, so
 * stable ids are what make active-section tracking work.
 */
function buildHeadingIdDecorations(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = []
  const slugCounts = new Map<string, number>()

  doc.descendants((node, pos) => {
    if (node.type.name !== "heading") {
      return
    }

    const level = (node.attrs.level as number | undefined) ?? 1
    if (level > MAX_TOC_HEADING_LEVEL) {
      return
    }

    const text = node.textContent.trim()
    if (!text) {
      return
    }

    const base = slugifyHeading(text) || "heading"
    const count = slugCounts.get(base) ?? 0
    slugCounts.set(base, count + 1)
    const id = count === 0 ? base : `${base}-${count}`

    decorations.push(Decoration.node(pos, pos + node.nodeSize, { id }))
  })

  return DecorationSet.create(doc, decorations)
}

const headingIdsPluginKey = new PluginKey<DecorationSet>("headingIds")

/**
 * TipTap extension that keeps stable slug ids on headings so the fumadocs TOC
 * can track the active section via document.getElementById.
 */
export const HeadingIds = Extension.create({
  name: "headingIds",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: headingIdsPluginKey,
        state: {
          init: (_config, { doc }) => buildHeadingIdDecorations(doc),
          apply: (tr, value) =>
            tr.docChanged ? buildHeadingIdDecorations(tr.doc) : value
        },
        props: {
          decorations(state) {
            return headingIdsPluginKey.getState(state)
          }
        }
      })
    ]
  }
})
