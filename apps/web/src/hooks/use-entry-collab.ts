import { hashUserIdToColor } from "@folionote/editor-core/collab"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { useCallback, useEffect, useState } from "react"

import { getCollabUrl } from "@/utils/api-environment"

export interface CollabParticipant {
  clientId: number
  userId: string
  name: string
  color: string
}

export type CollabConnectionState = "connecting" | "connected" | "disconnected"

export interface UseEntryCollabOptions {
  entryId: string
  /** Only connects when true — solo entries never open a socket. */
  enabled: boolean
  userId: string
  userName: string
}

export interface UseEntryCollabResult {
  /** null until the connection is being set up (or collab is disabled). */
  provider: HocuspocusProvider | null
  connectionState: CollabConnectionState
  /** Everyone else in the room — never includes the local user. */
  participants: CollabParticipant[]
  /** This client's own identity color — same hash every other participant
   *  computes for this userId, so pass it straight to CollaborationCaret. */
  localColor: string
  /** Best-effort: scrolls to a participant's rendered caret, matched by
   *  their CollaborationCaret label text (Tiptap doesn't expose a stable
   *  per-user selector, only the `collaboration-carets__label` class). */
  jumpToParticipant: (participant: CollabParticipant) => void
}

interface AwarenessUserState {
  userId?: string
  name?: string
  color?: string
}

/**
 * Owns a HocuspocusProvider for one entry's collaborative session:
 * connects on mount, tears down on unmount or when `entryId`/`enabled`
 * changes, and exposes connection state + live participants from Yjs
 * Awareness (see https://docs.yjs.dev — `awareness.on('change', ...)` is
 * the documented way to react to any local/remote awareness state change).
 */
export function useEntryCollab({
  entryId,
  enabled,
  userId,
  userName
}: UseEntryCollabOptions): UseEntryCollabResult {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)
  const [connectionState, setConnectionState] =
    useState<CollabConnectionState>("connecting")
  const [participants, setParticipants] = useState<CollabParticipant[]>([])
  const localColor = hashUserIdToColor(userId)

  useEffect(() => {
    if (!enabled) {
      setProvider(null)
      setParticipants([])
      return
    }

    setConnectionState("connecting")

    const instance = new HocuspocusProvider({
      url: getCollabUrl(),
      name: entryId,
      onStatus: ({ status }) => {
        setConnectionState(status === "connected" ? "connected" : "connecting")
      },
      onDisconnect: () => setConnectionState("disconnected"),
      onAuthenticationFailed: () => setConnectionState("disconnected")
    })

    instance.awareness?.setLocalStateField("user", {
      userId,
      name: userName,
      color: localColor
    } satisfies AwarenessUserState)

    const updateParticipants = () => {
      const localClientId = instance.document.clientID
      const states = instance.awareness?.getStates().entries() ?? []

      const next: CollabParticipant[] = []
      for (const [clientId, state] of states) {
        if (clientId === localClientId) {
          continue
        }
        const user = (state as { user?: AwarenessUserState }).user
        if (!user?.userId) {
          continue
        }
        next.push({
          clientId,
          userId: user.userId,
          name: user.name || "Someone",
          color: user.color || "#8a8a8a"
        })
      }
      setParticipants(next)
    }

    instance.awareness?.on("change", updateParticipants)
    updateParticipants()
    setProvider(instance)

    return () => {
      instance.awareness?.off("change", updateParticipants)
      instance.destroy()
      setProvider(null)
      setParticipants([])
    }
  }, [enabled, entryId, userId, userName, localColor])

  const jumpToParticipant = useCallback((participant: CollabParticipant) => {
    const labels = document.querySelectorAll<HTMLElement>(
      ".collaboration-carets__label"
    )
    const match = [...labels].find(
      (label) => label.textContent === participant.name
    )
    match?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [])

  return {
    provider,
    connectionState,
    participants,
    localColor,
    jumpToParticipant
  }
}
