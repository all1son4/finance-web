import { AppError, handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { serializeCategory } from "@/lib/serializers";
import { categorySchema } from "@/lib/validation";
import prisma from "@/prisma";

async function getCategoryForWorkspace(id: string, workspaceId: string) {
  const category = await prisma.category.findFirst({
    where: {
      id,
      workspaceId,
    },
  });

  if (!category) {
    throw new AppError(404, "Категория не найдена.");
  }

  return category;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    const category = await getCategoryForWorkspace(id, user.activeWorkspace.id);

    return ok({
      category: serializeCategory(category),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    const existing = await getCategoryForWorkspace(id, user.activeWorkspace.id);
    const raw = (await readJson(request)) as Record<string, unknown>;

    const payload = categorySchema.parse({
      color: raw.color ?? existing.color,
      kind: raw.kind ?? existing.kind,
      name: raw.name ?? existing.name,
    });

    if (payload.kind !== "EXPENSE") {
      const budgetCount = await prisma.budget.count({
        where: {
          categoryId: existing.id,
        },
      });

      if (budgetCount) {
        throw new AppError(
          422,
          "Категории, которые используются в бюджетах, должны оставаться категориями трат.",
        );
      }
    }

    const category = await prisma.category.update({
      data: {
        color: payload.color,
        kind: payload.kind,
        name: payload.name,
      },
      where: {
        id: existing.id,
      },
    });

    return ok({
      category: serializeCategory(category),
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
    const category = await getCategoryForWorkspace(id, user.activeWorkspace.id);
    const [budgetCount, transactionCount] = await Promise.all([
      prisma.budget.count({
        where: {
          categoryId: category.id,
        },
      }),
      prisma.transaction.count({
        where: {
          categoryId: category.id,
        },
      }),
    ]);

    if (budgetCount || transactionCount) {
      throw new AppError(
        409,
        "Перед удалением категории удалите или перенесите связанные бюджеты и операции.",
      );
    }

    await prisma.category.delete({
      where: {
        id: category.id,
      },
    });

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
