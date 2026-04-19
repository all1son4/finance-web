import { randomBytes } from "node:crypto";

import type { Prisma, PrismaClient } from "@prisma/client";

import { AppError } from "@/lib/api";
import { DEFAULT_CATEGORIES, getMemberColor } from "@/lib/defaults";
import { DEFAULT_APP_CURRENCY, DEFAULT_APP_LOCALE } from "@/lib/settings";

type DbClient = Prisma.TransactionClient | PrismaClient;

type CreateWorkspaceInput = {
  memberNames: string[];
  name: string;
  ownerName: string;
  ownerUserId: string;
};

function dedupeNames(names: string[]) {
  const seen = new Set<string>();
  const uniqueNames: string[] = [];

  for (const name of names) {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();

    if (!trimmed || seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueNames.push(trimmed);
  }

  return uniqueNames;
}

export function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function generateInviteCode(db: DbClient) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const inviteCode = randomBytes(5).toString("hex").toUpperCase();
    const existing = await db.workspace.findUnique({
      where: {
        inviteCode,
      },
    });

    if (!existing) {
      return inviteCode;
    }
  }

  throw new AppError(500, "Не удалось сгенерировать код приглашения.");
}

export async function createWorkspace(
  db: DbClient,
  { memberNames, name, ownerName, ownerUserId }: CreateWorkspaceInput,
) {
  const inviteCode = await generateInviteCode(db);
  const uniqueMemberNames = dedupeNames([ownerName, ...memberNames]);

  return db.workspace.create({
    data: {
      currency: DEFAULT_APP_CURRENCY,
      inviteCode,
      locale: DEFAULT_APP_LOCALE,
      memberships: {
        create: {
          role: "OWNER",
          userId: ownerUserId,
        },
      },
      members: {
        createMany: {
          data: uniqueMemberNames.map((memberName, index) => ({
            color: getMemberColor(index),
            name: memberName,
            sortOrder: index,
            userId: ownerUserId,
          })),
        },
      },
      name: name.trim(),
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
      categories: {
        createMany: {
          data: DEFAULT_CATEGORIES.map((category) => ({
            ...category,
            userId: ownerUserId,
          })),
        },
      },
    },
  });
}

export async function joinWorkspaceByInviteCode(
  db: DbClient,
  inviteCode: string,
  userId: string,
) {
  const normalizedInviteCode = normalizeInviteCode(inviteCode);

  const workspace = await db.workspace.findUnique({
    where: {
      inviteCode: normalizedInviteCode,
    },
  });

  if (!workspace) {
    throw new AppError(404, "Пространство с таким кодом не найдено.");
  }

  await db.workspaceMembership.upsert({
    create: {
      role: "MEMBER",
      userId,
      workspaceId: workspace.id,
    },
    update: {},
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: workspace.id,
      },
    },
  });

  return workspace;
}
