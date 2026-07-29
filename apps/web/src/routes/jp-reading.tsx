import { createFileRoute } from "@tanstack/react-router"

import { JapaneseReadingView } from "@/components/review"

export const Route = createFileRoute("/jp-reading")({
  component: JpReadingPage
})
function JpReadingPage() {
  return <JapaneseReadingView />
}
