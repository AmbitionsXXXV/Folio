// Committed companion to the git-ignored, Expo-generated `expo-env.d.ts`.
// CI never runs the Expo CLI, so `expo-env.d.ts` is absent there and the
// ambient asset declarations from `expo/types` (e.g. for `*.css` side-effect
// imports such as `@/global.css`) go missing, failing `tsc` with TS2882.
// Re-reference them here so type-checking matches local dev and Metro.
/// <reference types="expo/types" />
