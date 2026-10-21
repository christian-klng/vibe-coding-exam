import { useTranslations } from "next-intl";

/** Maps Better Auth error codes to translated messages, with a generic fallback. */
export function useAuthError() {
  const t = useTranslations("Auth.errors");
  return (error: { code?: string } | null | undefined) => {
    if (!error) {
      return null;
    }
    const key = error.code ?? "";
    return t.has(key) ? t(key) : t("generic");
  };
}
