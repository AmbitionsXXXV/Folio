import ultracite from "ultracite/oxfmt"
import ultraciteCoreConfig from "ultracite/oxlint/core"
import ultraciteReactConfig from "ultracite/oxlint/react"
import ultraciteTanstackConfig from "ultracite/oxlint/tanstack"
import { defineConfig } from "vite-plus"

const sharedIgnores = [
  ".agents/**/*",
  ".claude/**/*",
  ".cursor/**/*",
  ".gemini/**/*",
  "**/.turbo/**",
  "**/.vite/**",
  "**/.output/**",
  "**/.expo/**",
  "**/dist/**",
  "**/dev-dist/**",
  "**/.source/**",
  "**/.react-email/**",
  "**/convex/_generated/**",
  "**/routeTree.gen.ts",
  "**/uniwind-types.d.ts",
  "**/*.lock",
  "tools/clean.js"
]

// ultracite 7.8.3 ships these rules for a newer oxlint than Vite+ 0.1.24
// bundles (oxlint 1.67.0); they fail oxlint config parsing, so drop them until
// the bundled oxlint catches up.
const incompatibleOxlintRules = [
  "prefer-named-capture-group",
  "jsdoc/require-yields-description",
  "typescript/method-signature-style"
]

const lintRules = {
  ...ultraciteCoreConfig.rules,
  ...ultraciteReactConfig.rules,
  ...ultraciteTanstackConfig.rules,
  "eslint/func-style": "off" as const,
  "eslint/no-use-before-define": "off" as const,
  "eslint/sort-keys": "off" as const
}

for (const rule of incompatibleOxlintRules) {
  delete lintRules[rule]
}

// Rules the prior Biome config tolerated. The existing codebase predates this
// stricter oxlint preset, so these are relaxed to keep `vp check` green after
// the migration's auto-fix pass. Tighten incrementally over time.
const relaxedRules = [
  "eslint/arrow-body-style",
  "eslint/class-methods-use-this",
  "eslint/complexity",
  "eslint/curly",
  "eslint/eqeqeq",
  "eslint/no-await-in-loop",
  "eslint/no-empty-function",
  "eslint/no-eq-null",
  "eslint/no-inline-comments",
  "eslint/no-loop-func",
  "eslint/no-negated-condition",
  "eslint/no-param-reassign",
  "eslint/no-plusplus",
  "eslint/no-promise-executor-return",
  "eslint/no-shadow",
  "eslint/no-unsafe-optional-chaining",
  "eslint/no-unused-vars",
  "eslint/no-useless-return",
  "eslint/prefer-destructuring",
  "eslint/require-await",
  "eslint/require-unicode-regexp",
  "import/first",
  "import/no-cycle",
  "import/no-named-as-default",
  "import/no-named-as-default-member",
  // a11y rules the prior Biome config also disabled
  "jsx-a11y/control-has-associated-label",
  "jsx-a11y/interactive-supports-focus",
  "jsx-a11y/no-noninteractive-element-interactions",
  "jsdoc/check-tag-names",
  "node/callback-return",
  "node/global-require",
  "oxc/no-barrel-file",
  "promise/avoid-new",
  "promise/prefer-await-to-callbacks",
  "promise/prefer-await-to-then",
  "react/no-object-type-as-default-prop",
  "react/no-unstable-nested-components",
  "typescript/array-type",
  "typescript/ban-ts-comment",
  "typescript/consistent-type-imports",
  "typescript/no-dynamic-delete",
  "typescript/no-explicit-any",
  "unicorn/consistent-function-scoping",
  "unicorn/custom-error-definition",
  "unicorn/escape-case",
  "unicorn/import-style",
  "unicorn/no-anonymous-default-export",
  "unicorn/no-array-reduce",
  "unicorn/no-document-cookie",
  "unicorn/no-empty-file",
  "unicorn/no-hex-escape",
  "unicorn/no-immediate-mutation",
  "unicorn/no-negated-condition",
  "unicorn/no-useless-undefined",
  "unicorn/prefer-add-event-listener",
  "unicorn/prefer-array-find",
  "unicorn/prefer-dom-node-remove",
  "unicorn/prefer-module",
  "unicorn/prefer-native-coercion-functions",
  // getElementById is intentional for numeric-leading heading ids (e.g. dates),
  // which are valid ids but invalid CSS selectors for querySelector("#...").
  "unicorn/prefer-query-selector",
  "unicorn/prefer-spread",
  "unicorn/prefer-string-replace-all",
  "unicorn/prefer-ternary",
  "unicorn/switch-case-braces"
]

for (const rule of relaxedRules) {
  lintRules[rule] = "off"
}

export default defineConfig({
  fmt: {
    ...ultracite,
    ignorePatterns: [...(ultracite.ignorePatterns ?? []), ...sharedIgnores],
    semi: false,
    sortTailwindcss: {
      attributes: ["className"],
      stylesheet: "packages/ui/src/styles/index.css"
    },
    trailingComma: "none"
  },
  lint: {
    env: ultraciteCoreConfig.env,
    ignorePatterns: [
      ...(ultraciteCoreConfig.ignorePatterns ?? []),
      ...sharedIgnores
    ],
    overrides: [
      ...(ultraciteCoreConfig.overrides ?? []),
      ...(ultraciteTanstackConfig.overrides ?? [])
    ],
    plugins: [
      ...(ultraciteCoreConfig.plugins ?? []),
      ...(ultraciteReactConfig.plugins ?? [])
    ],
    rules: lintRules
  },
  staged: {
    "*.{css,js,jsx,json,jsonc,ts,tsx,cjs,mjs}": "vp check --fix"
  },
  test: {
    coverage: {
      exclude: [
        "**/node_modules/**",
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/dist/**",
        "**/migrations/**",
        "**/*.d.ts"
      ],
      include: ["**/src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        branches: 75,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },
    projects: [
      "./apps/web/vitest.config.ts",
      "./apps/server/vitest.config.ts",
      {
        test: {
          environment: "node",
          globals: true,
          include: ["**/__tests__/**/*.test.tsx", "**/*.spec.tsx"],
          name: "native",
          root: "./apps/native"
        }
      },
      {
        test: {
          environment: "node",
          exclude: ["**/node_modules/**", "**/dist/**", "**/.react-email/**"],
          globals: true,
          include: ["**/__tests__/**/*.test.ts", "**/*.spec.ts"],
          name: "packages",
          root: "./packages"
        }
      }
    ]
  }
})
