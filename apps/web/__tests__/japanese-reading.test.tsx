import { fireEvent, render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, it } from "vite-plus/test"

import type { JapaneseReadingWork } from "../src/components/review/japanese-analyzed-data"
import { JAPANESE_READING_WORKS } from "../src/components/review/japanese-analyzed-data"
import { JapaneseReadingView } from "../src/components/review/japanese-reading-view"
import i18n from "../src/lib/i18n"

const getWork = (id: string): JapaneseReadingWork => {
  const work = JAPANESE_READING_WORKS.find((candidate) => candidate.id === id)

  if (!work) {
    throw new Error(`Expected Japanese reading work "${id}" to exist.`)
  }

  return work
}

describe("JapaneseReadingView", () => {
  it("uses traceable public-domain works instead of invented demo copy", () => {
    expect(JAPANESE_READING_WORKS).toHaveLength(3)

    for (const work of JAPANESE_READING_WORKS) {
      expect(work.sourceName).toBe("青空文庫")
      expect(work.sourceUrl).toMatch(/^https:\/\/www\.aozora\.gr\.jp\//)
      expect(work.rights).toBe("public-domain")
      expect(work.sentences.length).toBeGreaterThan(0)
      expect(
        work.sentences.every((sentence) => sentence.tokens.length > 0)
      ).toBe(true)

      for (const sentence of work.sentences) {
        for (const token of sentence.tokens) {
          if (token.ruby) {
            expect(token.ruby.map((segment) => segment.text).join("")).toBe(
              token.surface
            )
          }
        }
      }
    }
  })

  it("switches between authentic excerpts and their source attribution", async () => {
    await i18n.changeLanguage("zh-CN")

    render(
      <I18nextProvider i18n={i18n}>
        <JapaneseReadingView />
      </I18nextProvider>
    )

    expect(screen.getByRole("heading", { name: "蜘蛛の糸" })).toBeTruthy()
    expect(
      screen
        .getByRole("link", { name: "在青空文庫阅读原文" })
        .getAttribute("href")
    ).toBe(getWork("kumo-no-ito").sourceUrl)

    fireEvent.change(screen.getByLabelText("选择作品"), {
      target: { value: "gon-gitsune" }
    })

    expect(screen.getByRole("heading", { name: "ごん狐" })).toBeTruthy()
    expect(
      screen.getByText("这是我小时候从村里一位叫茂平的老人那里听来的故事。")
    ).toBeTruthy()
    expect(
      screen
        .getByRole("link", { name: "在青空文庫阅读原文" })
        .getAttribute("href")
    ).toBe(getWork("gon-gitsune").sourceUrl)
  })
})
