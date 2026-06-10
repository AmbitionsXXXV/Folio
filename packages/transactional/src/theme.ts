/**
 * Shared email theme configuration
 *
 * These colors and styles are aligned with the FolioNote web app theme.
 * The values are converted to hex/rgb for email client compatibility.
 */

export const emailTheme = {
  // Brand colors (derived from oklch values in web app)
  colors: {
    // Primary purple gradient colors
    primary: "#8b5cf6", // oklch(0.709 0.1592 293.5412) approximation
    primaryDark: "#7c3aed", // Darker variant
    primaryLight: "#a78bfa", // Lighter variant

    // Background colors
    background: "#f8f7fc", // Light purple-tinted background
    backgroundDark: "#1a1614", // Dark mode background

    // Card/Container
    card: "#ffffff",
    cardDark: "#2d2638",

    // Text colors
    foreground: "#3f3d56", // Dark purple-gray text
    foregroundMuted: "#6b7280", // Muted text
    foregroundLight: "#9ca3af", // Light text

    // Accent colors
    accent: "#f0e7ff", // Light purple accent
    accentForeground: "#3f3d56",

    // Border
    border: "#e5e7eb",
    borderDark: "#3d3654",

    // Destructive/Error
    destructive: "#ef4444",

    // Success
    success: "#22c55e"
  },

  // Font families (email-safe fallbacks)
  fonts: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", serif'
  },

  // Spacing (in pixels for email compatibility)
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    "2xl": "40px"
  },

  // Border radius
  borderRadius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "9999px"
  }
} as const

/**
 * Tailwind config for React Email
 * Uses pixel-based values for better email client compatibility
 */
export const tailwindConfig = {
  theme: {
    extend: {
      colors: {
        // Brand
        brand: emailTheme.colors.primary,
        "brand-dark": emailTheme.colors.primaryDark,
        "brand-light": emailTheme.colors.primaryLight,

        // Semantic colors
        background: emailTheme.colors.background,
        foreground: emailTheme.colors.foreground,
        "foreground-muted": emailTheme.colors.foregroundMuted,
        "foreground-light": emailTheme.colors.foregroundLight,
        card: emailTheme.colors.card,
        accent: emailTheme.colors.accent,
        "accent-foreground": emailTheme.colors.accentForeground,
        border: emailTheme.colors.border,
        destructive: emailTheme.colors.destructive,
        success: emailTheme.colors.success
      },
      fontFamily: {
        sans: [emailTheme.fonts.sans],
        serif: [emailTheme.fonts.serif]
      },
      borderRadius: {
        sm: emailTheme.borderRadius.sm,
        md: emailTheme.borderRadius.md,
        lg: emailTheme.borderRadius.lg,
        xl: emailTheme.borderRadius.xl
      }
    }
  }
}

export type EmailTheme = typeof emailTheme
