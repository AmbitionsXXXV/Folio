import type {
  SlashCommandDefinition,
  SlashCommandItem,
  TranslateFunction
} from "../types"
import { getDefaultSlashCommands } from "./defaults"

/**
 * Resolve command definitions to items with translated strings
 */
export function resolveCommands(
  definitions: SlashCommandDefinition[],
  t: TranslateFunction
): SlashCommandItem[] {
  return definitions.map((def) => ({
    id: def.id,
    title: t(def.titleKey),
    description: t(def.descriptionKey),
    iconId: def.iconId,
    keywords: def.keywords,
    group: def.groupKey ? t(def.groupKey) : undefined,
    command: ({ editor, range }) => {
      def.execute({ editor, range })
    }
  }))
}

/**
 * Get resolved default commands with translations
 */
export function getResolvedDefaultCommands(
  t: TranslateFunction
): SlashCommandItem[] {
  return resolveCommands(getDefaultSlashCommands(), t)
}
