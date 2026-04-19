import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcrypt";
import type { Member } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppError } from "@/lib/api";
import { localizeMemberName } from "@/lib/defaults";
import { ensureUserSettings, serializeSettings, type AppSettingsRecord } from "@/lib/settings";
import prisma from "@/prisma";

const SESSION_COOKIE = "finance_session";
const SESSION_DURATION_DAYS = 30;

export type SafeUser = {
  email: string;
  id: string;
  members: Array<Pick<Member, "color" | "id" | "name">>;
  name: string;
  settings: AppSettingsRecord;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionExpiresAt() {
  return new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
}

function sanitizeUser(user: {
  email: string;
  id: string;
  members: Array<Pick<Member, "color" | "id" | "name">>;
  name: string;
  settings: AppSettingsRecord;
}): SafeUser {
  return {
    email: user.email,
    id: user.id,
    members: user.members.map((member) => ({
      color: member.color,
      id: member.id,
      name: localizeMemberName(member.name),
    })),
    name: user.name,
    settings: user.settings,
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

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = sessionExpiresAt();

  await prisma.session.create({
    data: {
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

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    include: {
      user: {
        include: {
          members: {
            orderBy: {
              sortOrder: "asc",
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

  const settings = await ensureUserSettings(session.user.id);

  return sanitizeUser({
    ...session.user,
    settings: serializeSettings(settings),
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
