/**
 * Deterministic identity color for a collaborator's cursor, selection, and
 * avatar. Plain hex (not CSS custom properties / oklch) so this is directly
 * reusable in React Native later, not just the web app's CSS.
 *
 * The local user isn't assigned a color from here — the web app renders
 * "you" with the brand accent color instead, so this palette only needs to
 * distinguish *other* people from each other.
 */
const IDENTITY_PALETTE = [
  "#e0575b", // rose
  "#3f9e83", // moss
  "#4a90d9", // azure
  "#8b6fd9", // violet
  "#d9599e" // magenta
] as const

/**
 * Hash a user id to one of `IDENTITY_PALETTE`'s colors. Deterministic and
 * stable across clients/sessions (every participant computes the same
 * color for the same userId independently — nothing is negotiated over
 * the wire). Collisions become visually ambiguous past
 * `IDENTITY_PALETTE.length` concurrent non-local participants.
 */
// 2^31 - 1 (a Mersenne prime): keeps the running hash within a safe integer
// range without the usual `| 0` bit-truncation trick, which both the
// linter rejects and wouldn't even do the right thing here (`| 0` truncates
// to 32-bit signed *and* wraps on overflow; `Math.trunc` — the linter's own
// suggested replacement — only drops decimals, which never wraps and lets
// the hash grow past Number.MAX_SAFE_INTEGER for any id longer than a few
// characters).
const HASH_MODULUS = 2_147_483_647

export function hashUserIdToColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + (userId.codePointAt(i) ?? 0)) % HASH_MODULUS
  }
  const index = hash % IDENTITY_PALETTE.length
  return IDENTITY_PALETTE[index] ?? IDENTITY_PALETTE[0]
}
