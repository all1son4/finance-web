import { handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import {
  ensureWorkspaceStarterCategories,
  serializeStarterCategory,
} from "@/lib/settings";
import prisma from "@/prisma";
import { starterCategorySchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireUserApi();
    const workspace = await ensureWorkspaceStarterCategories(user.activeWorkspace.id);

    return ok({
      starterCategories: workspace.starterCategories.map(serializeStarterCategory),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    await ensureWorkspaceStarterCategories(user.activeWorkspace.id);
    const payload = starterCategorySchema.parse(await readJson(request));

    const starterCategory = await prisma.starterCategory.create({
      data: {
        color: payload.color,
        kind: payload.kind,
        name: payload.name,
        sortOrder: payload.sortOrder,
        workspaceId: user.activeWorkspace.id,
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
