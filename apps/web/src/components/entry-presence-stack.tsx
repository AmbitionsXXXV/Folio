import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount
} from "@folionote/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@folionote/ui/tooltip"
import { useTranslation } from "react-i18next"

import type {
  CollabConnectionState,
  CollabParticipant
} from "@/hooks/use-entry-collab"
import { cn } from "@/lib/utils"

const MAX_VISIBLE_AVATARS = 4

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]
  if (!first) {
    return "?"
  }
  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase()
  }
  const last = parts.at(-1) ?? ""
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase()
}

interface EntryPresenceStackProps {
  participants: CollabParticipant[]
  /** The local user's display name — rendered as the amber "you" avatar at
   *  the end of the stack, distinct from everyone else's identity colors. */
  localUserName: string
  onJumpToParticipant: (participant: CollabParticipant) => void
}

/**
 * Who's here right now. Renders nothing until a second person actually
 * connects — a lone "you" avatar would just be noise. Once others are
 * present, the local user appears too (brand-accent amber, closest to the
 * sync pill), so the stack reads as the full room, not just "them".
 */
export function EntryPresenceStack({
  participants,
  localUserName,
  onJumpToParticipant
}: EntryPresenceStackProps) {
  const { t } = useTranslation()

  if (participants.length === 0) {
    return null
  }

  const visible = participants.slice(0, MAX_VISIBLE_AVATARS)
  const overflow = participants.length - visible.length
  const youLabel = `${localUserName} · ${t("editor.collabYou")}`

  return (
    <AvatarGroup>
      {visible.map((participant) => {
        const roleLabel =
          participant.role === "viewer"
            ? t("share.roleViewer")
            : t("share.roleEditor")
        const label = `${participant.name} · ${roleLabel}`
        return (
          <Tooltip key={participant.clientId}>
            <TooltipTrigger
              aria-label={label}
              className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              onClick={() => onJumpToParticipant(participant)}
            >
              <Avatar
                className="size-7"
                size="sm"
                style={{ boxShadow: `0 0 0 2px ${participant.color}` }}
              >
                <AvatarFallback
                  className="text-[0.65rem] text-white"
                  style={{ backgroundColor: participant.color }}
                >
                  {initials(participant.name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        )
      })}
      {overflow > 0 && (
        <AvatarGroupCount className="size-7 bg-surface-secondary text-[0.65rem] font-medium text-muted-foreground">
          +{overflow}
        </AvatarGroupCount>
      )}
      <Tooltip>
        <TooltipTrigger
          aria-label={youLabel}
          className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Avatar
            className="size-7"
            size="sm"
            style={{ boxShadow: "0 0 0 2px var(--primary)" }}
          >
            <AvatarFallback className="bg-primary text-[0.65rem] text-primary-foreground">
              {initials(localUserName)}
            </AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent>{youLabel}</TooltipContent>
      </Tooltip>
    </AvatarGroup>
  )
}

const SYNC_DOT_CLASS: Record<CollabConnectionState, string> = {
  connected: "bg-green-500",
  connecting: "animate-pulse bg-muted-foreground",
  disconnected: "bg-destructive"
}

const SYNC_LABEL_KEY: Record<CollabConnectionState, string> = {
  connected: "editor.collabSynced",
  connecting: "editor.collabSyncing",
  disconnected: "editor.collabReconnecting"
}

interface CollabSyncPillProps {
  connectionState: CollabConnectionState
  className?: string
}

/**
 * Live sync status for a collaborative entry. Replaces the
 * SaveStatusIndicator whenever collab is active (body content no longer
 * flows through autosave, so "Saving/Saved" would be misleading there) —
 * and unlike the presence stack, it shows even when you're alone in the
 * room, since the connection itself is what it reports on.
 */
export function CollabSyncPill({
  connectionState,
  className
}: CollabSyncPillProps) {
  const { t } = useTranslation()

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", SYNC_DOT_CLASS[connectionState])}
      />
      {t(SYNC_LABEL_KEY[connectionState])}
    </span>
  )
}
