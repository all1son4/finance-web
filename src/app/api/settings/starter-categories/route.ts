import { handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import {
  ensureUserSettings,
  serializeStarterCategory,
} from "@/lib/settings";
import prisma from "@/prisma";
import { starterCategorySchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireUserApi();
    const settings = await ensureUserSettings(user.id);

    return ok({
      starterCategories: settings.starterCategories.map(serializeStarterCategory),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    const settings = await ensureUserSettings(user.id);
    const payload = starterCategorySchema.parse(await readJson(request));

    const starterCategory = await prisma.starterCategory.create({
      data: {
        color: payload.color,
        kind: payload.kind,
        name: payload.name,
        sortOrder: payload.sortOrder,
        userSettingsId: settings.id,
      },
    });

    return ok(
      {
        starterCategory: serializeStarterCategory(starterCategory),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
