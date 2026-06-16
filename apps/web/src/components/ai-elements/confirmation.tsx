"use client"

import { Button } from "@folionote/ui/button"
import type { ToolUIPart } from "ai"
import type { ComponentProps, ReactNode } from "react"
import { createContext, useContext } from "react"

import { cn } from "@/lib/utils"

type ToolUIPartApproval =
  | {
      id: string
      approved?: never
      reason?: never
    }
  | {
      id: string
      approved: boolean
      reason?: string
    }
  | undefined

interface ConfirmationContextValue {
  approval: ToolUIPartApproval
  state: ToolUIPart["state"]
}

const ConfirmationContext = createContext<ConfirmationContextValue | null>(null)

const useConfirmation = () => {
  const context = useContext(ConfirmationContext)
  if (!context) {
    throw new Error("Confirmation components must be used within Confirmation")
  }
  return context
}

export type ConfirmationProps = ComponentProps<"div"> & {
  approval?: ToolUIPartApproval
  state: ToolUIPart["state"]
}

export const Confirmation = ({
  className,
  approval,
  state,
  ...props
}: ConfirmationProps) => {
  if (!approval || state === "input-streaming" || state === "input-available") {
    return null
  }

  return (
    <ConfirmationContext.Provider value={{ approval, state }}>
      <div
        className={cn(
          "flex flex-col gap-2 rounded-lg border border-border/60 bg-surface-secondary/20 p-3 text-sm",
          className
        )}
        {...props}
      />
    </ConfirmationContext.Provider>
  )
}

export type ConfirmationTitleProps = ComponentProps<"div">

export const ConfirmationTitle = ({
  className,
  ...props
}: ConfirmationTitleProps) => (
  <div className={cn("inline text-sm", className)} {...props} />
)

export interface ConfirmationRequestProps {
  children?: ReactNode
}

export const ConfirmationRequest = ({ children }: ConfirmationRequestProps) => {
  const { state } = useConfirmation()

  if (state !== "approval-requested") {
    return null
  }

  return children
}

export interface ConfirmationAcceptedProps {
  children?: ReactNode
}

export const ConfirmationAccepted = ({
  children
}: ConfirmationAcceptedProps) => {
  const { approval, state } = useConfirmation()

  if (
    !approval?.approved ||
    (state !== "approval-responded" &&
      state !== "output-denied" &&
      state !== "output-available")
  ) {
    return null
  }

  return children
}

export interface ConfirmationRejectedProps {
  children?: ReactNode
}

export const ConfirmationRejected = ({
  children
}: ConfirmationRejectedProps) => {
  const { approval, state } = useConfirmation()

  if (
    approval?.approved !== false ||
    (state !== "approval-responded" &&
      state !== "output-denied" &&
      state !== "output-available")
  ) {
    return null
  }

  return children
}

export type ConfirmationActionsProps = ComponentProps<"div">

export const ConfirmationActions = ({
  className,
  ...props
}: ConfirmationActionsProps) => {
  const { state } = useConfirmation()

  if (state !== "approval-requested") {
    return null
  }

  return (
    <div
      className={cn("flex items-center justify-end gap-2 self-end", className)}
      {...props}
    />
  )
}

export type ConfirmationActionProps = ComponentProps<typeof Button>

export const ConfirmationAction = (props: ConfirmationActionProps) => (
  <Button className="h-8 px-3 text-sm" type="button" {...props} />
)
