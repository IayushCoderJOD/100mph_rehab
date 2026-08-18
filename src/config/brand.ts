/**
 * Outward-facing details for 100mph — the things that live outside the app.
 *
 * TODO: the social handles below are placeholders. Replace them with the real
 * accounts before shipping; every social row in Settings reads from here.
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
    handle: '@100mph',
    url: 'https://instagram.com/100mph',
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
