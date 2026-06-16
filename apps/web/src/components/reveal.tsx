import type * as React from "react"
import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

interface RevealProps extends React.ComponentProps<"div"> {
  /** Stagger delay in ms before the entrance transition starts. */
  delay?: number
  /** Vertical travel distance in px. */
  y?: number
}

/**
 * Scroll-triggered entrance that brings the landing page's staggered reveals
 * into the app — tasteful, dependency-free (IntersectionObserver), and fully
 * disabled under `prefers-reduced-motion`.
 *
 * Stagger a list by passing an increasing `delay` per item (e.g. `index * 80`).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
  style,
  ...props
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={cn(
        "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        className
      )}
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : `translateY(${y}px)`,
        transitionDelay: `${delay}ms`,
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  )
}
