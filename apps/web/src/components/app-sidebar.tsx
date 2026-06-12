import { cn } from "@folionote/ui/lib/utils"
import {
  Activity01Icon,
  AiBrain01Icon,
  Atom02Icon,
  BookOpen01Icon,
  InboxIcon,
  Link01Icon,
  Rocket01Icon,
  Search01Icon,
  Tag01Icon
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link, useMatchRoute, useRouterState } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/sidebar"
import { useCommandPalette } from "@/contexts/command-palette-context"

import UserMenu from "./user-menu"

interface NavItem {
  to: string
  labelKey: string
  icon: IconSvgElement
}

const mainNavItems: NavItem[] = [
  { to: "/activity", labelKey: "nav.activity", icon: Activity01Icon },
  { to: "/inbox", labelKey: "nav.inbox", icon: InboxIcon },
  { to: "/library", labelKey: "nav.library", icon: BookOpen01Icon }
]

const secondaryNavItems: NavItem[] = [
  { to: "/tags", labelKey: "nav.tags", icon: Tag01Icon },
  { to: "/sources", labelKey: "nav.sources", icon: Link01Icon },
  { to: "/graph", labelKey: "nav.graph", icon: Atom02Icon },
  { to: "/review", labelKey: "nav.review", icon: Rocket01Icon },
  { to: "/knowledge", labelKey: "nav.knowledge", icon: AiBrain01Icon }
]

function NavItems({ items }: { items: NavItem[] }) {
  const { t } = useTranslation()
  const matchRoute = useMatchRoute()
  const pendingLocation = useRouterState({
    select: (state) => (state.isTransitioning ? state.location.pathname : null)
  })

  return (
    <SidebarMenu>
      {items.map(({ to, labelKey, icon }) => {
        const isActive = matchRoute({ to, fuzzy: true })
        const isPending = pendingLocation?.startsWith(to) ?? false

        return (
          <SidebarMenuItem key={to}>
            <SidebarMenuButton
              className={cn(
                "relative gap-3 transition-all duration-200",
                isPending && "opacity-70",
                (isActive || isPending) && "bg-sidebar-accent/60 font-medium"
              )}
              isActive={!!isActive || isPending}
              render={<Link preload="intent" to={to} />}
              tooltip={t(labelKey)}
            >
              {(isActive || isPending) && (
                <span className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <HugeiconsIcon
                className={cn(
                  "size-5 transition-colors",
                  isActive || isPending
                    ? "text-primary"
                    : "text-muted-foreground",
                  isPending && "animate-pulse"
                )}
                icon={icon}
                strokeWidth={isActive || isPending ? 2.5 : 2}
              />
              <span>{t(labelKey)}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

function SearchButton() {
  const { t } = useTranslation()
  const { setOpen } = useCommandPalette()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border border-border/50 bg-surface-secondary/30 px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-surface-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isCollapsed && "justify-center px-0"
      )}
      onClick={() => setOpen(true)}
      type="button"
    >
      <HugeiconsIcon className="size-4 shrink-0" icon={Search01Icon} />
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left">{t("nav.search")}</span>
          <kbd className="pointer-events-none hidden h-5 items-center gap-1 rounded border border-border/40 bg-surface-secondary/40 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/70 select-none md:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </>
      )}
    </button>
  )
}

export function AppSidebar() {
  const { t } = useTranslation()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="p-4">
        <Link
          className="font-script-en flex items-center gap-3 font-script text-2xl font-bold text-primary"
          to="/"
        >
          <img
            alt="FolioNote"
            className="size-8 rounded-full"
            src="/svg/icon.svg"
          />
          <span className="group-data-[collapsible=icon]:hidden">
            FolioNote
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className="px-3 text-xs font-medium tracking-wide uppercase">
            {t("nav.sectionMain", "Main")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="mb-1 group-data-[collapsible=icon]:hidden">
              <SearchButton />
            </div>
            <NavItems items={mainNavItems} />
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-4 h-px bg-border/50" />

        <SidebarGroup className="px-2">
          <SidebarGroupLabel className="px-3 text-xs font-medium tracking-wide uppercase">
            {t("nav.sectionExplore", "Explore")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <NavItems items={secondaryNavItems} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/40 p-2">
        <UserMenu collapsed={isCollapsed} />
      </SidebarFooter>
    </Sidebar>
  )
}
