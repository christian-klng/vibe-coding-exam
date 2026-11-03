"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { testLlm, type TestLlmState } from "@/app/actions/admin";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function LlmTest() {
  const t = useTranslations("Admin.llm");
  const [state, formAction, pending] = useActionState<TestLlmState>(() => testLlm(), {});
  const passed = state.steps?.length === 3 && state.steps.every((step) => step.ok);

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? t("testing") : t("test")}
        </Button>
      </div>
      {state.failed && (
        <Alert variant="destructive">
          <AlertDescription>{t("testFailed")}</AlertDescription>
        </Alert>
      )}
      {state.steps && !pending && (
        <div className="space-y-3" role="status">
          <ul className="space-y-2 text-sm">
            {state.steps.map((step) => {
              const Icon = step.ok ? CheckCircle2 : XCircle;
              return (
                <li key={step.name} className="flex gap-2">
                  <Icon
                    role="img"
                    aria-label={t(step.ok ? "stepOk" : "stepFailed")}
                    className={`mt-0.5 size-4 shrink-0 ${step.ok ? "text-green-600" : "text-destructive"}`}
                  />
                  <div className="min-w-0">
                    <p>{t(`steps.${step.name}`)}</p>
                    <p className="text-xs break-words text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-sm font-medium">{passed ? t("testPassed") : t("testNotPassed")}</p>
        </div>
      )}
    </form>
  );
}
