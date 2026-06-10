import { UserCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTranslation } from "react-i18next"

/**
 * Profile page header component
 */
export function ProfileHeader() {
  const { t } = useTranslation()

  return (
    <div className="mb-8">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-balance">
        <HugeiconsIcon className="size-7" icon={UserCircleIcon} />
        {t("profile.title")}
      </h1>
      <p className="text-pretty text-muted-foreground">
        {t("profile.settingsDescription")}
      </p>
    </div>
  )
}
