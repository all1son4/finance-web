import type { Category, StarterCategory, Workspace } from "@prisma/client";

import { AppError } from "@/lib/api";
import { DEFAULT_CATEGORIES, type CategoryKindValue } from "@/lib/defaults";
import prisma from "@/prisma";

export type AppSettingsRecord = {
  appName: string;
  currency: string;
  id: string;
  locale: string;
};

export type StarterCategoryRecord = {
  color: string;
  id: string;
  kind: CategoryKindValue;
  name: string;
  sortOrder: number;
};

export const DEFAULT_APP_NAME = "Household Finance";
export const DEFAULT_APP_LOCALE = "ru-RU";
export const DEFAULT_APP_CURRENCY = "PLN";

export const LOCALE_OPTIONS = [
  { label: "Русский", value: "ru-RU" },
  { label: "Polski", value: "pl-PL" },
  { label: "English", value: "en-US" },
] as const;

export const CURRENCY_OPTIONS = [
  { label: "Польский злотый", value: "PLN" },
  { label: "Евро", value: "EUR" },
  { label: "Доллар США", value: "USD" },
] as const;

export function serializeSettings(workspace: Pick<Workspace, "currency" | "id" | "locale" | "name">): AppSettingsRecord {
  return {
    appName: workspace.name,
    currency: workspace.currency,
    id: workspace.id,
    locale: workspace.locale,
  };
}

export function serializeStarterCategory(
  category: StarterCategory,
): StarterCategoryRecord {
  return {
    color: category.color,
    id: category.id,
    kind: category.kind as CategoryKindValue,
    name: category.name,
    sortOrder: category.sortOrder,
  };
}

function buildDefaultStarterCategories() {
  return DEFAULT_CATEGORIES.map((category, index) => ({
    color: category.color,
    kind: category.kind,
    name: category.name,
    sortOrder: index,
  }));
}

function mapExistingCategoriesToStarterCategories(categories: Category[]) {
  return categories.map((category, index) => ({
    color: category.color,
    kind: category.kind as CategoryKindValue,
    name: category.name,
    sortOrder: index,
  }));
}

export async function ensureWorkspaceStarterCategories(workspaceId: string) {
  const existingWorkspace = await prisma.workspace.findUnique({
    include: {
      starterCategories: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    where: {
      id: workspaceId,
    },
  });

  if (!existingWorkspace) {
    throw new AppError(404, "Пространство не найдено.");
  }

  if (existingWorkspace.starterCategories.length) {
    return existingWorkspace;
  }

  const existingCategories = await prisma.category.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    where: { workspaceId },
  });

  return prisma.workspace.update({
    data: {
      starterCategories: {
        createMany: {
          data: existingCategories.length
            ? mapExistingCategoriesToStarterCategories(existingCategories)
            : buildDefaultStarterCategories(),
        },
      },
    },
    include: {
      starterCategories: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    where: {
      id: workspaceId,
    },
  });
}

export async function requireStarterCategoryForWorkspace(
  workspaceId: string,
  id: string,
) {
  const workspace = await ensureWorkspaceStarterCategories(workspaceId);
  const starterCategory = workspace.starterCategories.find((category) => category.id === id);

  if (!starterCategory) {
    throw new AppError(404, "Стартовая категория не найдена.");
  }

  return starterCategory;
}
