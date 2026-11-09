import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const t = await getTranslations("Admin");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <nav className="flex gap-4 border-b pb-2 text-sm">
          <Link href="/admin/llm" className="font-medium underline-offset-4 hover:underline">
            {t("nav.llm")}
          </Link>
          <Link href="/admin/users" className="font-medium underline-offset-4 hover:underline">
            {t("nav.users")}
          </Link>
          <Link href="/admin/tasks" className="font-medium underline-offset-4 hover:underline">
            {t("nav.tasks")}
          </Link>
          <Link href="/admin/modules" className="font-medium underline-offset-4 hover:underline">
            {t("nav.modules")}
          </Link>
          <Link href="/admin/progress" className="font-medium underline-offset-4 hover:underline">
            {t("nav.progress")}
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
