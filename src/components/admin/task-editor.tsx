"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { saveTask, type TaskEditorState } from "@/app/actions/tasks-admin";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/config";
import { appTypes, checkTypes, type Criterion, type Localized, type TaskDefinition } from "@/lib/tasks/schema";

export type TaskEditorProps = {
  create: boolean;
  id: string;
  moduleId: string;
  order: number;
  definition?: TaskDefinition;
  body?: Localized;
  preChecksYaml: string;
  modules: { id: string; title: Localized }[];
  otherTasks: { id: string; title: Localized }[];
  locale: Locale;
  // A draft exists whose criteria differ from the published version.
  criteriaDiffer: boolean;
};

type CriterionRow = Criterion & { key: number };

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

function emptyCriterion(key: number): CriterionRow {
  return { key, id: "", required: true, text: { de: "", en: "" } };
}

export function TaskEditor(props: TaskEditorProps) {
  const t = useTranslations("Admin.tasks");
  const { definition, locale } = props;
  const [state, formAction, pending] = useActionState<TaskEditorState, FormData>(saveTask.bind(null, props.create), {
    status: "idle",
  });
  const [criteria, setCriteria] = useState<CriterionRow[]>(() =>
    definition ? definition.check.criteria.map((criterion, index) => ({ ...criterion, key: index })) : [emptyCriterion(0)],
  );
  const [nextKey, setNextKey] = useState(criteria.length);

  const update = (key: number, patch: Partial<Criterion> | { text: Partial<Localized> }) =>
    setCriteria((rows) =>
      rows.map((row) =>
        row.key === key ? { ...row, ...patch, text: { ...row.text, ...("text" in patch ? patch.text : {}) } } : row,
      ),
    );
  const move = (index: number, direction: -1 | 1) =>
    setCriteria((rows) => {
      const target = index + direction;
      if (target < 0 || target >= rows.length) return rows;
      const copy = [...rows];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });

  const field = (name: string, label: string, defaultValue: string | undefined, multiline = false, rows = 3) => (
    <div className="space-y-1.5">
      <Label htmlFor={`task-${name}`}>{label}</Label>
      {multiline ? (
        <Textarea id={`task-${name}`} name={name} defaultValue={defaultValue} rows={rows} />
      ) : (
        <Input id={`task-${name}`} name={name} defaultValue={defaultValue} autoComplete="off" />
      )}
    </div>
  );

  return (
    <form action={formAction} className="space-y-8">
      {state.status === "saved" && (
        <Alert>
          <AlertDescription>{t("savedDraft")}</AlertDescription>
        </Alert>
      )}
      {state.status === "published" && (
        <Alert>
          <AlertDescription>
            {t("published", { version: state.version })} {state.criteriaChanged && t("publishedCriteriaChanged")}
          </AlertDescription>
        </Alert>
      )}
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>
            <p className="font-medium">{t("invalid")}</p>
            <ul className="list-disc pl-4">
              {state.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-id">{t("fields.id")}</Label>
          <Input id="task-id" name="id" defaultValue={props.id} readOnly={!props.create} autoComplete="off" spellCheck={false} />
          {props.create && <p className="text-xs text-muted-foreground">{t("fields.idHint")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-module">{t("fields.module")}</Label>
          <select id="task-module" name="moduleId" defaultValue={props.moduleId} className={selectClass}>
            {props.modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.title[locale]}
              </option>
            ))}
          </select>
        </div>
        {field("order", t("fields.order"), String(props.order))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {(["de", "en"] as const).map((lang) => (
          <div key={lang} className="space-y-4 rounded-xl border p-4">
            <h2 className="font-semibold">{t(`language.${lang}`)}</h2>
            {field(`title.${lang}`, t("fields.title"), definition?.title[lang])}
            {field(`summary.${lang}`, t("fields.summary"), definition?.summary[lang], true, 2)}
            {field(`body.${lang}`, t("fields.body"), props.body?.[lang], true, 16)}
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">{t("sections.settings")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="requiresRepo" defaultChecked={definition?.requiresRepo ?? true} />
              {t("fields.requiresRepo")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="showRepoForm" defaultChecked={definition?.showRepoForm ?? false} />
              {t("fields.showRepoForm")}
            </label>
          </div>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">{t("fields.appTypes")}</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {appTypes.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="appTypes" value={type} defaultChecked={(definition?.appTypes ?? ["all"]).includes(type)} />
                  {type}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">{t("fields.prerequisites")}</legend>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {props.otherTasks.map((task) => (
              <label key={task.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="prerequisites" value={task.id} defaultChecked={definition?.prerequisites.includes(task.id)} />
                <span className="truncate">{task.title[locale]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">{t("sections.check")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-checkType">{t("fields.checkType")}</Label>
            <select id="task-checkType" name="checkType" defaultValue={definition?.check.type ?? "ai"} className={selectClass}>
              {checkTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`checkTypes.${type}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-scopePaths">{t("fields.scopePaths")}</Label>
            <Textarea id="task-scopePaths" name="scopePaths" rows={2} defaultValue={definition?.check.scope?.paths.join("\n")} spellCheck={false} />
            <p className="text-xs text-muted-foreground">{t("fields.scopePathsHint")}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-preChecks">{t("fields.preChecks")}</Label>
          <Textarea id="task-preChecks" name="preChecks" rows={3} defaultValue={props.preChecksYaml} spellCheck={false} className="font-mono" />
          <p className="text-xs text-muted-foreground">{t("fields.preChecksHint")}</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("sections.criteria")}</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setCriteria((rows) => [...rows, emptyCriterion(nextKey)]);
              setNextKey((key) => key + 1);
            }}
          >
            <Plus data-icon="inline-start" aria-hidden />
            {t("criteria.add")}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t("criteria.hint")}</p>
        <ol className="space-y-3">
          {criteria.map((criterion, index) => (
            <li key={criterion.key} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[8rem_1fr_1fr_auto]">
              <div className="space-y-2">
                <Input
                  name={`criterion.${index}.id`}
                  value={criterion.id}
                  onChange={(event) => update(criterion.key, { id: event.target.value })}
                  onBlur={() => !criterion.id && update(criterion.key, { id: slug(criterion.text.en || criterion.text.de) })}
                  placeholder={t("criteria.id")}
                  aria-label={t("criteria.id")}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`criterion.${index}.required`}
                    checked={criterion.required}
                    onChange={(event) => update(criterion.key, { required: event.target.checked })}
                  />
                  {t("criteria.required")}
                </label>
              </div>
              {(["de", "en"] as const).map((lang) => (
                <Textarea
                  key={lang}
                  name={`criterion.${index}.text.${lang}`}
                  value={criterion.text[lang]}
                  onChange={(event) => update(criterion.key, { text: { [lang]: event.target.value } })}
                  rows={2}
                  placeholder={t(`language.${lang}`)}
                  aria-label={`${t("criteria.text")} (${t(`language.${lang}`)})`}
                />
              ))}
              <div className="flex gap-1 sm:flex-col">
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t("criteria.up")} disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("criteria.down")}
                  disabled={index === criteria.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("criteria.remove")}
                  onClick={() => setCriteria((rows) => rows.filter((row) => row.key !== criterion.key))}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t pt-6">
        <Button type="submit" name="intent" value="save" variant="outline" disabled={pending}>
          {pending ? t("saving") : t("saveDraft")}
        </Button>
        <Button type="submit" name="intent" value="publish" disabled={pending}>
          {pending ? t("saving") : t("publish")}
        </Button>
        {props.criteriaDiffer && <p className="text-sm text-muted-foreground">{t("criteriaDiffer")}</p>}
      </div>
    </form>
  );
}
