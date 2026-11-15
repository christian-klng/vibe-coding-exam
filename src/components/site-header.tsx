import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutButton } from "@/components/logout-button";
import { buttonVariants } from "@/components/ui/button";
import { isAdmin } from "@/lib/admin";
import { getSession } from "@/lib/session";
import logo from "./logo.png";

export async function SiteHeader() {
  const t = await getTranslations("Header");
  const session = await getSession();

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <Image src={logo} alt="" unoptimized className="h-7 w-auto" />
          {/* On small screens only the logo shows; the name stays for screen readers. */}
          <span className="sr-only sm:not-sr-only">Vibe Buddy</span>
        </Link>
        <nav className="flex items-center gap-2">
          <LanguageSwitcher />
          {session ? (
            <>
              {isAdmin(session.user) && (
                <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  {t("admin")}
                </Link>
              )}
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
