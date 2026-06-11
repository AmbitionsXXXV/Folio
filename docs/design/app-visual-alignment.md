# App ⇄ Landing visual alignment

The landing page (`apps/web/src/routes/index.tsx`) and the in-app screens already
share the same design tokens via `@folionote/ui` (obsidian + warm-amber palette,
Fraunces / DM Sans / Story Script fonts, `--radius: 1.5rem`, warm shadows). What
drifted was **application convention** — spacing, accent opacity, header markup,
surface treatment, and motion were re-invented per screen.

This doc is the source of truth for those conventions. It applies to **both**
`apps/web` (Tailwind + Base UI) and `apps/native` (Uniwind + Reanimated); the
two implement the same rules in their own styling systems.

## Primitives (web)

Live in `apps/web/src/components/`:

- **`PageContainer`** — page wrapper. `container mx-auto px-4 py-10 md:py-14`,
  width `default = max-w-5xl`. Replaces ad-hoc `py-8` / `py-10 md:py-14`.
- **`PageHeader`** — `{ icon, eyebrow?, title, description?, actions? }`. Accent
  chip + `font-display` title + muted description. Replaces the per-screen header
  blocks that drifted in spacing, icon size, and accent opacity.
- **`Surface`** — frosted card: `rounded-3xl border border-border/60 bg-card/70
  shadow-sm backdrop-blur-sm`; `interactive` adds the hover lift. Mirrors the
  landing's feature cards.
- **`Reveal`** — IntersectionObserver scroll-in (`translateY(16px)` + fade,
  700ms, `cubic-bezier(0.16,1,0.3,1)`), disabled under reduced motion. Stagger
  lists with `delay={index * 80}`.

## Rules

### Accent opacity scale

Use **only** these steps for amber accents; do not introduce `/3 /8 /12 /18`.

| Step           | Light            | Dark              | Use                          |
| -------------- | ---------------- | ----------------- | ---------------------------- |
| subtle tint    | `bg-primary/5`   | `bg-primary/10`   | empty-state icon wells       |
| chip / surface | `bg-primary/10`  | `bg-primary/10`   | header chip + `ring-primary/15` |
| hover / active | `bg-primary/15`  | `bg-primary/15`   | hover fills, active pills    |

Icon chip canonical: `size-10 rounded-2xl bg-primary/10 ring-1 ring-primary/15`
wrapping a `size-5 text-primary` glyph.

### Typography

- Page title: `font-display text-2xl font-semibold tracking-tight md:text-3xl`.
- Hero greeting (activity): may step up to `md:text-4xl` via the `eyebrow` slot.
- Section label: `font-display text-sm font-medium tracking-wide uppercase
  text-muted-foreground`.
- Body / descriptions: `text-sm text-muted-foreground`.

### Spacing & radius

- Page rhythm: `py-10 md:py-14`; header margin `mb-10 md:mb-12`.
- Grid gaps: `gap-4` (cards), `gap-6` (sections).
- Radius: feature surfaces `rounded-3xl`, nested/secondary `rounded-2xl`,
  controls `rounded-lg`/`rounded-full` (unchanged from `@folionote/ui`).

### Motion

- Entrance: `Reveal` (scroll-in). Prefer it over the mount-only
  `animate-fade-in` + `delay-*` classes for list/section reveals.
- Hover lift: cards `hover:-translate-y-1`, small items `hover:-translate-y-0.5`,
  buttons/CTAs `hover:scale-[1.02] active:scale-[0.98]`.
- Always honor `prefers-reduced-motion`.

## Native parity

`apps/native` mirrors the same palette, accent scale, header anatomy, frosted
surfaces, and entrance motion — implemented with Uniwind classes and Reanimated
(`FadeInDown`-style entrances) instead of CSS/IntersectionObserver. No GSAP on
native.
