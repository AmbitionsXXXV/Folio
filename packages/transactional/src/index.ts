/**
 * @folionote/transactional
 *
 * Email templates for FolioNote using React Email.
 * Run `pnpm dev` in this package to preview templates.
 */

// Email templates
export { ResetPasswordEmail } from '../emails/reset-password'
export type { EmailTheme } from './theme'
// Theme configuration (can be used by other packages)
export { emailTheme, tailwindConfig } from './theme'
