import { handleApiError, ok, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { serializeCategory } from "@/lib/serializers";
import { categorySchema } from "@/lib/validation";
import prisma from "@/prisma";

export async function GET() {
  try {
    const user = await requireUserApi();
    const categories = await prisma.category.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      where: {
        userId: user.id,
      },
    });

    return ok({
      categories: categories.map(serializeCategory),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    const payload = categorySchema.parse(await readJson(request));
    const category = await prisma.category.create({
      data: {
        color: payload.color,
        kind: payload.kind,
        name: payload.name,
        userId: user.id,
      },
    });

    return ok(
      {
        category: serializeCategory(category),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
