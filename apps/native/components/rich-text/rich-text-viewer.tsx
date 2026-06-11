import type { JSONContent } from "@tiptap/core"
import { renderJSONContentToReactElement } from "@tiptap/static-renderer/json/react"
import type { MarkProps, NodeProps } from "@tiptap/static-renderer/json/react"
import { Children, useMemo } from "react"
import type { ReactNode } from "react"
import { Linking, Platform, StyleSheet, Text, View } from "react-native"

interface RichTextViewerProps {
  /** ProseMirror JSON content string */
  content: string
  /** Dark mode */
  isDark?: boolean
}

interface Palette {
  foreground: string
  primary: string
  border: string
  codeBackground: string
  codeForeground: string
}

const DARK_COLORS: Palette = {
  foreground: "#e8e4e1",
  primary: "#a78bfa",
  border: "#3f3f46",
  codeBackground: "#0d1117",
  codeForeground: "#e6edf3"
}

const LIGHT_COLORS: Palette = {
  foreground: "#1f2937",
  primary: "#8b5cf6",
  border: "#e5e7eb",
  codeBackground: "#f3f4f6",
  codeForeground: "#1f2937"
}

const MONO_FONT = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace"
})

const ALLOWED_LINK_SCHEMES = new Set(["http", "https", "mailto", "tel"])
const URL_SCHEME_REGEX = /^([a-z][a-z0-9+.-]*):/i

function openLink(href?: string): void {
  if (!href) {
    return
  }
  // Stored note content is untrusted: only open vetted schemes and reject
  // custom/deep-link schemes (intent://, app schemes) that could trigger
  // unintended native side effects on tap.
  const scheme = URL_SCHEME_REGEX.exec(href.trim())?.[1]?.toLowerCase()
  if (!scheme || !ALLOWED_LINK_SCHEMES.has(scheme)) {
    return
  }
  // Swallow: unsupported/invalid URL schemes shouldn't crash the viewer.
  Linking.openURL(href).catch(() => undefined)
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { padding: 16 },
    paragraph: {
      color: c.foreground,
      fontSize: 16,
      lineHeight: 26,
      marginBottom: 12
    },
    paragraphTight: { color: c.foreground, fontSize: 16, lineHeight: 26 },
    h1: {
      color: c.foreground,
      fontSize: 28,
      fontWeight: "700",
      lineHeight: 34,
      marginBottom: 12,
      marginTop: 4
    },
    h2: {
      color: c.foreground,
      fontSize: 22,
      fontWeight: "600",
      lineHeight: 29,
      marginBottom: 10,
      marginTop: 4
    },
    h3: {
      color: c.foreground,
      fontSize: 18,
      fontWeight: "600",
      lineHeight: 25,
      marginBottom: 8,
      marginTop: 4
    },
    list: { marginBottom: 12 },
    listRow: { flexDirection: "row", marginBottom: 4 },
    marker: {
      color: c.foreground,
      fontSize: 16,
      lineHeight: 26,
      marginRight: 8,
      minWidth: 18
    },
    listItemContent: { flex: 1 },
    blockquote: {
      borderLeftColor: c.primary,
      borderLeftWidth: 3,
      marginBottom: 12,
      paddingLeft: 16
    },
    codeBlock: {
      backgroundColor: c.codeBackground,
      borderRadius: 8,
      marginBottom: 12,
      padding: 16
    },
    codeBlockText: {
      color: c.codeForeground,
      fontFamily: MONO_FONT,
      fontSize: 14,
      lineHeight: 21
    },
    inlineCode: {
      backgroundColor: c.codeBackground,
      borderRadius: 4,
      color: c.foreground,
      fontFamily: MONO_FONT,
      fontSize: 14,
      paddingHorizontal: 4
    },
    hr: { backgroundColor: c.border, height: 1, marginVertical: 24 },
    bold: { fontWeight: "700" },
    italic: { fontStyle: "italic" },
    strike: { textDecorationLine: "line-through" },
    link: { color: c.primary, textDecorationLine: "underline" }
  })
}

