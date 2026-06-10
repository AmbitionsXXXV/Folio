import { Badge } from "@folionote/ui/badge"
import { Button } from "@folionote/ui/button"
import { Separator } from "@folionote/ui/separator"
import {
  AiChat02Icon,
  ArrowRight02Icon,
  BookOpen01Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  ComputerIcon,
  GridViewIcon,
  InboxIcon,
  MagicWand01Icon,
  PencilEdit02Icon,
  Search01Icon,
  SmartPhone01Icon,
  Tag01Icon
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { getUser } from "@/functions/get-user"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/")({
  component: LandingPage,
  beforeLoad: async () => {
    const session = await getUser()
    if (session) {
      throw redirect({ to: "/activity" })
    }
  }
})

const INFINITE = Number.POSITIVE_INFINITY

// Brand 3D objects shipped in /public/img — tactile, glossy, on-brand.
const OBJECT_BOOK = "/img/note.png"
const OBJECT_LENS = "/img/zoom.png"
const OBJECT_BOOKMARK = "/img/bookmark.png"

// ---------------------------------------------------------------------------
// Motion primitives
// ---------------------------------------------------------------------------

// Springy scroll-reveal. Falls back to a plain, fully-visible element when the
// visitor prefers reduced motion.
function Reveal({
  children,
  className,
  delay = 0,
  y = 28
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      transition={{ type: "spring", stiffness: 120, damping: 18, delay }}
      viewport={{ once: true, margin: "-80px" }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  )
}

// A floating, gently-bouncing 3D brand object that pops in with a spring.
function FloatObject({
  src,
  alt,
  className,
  floatDistance = 16,
  floatDuration = 6,
  delay = 0,
  spin = 0
}: {
  src: string
  alt: string
  className?: string
  floatDistance?: number
  floatDuration?: number
  delay?: number
  spin?: number
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      animate={
        reduced
          ? undefined
          : { y: [0, -floatDistance, 0], rotate: [0, spin, 0] }
      }
      className={className}
      transition={{
        duration: floatDuration,
        repeat: INFINITE,
        ease: "easeInOut",
        delay
      }}
    >
      <motion.img
        alt={alt}
        className="size-full drop-shadow-[0_24px_40px_rgba(91,33,182,0.28)] select-none"
        draggable={false}
        initial={reduced ? false : { opacity: 0, scale: 0.6 }}
        loading="lazy"
        src={src}
        transition={{ type: "spring", stiffness: 140, damping: 12, delay }}
        viewport={{ once: true }}
        whileHover={reduced ? undefined : { scale: 1.08, rotate: spin ? 0 : 4 }}
        whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
      />
    </motion.div>
  )
}

// Organic, blurred violet/pink blob used as soft background decoration.
function Blob({
  className,
  shape = "47% 53% 60% 40% / 50% 45% 55% 50%"
}: {
  className?: string
  shape?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute blur-3xl", className)}
      style={{ borderRadius: shape }}
    />
  )
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

function LandingNavbar() {
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  return (
    <nav
      className={cn(
        "fixed top-4 right-4 left-4 z-50 mx-auto flex max-w-6xl items-center justify-between rounded-full px-5 py-2.5 transition-all duration-300",
        scrolled
          ? "border border-border/60 bg-background/80 shadow-lg backdrop-blur-xl"
          : "border border-transparent bg-transparent"
      )}
    >
      <Link className="flex cursor-pointer items-center gap-2.5" to="/">
        <motion.img
          alt="FolioNote"
          className="size-9"
          src="/svg/icon.svg"
          whileHover={{ rotate: -8, scale: 1.08 }}
        />
        <span className="font-display text-lg font-semibold tracking-tight">
          FolioNote
        </span>
      </Link>

      <div className="hidden items-center gap-8 md:flex">
        <a
          className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
          href="#features"
        >
          {t("landing.nav.features", "Features")}
        </a>
        <a
          className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
          href="#how-it-works"
        >
          {t("landing.nav.howItWorks", "How It Works")}
        </a>
        <a
          className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
          href="#showcase"
        >
          {t("landing.nav.showcase", "Showcase")}
        </a>
      </div>

      <div className="flex items-center gap-2">
        <Link to="/login">
          <Button
            className="cursor-pointer rounded-full"
            size="sm"
            variant="ghost"
          >
            {t("auth.signIn", "Sign In")}
          </Button>
        </Link>
        <Link to="/register">
          <Button className="cursor-pointer gap-1.5 rounded-full px-5">
            {t("landing.nav.getStarted", "Get Started")}
            <HugeiconsIcon className="size-4" icon={ArrowRight02Icon} />
          </Button>
        </Link>
      </div>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function HeroSection() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  return (
    <section className="relative flex min-h-dvh flex-col justify-start overflow-hidden pt-32 pb-20 md:justify-center md:pt-36 md:pb-28">
      {/* Organic violet → pink blobs */}
      <Blob className="-top-32 left-1/4 size-[460px] bg-primary/25" />
      <Blob
        className="top-10 right-0 size-[380px] bg-fuchsia-400/20"
        shape="60% 40% 30% 70% / 60% 30% 70% 40%"
      />
      <Blob
        className="bottom-0 left-0 size-[320px] bg-violet-400/15"
        shape="40% 60% 55% 45% / 55% 50% 50% 45%"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <motion.div
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            initial={reduced ? false : { opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          >
            <Badge
              className="mb-6 gap-1.5 rounded-full px-3 py-1"
              variant="secondary"
            >
              <HugeiconsIcon className="size-3.5" icon={MagicWand01Icon} />
              {t("landing.hero.badge", "Your personal learning companion")}
            </Badge>
          </motion.div>

          <motion.h1
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            className="font-display text-[2.75rem] leading-[1.05] font-bold tracking-tight md:text-6xl"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 18,
              delay: 0.08
            }}
          >
            {t("landing.hero.titleLine1", "Capture, organize &")}{" "}
            <span className="relative inline-block font-script font-normal text-primary">
              {t("landing.hero.titleHighlight", "remember")}
              <motion.svg
                aria-hidden="true"
                className="absolute -bottom-2 left-0 w-full text-accent-foreground/40"
                fill="none"
                initial={reduced ? false : { pathLength: 0 }}
                preserveAspectRatio="none"
                transition={{ duration: 0.9, delay: 0.6, ease: "easeInOut" }}
                viewBox="0 0 200 12"
                whileInView={reduced ? undefined : { pathLength: 1 }}
              >
                <motion.path
                  d="M2 8C40 3 80 3 120 6C150 8 180 7 198 4"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </motion.svg>
            </span>{" "}
            {t("landing.hero.titleLine2", "everything you learn")}
          </motion.h1>

          <motion.p
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl lg:mx-0"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 18,
              delay: 0.16
            }}
          >
            {t(
              "landing.hero.subtitle",
              "A warm, playful home for your notes. Capture ideas in a flash, let AI connect the dots, and let spaced review make them stick — so nothing you learn slips away."
            )}
          </motion.p>

          <motion.div
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 18,
              delay: 0.24
            }}
          >
            <Link to="/register">
              <motion.span
                className="inline-block"
                whileHover={reduced ? undefined : { scale: 1.04 }}
                whileTap={reduced ? undefined : { scale: 0.97 }}
              >
                <Button className="h-12 cursor-pointer gap-2 rounded-full px-7 text-base shadow-lg shadow-primary/20">
                  {t("landing.hero.cta", "Start learning — free")}
                  <HugeiconsIcon className="size-5" icon={ArrowRight02Icon} />
                </Button>
              </motion.span>
            </Link>
            <a href="#features">
              <motion.span
                className="inline-block"
                whileHover={reduced ? undefined : { scale: 1.04 }}
                whileTap={reduced ? undefined : { scale: 0.97 }}
              >
                <Button
                  className="h-12 cursor-pointer gap-2 rounded-full px-7 text-base"
                  variant="outline"
                >
                  {t("landing.hero.ctaSecondary", "Take the tour")}
                </Button>
              </motion.span>
            </a>
          </motion.div>

          {/* Leckerli stat strip */}
          <motion.div
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            className="mt-10 flex items-center justify-center gap-7 lg:justify-start"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 18,
              delay: 0.32
            }}
          >
            <HeroStat
              label={t("landing.hero.statPlatforms", "Platforms")}
              value="3"
            />
            <Separator className="h-9" orientation="vertical" />
            <HeroStat
              label={t("landing.hero.statFreeLabel", "To start")}
              value={t("landing.hero.statFreeValue", "Free")}
            />
            <Separator className="h-9" orientation="vertical" />
            <HeroStat
              label={t("landing.hero.statYoursLabel", "Yours")}
              value="100%"
            />
          </motion.div>
        </div>

        {/* Floating 3D object cluster */}
        <div className="relative mx-auto h-[340px] w-full max-w-md md:h-[440px]">
          <FloatObject
            alt={t(
              "landing.hero.objectBook",
              "A notebook full of what you've learned"
            )}
            className="absolute top-6 left-1/2 size-56 -translate-x-1/2 md:size-72"
            floatDistance={18}
            floatDuration={6.5}
            src={OBJECT_BOOK}
          />
          <FloatObject
            alt={t("landing.hero.objectSearch", "Search across everything")}
            className="absolute top-0 right-2 size-24 md:size-28"
            delay={0.3}
            floatDistance={14}
            floatDuration={5}
            spin={-6}
            src={OBJECT_LENS}
          />
          <FloatObject
            alt={t("landing.hero.objectBookmark", "Save what matters")}
            className="absolute bottom-2 left-0 size-20 md:size-24"
            delay={0.5}
            floatDistance={12}
            floatDuration={5.5}
            spin={6}
            src={OBJECT_BOOKMARK}
          />
        </div>
      </div>
    </section>
  )
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center lg:text-left">
      <p className="font-number text-3xl text-primary md:text-4xl">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

