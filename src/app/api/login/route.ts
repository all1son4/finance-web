import { AppError, handleApiError, ok, readJson } from "@/lib/api";
import { createSession, verifyPassword } from "@/lib/auth";
import { serializeSettings } from "@/lib/settings";
import prisma from "@/prisma";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await readJson(request));

    const user = await prisma.user.findUnique({
      include: {
        workspaceMemberships: {
          include: {
            workspace: {
              include: {
                _count: {
                  select: {
                    members: true,
                  },
                },
                members: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
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

    const activeMembership = user.workspaceMemberships[0];

    if (!activeMembership) {
      throw new AppError(409, "У пользователя нет доступных пространств.");
    }

    await createSession(user.id, activeMembership.workspace.id);

    return ok({
      user: {
        activeWorkspace: {
          id: activeMembership.workspace.id,
          inviteCode: activeMembership.workspace.inviteCode,
          members: activeMembership.workspace.members.map((member) => ({
            color: member.color,
            id: member.id,
            name: member.name,
          })),
          name: activeMembership.workspace.name,
          role: activeMembership.role,
          settings: serializeSettings(activeMembership.workspace),
        },
        email: user.email,
        id: user.id,
        name: user.name,
        workspaces: user.workspaceMemberships.map((membership) => ({
          id: membership.workspace.id,
          inviteCode: membership.workspace.inviteCode,
          memberCount: membership.workspace._count.members,
          name: membership.workspace.name,
          role: membership.role,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
