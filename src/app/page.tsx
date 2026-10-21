import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export default async function Home() {
  if (await getSession()) {
    redirect("/tasks");
  }
  const t = await getTranslations("Home");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
      <p className="text-lg text-muted-foreground">{t("intro")}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/register" className={buttonVariants({ size: "lg" })}>
          {t("ctaRegister")}
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {t("ctaLogin")}
        </Link>
      </div>
    </main>
  );
}
