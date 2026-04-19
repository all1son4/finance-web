import { AppError, handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { serializeTransaction } from "@/lib/serializers";
import { toDateInputValue } from "@/lib/format";
import { transactionSchema } from "@/lib/validation";
import prisma from "@/prisma";

async function getTransactionForWorkspace(id: string, workspaceId: string) {
  const transaction = await prisma.transaction.findFirst({
    include: {
      category: true,
      member: true,
    },
    where: {
      id,
      workspaceId,
    },
  });

  if (!transaction) {
    throw new AppError(404, "Операция не найдена.");
  }

  return transaction;
}

async function assertDependencies(
  workspaceId: string,
  categoryId: string,
  memberId: string,
) {
  const [category, member] = await Promise.all([
    prisma.category.findFirst({
      where: {
        id: categoryId,
        workspaceId,
      },
    }),
    prisma.member.findFirst({
      where: {
        id: memberId,
        workspaceId,
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
    const transaction = await getTransactionForWorkspace(id, user.activeWorkspace.id);

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
    const existing = await getTransactionForWorkspace(id, user.activeWorkspace.id);
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

    await assertDependencies(user.activeWorkspace.id, payload.categoryId, payload.memberId);

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
    const transaction = await getTransactionForWorkspace(id, user.activeWorkspace.id);

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
