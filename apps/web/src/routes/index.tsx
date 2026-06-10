import { Badge } from "@folionote/ui/badge"
import { Button } from "@folionote/ui/button"
import { Separator } from "@folionote/ui/separator"
import {
  AiBrain01Icon,
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
import { useCallback, useEffect, useRef, useState } from "react"
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
        "fixed top-4 right-4 left-4 z-50 mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-6 py-3 transition-all duration-300",
        scrolled
          ? "border border-border/50 bg-white/80 shadow-lg backdrop-blur-xl dark:bg-card/80"
          : "bg-transparent"
      )}
    >
      <Link className="flex cursor-pointer items-center gap-2.5" to="/">
        <img alt="FolioNote" className="size-8" src="/svg/icon.svg" />
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

      <div className="flex items-center gap-3">
        <Link to="/login">
          <Button className="cursor-pointer" size="sm" variant="ghost">
            {t("auth.signIn", "Sign In")}
          </Button>
        </Link>
        <Link to="/register">
          <Button className="cursor-pointer gap-1.5" size="sm">
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

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute top-20 -right-40 size-[400px] rounded-full bg-purple-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-40 size-[400px] rounded-full bg-violet-400/8 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            className="animate-fade-in mb-6 gap-1.5 px-3 py-1"
            variant="secondary"
          >
            <HugeiconsIcon className="size-3.5" icon={MagicWand01Icon} />
            {t("landing.hero.badge", "Your personal learning companion")}
          </Badge>

          <h1 className="animate-fade-in font-display text-4xl leading-tight font-bold tracking-tight delay-100 md:text-6xl md:leading-tight">
            {t("landing.hero.titleLine1", "Capture, Organize &")}{" "}
            <span className="bg-linear-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              {t("landing.hero.titleHighlight", "Remember")}
            </span>{" "}
            {t("landing.hero.titleLine2", "Everything You Learn")}
          </h1>

          <p className="animate-fade-in mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground delay-200 md:text-xl">
            {t(
              "landing.hero.subtitle",
              "FolioNote helps you build a personal knowledge base with smart note-taking, spaced repetition, and AI-powered insights — so nothing you learn is ever lost."
            )}
          </p>

          <div className="animate-fade-in mt-10 flex flex-wrap items-center justify-center gap-4 delay-300">
            <Link to="/register">
              <Button className="cursor-pointer gap-2 px-6 text-base" size="lg">
                {t("landing.hero.cta", "Start Learning for Free")}
                <HugeiconsIcon className="size-5" icon={ArrowRight02Icon} />
              </Button>
            </Link>
            <a href="#features">
              <Button
                className="cursor-pointer gap-2 px-6 text-base"
                size="lg"
                variant="outline"
              >
                {t("landing.hero.ctaSecondary", "See How It Works")}
              </Button>
            </a>
          </div>
        </div>

        {/* Hero product mockup */}
        <div className="animate-fade-in relative mx-auto mt-16 max-w-4xl delay-400">
          <div className="rounded-2xl border border-border/50 bg-card/60 p-3 shadow-2xl backdrop-blur-sm">
            <div className="rounded-xl border border-border/30 bg-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-400/60" />
                  <div className="size-3 rounded-full bg-yellow-400/60" />
                  <div className="size-3 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 rounded-lg bg-muted/50 px-4 py-1.5 text-center text-xs text-muted-foreground">
                  https://web.folionote.xyz/
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <MockCard
                  color="from-violet-500/10 to-purple-500/10"
                  icon={PencilEdit02Icon}
                  label={t("landing.hero.mockCapture", "Quick Capture")}
                  lines={3}
                />
                <MockCard
                  color="from-blue-500/10 to-indigo-500/10"
                  icon={AiBrain01Icon}
                  label={t("landing.hero.mockAI", "AI Insights")}
                  lines={4}
                />
                <MockCard
                  color="from-amber-500/10 to-orange-500/10"
                  icon={Calendar03Icon}
                  label={t("landing.hero.mockReview", "Spaced Review")}
                  lines={2}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MockCard({
  icon,
  label,
  lines,
  color
}: {
  icon: IconSvgElement
  label: string
  lines: number
  color: string
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg bg-linear-to-br",
            color
          )}
        >
          <HugeiconsIcon className="size-4 text-foreground/70" icon={icon} />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            className={cn(
              "h-2 rounded-full bg-muted/60",
              i === lines - 1 ? "w-3/5" : "w-full"
            )}
            key={`line-${i.toString()}`}
          />
        ))}
      </div>
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
        "Capture ideas, notes, and learnings instantly with a rich text editor. Tag, categorize, and organize effortlessly."
      ),
      gradient: "from-violet-500/15 to-purple-500/15"
    },
    {
      icon: Calendar03Icon,
      title: t("landing.features.review.title", "Spaced Repetition"),
      description: t(
        "landing.features.review.desc",
        "Never forget what you learn. Our smart review system schedules optimal times to revisit your notes."
      ),
      gradient: "from-amber-500/15 to-orange-500/15"
    },
    {
      icon: AiChat02Icon,
      title: t("landing.features.ai.title", "AI Knowledge Assistant"),
      description: t(
        "landing.features.ai.desc",
        "Chat with your notes. Ask questions, get summaries, and discover connections across your entire knowledge base."
      ),
      gradient: "from-emerald-500/15 to-teal-500/15"
    },
    {
      icon: Search01Icon,
      title: t("landing.features.search.title", "Powerful Search"),
      description: t(
        "landing.features.search.desc",
        "Find anything in seconds with full-text search, filters, and AI-powered semantic search across all your entries."
      ),
      gradient: "from-blue-500/15 to-indigo-500/15"
    },
    {
      icon: Tag01Icon,
      title: t("landing.features.tags.title", "Smart Organization"),
      description: t(
        "landing.features.tags.desc",
        "Organize with tags, collections, and sources. Build a personal taxonomy that grows with your knowledge."
      ),
      gradient: "from-rose-500/15 to-pink-500/15"
    },
    {
      icon: GridViewIcon,
      title: t("landing.features.graph.title", "Knowledge Graph"),
      description: t(
        "landing.features.graph.desc",
        "Visualize connections between your notes. Discover hidden relationships and see the big picture of your learning."
      ),
      gradient: "from-cyan-500/15 to-sky-500/15"
    }
  ]

  return (
    <section className="relative py-20 md:py-28" id="features">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          badge={t("landing.features.badge", "Core Features")}
          description={t(
            "landing.features.description",
            "Everything you need to capture, organize, and retain knowledge — all in one place."
          )}
          title={t("landing.features.title", "Built for Lifelong Learners")}
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard feature={feature} key={feature.title} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ feature }: { feature: FeatureItem }) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useIntersectionFade(ref)

  return (
    <div
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
      ref={ref}
      style={{ transitionDelay: "100ms" }}
    >
      <div
        className={cn(
          "absolute inset-0 bg-linear-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          feature.gradient
        )}
      />
      <div className="relative">
        <div
          className={cn(
            "mb-4 flex size-12 items-center justify-center rounded-xl bg-linear-to-br transition-transform duration-300 group-hover:scale-110",
            feature.gradient
          )}
        >
          <HugeiconsIcon
            className="size-6 text-foreground/80"
            icon={feature.icon}
          />
        </div>
        <h3 className="mb-2 font-display text-lg font-semibold">
          {feature.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {feature.description}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// How It Works
// ---------------------------------------------------------------------------

function HowItWorksSection() {
  const { t } = useTranslation()

  const steps = [
    {
      number: "1",
      title: t("landing.howItWorks.step1.title", "Capture"),
      description: t(
        "landing.howItWorks.step1.desc",
        "Jot down ideas, highlights, or learnings as they come. Use the rich editor, quick capture, or paste from anywhere."
      ),
      icon: PencilEdit02Icon
    },
    {
      number: "2",
      title: t("landing.howItWorks.step2.title", "Organize"),
      description: t(
        "landing.howItWorks.step2.desc",
        "Tag your entries, add sources, and let AI help you categorize. Your notes become a structured knowledge base."
      ),
      icon: InboxIcon
    },
    {
      number: "3",
      title: t("landing.howItWorks.step3.title", "Remember"),
      description: t(
        "landing.howItWorks.step3.desc",
        "Spaced repetition surfaces the right notes at the right time. Review, strengthen, and truly retain what you learn."
      ),
      icon: BookOpen01Icon
    }
  ]

  return (
    <section className="relative py-20 md:py-28" id="how-it-works">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-muted/30 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeader
          badge={t("landing.howItWorks.badge", "Simple Process")}
          description={t(
            "landing.howItWorks.description",
            "Three simple steps to build a knowledge system that works for you."
          )}
          title={t("landing.howItWorks.title", "How It Works")}
        />

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <StepCard
              index={index}
              isLast={index === steps.length - 1}
              key={step.number}
              step={step}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function StepCard({
  step,
  index,
  isLast
}: {
  step: {
    number: string
    title: string
    description: string
    icon: IconSvgElement
  }
  index: number
  isLast: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useIntersectionFade(ref)

  return (
    <div
      className={cn(
        "relative text-center transition-all duration-500",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      )}
      ref={ref}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      {/* Connector line */}
      {!isLast && (
        <div className="pointer-events-none absolute top-10 left-[calc(50%+40px)] hidden h-px w-[calc(100%-80px)] bg-linear-to-r from-border to-transparent md:block" />
      )}

      <div className="relative mx-auto mb-5 flex size-20 items-center justify-center rounded-2xl border border-border/50 bg-card/80 shadow-sm backdrop-blur-sm">
        <span className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-primary font-number text-sm font-bold text-primary-foreground">
          {step.number}
        </span>
        <HugeiconsIcon className="size-8 text-primary" icon={step.icon} />
      </div>
      <h3 className="mb-2 font-display text-xl font-semibold">{step.title}</h3>
      <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
        {step.description}
      </p>
    </div>
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
            "Powerful tools designed to make learning stick."
          )}
          title={t(
            "landing.showcase.title",
            "Everything You Need, Nothing You Don\u2019t"
          )}
        />

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Large card - AI Chat */}
          <BentoCard
            className="lg:col-span-2"
            description={t(
              "landing.showcase.ai.desc",
              "Have a conversation with your knowledge base. Ask questions, get summaries, and discover insights you never knew existed."
            )}
            gradient="from-emerald-500/10 to-teal-500/10"
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
                  "Based on your 3 entries from last week, you explored useEffect cleanup, custom hooks patterns, and..."
                )}
              />
            </div>
          </BentoCard>

          {/* Knowledge Graph */}
          <BentoCard
            description={t(
              "landing.showcase.graph.desc",
              "See how your notes connect. Explore topics and discover hidden relationships."
            )}
            gradient="from-cyan-500/10 to-sky-500/10"
            icon={GridViewIcon}
            title={t("landing.showcase.graph.title", "Knowledge Graph")}
          >
            <div className="mt-4 flex items-center justify-center">
              <GraphMock />
            </div>
          </BentoCard>

          {/* Spaced Review */}
          <BentoCard
            description={t(
              "landing.showcase.review.desc",
              "Science-backed review scheduling to help you remember what matters most."
            )}
            gradient="from-amber-500/10 to-orange-500/10"
            icon={Calendar03Icon}
            title={t("landing.showcase.review.title", "Spaced Repetition")}
          >
            <div className="mt-4 flex gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
                <div className="flex-1 text-center" key={day}>
                  <div
                    className={cn(
                      "mx-auto mb-1 flex size-8 items-center justify-center rounded-lg font-medium text-xs",
                      i < 3 &&
                        "bg-green-500/15 text-green-600 dark:text-green-400",
                      i === 3 && "bg-primary/15 text-primary",
                      i > 3 && "bg-muted/50 text-muted-foreground"
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

          {/* Rich Editor */}
          <BentoCard
            className="lg:col-span-2"
            description={t(
              "landing.showcase.editor.desc",
              "A beautiful, distraction-free editor with markdown, code blocks, and rich media support."
            )}
            gradient="from-violet-500/10 to-purple-500/10"
            icon={PencilEdit02Icon}
            title={t("landing.showcase.editor.title", "Rich Text Editor")}
          >
            <div className="mt-4 rounded-lg border border-border/30 bg-card/50 p-4">
              <div className="mb-3 flex gap-2 border-b border-border/30 pb-3">
                {["B", "I", "U", "H1", "H2", "</>"].map((btn) => (
                  <div
                    className="flex size-7 items-center justify-center rounded bg-muted/40 font-mono text-xs text-muted-foreground"
                    key={btn}
                  >
                    {btn}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="h-2.5 w-4/5 rounded-full bg-foreground/10" />
                <div className="h-2.5 w-full rounded-full bg-foreground/8" />
                <div className="h-2.5 w-3/5 rounded-full bg-foreground/6" />
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  )
}

function BentoCard({
  icon,
  title,
  description,
  gradient,
  className,
  children
}: {
  icon: IconSvgElement
  title: string
  description: string
  gradient: string
  className?: string
  children?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useIntersectionFade(ref)

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-lg",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className
      )}
      ref={ref}
    >
      <div className="mb-3 flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-xl bg-linear-to-br",
            gradient
          )}
        >
          <HugeiconsIcon className="size-5 text-foreground/80" icon={icon} />
        </div>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children}
    </div>
  )
}

