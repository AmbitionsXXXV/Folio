/**
 * Truncate text to maxLength characters, appending ellipsis when truncated.
 * Does not subtract ellipsis length from the slice (result may exceed maxLength by ellipsis length).
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @param ellipsis - Suffix when truncated (default: '…')
 */
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis = "…"
): string {
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength)}${ellipsis}`
}
