import { TransactionsClient } from "@/components/transactions-client";
import { requireUserPage } from "@/lib/auth";
import { serializeCategory, serializeTransaction } from "@/lib/serializers";
import prisma from "@/prisma";

export default async function TransactionsPage() {
  const user = await requireUserPage();
  const [categories, transactions] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      where: {
        userId: user.id,
      },
    }),
    prisma.transaction.findMany({
      include: {
        category: true,
        member: true,
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      where: {
        userId: user.id,
      },
    }),
  ]);

  return (
    <TransactionsClient
      categories={categories.map(serializeCategory)}
      members={user.members}
      settings={user.settings}
      transactions={transactions.map(serializeTransaction)}
    />
  );
}
