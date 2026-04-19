import { handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi, setActiveWorkspace } from "@/lib/auth";
import prisma from "@/prisma";
import { workspaceJoinSchema } from "@/lib/validation";
import { joinWorkspaceByInviteCode } from "@/lib/workspaces";

export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    const payload = workspaceJoinSchema.parse(await readJson(request));

    const workspace = await prisma.$transaction((tx) =>
      joinWorkspaceByInviteCode(tx, payload.inviteCode, user.id),
    );

    await setActiveWorkspace(workspace.id);

    return ok({
      workspace: {
        id: workspace.id,
        inviteCode: workspace.inviteCode,
        name: workspace.name,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
