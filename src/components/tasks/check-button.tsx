"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { requestCheck, type RequestCheckState } from "@/app/actions/check";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function CheckButton({ taskId, label }: { taskId: string; label: string }) {
  const t = useTranslations("Checks.limits");
  const [state, formAction, pending] = useActionState<RequestCheckState>(() => requestCheck(taskId), {});

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <Alert>
          <AlertDescription>{t(state.error)}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {label}
      </Button>
    </form>
  );
}
