/**
 * Where "Seite unterstützen" links to: an external donation page (Buy Me a Coffee, Ko-fi,
 * PayPal.me …). The site never handles payments itself.
 *
 * PLACEHOLDER: no real link yet. Put the URL here, or set VITE_SUPPORT_URL at build time.
 * While both are empty the buttons show a "kommt bald" note instead of linking anywhere.
 */
const SUPPORT_URL_DEFAULT = '' // TODO: e.g. 'https://buymeacoffee.com/your-name'

export const SUPPORT_URL: string = import.meta.env.VITE_SUPPORT_URL || SUPPORT_URL_DEFAULT
