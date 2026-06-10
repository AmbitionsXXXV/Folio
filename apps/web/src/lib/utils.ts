import { clsx } from "clsx"
import type { ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export greeting utilities from shared utils package
export { getGreetingKey, getSimpleGreetingKey } from "@folionote/utils"
