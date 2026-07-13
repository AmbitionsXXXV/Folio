---
"@folionote/auth": patch
---

fix(auth): link social sign-in to unverified local accounts

Signing in with Google still failed with `account_not_linked` when a same-email email/password account already existed. Better Auth 1.6.x blocks implicit linking to an _unverified local_ account by default (`requireLocalEmailVerified`, default true), and every email/password account is unverified while `REQUIRE_EMAIL_VERIFICATION` is off — so the link was rejected even though Google returns a verified email. `trustedProviders` never covered this: it only waives the incoming provider's verification, not the local account's.

Set `accountLinking.requireLocalEmailVerified: false` so a verified social sign-in links into the existing account, and drop the ineffective (and, for an unverified GitHub primary email, unsafe) `trustedProviders` list. This is an interim fix — the durable fix is enabling email verification, then restoring the default.
