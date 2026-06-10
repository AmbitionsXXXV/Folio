import { fireEvent, render, screen } from "@testing-library/react"
import type { UIMessage } from "ai"
import type { ReactElement } from "react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, it, vi } from "vite-plus/test"

import { MessageBubble } from "../src/features/knowledge/components/message-bubble"
import type { ChatMessage } from "../src/features/knowledge/types"
import i18n from "../src/lib/i18n"

const RETRY_REGEX = /retry/i
const COPY_REGEX = /copy/i

async function renderWithI18n(ui: ReactElement) {
  if (i18n.language !== "en") {
    await i18n.changeLanguage("en")
  }

  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

describe("MessageBubble", () => {
  it("renders message actions for assistant messages", async () => {
    const message: ChatMessage = {
      id: "msg-1",
      role: "assistant",
      content: "Hello there",
      timestamp: new Date(),
      parts: [{ type: "text", text: "Hello there" }]
    }
    const onRegenerate = vi.fn()

    await renderWithI18n(
      <MessageBubble message={message} onRegenerate={onRegenerate} />
    )

    // Find buttons by their sr-only text content
    const retryButton = screen.getByRole("button", { name: RETRY_REGEX })
    const copyButton = screen.getByRole("button", { name: COPY_REGEX })

    expect(retryButton).toBeTruthy()
    expect(copyButton).toBeTruthy()

    fireEvent.click(retryButton)
    expect(onRegenerate).toHaveBeenCalledOnce()
  })

  it("renders sources from source-url parts", async () => {
    const sourcePart = {
      type: "source-url",
      url: "https://example.com",
      title: "Example"
    } as UIMessage["parts"][number]

    const message: ChatMessage = {
      id: "msg-2",
      role: "assistant",
      content: "Here is a source",
      timestamp: new Date(),
      parts: [{ type: "text", text: "Here is a source" }, sourcePart]
    }

    await renderWithI18n(<MessageBubble message={message} />)

    expect(screen.getByText("Used 1 source")).toBeTruthy()
  })
})
