"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { saveLlm, type SaveLlmState } from "@/app/actions/admin";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  baseURL: string;
  model: string;
  hasStoredKey: boolean;
  envBaseURL?: string;
  envModel?: string;
  hasEnvKey: boolean;
};

export function LlmForm({ baseURL, model, hasStoredKey, envBaseURL, envModel, hasEnvKey }: Props) {
  const t = useTranslations("Admin.llm");
  const [state, formAction, pending] = useActionState<SaveLlmState, FormData>(saveLlm, { status: "idle" });

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "saved" && (
        <Alert>
          <AlertDescription>{t("saved")}</AlertDescription>
        </Alert>
      )}
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{t(`errors.${state.error}`)}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="llm-url">{t("baseURL")}</Label>
        <Input
          id="llm-url"
          name="baseURL"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder={envBaseURL ?? "https://llm.example.com/v1"}
          defaultValue={baseURL}
        />
        <p className="text-xs text-muted-foreground">
          {envBaseURL ? t("emptyUsesEnv", { value: envBaseURL }) : t("baseURLHint")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="llm-model">{t("model")}</Label>
        <Input
          id="llm-model"
          name="model"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={envModel ?? "Qwen/Qwen3.6"}
          defaultValue={model}
        />
        <p className="text-xs text-muted-foreground">
          {envModel ? t("emptyUsesEnv", { value: envModel }) : t("modelHint")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="llm-key">{t("apiKey")}</Label>
        <Input
          id="llm-key"
          name="apiKey"
          type="password"
          autoComplete="new-password"
          placeholder={hasStoredKey ? "••••••••" : undefined}
        />
        <p className="text-xs text-muted-foreground">
          {hasStoredKey ? t("keyStored") : hasEnvKey ? t("keyFromEnv") : t("keyMissing")}
        </p>
        {hasStoredKey && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removeApiKey" />
            {t("removeKey")}
          </label>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
