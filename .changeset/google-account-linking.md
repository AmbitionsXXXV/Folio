---
"@folionote/auth": patch
"web": patch
---

fix(auth): auto-link social sign-ins and route OAuth errors to the web app

Enable Better Auth account linking with Google and GitHub as trusted providers,
so signing in with Google no longer fails with `account_not_linked` when an
account with the same verified email already exists. Thread `errorCallbackURL`
through the web social-auth flow so OAuth failures return to `/login` (shown as
a toast) instead of landing on the API origin.
