import { z } from "zod";

const localized = z.object({ de: z.string().min(1), en: z.string().min(1) });

export const checkTypes = ["ai", "auto", "url", "quiz", "self"] as const;
export const appTypes = ["all", "web", "mobile", "api", "landingpage"] as const;

export const moduleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int(),
  title: localized,
  description: localized,
});

export const criterionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  required: z.boolean(),
  text: localized,
});

export const taskSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  version: z.number().int().positive(),
  module: z.string(),
  order: z.number().int(),
  title: localized,
  summary: localized,
  requiresRepo: z.boolean(),
  appTypes: z.array(z.enum(appTypes)).min(1),
  prerequisites: z.array(z.string()).default([]),
  check: z.object({
    type: z.enum(checkTypes),
    // Hints for the check agent where to look (glob patterns).
    scope: z.object({ paths: z.array(z.string()) }).optional(),
    // Deterministic checks that run before the AI (see PLAN.md, section 6).
    preChecks: z.array(z.record(z.string(), z.unknown())).default([]),
    criteria: z.array(criterionSchema).min(1),
  }),
});

export type TaskModule = z.infer<typeof moduleSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Criterion = z.infer<typeof criterionSchema>;
