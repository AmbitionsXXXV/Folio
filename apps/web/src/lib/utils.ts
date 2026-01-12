import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

// Re-export greeting utilities from shared utils package
export { getGreetingKey, getSimpleGreetingKey } from '@folionote/utils'
