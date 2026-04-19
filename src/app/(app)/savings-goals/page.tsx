import { SavingsGoalsClient } from "@/components/savings-goals-client";
import { requireUserPage } from "@/lib/auth";
import { serializeSavingsGoal } from "@/lib/serializers";
import prisma from "@/prisma";

export default async function SavingsGoalsPage() {
  const user = await requireUserPage();
  const savingsGoals = await prisma.savingsGoal.findMany({
    orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }],
    where: {
      userId: user.id,
    },
  });

  return (
    <SavingsGoalsClient
      savingsGoals={savingsGoals.map(serializeSavingsGoal)}
      settings={user.settings}
    />
  );
}
