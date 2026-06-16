import { Sidebar } from "@heroui-pro/react"
import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter
} from "@tanstack/react-router"

import { AppSidebar } from "@/components/app-sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { getUser } from "@/functions/get-user"

export const Route = createFileRoute("/_app")({
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
  component: AppLayout
})

/**
 * App layout with sidebar for authenticated product pages.
 * This layout wraps all product pages (inbox, library, tags, etc.)
 */
function AppLayout() {
  const router = useRouter()

  return (
    // h-svh pins the shell to a definite viewport height. The HeroUI Pro
    // provider only sets min-height:100svh, which lets the shell grow with
    // content so #main-content's overflow-y-auto never engages and tall pages
    // can't scroll. A definite height bounds the flex chain so the inner
    // content scrolls internally, as every product page expects.
    <Sidebar.Provider
      className="app-shell h-svh"
      collapsible="icon"
      navigate={(href) => router.navigate({ to: href })}
      variant="sidebar"
    >
      <AppSidebar />

      <Sidebar.Main>
        <MobileHeader />

        <div
          className="flex-1 overflow-y-auto overscroll-contain scroll-smooth"
          id="main-content"
          role="main"
        >
          <div className="animate-fade-in-scale">
            <Outlet />
          </div>
        </div>
      </Sidebar.Main>
    </Sidebar.Provider>
  )
}
