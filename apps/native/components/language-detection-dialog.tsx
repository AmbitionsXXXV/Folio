import { Button, Dialog } from "heroui-native"
import { useTranslation } from "react-i18next"
import { Text, View } from "react-native"

interface LanguageDetectionDialogProps {
  detectedLanguageLabel: string
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function LanguageDetectionDialog({
  isOpen,
  detectedLanguageLabel,
  onConfirm,
  onCancel
}: LanguageDetectionDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <View className="mb-5 gap-1.5">
            <Dialog.Title>{t("settings.languageDetection.title")}</Dialog.Title>
            <Dialog.Description>
              {t("settings.languageDetection.description", {
                language: detectedLanguageLabel
              })}
            </Dialog.Description>
          </View>
          <View className="flex-row justify-end gap-3">
            <Button onPress={onCancel} size="sm" variant="ghost">
              <Text className="text-foreground">
                {t("settings.languageDetection.cancel")}
              </Text>
            </Button>
            <Button onPress={onConfirm} size="sm">
              <Text className="text-white">
                {t("settings.languageDetection.confirm")}
              </Text>
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
