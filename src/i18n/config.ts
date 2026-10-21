export const locales = ["de", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "de";
export const localeCookie = "locale";

export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}
