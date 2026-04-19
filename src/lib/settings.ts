import type { Category, StarterCategory, UserSettings } from "@prisma/client";

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

export function serializeSettings(settings: UserSettings): AppSettingsRecord {
  return {
    appName: settings.appName,
    currency: settings.currency,
    id: settings.id,
    locale: settings.locale,
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

export async function ensureUserSettings(userId: string) {
  const existingSettings = await prisma.userSettings.findUnique({
    include: {
      starterCategories: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    where: {
      userId,
    },
  });

  if (existingSettings) {
    if (existingSettings.starterCategories.length) {
      return existingSettings;
    }

    const existingCategories = await prisma.category.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      where: { userId },
    });

    return prisma.userSettings.update({
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
        id: existingSettings.id,
      },
    });
  }

  return prisma.userSettings.create({
    data: {
      appName: DEFAULT_APP_NAME,
      currency: DEFAULT_APP_CURRENCY,
      locale: DEFAULT_APP_LOCALE,
      starterCategories: {
        createMany: {
          data: buildDefaultStarterCategories(),
        },
      },
      userId,
    },
    include: {
      starterCategories: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}

export async function requireStarterCategoryForUser(userId: string, id: string) {
  const settings = await ensureUserSettings(userId);
  const starterCategory = settings.starterCategories.find(
    (category) => category.id === id,
  );

  if (!starterCategory) {
    throw new AppError(404, "Стартовая категория не найдена.");
  }

  return starterCategory;
}
