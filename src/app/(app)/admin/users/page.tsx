import { desc, ilike, or } from "drizzle-orm";
import { getFormatter, getTranslations } from "next-intl/server";
import { setUserRole } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

const PAGE_SIZE = 100;

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const session = await requireAdmin();
  const t = await getTranslations("Admin.users");
  const format = await getFormatter();
  const { q } = await searchParams;
  const search = typeof q === "string" ? q.trim() : "";
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;

  const users = await getDb()
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })
    .from(user)
    .where(search ? or(ilike(user.email, pattern), ilike(user.name, pattern)) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(PAGE_SIZE);

  return (
    <div className="space-y-4">
      <form className="flex max-w-md gap-2">
        <Input name="q" type="search" defaultValue={search} placeholder={t("search")} aria-label={t("search")} />
        <Button type="submit" variant="outline">
          {t("searchSubmit")}
        </Button>
      </form>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {users.map((person) => {
            const isAdmin = person.role === "admin";
            return (
              <li key={person.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
                <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                  <p className="font-medium break-words">{person.name}</p>
                  <p className="break-words text-muted-foreground">{person.email}</p>
                </div>
                <span className="text-xs text-muted-foreground">{format.dateTime(person.createdAt, { dateStyle: "short" })}</span>
                {isAdmin && <Badge>{t("admin")}</Badge>}
                {person.id === session.user.id ? (
                  <span className="text-xs text-muted-foreground">{t("you")}</span>
                ) : (
                  <form action={setUserRole.bind(null, person.id, isAdmin ? "student" : "admin")}>
                    <Button type="submit" variant="outline" size="sm">
                      {isAdmin ? t("revoke") : t("grant")}
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {users.length === PAGE_SIZE && <p className="text-xs text-muted-foreground">{t("limited", { count: PAGE_SIZE })}</p>}
    </div>
  );
}
