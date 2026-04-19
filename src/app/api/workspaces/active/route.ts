import { AppError, handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi, setActiveWorkspace } from "@/lib/auth";
import { workspaceSwitchSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  try {
    const user = await requireUserApi();
    const payload = workspaceSwitchSchema.parse(await readJson(request));
    const hasAccess = user.workspaces.some((workspace) => workspace.id === payload.workspaceId);

    if (!hasAccess) {
      throw new AppError(404, "Пространство недоступно.");
    }

    await setActiveWorkspace(payload.workspaceId);

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
