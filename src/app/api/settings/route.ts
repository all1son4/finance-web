import { handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import {
  ensureWorkspaceStarterCategories,
  serializeSettings,
  serializeStarterCategory,
} from "@/lib/settings";
import prisma from "@/prisma";
import { settingsSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireUserApi();
    const workspace = await ensureWorkspaceStarterCategories(user.activeWorkspace.id);

    return ok({
      settings: serializeSettings(workspace),
      starterCategories: workspace.starterCategories.map(serializeStarterCategory),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUserApi();
    const existing = user.activeWorkspace.settings;
    const raw = (await readJson(request)) as Record<string, unknown>;

    const payload = settingsSchema.parse({
      appName: raw.appName ?? existing.appName,
      currency: raw.currency ?? existing.currency,
      locale: raw.locale ?? existing.locale,
    });

    const workspace = await prisma.workspace.update({
      data: {
        currency: payload.currency.toUpperCase(),
        locale: payload.locale,
        name: payload.appName,
      },
      include: {
        starterCategories: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
      where: {
        id: user.activeWorkspace.id,
      },
    });

    return ok({
      settings: serializeSettings(workspace),
      starterCategories: workspace.starterCategories.map(serializeStarterCategory),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
