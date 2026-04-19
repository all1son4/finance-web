import { handleApiError, ok } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUserApi();
    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
