import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcrypt";
import type { Member } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppError } from "@/lib/api";
import { localizeMemberName } from "@/lib/defaults";
import { serializeSettings, type AppSettingsRecord } from "@/lib/settings";
import prisma from "@/prisma";

const SESSION_COOKIE = "finance_session";
const SESSION_DURATION_DAYS = 30;

export type WorkspaceSummary = {
  id: string;
  inviteCode: string;
  memberCount: number;
  name: string;
  role: string;
};

export type ActiveWorkspace = {
  id: string;
  inviteCode: string;
  members: Array<Pick<Member, "color" | "id" | "name">>;
  name: string;
  role: string;
  settings: AppSettingsRecord;
};

export type SafeUser = {
  activeWorkspace: ActiveWorkspace;
  email: string;
  id: string;
  name: string;
  workspaces: WorkspaceSummary[];
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionExpiresAt() {
  return new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
}

function sanitizeMembers(members: Array<Pick<Member, "color" | "id" | "name">>) {
  return members.map((member) => ({
    color: member.color,
    id: member.id,
    name: localizeMemberName(member.name),
  }));
}

function sanitizeUser(user: {
  activeWorkspace: ActiveWorkspace;
  email: string;
  id: string;
  name: string;
  workspaces: WorkspaceSummary[];
}): SafeUser {
  return {
    activeWorkspace: {
      ...user.activeWorkspace,
      members: sanitizeMembers(user.activeWorkspace.members),
    },
    email: user.email,
    id: user.id,
    name: user.name,
    workspaces: user.workspaces,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function isSetupComplete() {
  const userCount = await prisma.user.count();
  return userCount > 0;
}

export async function createSession(userId: string, activeWorkspaceId: string) {
  const cookieStore = await cookies();
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = sessionExpiresAt();

  await prisma.session.create({
    data: {
      activeWorkspaceId,
      expiresAt,
      tokenHash,
      userId,
    },
  });

  cookieStore.set(SESSION_COOKIE, token, {
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    priority: "high",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashToken(token),
      },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function setActiveWorkspace(workspaceId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) {
    throw new AppError(401, "Нужна авторизация.");
  }

  await prisma.session.updateMany({
    data: {
      activeWorkspaceId: workspaceId,
    },
    where: {
      tokenHash: hashToken(token),
    },
  });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    include: {
      user: {
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
      },
    },
    where: {
      tokenHash: hashToken(token),
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  const memberships = session.user.workspaceMemberships;
  const activeMembership =
    memberships.find((membership) => membership.workspaceId === session.activeWorkspaceId) ??
    memberships[0];

  if (!activeMembership) {
    return null;
  }

  return sanitizeUser({
    activeWorkspace: {
      id: activeMembership.workspace.id,
      inviteCode: activeMembership.workspace.inviteCode,
      members: activeMembership.workspace.members,
      name: activeMembership.workspace.name,
      role: activeMembership.role,
      settings: serializeSettings(activeMembership.workspace),
    },
    email: session.user.email,
    id: session.user.id,
    name: session.user.name,
    workspaces: memberships.map((membership) => ({
      id: membership.workspace.id,
      inviteCode: membership.workspace.inviteCode,
      memberCount: membership.workspace._count.members,
      name: membership.workspace.name,
      role: membership.role,
    })),
  });
}

export async function requireUserApi() {
  const user = await getCurrentUser();

  if (!user) {
    throw new AppError(401, "Нужна авторизация.");
  }

  return user;
}

export async function requireUserPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
