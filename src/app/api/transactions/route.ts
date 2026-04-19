import { AppError, handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { serializeTransaction } from "@/lib/serializers";
import { transactionSchema } from "@/lib/validation";
import prisma from "@/prisma";

async function findTransactionDependencies(userId: string, categoryId: string, memberId: string) {
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

export async function GET() {
  try {
    const user = await requireUserApi();
    const transactions = await prisma.transaction.findMany({
      include: {
        category: true,
        member: true,
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      where: {
        userId: user.id,
      },
    });

    return ok({
      transactions: transactions.map(serializeTransaction),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    const payload = transactionSchema.parse(await readJson(request));

    await findTransactionDependencies(user.id, payload.categoryId, payload.memberId);

    const transaction = await prisma.transaction.create({
      data: {
        amount: payload.amount,
        categoryId: payload.categoryId,
        description: payload.description ?? null,
        memberId: payload.memberId,
        notes: payload.notes ?? null,
        transactionDate: new Date(payload.transactionDate),
        userId: user.id,
      },
      include: {
        category: true,
        member: true,
      },
    });

    return ok(
      {
        transaction: serializeTransaction(transaction),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
