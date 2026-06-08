import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize a user-provided profile name.
 * Strips HTML tags, removes non-word characters, trims to 20 chars.
 * Falls back to "Anonymous" if empty after sanitization.
 */
export function sanitizeName(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s]/g, '')
    .trim()
    .slice(0, 20) || 'Anonymous';
}
