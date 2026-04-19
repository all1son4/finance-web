import { handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { serializeSavingsGoal } from "@/lib/serializers";
import { savingsGoalSchema } from "@/lib/validation";
import prisma from "@/prisma";

export async function GET() {
  try {
    const user = await requireUserApi();
    const savingsGoals = await prisma.savingsGoal.findMany({
      orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }],
      where: {
        userId: user.id,
      },
    });

    return ok({
      savingsGoals: savingsGoals.map(serializeSavingsGoal),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    const payload = savingsGoalSchema.parse(await readJson(request));
    const savingsGoal = await prisma.savingsGoal.create({
      data: {
        currentAmount: payload.currentAmount,
        name: payload.name,
        notes: payload.notes ?? null,
        targetAmount: payload.targetAmount,
        targetDate: payload.targetDate ? new Date(payload.targetDate) : null,
        userId: user.id,
      },
    });

    return ok(
      {
        savingsGoal: serializeSavingsGoal(savingsGoal),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
