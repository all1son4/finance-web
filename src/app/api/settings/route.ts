import { handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import {
  ensureUserSettings,
  serializeSettings,
  serializeStarterCategory,
} from "@/lib/settings";
import prisma from "@/prisma";
import { settingsSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireUserApi();
    const settings = await ensureUserSettings(user.id);

    return ok({
      settings: serializeSettings(settings),
      starterCategories: settings.starterCategories.map(serializeStarterCategory),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUserApi();
    const existing = await ensureUserSettings(user.id);
    const raw = (await readJson(request)) as Record<string, unknown>;

    const payload = settingsSchema.parse({
      appName: raw.appName ?? existing.appName,
      currency: raw.currency ?? existing.currency,
      locale: raw.locale ?? existing.locale,
    });

    const settings = await prisma.userSettings.update({
      data: {
        appName: payload.appName,
        currency: payload.currency.toUpperCase(),
        locale: payload.locale,
      },
      include: {
        starterCategories: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
      where: {
        id: existing.id,
      },
    });

    return ok({
      settings: serializeSettings(settings),
      starterCategories: settings.starterCategories.map(serializeStarterCategory),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
