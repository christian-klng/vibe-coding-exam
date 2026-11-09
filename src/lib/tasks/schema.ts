import { z } from "zod";

export const localized = z.object({ de: z.string().min(1), en: z.string().min(1) });
export type Localized = z.infer<typeof localized>;

export const checkTypes = ["ai", "auto", "url", "quiz", "self"] as const;
export const appTypes = ["all", "web", "mobile", "api", "landingpage"] as const;

export const moduleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int(),
  title: localized,
  description: localized,
});

// Deterministic checks that run before the AI, see src/checker/pre-checks.ts.
export const preCheckSchema = z.union([
  z.strictObject({ fileExists: z.string() }),
  z.strictObject({ notTracked: z.array(z.string()) }),
  z.strictObject({ minCommits: z.number().int().positive() }),
  z.strictObject({ mergedPullRequest: z.literal(true) }),
  z.strictObject({ repoIsPublic: z.literal(true) }),
  z.strictObject({ readmeHasUrl: z.literal(true) }),
  z.strictObject({ urlReachable: z.literal(true) }),
  z.strictObject({ httpsValid: z.literal(true) }),
  z.strictObject({ httpRedirectsToHttps: z.literal(true) }),
  z.strictObject({ noSecretsInFiles: z.literal(true) }),
  z.strictObject({ noSecretsInHistory: z.literal(true) }),
  z.strictObject({ noSecretsInClientBundle: z.literal(true) }),
]);

export const criterionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  required: z.boolean(),
  text: localized,
});

// What a version of a task contains. Id, version, module and order live next to it.
export const taskDefinitionSchema = z.object({
  title: localized,
  summary: localized,
  requiresRepo: z.boolean(),
  // Shows the form for entering the GitHub repository on the task page.
  showRepoForm: z.boolean().default(false),
  appTypes: z.array(z.enum(appTypes)).min(1),
  prerequisites: z.array(z.string()).default([]),
  check: z.object({
    type: z.enum(checkTypes),
    // Hints for the check agent where to look (glob patterns).
    scope: z.object({ paths: z.array(z.string()) }).optional(),
    preChecks: z.array(preCheckSchema).default([]),
    criteria: z.array(criterionSchema).min(1),
  }),
});

// A task file (task.yaml) and the shape every consumer of the catalog gets.
export const taskSchema = taskDefinitionSchema.extend({
  id: z.string().regex(/^[a-z0-9-]+$/),
  version: z.number().int().positive(),
  module: z.string(),
  order: z.number().int(),
});

export type TaskModule = z.infer<typeof moduleSchema>;
export type TaskDefinition = z.infer<typeof taskDefinitionSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Criterion = z.infer<typeof criterionSchema>;
export type PreCheck = z.infer<typeof preCheckSchema>;
