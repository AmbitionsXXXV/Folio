import { createFileRoute, redirect } from "@tanstack/react-router"

import { JapaneseReadingView } from "@/components/review"
import { getUser } from "@/functions/get-user"

export const Route = createFileRoute("/jp-reading")({
  beforeLoad: async ({ location }) => {
    const session = await getUser()
    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href }
      })
    }
    return { session }
  },
  component: JpReadingPage
})
function JpReadingPage() {
  return <JapaneseReadingView />
}
