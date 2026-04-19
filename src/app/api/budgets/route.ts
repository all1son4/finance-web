import { AppError, handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { serializeBudget } from "@/lib/serializers";
import { budgetSchema } from "@/lib/validation";
import prisma from "@/prisma";

async function findBudgetCategory(userId: string, categoryId: string) {
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
    throw new AppError(422, "Бюджеты можно создавать только для категорий трат.");
  }

  return category;
}

export async function GET() {
  try {
    const user = await requireUserApi();
    const budgets = await prisma.budget.findMany({
      include: {
        category: true,
      },
      orderBy: [{ endDate: "asc" }, { name: "asc" }],
      where: {
        userId: user.id,
      },
    });

    return ok({
      budgets: budgets.map(serializeBudget),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    const payload = budgetSchema.parse(await readJson(request));
    const category = await findBudgetCategory(user.id, payload.categoryId);

    const budget = await prisma.budget.create({
      data: {
        amount: payload.amount,
        categoryId: payload.categoryId,
        endDate: new Date(payload.endDate),
        name: payload.name ?? `${category.name} бюджет`,
        startDate: new Date(payload.startDate),
        userId: user.id,
      },
      include: {
        category: true,
      },
    });

    return ok(
      {
        budget: serializeBudget(budget),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
