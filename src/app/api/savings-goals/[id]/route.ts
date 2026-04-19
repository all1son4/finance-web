import { AppError, handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { serializeSavingsGoal } from "@/lib/serializers";
import { savingsGoalSchema } from "@/lib/validation";
import prisma from "@/prisma";

async function getGoalForUser(id: string, userId: string) {
  const savingsGoal = await prisma.savingsGoal.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!savingsGoal) {
    throw new AppError(404, "Цель накоплений не найдена.");
  }

  return savingsGoal;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    const savingsGoal = await getGoalForUser(id, user.id);

    return ok({
      savingsGoal: serializeSavingsGoal(savingsGoal),
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
    const existing = await getGoalForUser(id, user.id);
    const raw = (await readJson(request)) as Record<string, unknown>;

    const payload = savingsGoalSchema.parse({
      currentAmount: raw.currentAmount ?? Number(existing.currentAmount),
      name: raw.name ?? existing.name,
      notes: "notes" in raw ? raw.notes : existing.notes ?? undefined,
      targetAmount: raw.targetAmount ?? Number(existing.targetAmount),
      targetDate:
        "targetDate" in raw
          ? raw.targetDate
          : existing.targetDate?.toISOString().slice(0, 10),
    });

    const savingsGoal = await prisma.savingsGoal.update({
      data: {
        currentAmount: payload.currentAmount,
        name: payload.name,
        notes: payload.notes ?? null,
        targetAmount: payload.targetAmount,
        targetDate: payload.targetDate ? new Date(payload.targetDate) : null,
      },
      where: {
        id: existing.id,
      },
    });

    return ok({
      savingsGoal: serializeSavingsGoal(savingsGoal),
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
    const savingsGoal = await getGoalForUser(id, user.id);

    await prisma.savingsGoal.delete({
      where: {
        id: savingsGoal.id,
      },
    });

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
