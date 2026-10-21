"use client";

import { ExternalLink, GitBranch } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { saveRepository, type SaveRepoState } from "@/app/actions/repository";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SavedRepo = { url: string; owner: string; name: string; defaultBranch: string };

export function RepoForm({ repo }: { repo: SavedRepo | null }) {
  const t = useTranslations("Repo");
  const [state, formAction, pending] = useActionState<SaveRepoState, FormData>(saveRepository, { status: "idle" });
  const [editing, setEditing] = useState(false);

  // A successful save ends edit mode; the page then re-renders with the new repo.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "saved") setEditing(false);
  }

  const feedback =
    state.status === "saved" ? (
      <Alert>
        <AlertDescription>{state.hasCommits ? t("saved") : t("savedNoCommits")}</AlertDescription>
      </Alert>
    ) : null;

  if (repo && !editing) {
    return (
      <div className="space-y-3">
        {feedback}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
          >
            {repo.owner}/{repo.name}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <GitBranch className="size-3.5" aria-hidden />
            {t("branch", { branch: repo.defaultBranch })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="ml-auto">
            {t("change")}
          </Button>
        </div>
      </div>
    );
  }

  const error = state.status === "error" ? t(`errors.${state.error}`) : null;

  return (
    <form action={formAction} className="space-y-3">
      {!repo && <p className="text-sm text-muted-foreground">{t("missing")}</p>}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="repo-url">{t("label")}</Label>
        <Input
          id="repo-url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder={t("placeholder")}
          defaultValue={state.status === "error" ? state.value : (repo?.url ?? "")}
          aria-invalid={error ? true : undefined}
          required
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
        {repo && (
          <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
