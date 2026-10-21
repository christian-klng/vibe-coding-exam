import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutButton } from "@/components/logout-button";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export async function SiteHeader() {
  const t = await getTranslations("Header");
  const session = await getSession();

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Vibe Coding Exam
        </Link>
        <nav className="flex items-center gap-2">
          <LanguageSwitcher />
          {session ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">{session.user.name}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                {t("login")}
              </Link>
              <Link href="/register" className={buttonVariants({ size: "sm" })}>
                {t("register")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
