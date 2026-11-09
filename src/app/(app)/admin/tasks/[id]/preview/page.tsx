import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { TaskArticle } from "@/components/tasks/task-article";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isLocale } from "@/i18n/config";
import { requireAdmin } from "@/lib/session";
import { getTaskForEditor } from "@/lib/tasks/admin";
import { getTaskVersion } from "@/lib/tasks/catalog";

/** Shows the draft (or one published version) the way students will see it. */
export default async function PreviewTaskPage({ params, searchParams }: PageProps<"/admin/tasks/[id]/preview">) {
  await requireAdmin();
  const { id } = await params;
  const { version } = await searchParams;
  const t = await getTranslations("Admin.tasks");
  const tt = await getTranslations("Tasks");
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "de";

  const requested = typeof version === "string" ? Number(version) : undefined;
  const shown = requested
    ? await getTaskVersion(id, requested).then((task) => task && { definition: task, body: task.body, label: t("version", { version: requested }) })
    : await getTaskForEditor(id).then(
        (task) =>
          task?.definition &&
          task.body && {
            definition: task.definition,
            body: task.body,
            label: task.source === "draft" ? t("draft") : t("version", { version: task.currentVersion ?? 0 }),
          },
      );
  if (!shown) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href={`/admin/tasks/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToEditor")}
        </Link>
        <Badge variant="secondary">
          {t("previewOf")}: {shown.label}
        </Badge>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{shown.definition.title[locale]}</h1>
        <p className="text-muted-foreground">{shown.definition.summary[locale]}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <TaskArticle markdown={shown.body[locale]} />
        <Card className="lg:self-start">
          <CardHeader>
            <CardTitle>{tt("criteria")}</CardTitle>
            <CardDescription>{tt("criteriaHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-4 text-sm">
              {shown.definition.check.criteria.map((criterion) => (
                <li key={criterion.id}>
                  {criterion.text[locale]}
                  {criterion.required && <span aria-label={tt("required")}> *</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
