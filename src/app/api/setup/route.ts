import { AppError, handleApiError, ok, readJson } from "@/lib/api";
import { createSession, hashPassword, isSetupComplete } from "@/lib/auth";
import { DEFAULT_CATEGORIES, getMemberColor } from "@/lib/defaults";
import { DEFAULT_APP_CURRENCY, DEFAULT_APP_LOCALE, serializeSettings } from "@/lib/settings";
import prisma from "@/prisma";
import { setupSchema } from "@/lib/validation";

function dedupeNames(names: string[]) {
  const seen = new Set<string>();
  const uniqueNames: string[] = [];

  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueNames.push(name.trim());
  }

  return uniqueNames;
}

export async function POST(request: Request) {
  try {
    if (await isSetupComplete()) {
      throw new AppError(409, "Начальная настройка уже завершена.");
    }

    const payload = setupSchema.parse(await readJson(request));
    const passwordHash = await hashPassword(payload.password);
    const memberNames = dedupeNames([payload.name, ...payload.memberNames]);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: payload.email,
          name: payload.name,
          passwordHash,
        },
      });

      await tx.member.createMany({
        data: memberNames.map((name, index) => ({
          color: getMemberColor(index),
          name,
          sortOrder: index,
          userId: createdUser.id,
        })),
      });

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((category) => ({
          ...category,
          userId: createdUser.id,
        })),
      });

      const settings = await tx.userSettings.create({
        data: {
          appName: payload.name.trim(),
          currency: DEFAULT_APP_CURRENCY,
          locale: DEFAULT_APP_LOCALE,
          starterCategories: {
            createMany: {
              data: DEFAULT_CATEGORIES.map((category, index) => ({
                color: category.color,
                kind: category.kind,
                name: category.name,
                sortOrder: index,
              })),
            },
          },
          userId: createdUser.id,
        },
      });

      const user = await tx.user.findUniqueOrThrow({
        include: {
          members: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
        where: {
          id: createdUser.id,
        },
      });

      return {
        settings,
        user,
      };
    });

    await createSession(user.user.id);

    return ok(
      {
        user: {
          email: user.user.email,
          id: user.user.id,
          members: user.user.members.map((member) => ({
            color: member.color,
            id: member.id,
            name: member.name,
          })),
          name: user.user.name,
          settings: serializeSettings(user.settings),
        },
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
