import { TransactionsClient } from "@/components/transactions-client";
import { requireUserPage } from "@/lib/auth";
import { serializeCategory, serializeTransaction } from "@/lib/serializers";
import prisma from "@/prisma";

export default async function TransactionsPage() {
  const user = await requireUserPage();
  const workspace = user.activeWorkspace;
  const [categories, transactions] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      where: {
        workspaceId: workspace.id,
      },
    }),
    prisma.transaction.findMany({
      include: {
        category: true,
        member: true,
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      where: {
        workspaceId: workspace.id,
      },
    }),
  ]);

  return (
    <TransactionsClient
      categories={categories.map(serializeCategory)}
      members={workspace.members}
      settings={workspace.settings}
      transactions={transactions.map(serializeTransaction)}
    />
  );
}
