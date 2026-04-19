import { handleApiError, ok } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { ensureWorkspaceStarterCategories } from "@/lib/settings";
import prisma from "@/prisma";

export async function POST() {
  try {
    const user = await requireUserApi();
    const workspaceId = user.activeWorkspace.id;
    const workspace = await ensureWorkspaceStarterCategories(workspaceId);

    const existingCategories = await prisma.category.findMany({
      select: {
        name: true,
      },
      where: {
        workspaceId,
      },
    });

    const existingNames = new Set(
      existingCategories.map((category) => category.name.trim().toLowerCase()),
    );

    const missingStarterCategories = workspace.starterCategories.filter(
      (category) => !existingNames.has(category.name.trim().toLowerCase()),
    );

    if (missingStarterCategories.length) {
      await prisma.category.createMany({
        data: missingStarterCategories.map((category) => ({
          color: category.color,
          kind: category.kind,
          name: category.name,
          userId: user.id,
          workspaceId,
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
