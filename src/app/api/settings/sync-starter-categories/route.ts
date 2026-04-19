import { handleApiError, ok } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { ensureUserSettings } from "@/lib/settings";
import prisma from "@/prisma";

export async function POST() {
  try {
    const user = await requireUserApi();
    const settings = await ensureUserSettings(user.id);

    const existingCategories = await prisma.category.findMany({
      select: {
        name: true,
      },
      where: {
        userId: user.id,
      },
    });

    const existingNames = new Set(
      existingCategories.map((category) => category.name.trim().toLowerCase()),
    );

    const missingStarterCategories = settings.starterCategories.filter(
      (category) => !existingNames.has(category.name.trim().toLowerCase()),
    );

    if (missingStarterCategories.length) {
      await prisma.category.createMany({
        data: missingStarterCategories.map((category) => ({
          color: category.color,
          kind: category.kind,
          name: category.name,
          userId: user.id,
        })),
      });
    }

    return ok({
      addedCount: missingStarterCategories.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
