import { render, screen } from "@testing-library/react"
import type { UIMessage } from "ai"
import type { ReactElement } from "react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, it } from "vite-plus/test"

import { MessageList } from "../src/features/knowledge/components/message-list"
import type { ChatMessage } from "../src/features/knowledge/types"
import i18n from "../src/lib/i18n"

const SAMPLE_THINKING = "Draft a response plan."

async function renderWithI18n(ui: ReactElement) {
  if (i18n.language !== "en") {
    await i18n.changeLanguage("en")
  }

  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

describe("MessageList", () => {
  it("uses reasoning for waiting state", async () => {
    await renderWithI18n(
      <MessageList isPending messages={[]} thinkingEnabled={true} />
    )

    expect(screen.getByText("Thinking…")).toBeTruthy()
  })

  it("renders tool calls under reasoning when thinking is present", async () => {
    const toolInvocation = {
      type: "tool-getStockPrice",
      state: "input-available",
      toolCallId: "tool-call-1",
      input: {
        symbol: "AAPL"
      }
    } satisfies UIMessage["parts"][number]

    const message: ChatMessage = {
      id: "msg-1",
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: false,
      thinking: SAMPLE_THINKING,
      parts: [toolInvocation]
    }

    await renderWithI18n(
      <MessageList
        isPending={false}
        messages={[message]}
        thinkingEnabled={true}
      />
    )

    expect(screen.getByText(SAMPLE_THINKING)).toBeTruthy()
    expect(screen.getByText("Stock")).toBeTruthy()
  })
})
