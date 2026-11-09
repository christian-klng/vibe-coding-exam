"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { type ModuleFormState, saveModuleAction } from "@/app/actions/tasks-admin";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TaskModule } from "@/lib/tasks/schema";

export function ModuleForm({ module, create = false }: { module?: TaskModule; create?: boolean }) {
  const t = useTranslations("Admin.modules");
  const [state, formAction, pending] = useActionState<ModuleFormState, FormData>(saveModuleAction.bind(null, create), {
    status: "idle",
  });
  const prefix = module?.id ?? "new";

  return (
    <form action={formAction} className="space-y-3 rounded-xl border p-4">
      {state.status === "saved" && (
        <Alert>
          <AlertDescription>{t("saved")}</AlertDescription>
        </Alert>
      )}
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{state.problems.join(" · ")}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-id`}>{t("id")}</Label>
          <Input id={`${prefix}-id`} name="id" defaultValue={module?.id} readOnly={!create} autoComplete="off" spellCheck={false} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-order`}>{t("order")}</Label>
          <Input id={`${prefix}-order`} name="order" type="number" defaultValue={module?.order} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["de", "en"] as const).map((lang) => (
          <div key={lang} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${prefix}-title-${lang}`}>{t(`title.${lang}`)}</Label>
              <Input id={`${prefix}-title-${lang}`} name={`title.${lang}`} defaultValue={module?.title[lang]} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${prefix}-description-${lang}`}>{t(`description.${lang}`)}</Label>
              <Textarea id={`${prefix}-description-${lang}`} name={`description.${lang}`} defaultValue={module?.description[lang]} rows={2} />
            </div>
          </div>
        ))}
      </div>
      <Button type="submit" variant={create ? "default" : "outline"} size="sm" disabled={pending}>
        {pending ? t("saving") : create ? t("create") : t("save")}
      </Button>
    </form>
  );
}