function ChatBubble({ text, isAi }: { text: string; isAi: boolean }) {
  return (
    <div className={cn("flex", isAi ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isAi
            ? "rounded-tl-sm bg-muted/60 text-foreground"
            : "rounded-tr-sm bg-primary/15 text-foreground"
        )}
      >
        {text}
      </div>
    </div>
  )
}

function GraphMock() {
  const nodes = [
    { x: 50, y: 30, size: 10, label: "React" },
    { x: 25, y: 60, size: 8, label: "Hooks" },
    { x: 75, y: 55, size: 9, label: "State" },
    { x: 40, y: 85, size: 7, label: "Effects" },
    { x: 70, y: 80, size: 6, label: "Memo" }
  ]
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [1, 2]
  ]

  return (
    <svg
      aria-label="Knowledge graph visualization"
      className="h-32 w-full text-primary"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      viewBox="0 0 100 100"
    >
      {edges.map(([from, to]) => {
        const a = nodes.at(from)
        const b = nodes.at(to)
        if (!(a && b)) {
          return null
        }
        return (
          <line
            key={`${from}-${to}`}
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="0.5"
            x1={a.x}
            x2={b.x}
            y1={a.y}
            y2={b.y}
          />
        )
      })}
      {nodes.map((node) => (
        <g key={node.label}>
          <circle
            cx={node.x}
            cy={node.y}
            fill="currentColor"
            fillOpacity="0.15"
            r={node.size}
          />
          <circle
            cx={node.x}
            cy={node.y}
            fill="currentColor"
            fillOpacity="0.6"
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

// ---------------------------------------------------------------------------
// Stats / Social Proof
// ---------------------------------------------------------------------------

function StatsSection() {
  const { t } = useTranslation()

  const stats = [
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
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-muted/30 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StatCard({
  stat
}: {
  stat: { value: string; label: string; icon: IconSvgElement }
}) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useIntersectionFade(ref)

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-card/50 p-6 text-center backdrop-blur-sm transition-all duration-500",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
      ref={ref}
    >
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <HugeiconsIcon className="size-6 text-primary" icon={stat.icon} />
      </div>
      <p className="font-display text-3xl font-bold tabular-nums">
        {stat.value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Final CTA
// ---------------------------------------------------------------------------

function FinalCTASection() {
  const { t } = useTranslation()

  return (
    <section className="relative py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/50 p-10 text-center backdrop-blur-sm md:p-16">
          <div className="pointer-events-none absolute -top-20 left-1/2 size-[400px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 -bottom-20 size-[300px] rounded-full bg-purple-400/10 blur-3xl" />

          <div className="relative">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              {t("landing.cta.title", "Ready to Build Your Knowledge System?")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t(
                "landing.cta.description",
                "Join learners who use FolioNote to capture, organize, and remember everything they learn."
              )}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to="/register">
                <Button
                  className="cursor-pointer gap-2 px-8 text-base"
                  size="lg"
                >
                  {t("landing.cta.button", "Get Started for Free")}
                  <HugeiconsIcon className="size-5" icon={ArrowRight02Icon} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function LandingFooter() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-border/50 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <img alt="FolioNote" className="size-6" src="/svg/icon.svg" />
            <span className="font-display text-sm font-semibold">
              FolioNote
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
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
            {t("landing.footer.copyright", "\u00A9 {{year}} FolioNote", {
              year: new Date().getFullYear()
            })}
          </p>
        </div>
      </div>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Shared Components & Hooks
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
  const ref = useRef<HTMLDivElement>(null)
  const visible = useIntersectionFade(ref)

  return (
    <div
      className={cn(
        "mx-auto max-w-2xl text-center transition-all duration-500",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
      ref={ref}
    >
      <Badge className="mb-4 px-3 py-1" variant="secondary">
        {badge}
      </Badge>
      <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function useIntersectionFade(ref: React.RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false)

  const callback = useCallback((entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        setVisible(true)
      }
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(callback, { threshold: 0.15 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, callback])

  return visible
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
