import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

interface ShareFooterProps {
  showBranding: boolean
}

/**
 * Footer component for share page
 */
export function ShareFooter({ showBranding }: ShareFooterProps) {
  const { t } = useTranslation()

  if (!showBranding) {
    return null
  }

  return (
    <footer className="border-t py-8">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-pretty text-muted-foreground">
          {t("share.poweredBy")}{" "}
          <Link className="font-medium underline" to="/">
            FolioNote
          </Link>
        </p>
      </div>
    </footer>
  )
}
