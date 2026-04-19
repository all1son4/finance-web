import { handleApiError, ok, readJson } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { serializeSettings } from "@/lib/settings";
import prisma from "@/prisma";
import { setupSchema } from "@/lib/validation";
import { createWorkspace } from "@/lib/workspaces";

export async function POST(request: Request) {
  try {
    const payload = setupSchema.parse(await readJson(request));
    const passwordHash = await hashPassword(payload.password);

    const result = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: payload.email,
          name: payload.name,
          passwordHash,
        },
      });

      const workspace = await createWorkspace(tx, {
        memberNames: payload.memberNames,
        name: payload.workspaceName,
        ownerName: createdUser.name,
        ownerUserId: createdUser.id,
      });

      const user = await tx.user.findUniqueOrThrow({
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
          },
        },
        where: {
          id: createdUser.id,
        },
      });

      return {
        user,
        workspaceId: workspace.id,
      };
    });

    await createSession(result.user.id, result.workspaceId);

    const membership = result.user.workspaceMemberships.find(
      (item) => item.workspace.id === result.workspaceId,
    );

    return ok(
      {
        user: {
          activeWorkspace: membership
            ? {
                id: membership.workspace.id,
                inviteCode: membership.workspace.inviteCode,
                members: membership.workspace.members.map((member) => ({
                  color: member.color,
                  id: member.id,
                  name: member.name,
                })),
                name: membership.workspace.name,
                role: membership.role,
                settings: serializeSettings(membership.workspace),
              }
            : null,
          email: result.user.email,
          id: result.user.id,
          name: result.user.name,
          workspaces: result.user.workspaceMemberships.map((item) => ({
            id: item.workspace.id,
            inviteCode: item.workspace.inviteCode,
            memberCount: item.workspace._count.members,
            name: item.workspace.name,
            role: item.role,
          })),
        },
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
