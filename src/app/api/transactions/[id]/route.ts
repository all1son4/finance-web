import { AppError, handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { serializeTransaction } from "@/lib/serializers";
import { toDateInputValue } from "@/lib/format";
import { transactionSchema } from "@/lib/validation";
import prisma from "@/prisma";

async function getTransactionForUser(id: string, userId: string) {
  const transaction = await prisma.transaction.findFirst({
    include: {
      category: true,
      member: true,
    },
    where: {
      id,
      userId,
    },
  });

  if (!transaction) {
    throw new AppError(404, "Операция не найдена.");
  }

  return transaction;
}

async function assertDependencies(userId: string, categoryId: string, memberId: string) {
  const [category, member] = await Promise.all([
    prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
    }),
    prisma.member.findFirst({
      where: {
        id: memberId,
        userId,
      },
    }),
  ]);

  if (!category) {
    throw new AppError(404, "Категория не найдена.");
  }

  if (!member) {
    throw new AppError(404, "Пользователь не найден.");
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    const transaction = await getTransactionForUser(id, user.id);

    return ok({
      transaction: serializeTransaction(transaction),
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
    const existing = await getTransactionForUser(id, user.id);
    const raw = (await readJson(request)) as Record<string, unknown>;

    const payload = transactionSchema.parse({
      amount: raw.amount ?? Number(existing.amount),
      categoryId: raw.categoryId ?? existing.categoryId,
      description:
        "description" in raw ? raw.description : existing.description ?? undefined,
      memberId: raw.memberId ?? existing.memberId,
      notes: "notes" in raw ? raw.notes : existing.notes ?? undefined,
      transactionDate:
        raw.transactionDate ?? toDateInputValue(existing.transactionDate),
    });

    await assertDependencies(user.id, payload.categoryId, payload.memberId);

    const transaction = await prisma.transaction.update({
      data: {
        amount: payload.amount,
        categoryId: payload.categoryId,
        description: payload.description ?? null,
        memberId: payload.memberId,
        notes: payload.notes ?? null,
        transactionDate: new Date(payload.transactionDate),
      },
      include: {
        category: true,
        member: true,
      },
      where: {
        id: existing.id,
      },
    });

    return ok({
      transaction: serializeTransaction(transaction),
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
    const transaction = await getTransactionForUser(id, user.id);

    await prisma.transaction.delete({
      where: {
        id: transaction.id,
      },
    });

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
