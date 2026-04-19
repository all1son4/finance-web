import { handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi, setActiveWorkspace } from "@/lib/auth";
import prisma from "@/prisma";
import { workspaceCreateSchema } from "@/lib/validation";
import { createWorkspace } from "@/lib/workspaces";

export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    const payload = workspaceCreateSchema.parse(await readJson(request));

    const workspace = await prisma.$transaction((tx) =>
      createWorkspace(tx, {
        memberNames: payload.memberNames,
        name: payload.name,
        ownerName: user.name,
        ownerUserId: user.id,
      }),
    );

    await setActiveWorkspace(workspace.id);

    return ok(
      {
        workspace: {
          id: workspace.id,
          inviteCode: workspace.inviteCode,
          name: workspace.name,
        },
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
