import { SavingsGoalsClient } from "@/components/savings-goals-client";
import { requireUserPage } from "@/lib/auth";
import { serializeSavingsGoal } from "@/lib/serializers";
import prisma from "@/prisma";

export default async function SavingsGoalsPage() {
  const user = await requireUserPage();
  const workspace = user.activeWorkspace;
  const savingsGoals = await prisma.savingsGoal.findMany({
    orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }],
    where: {
      workspaceId: workspace.id,
    },
  });

  return (
    <SavingsGoalsClient
      savingsGoals={savingsGoals.map(serializeSavingsGoal)}
      settings={workspace.settings}
    />
  );
}
