import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { motion } from "motion/react"

import { SettingsNavTabs, SettingsSidebar } from "@/components/settings"

export const Route = createFileRoute("/_app/settings")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/settings") {
      throw redirect({ to: "/settings/general" })
    }
  },
  component: SettingsLayout
})

function SettingsLayout() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-dvh md:flex-row">
      <div className="hidden md:flex">
        <SettingsSidebar />
      </div>

      <div className="md:hidden">
        <SettingsNavTabs />
      </div>

      <div className="flex-1 overflow-hidden bg-background">
        <div className="no-scrollbar h-full overflow-y-auto">
          <motion.div
            animate={{ opacity: 1 }}
            initial={{ opacity: 0 }}
            key={Route.fullPath}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
