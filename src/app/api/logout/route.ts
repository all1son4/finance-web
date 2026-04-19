import { clearSession } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api";

export async function POST() {
  try {
    await clearSession();
    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