type Styles = ReturnType<typeof createStyles>

function headingStyle(styles: Styles, level: number) {
  if (level === 1) {
    return styles.h1
  }
  if (level === 2) {
    return styles.h2
  }
  return styles.h3
}

/**
 * Build a render function that turns ProseMirror JSON into React Native
 * elements. Every node and mark is mapped explicitly — text always lands inside
 * a <Text>, blocks become <View>/<Text>, so no raw strings leak into a <View>.
 */
function buildRenderDoc(styles: Styles) {
  return renderJSONContentToReactElement({
    nodeMapping: {
      doc: ({ children }: NodeProps) => <>{children}</>,
      paragraph: ({ parent, children }: NodeProps) => (
        <Text
          style={
            parent?.type === "listItem"
              ? styles.paragraphTight
              : styles.paragraph
          }
        >
          {children}
        </Text>
      ),
      heading: ({ node, children }: NodeProps) => (
        <Text style={headingStyle(styles, Number(node?.attrs?.level) || 1)}>
          {children}
        </Text>
      ),
      bulletList: ({ children }: NodeProps) => (
        <View style={styles.list}>
          {Children.map(children as ReactNode, (child) => (
            <View style={styles.listRow}>
              <Text style={styles.marker}>{"•"}</Text>
              {child}
            </View>
          ))}
        </View>
      ),
      orderedList: ({ node, children }: NodeProps) => {
        const start = Number(node?.attrs?.start) || 1
        return (
          <View style={styles.list}>
            {Children.map(children as ReactNode, (child, index) => (
              <View style={styles.listRow}>
                <Text style={styles.marker}>{`${start + index}.`}</Text>
                {child}
              </View>
            ))}
          </View>
        )
      },
      listItem: ({ children }: NodeProps) => (
        <View style={styles.listItemContent}>{children}</View>
      ),
      blockquote: ({ children }: NodeProps) => (
        <View style={styles.blockquote}>{children}</View>
      ),
      codeBlock: ({ children }: NodeProps) => (
        <View style={styles.codeBlock}>
          <Text style={styles.codeBlockText}>{children}</Text>
        </View>
      ),
      horizontalRule: () => <View style={styles.hr} />,
      hardBreak: () => "\n",
      text: ({ node }: NodeProps) => node?.text ?? ""
    },
    markMapping: {
      bold: ({ children }: MarkProps) => (
        <Text style={styles.bold}>{children}</Text>
      ),
      italic: ({ children }: MarkProps) => (
        <Text style={styles.italic}>{children}</Text>
      ),
      strike: ({ children }: MarkProps) => (
        <Text style={styles.strike}>{children}</Text>
      ),
      code: ({ children }: MarkProps) => (
        <Text style={styles.inlineCode}>{children}</Text>
      ),
      link: ({ mark, children }: MarkProps) => (
        <Text
          accessibilityRole="link"
          onPress={() => openLink(mark?.attrs?.href)}
          style={styles.link}
        >
          {children}
        </Text>
      )
    },
    unhandledNode: () => null,
    unhandledMark: ({ children }: MarkProps) => <>{children}</>
  })
}

function parseDoc(content: string): JSONContent | null {
  if (!content) {
    return null
  }
  try {
    return JSON.parse(content) as JSONContent
  } catch {
    return null
  }
}

/**
 * Read-only rich text viewer.
 *
 * Renders ProseMirror JSON natively (no WebView / Expo DOM) via Tiptap's static
 * renderer, mapping each node and mark to React Native primitives.
 */
export default function RichTextViewer({
  content,
  isDark = false
}: RichTextViewerProps) {
  return useMemo(() => {
    const styles = createStyles(isDark ? DARK_COLORS : LIGHT_COLORS)
    const doc = parseDoc(content)
    const body = doc ? buildRenderDoc(styles)({ content: doc }) : null
    return <View style={styles.container}>{body}</View>
  }, [content, isDark])
}
