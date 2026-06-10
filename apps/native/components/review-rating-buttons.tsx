import {
  FlashIcon,
  HelpCircleIcon,
  RefreshIcon,
  Tick01Icon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react-native"
import { Button, useThemeColor } from "heroui-native"
import { useTranslation } from "react-i18next"
import { ActivityIndicator, Text, View } from "react-native"

type Rating = "again" | "hard" | "good" | "easy"

interface ReviewRatingButtonsProps {
  onRating: (rating: Rating) => void
  isPending: boolean
}

export function ReviewRatingButtons({
  onRating,
  isPending
}: ReviewRatingButtonsProps) {
  const { t } = useTranslation()
  const accentColor = useThemeColor("accent")
  const successColor = useThemeColor("success")
  const dangerColor = useThemeColor("danger")
  const warningColor = useThemeColor("warning")

  return (
    <View className="mt-4">
      <View className="flex-row justify-between">
        {/* Again */}
        <Button
          className="bg-danger/10 mr-2 flex-1 items-center active:opacity-70"
          isDisabled={isPending}
          onPress={() => onRating("again")}
        >
          <HugeiconsIcon color={dangerColor} icon={RefreshIcon} size={24} />
          <Text className="text-danger mt-1 text-sm font-medium">
            {t("review.again")}
          </Text>
        </Button>

        {/* Hard */}
        <Button
          className="bg-warning/10 mr-2 flex-1 items-center active:opacity-70"
          isDisabled={isPending}
          onPress={() => onRating("hard")}
        >
          <HugeiconsIcon color={warningColor} icon={HelpCircleIcon} size={24} />
          <Text className="text-warning mt-1 text-sm font-medium">
            {t("review.hard")}
          </Text>
        </Button>

        {/* Good */}
        <Button
          className="bg-success/10 mr-2 flex-1 items-center active:opacity-70"
          isDisabled={isPending}
          onPress={() => onRating("good")}
        >
          <HugeiconsIcon color={successColor} icon={Tick01Icon} size={24} />
          <Text className="text-success mt-1 text-sm font-medium">
            {t("review.good")}
          </Text>
        </Button>

        {/* Easy */}
        <Button
          className="flex-1 items-center bg-accent/10 active:opacity-70"
          isDisabled={isPending}
          onPress={() => onRating("easy")}
        >
          <HugeiconsIcon color={accentColor} icon={FlashIcon} size={24} />
          <Text className="mt-1 text-sm font-medium text-accent">
            {t("review.easy")}
          </Text>
        </Button>
      </View>

      {isPending && (
        <View className="absolute inset-0 items-center justify-center rounded-lg bg-background/80">
          <ActivityIndicator color={accentColor} />
        </View>
      )}
    </View>
  )
}
