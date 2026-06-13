import { createFileRoute, redirect } from "@tanstack/react-router"

import { JapaneseExamView } from "@/components/review"
import { getUser } from "@/functions/get-user"

export const Route = createFileRoute("/jp-exam")({
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
  component: JpExamPage
})
function JpExamPage() {
  return <JapaneseExamView />
}
