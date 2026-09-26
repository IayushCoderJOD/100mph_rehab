/**
 * Outward-facing details for 100mph — the things that live outside the app.
 *
 * Instagram is the confirmed account. TODO: the other handles below are still
 * placeholders — replace each with the real account, then list its id in
 * `features.socialLinks` so Settings shows it.
 */

export type SocialLink = {
  id: string;
  label: string;
  handle: string;
  url: string;
  /** Ionicons glyph name. */
  icon: string;
};

export const supportEmail = '100mph@gmail.com';

export const socialLinks: SocialLink[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@100mph_',
    url: 'https://www.instagram.com/100mph_',
    icon: 'logo-instagram',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    handle: '100mph High Performance',
    url: 'https://linkedin.com/company/100mph',
    icon: 'logo-linkedin',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    handle: '@100mph',
    url: 'https://youtube.com/@100mph',
    icon: 'logo-youtube',
  },
  {
    id: 'website',
    label: 'Website',
    handle: '100mph.in',
    url: 'https://100mph.in',
    icon: 'globe-outline',
  },
];
