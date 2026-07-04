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

const CONNECTION_DOT_CLASS: Record<CollabConnectionState, string> = {
  connected: "bg-green-500",
  connecting: "bg-muted-foreground",
  disconnected: "bg-destructive"
}

interface EntryPresenceStackProps {
  participants: CollabParticipant[]
  connectionState: CollabConnectionState
  onJumpToParticipant: (participant: CollabParticipant) => void
}

/**
 * Who's here right now. Renders nothing until a second person actually
 * connects — a lone "you" avatar would just be noise (this component only
 * ever receives *other* participants; see useEntryCollab).
 */
export function EntryPresenceStack({
  participants,
  connectionState,
  onJumpToParticipant
}: EntryPresenceStackProps) {
  const { t } = useTranslation()

  if (participants.length === 0) {
    return null
  }

  const visible = participants.slice(0, MAX_VISIBLE_AVATARS)
  const overflow = participants.length - visible.length

  const connectionLabelKey: Record<CollabConnectionState, string> = {
    connected: "editor.collabSynced",
    connecting: "editor.collabSyncing",
    disconnected: "editor.collabReconnecting"
  }
  const connectionLabel = t(connectionLabelKey[connectionState])

  return (
    <div className="flex items-center gap-2">
      <AvatarGroup>
        {visible.map((participant) => (
          <Tooltip key={participant.clientId}>
            <TooltipTrigger
              aria-label={participant.name}
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
            <TooltipContent>{participant.name}</TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <AvatarGroupCount className="size-7 bg-surface-secondary text-[0.65rem] font-medium text-muted-foreground">
            +{overflow}
          </AvatarGroupCount>
        )}
      </AvatarGroup>

      <Tooltip>
        <TooltipTrigger
          aria-label={connectionLabel}
          className="inline-flex size-2 items-center justify-center rounded-full outline-none"
        >
          <span
            className={`block size-full rounded-full ${CONNECTION_DOT_CLASS[connectionState]}`}
          />
        </TooltipTrigger>
        <TooltipContent>{connectionLabel}</TooltipContent>
      </Tooltip>
    </div>
  )
}
