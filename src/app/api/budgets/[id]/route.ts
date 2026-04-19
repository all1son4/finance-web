import { AppError, handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { toDateInputValue } from "@/lib/format";
import { serializeBudget } from "@/lib/serializers";
import { budgetSchema } from "@/lib/validation";
import prisma from "@/prisma";

async function getBudgetForUser(id: string, userId: string) {
  const budget = await prisma.budget.findFirst({
    include: {
      category: true,
    },
    where: {
      id,
      userId,
    },
  });

  if (!budget) {
    throw new AppError(404, "Бюджет не найден.");
  }

  return budget;
}

async function assertBudgetCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
  });

  if (!category) {
    throw new AppError(404, "Категория не найдена.");
  }

  if (category.kind !== "EXPENSE") {
    throw new AppError(422, "Бюджет можно привязать только к категории трат.");
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
    const budget = await getBudgetForUser(id, user.id);

    return ok({
      budget: serializeBudget(budget),
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
    const existing = await getBudgetForUser(id, user.id);
    const raw = (await readJson(request)) as Record<string, unknown>;

    const payload = budgetSchema.parse({
      amount: raw.amount ?? Number(existing.amount),
      categoryId: raw.categoryId ?? existing.categoryId,
      endDate: raw.endDate ?? toDateInputValue(existing.endDate),
      name: "name" in raw ? raw.name : existing.name,
      startDate: raw.startDate ?? toDateInputValue(existing.startDate),
    });

    const category = await assertBudgetCategory(user.id, payload.categoryId);

    const budget = await prisma.budget.update({
      data: {
        amount: payload.amount,
        categoryId: payload.categoryId,
        endDate: new Date(payload.endDate),
        name: payload.name ?? `${category.name} бюджет`,
        startDate: new Date(payload.startDate),
      },
      include: {
        category: true,
      },
      where: {
        id: existing.id,
      },
    });

    return ok({
      budget: serializeBudget(budget),
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
    const budget = await getBudgetForUser(id, user.id);

    await prisma.budget.delete({
      where: {
        id: budget.id,
      },
    });

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
