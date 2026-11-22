export const BRAND_LOGO_PATHS = {
  sm: 'assets/brand/logo-mark-96.png',
  md: 'assets/brand/logo-mark-192.png',
  lg: 'assets/brand/logo-mark-256.png',
  xl: 'assets/brand/logo-mark-512.png',
} as const;

export type BrandLogoVariant = keyof typeof BRAND_LOGO_PATHS;
