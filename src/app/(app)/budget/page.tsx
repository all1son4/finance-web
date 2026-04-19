import { BudgetClient } from "@/components/budget-client";
import { requireUserPage } from "@/lib/auth";
import {
  serializeBudget,
  serializeCategory,
  serializeTransaction,
} from "@/lib/serializers";
import prisma from "@/prisma";

export default async function BudgetPage() {
  const user = await requireUserPage();
  const workspace = user.activeWorkspace;
  const [budgets, categories, transactions] = await Promise.all([
    prisma.budget.findMany({
      include: {
        category: true,
      },
      orderBy: [{ endDate: "asc" }, { name: "asc" }],
      where: {
        workspaceId: workspace.id,
      },
    }),
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
      orderBy: [{ transactionDate: "desc" }],
      where: {
        workspaceId: workspace.id,
      },
    }),
  ]);

  return (
    <BudgetClient
      budgets={budgets.map(serializeBudget)}
      categories={categories.map(serializeCategory)}
      settings={workspace.settings}
      transactions={transactions.map(serializeTransaction)}
    />
  );
}