interface FeatureItem {
  description: string
  gradient: string
  icon: IconSvgElement
  title: string
}

function FeaturesSection() {
  const { t } = useTranslation()

  const features: FeatureItem[] = [
    {
      icon: PencilEdit02Icon,
      title: t("landing.features.capture.title", "Quick Capture"),
      description: t(
        "landing.features.capture.desc",
        "Catch ideas the moment they strike with a rich, distraction-free editor. Tag and organize without breaking your flow."
      ),
      gradient: "from-primary/20 to-fuchsia-400/20"
    },
    {
      icon: Calendar03Icon,
      title: t("landing.features.review.title", "Spaced Repetition"),
      description: t(
        "landing.features.review.desc",
        "Never forget what you learn. A friendly review schedule resurfaces your notes at exactly the right moment."
      ),
      gradient: "from-violet-400/20 to-primary/20"
    },
    {
      icon: AiChat02Icon,
      title: t("landing.features.ai.title", "AI Knowledge Assistant"),
      description: t(
        "landing.features.ai.desc",
        "Chat with your notes. Ask questions, get summaries, and uncover connections across your whole knowledge base."
      ),
      gradient: "from-fuchsia-400/20 to-pink-400/20"
    },
    {
      icon: Search01Icon,
      title: t("landing.features.search.title", "Powerful Search"),
      description: t(
        "landing.features.search.desc",
        "Find anything in seconds with full-text and AI-powered semantic search across every entry you've ever made."
      ),
      gradient: "from-primary/20 to-violet-400/20"
    },
    {
      icon: Tag01Icon,
      title: t("landing.features.tags.title", "Smart Organization"),
      description: t(
        "landing.features.tags.desc",
        "Tags, collections, and sources that grow into a personal taxonomy — structure that feels effortless."
      ),
      gradient: "from-pink-400/20 to-fuchsia-400/20"
    },
    {
      icon: GridViewIcon,
      title: t("landing.features.graph.title", "Knowledge Graph"),
      description: t(
        "landing.features.graph.desc",
        "Watch your notes link up. Explore hidden relationships and see the big picture of everything you know."
      ),
      gradient: "from-violet-400/20 to-fuchsia-400/20"
    }
  ]

  return (
    <section className="relative py-20 md:py-28" id="features">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          badge={t("landing.features.badge", "Core Features")}
          description={t(
            "landing.features.description",
            "Everything you need to capture, organize, and actually retain what you learn — in one playful place."
          )}
          title={t("landing.features.title", "Built for Lifelong Learners")}
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard
              delay={(index % 3) * 0.08}
              feature={feature}
              key={feature.title}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({
  feature,
  delay
}: {
  feature: FeatureItem
  delay: number
}) {
  const reduced = useReducedMotion()

  return (
    <Reveal delay={delay}>
      <motion.div
        className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-6 shadow-sm backdrop-blur-sm transition-colors hover:border-primary/40"
        whileHover={reduced ? undefined : { y: -6, scale: 1.015 }}
      >
        <div
          className={cn(
            "absolute inset-0 bg-linear-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
            feature.gradient
          )}
        />
        <div className="relative">
          <motion.div
            className={cn(
              "mb-4 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br",
              feature.gradient
            )}
            whileHover={reduced ? undefined : { rotate: -8, scale: 1.1 }}
          >
            <HugeiconsIcon
              className="size-7 text-primary"
              icon={feature.icon}
            />
          </motion.div>
          <h3 className="mb-2 font-display text-xl font-semibold">
            {feature.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {feature.description}
          </p>
        </div>
      </motion.div>
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// How It Works
// ---------------------------------------------------------------------------

interface StepItem {
  number: string
  title: string
  description: string
  icon: IconSvgElement
  object: string
}

function HowItWorksSection() {
  const { t } = useTranslation()

  const steps: StepItem[] = [
    {
      number: "1",
      title: t("landing.howItWorks.step1.title", "Capture"),
      description: t(
        "landing.howItWorks.step1.desc",
        "Jot ideas, highlights, and learnings as they come. Rich editor, quick capture, paste from anywhere."
      ),
      icon: PencilEdit02Icon,
      object: OBJECT_BOOK
    },
    {
      number: "2",
      title: t("landing.howItWorks.step2.title", "Organize"),
      description: t(
        "landing.howItWorks.step2.desc",
        "Tag your entries, add sources, and let AI help categorize. Your notes become a living knowledge base."
      ),
      icon: InboxIcon,
      object: OBJECT_BOOKMARK
    },
    {
      number: "3",
      title: t("landing.howItWorks.step3.title", "Remember"),
      description: t(
        "landing.howItWorks.step3.desc",
        "Spaced review surfaces the right notes at the right time. Revisit, strengthen, and truly retain."
      ),
      icon: BookOpen01Icon,
      object: OBJECT_LENS
    }
  ]

  return (
    <section className="relative py-20 md:py-28" id="how-it-works">
      <Blob className="top-1/2 left-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 bg-primary/8" />

      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeader
          badge={t("landing.howItWorks.badge", "Simple Process")}
          description={t(
            "landing.howItWorks.description",
            "Three playful steps to a knowledge system that finally works for you."
          )}
          title={t("landing.howItWorks.title", "How It Works")}
        />

        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {steps.map((step, index) => (
            <StepCard delay={index * 0.12} key={step.number} step={step} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StepCard({ step, delay }: { step: StepItem; delay: number }) {
  const reduced = useReducedMotion()

  return (
    <Reveal className="text-center" delay={delay}>
      <motion.div
        className="relative mx-auto mb-6 flex size-28 items-center justify-center"
        whileHover={reduced ? undefined : { scale: 1.06 }}
      >
        <div className="absolute inset-0 rounded-[42%_58%_55%_45%/55%_45%_55%_45%] bg-linear-to-br from-primary/15 to-fuchsia-400/15" />
        <img
          alt=""
          aria-hidden="true"
          className="size-20 drop-shadow-[0_16px_28px_rgba(91,33,182,0.25)]"
          src={step.object}
        />
        <span className="absolute -top-1 -right-1 flex size-9 items-center justify-center rounded-full bg-primary font-number text-base text-primary-foreground shadow-md">
          {step.number}
        </span>
      </motion.div>
      <h3 className="mb-2 font-display text-xl font-semibold">{step.title}</h3>
      <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
        {step.description}
      </p>
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// Product Showcase (Bento Grid)
// ---------------------------------------------------------------------------

function ShowcaseSection() {
  const { t } = useTranslation()

  return (
    <section className="relative py-20 md:py-28" id="showcase">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          badge={t("landing.showcase.badge", "Product Tour")}
          description={t(
            "landing.showcase.description",
            "Delightful tools designed to make learning stick."
          )}
          title={t(
            "landing.showcase.title",
            "Everything You Need, Nothing You Don’t"
          )}
        />

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <BentoCard
            className="lg:col-span-2"
            delay={0}
            description={t(
              "landing.showcase.ai.desc",
              "Have a conversation with your knowledge base. Ask questions, get summaries, and discover insights you never knew were there."
            )}
            icon={AiChat02Icon}
            title={t("landing.showcase.ai.title", "AI-Powered Chat")}
          >
            <div className="mt-4 space-y-3">
              <ChatBubble
                isAi={false}
                text={t(
                  "landing.showcase.ai.userMsg",
                  "What did I learn about React hooks last week?"
                )}
              />
              <ChatBubble
                isAi
                text={t(
                  "landing.showcase.ai.aiMsg",
                  "From your 3 entries last week: useEffect cleanup, custom hook patterns, and the rules of hooks…"
                )}
              />
            </div>
          </BentoCard>

          <BentoCard
            delay={0.08}
            description={t(
              "landing.showcase.graph.desc",
              "See how your notes connect. Explore topics and uncover hidden relationships."
            )}
            icon={GridViewIcon}
            title={t("landing.showcase.graph.title", "Knowledge Graph")}
          >
            <div className="mt-4 flex items-center justify-center">
              <GraphMock />
            </div>
          </BentoCard>

          <BentoCard
            delay={0.16}
            description={t(
              "landing.showcase.review.desc",
              "Science-backed review scheduling that helps you remember what matters most."
            )}
            icon={Calendar03Icon}
            title={t("landing.showcase.review.title", "Spaced Repetition")}
          >
            <div className="mt-4 flex gap-2">
              {REVIEW_DAYS.map((day, i) => (
                <div className="flex-1 text-center" key={day}>
                  <div
                    className={cn(
                      "mx-auto mb-1 flex size-8 items-center justify-center rounded-xl font-medium text-xs",
                      i < 3 && "bg-primary/20 text-primary",
                      i === 3 &&
                        "bg-fuchsia-400/25 text-fuchsia-600 dark:text-fuchsia-300",
                      i > 3 && "bg-muted/60 text-muted-foreground"
                    )}
                  >
                    {i < 3 ? (
                      <HugeiconsIcon
                        className="size-4"
                        icon={CheckmarkCircle02Icon}
                      />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{day}</span>
                </div>
              ))}
            </div>
          </BentoCard>

          <BentoCard
            className="lg:col-span-2"
            delay={0.24}
            description={t(
              "landing.showcase.editor.desc",
              "A beautiful, distraction-free editor with markdown, code blocks, and rich media."
            )}
            icon={PencilEdit02Icon}
            title={t("landing.showcase.editor.title", "Rich Text Editor")}
          >
            <div className="mt-4 rounded-2xl border border-border/40 bg-background/60 p-4">
              <div className="mb-3 flex gap-2 border-b border-border/40 pb-3">
                {EDITOR_TOOLS.map((btn) => (
                  <div
                    className="flex size-7 items-center justify-center rounded-lg bg-muted/50 font-mono text-xs text-muted-foreground"
                    key={btn}
                  >
                    {btn}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {EDITOR_LINES.map((line) => (
                  <div
                    className={cn(
                      "h-2.5 rounded-full bg-primary/15",
                      line.width
                    )}
                    key={line.id}
                  />
                ))}
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  )
}

const REVIEW_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const
const EDITOR_TOOLS = ["B", "I", "U", "H1", "H2", "</>"] as const
const EDITOR_LINES = [
  { id: "a", width: "w-4/5" },
  { id: "b", width: "w-full" },
  { id: "c", width: "w-3/5" }
] as const

function BentoCard({
  icon,
  title,
  description,
  className,
  delay,
  children
}: {
  icon: IconSvgElement
  title: string
  description: string
  className?: string
  delay: number
  children?: ReactNode
}) {
  const reduced = useReducedMotion()

  return (
    <Reveal className={className} delay={delay}>
      <motion.div
        className="group h-full overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-6 shadow-sm backdrop-blur-sm transition-colors hover:border-primary/30"
        whileHover={reduced ? undefined : { y: -4 }}
      >
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-fuchsia-400/20">
            <HugeiconsIcon className="size-5 text-primary" icon={icon} />
          </div>
          <h3 className="font-display text-lg font-semibold">{title}</h3>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        {children}
      </motion.div>
    </Reveal>
  )
}

function ChatBubble({ text, isAi }: { text: string; isAi: boolean }) {
  return (
    <div className={cn("flex", isAi ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isAi
            ? "rounded-tl-sm bg-muted/70 text-foreground"
            : "rounded-tr-sm bg-primary/15 text-foreground"
        )}
      >
        {text}
      </div>
    </div>
  )
}

function GraphMock() {
  return (
    <svg
      aria-label="Knowledge graph visualization"
      className="h-32 w-full text-primary"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      viewBox="0 0 100 100"
    >
      {GRAPH_EDGES.map(([from, to]) => {
        const a = GRAPH_NODES.at(from)
        const b = GRAPH_NODES.at(to)
        if (!(a && b)) {
          return null
        }
        return (
          <line
            key={`${from}-${to}`}
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="0.5"
            x1={a.x}
            x2={b.x}
            y1={a.y}
            y2={b.y}
          />
        )
      })}
      {GRAPH_NODES.map((node) => (
        <g key={node.label}>
          <circle
            cx={node.x}
            cy={node.y}
            fill="currentColor"
            fillOpacity="0.18"
            r={node.size}
          />
          <circle
            cx={node.x}
            cy={node.y}
            fill="currentColor"
            fillOpacity="0.7"
            r={node.size * 0.4}
          />
          <text
            className="fill-muted-foreground"
            dominantBaseline="hanging"
            fontSize="4"
            textAnchor="middle"
            x={node.x}
            y={node.y + node.size + 2}
          >
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

const GRAPH_NODES = [
  { x: 50, y: 30, size: 10, label: "React" },
  { x: 25, y: 60, size: 8, label: "Hooks" },
  { x: 75, y: 55, size: 9, label: "State" },
  { x: 40, y: 85, size: 7, label: "Effects" },
  { x: 70, y: 80, size: 6, label: "Memo" }
] as const
const GRAPH_EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4],
  [1, 2]
]

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

interface StatItem {
  value: string
  label: string
  icon: IconSvgElement
}

function StatsSection() {
  const { t } = useTranslation()

  const stats: StatItem[] = [
    {
      value: "6+",
      label: t("landing.stats.features", "Core Features"),
      icon: MagicWand01Icon
    },
    {
      value: "3",
      label: t("landing.stats.platforms", "Platforms"),
      icon: SmartPhone01Icon
    },
    {
      value: t("landing.stats.freeValue", "Free"),
      label: t("landing.stats.freeLabel", "To Get Started"),
      icon: CheckmarkCircle02Icon
    },
    {
      value: t("landing.stats.openSourceValue", "Open"),
      label: t("landing.stats.openSource", "Source Project"),
      icon: ComputerIcon
    }
  ]

  return (
    <section className="relative py-20 md:py-28">
      <Blob className="top-1/2 left-1/2 size-[460px] -translate-x-1/2 -translate-y-1/2 bg-fuchsia-400/8" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard delay={(index % 4) * 0.08} key={stat.label} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StatCard({ stat, delay }: { stat: StatItem; delay: number }) {
  const reduced = useReducedMotion()

  return (
    <Reveal delay={delay}>
      <motion.div
        className="rounded-3xl border border-border/60 bg-card/70 p-6 text-center shadow-sm backdrop-blur-sm"
        whileHover={reduced ? undefined : { y: -4, scale: 1.02 }}
      >
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/15">
          <HugeiconsIcon className="size-6 text-primary" icon={stat.icon} />
        </div>
        <p className="font-number text-4xl text-primary">{stat.value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
      </motion.div>
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// Final CTA
// ---------------------------------------------------------------------------

function FinalCTASection() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  return (
    <section className="relative py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-card/70 px-6 py-14 text-center shadow-lg backdrop-blur-sm md:px-16 md:py-20">
            <Blob className="-top-24 left-1/3 size-[420px] bg-primary/20" />
            <Blob
              className="-right-16 -bottom-24 size-[320px] bg-fuchsia-400/20"
              shape="60% 40% 30% 70% / 60% 30% 70% 40%"
            />

            <FloatObject
              alt=""
              className="mx-auto mb-6 size-24 md:size-28"
              floatDistance={14}
              src={OBJECT_BOOK}
            />

            <div className="relative">
              <h2 className="font-display text-3xl font-bold md:text-5xl">
                {t("landing.cta.title", "Ready to build your")}{" "}
                <span className="font-script font-normal text-primary">
                  {t("landing.cta.titleAccent", "knowledge system")}
                </span>
                ?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
                {t(
                  "landing.cta.description",
                  "Join the learners using FolioNote to capture, organize, and remember everything they learn."
                )}
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Link to="/register">
                  <motion.span
                    className="inline-block"
                    whileHover={reduced ? undefined : { scale: 1.04 }}
                    whileTap={reduced ? undefined : { scale: 0.97 }}
                  >
                    <Button className="h-12 cursor-pointer gap-2 rounded-full px-8 text-base shadow-lg shadow-primary/20">
                      {t("landing.cta.button", "Get started for free")}
                      <HugeiconsIcon
                        className="size-5"
                        icon={ArrowRight02Icon}
                      />
                    </Button>
                  </motion.span>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function LandingFooter() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <img alt="FolioNote" className="size-6" src="/svg/icon.svg" />
            <span className="font-display text-sm font-semibold">
              FolioNote
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <a
              className="cursor-pointer transition-colors hover:text-foreground"
              href="#features"
            >
              {t("landing.nav.features", "Features")}
            </a>
            <a
              className="cursor-pointer transition-colors hover:text-foreground"
              href="#how-it-works"
            >
              {t("landing.nav.howItWorks", "How It Works")}
            </a>
            <a
              className="cursor-pointer transition-colors hover:text-foreground"
              href="#showcase"
            >
              {t("landing.nav.showcase", "Showcase")}
            </a>

            <Separator className="hidden h-4 md:block" orientation="vertical" />

            <Link
              className="transition-colors hover:text-foreground"
              to="/login"
            >
              {t("auth.signIn", "Sign In")}
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("landing.footer.copyright", "© {{year}} FolioNote", { year })}
          </p>
        </div>
      </div>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function SectionHeader({
  badge,
  title,
  description
}: {
  badge: string
  title: string
  description: string
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <Badge className="mb-4 rounded-full px-3 py-1" variant="secondary">
        {badge}
      </Badge>
      <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        {description}
      </p>
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// Page Composition
// ---------------------------------------------------------------------------

function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ShowcaseSection />
        <StatsSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  )
}
