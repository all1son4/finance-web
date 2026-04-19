import { AppError, handleApiError, ok, readJson } from "@/lib/api";
import { createSession, verifyPassword } from "@/lib/auth";
import { ensureUserSettings, serializeSettings } from "@/lib/settings";
import prisma from "@/prisma";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await readJson(request));

    const user = await prisma.user.findUnique({
      include: {
        members: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      where: {
        email: payload.email,
      },
    });

    if (!user) {
      throw new AppError(401, "Неверная почта или пароль.");
    }

    const passwordMatches = await verifyPassword(payload.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError(401, "Неверная почта или пароль.");
    }

    await createSession(user.id);
    const settings = await ensureUserSettings(user.id);

    return ok({
      user: {
        email: user.email,
        id: user.id,
        members: user.members.map((member) => ({
          color: member.color,
          id: member.id,
          name: member.name,
        })),
        name: user.name,
        settings: serializeSettings(settings),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
