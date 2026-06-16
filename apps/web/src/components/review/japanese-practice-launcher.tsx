import {
  ArrowRight01Icon,
  BookOpen01Icon,
  SparklesIcon,
  TextAlignJustifyCenterIcon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Reveal } from "@/components/reveal"
import { Surface } from "@/components/surface"

/**
 * Launcher cards for the standalone Japanese-study surfaces. These routes are
 * full-screen experiences (no app chrome), so the review dashboard links into
 * them here rather than rendering them inline.
 */
const PRACTICE_CARDS = [
  {
    to: "/jp-reading",
    icon: TextAlignJustifyCenterIcon,
    titleKey: "review.japaneseReading.title",
    descriptionKey: "review.japanesePractice.readingDescription"
  },
  {
    to: "/jp-typing",
    icon: SparklesIcon,
    titleKey: "review.japaneseTyping.title",
    descriptionKey: "review.japanesePractice.typingDescription"
  },
  {
    to: "/jp-exam",
    icon: BookOpen01Icon,
    titleKey: "review.jlptExam.title",
    descriptionKey: "review.japanesePractice.examDescription"
  }
] as const

export function JapanesePracticeLauncher() {
  const { t } = useTranslation()

  return (
    <Reveal delay={360}>
      <h2 className="mb-4 font-display text-lg font-semibold">
        {t("review.japanesePractice.title")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {PRACTICE_CARDS.map(({ to, icon, titleKey, descriptionKey }, index) => (
          <Reveal delay={390 + index * 60} key={to}>
            <Link
              className="group block h-full rounded-3xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              to={to}
            >
              <Surface className="flex h-full flex-col p-5" interactive>
                <div className="flex items-center justify-between">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
                    <HugeiconsIcon
                      className="size-5 text-primary"
                      icon={icon}
                    />
                  </span>
                  <HugeiconsIcon
                    aria-hidden="true"
                    className="size-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
                    icon={ArrowRight01Icon}
                  />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold">
                  {t(titleKey)}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t(descriptionKey)}
                </p>
              </Surface>
            </Link>
          </Reveal>
        ))}
      </div>
    </Reveal>
  )
}
