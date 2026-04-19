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
  const [budgets, categories, transactions] = await Promise.all([
    prisma.budget.findMany({
      include: {
        category: true,
      },
      orderBy: [{ endDate: "asc" }, { name: "asc" }],
      where: {
        userId: user.id,
      },
    }),
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
      orderBy: [{ transactionDate: "desc" }],
      where: {
        userId: user.id,
      },
    }),
  ]);

  return (
    <BudgetClient
      budgets={budgets.map(serializeBudget)}
      categories={categories.map(serializeCategory)}
      settings={user.settings}
      transactions={transactions.map(serializeTransaction)}
    />
  );
}
