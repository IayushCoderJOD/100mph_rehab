/**
 * Parts of the app that are built but not ready to put in front of members.
 *
 * Each switch only hides the way in — the screens, providers and routes behind
 * it stay in the tree, so turning a flag on is all it takes to bring it back.
 *
 * The Learn tab is not listed here: it switches itself on as soon as any
 * lesson has a video attached (see app/(tabs)/_layout.tsx).
 */
export const features = {
  /**
   * Manage Membership, and the plan name on My Account. The plan lives on the
   * device only — there is no billing behind it yet, so a member could
   * "cancel" and nothing would happen.
   */
  membership: false,
  /**
   * "Forgot password?" on sign-in. The API issues a reset token but has no
   * mailer to send it, so the link would lead nowhere.
   */
  forgotPassword: false,
  /**
   * Which Follow 100mph rows Settings shows, by id from brand.ts. Only the
   * confirmed accounts — the rest are placeholders that may point at accounts
   * that are not ours.
   */
  socialLinks: ['instagram'] as string[],
};
