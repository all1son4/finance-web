import { handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import {
  requireStarterCategoryForWorkspace,
  serializeStarterCategory,
} from "@/lib/settings";
import prisma from "@/prisma";
import { starterCategorySchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    const existing = await requireStarterCategoryForWorkspace(user.activeWorkspace.id, id);
    const raw = (await readJson(request)) as Record<string, unknown>;

    const payload = starterCategorySchema.parse({
      color: raw.color ?? existing.color,
      kind: raw.kind ?? existing.kind,
      name: raw.name ?? existing.name,
      sortOrder: raw.sortOrder ?? existing.sortOrder,
    });

    const starterCategory = await prisma.starterCategory.update({
      data: {
        color: payload.color,
        kind: payload.kind,
        name: payload.name,
        sortOrder: payload.sortOrder,
      },
      where: {
        id: existing.id,
      },
    });

    return ok({
      starterCategory: serializeStarterCategory(starterCategory),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    const starterCategory = await requireStarterCategoryForWorkspace(
      user.activeWorkspace.id,
      id,
    );

    await prisma.starterCategory.delete({
      where: {
        id: starterCategory.id,
      },
    });

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
