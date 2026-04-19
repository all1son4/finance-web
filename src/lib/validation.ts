import { z } from "zod";

const categoryKinds = ["EXPENSE", "INCOME", "SAVINGS"] as const;

const emailSchema = z
  .string()
  .trim()
  .email("Введите корректный email.")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Пароль должен быть не короче 8 символов.")
  .max(100, "Пароль должен быть не длиннее 100 символов.");

const colorSchema = z.string().regex(/^#(?:[\dA-Fa-f]{3}){1,2}$/, {
  message: "Цвет должен быть в формате hex.",
});

const memberNamesSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(8, "Можно добавить до 8 пользователей.")
  .default([]);

const dateInputSchema = z.string().refine((value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && value.length >= 10;
}, "Введите корректную дату.");

const optionalString = (max: number) =>
  z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      const trimmed = (value ?? "").trim();
      return trimmed.length ? trimmed : undefined;
    })
    .refine((value) => (value ? value.length <= max : true), {
      message: `Значение должно быть не длиннее ${max} символов.`,
    });

export const setupSchema = z.object({
  email: emailSchema,
  memberNames: memberNamesSchema,
  name: z.string().trim().min(2).max(60),
  password: passwordSchema,
  workspaceName: z.string().trim().min(2).max(60),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const categorySchema = z.object({
  color: colorSchema,
  kind: z.enum(categoryKinds),
  name: z.string().trim().min(2).max(40),
});

export const transactionSchema = z.object({
  amount: z.coerce.number().positive("Сумма должна быть больше нуля.").max(1_000_000),
  categoryId: z.string().trim().min(1),
  description: optionalString(120),
  memberId: z.string().trim().min(1),
  notes: optionalString(240),
  transactionDate: dateInputSchema,
});

export const budgetSchema = z
  .object({
    amount: z.coerce.number().positive("Сумма бюджета должна быть больше нуля."),
    categoryId: z.string().trim().min(1),
    endDate: dateInputSchema,
    name: optionalString(80),
    startDate: dateInputSchema,
  })
  .refine(
    (value) => new Date(value.endDate).getTime() >= new Date(value.startDate).getTime(),
    {
      message: "Дата окончания должна быть не раньше даты начала.",
      path: ["endDate"],
    },
  );

export const savingsGoalSchema = z.object({
  currentAmount: z.coerce.number().min(0).max(1_000_000).default(0),
  name: z.string().trim().min(2).max(80),
  notes: optionalString(240),
  targetAmount: z.coerce.number().positive("Целевая сумма должна быть больше нуля."),
  targetDate: z
    .union([dateInputSchema, z.undefined()])
    .optional()
    .transform((value) => value || undefined),
});

export const settingsSchema = z.object({
  appName: z.string().trim().min(2).max(60),
  currency: z.string().trim().length(3, "Код валюты должен состоять из 3 символов."),
  locale: z.string().trim().min(2).max(16),
});

export const workspaceCreateSchema = z.object({
  memberNames: memberNamesSchema,
  name: z.string().trim().min(2).max(60),
});

export const workspaceJoinSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(6, "Код приглашения слишком короткий.")
    .max(64, "Код приглашения слишком длинный."),
});

export const workspaceSwitchSchema = z.object({
  workspaceId: z.string().trim().min(1),
});

export const starterCategorySchema = z.object({
  color: colorSchema,
  kind: z.enum(categoryKinds),
  name: z.string().trim().min(2).max(40),
  sortOrder: z.coerce.number().int().min(0).max(99).default(0),
});
