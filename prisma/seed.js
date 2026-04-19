const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const includeSampleData = process.env.SEED_INCLUDE_SAMPLE_DATA !== "false";
const seedEmail = process.env.SEED_EMAIL ?? "demo@finance.app";
const seedPassword = process.env.SEED_PASSWORD ?? "demo12345";
const seedUserName = process.env.SEED_USER_NAME ?? "Демо";
const seedAppName = process.env.SEED_APP_NAME ?? "Household Finance";
const seedWorkspaceId = process.env.SEED_WORKSPACE_ID ?? "demo-workspace";
const seedInviteCode = process.env.SEED_INVITE_CODE ?? "DEMOFIN10";

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const defaultCategories = [
  { name: "Еда", kind: "EXPENSE", color: "#FF8A65" },
  { name: "Аренда", kind: "EXPENSE", color: "#4DB6AC" },
  { name: "Транспорт", kind: "EXPENSE", color: "#64B5F6" },
  { name: "Зарплата", kind: "INCOME", color: "#81C784" },
  { name: "Развлечения", kind: "EXPENSE", color: "#BA68C8" },
  { name: "Накопления", kind: "SAVINGS", color: "#FFD54F" },
];

const members = [
  { name: "Вы", color: "#1A8F6D", sortOrder: 0 },
  { name: "Партнер", color: "#F47A62", sortOrder: 1 },
];

async function main() {
  const email = seedEmail;
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  const sampleKey = slugify(email) || "seed";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: seedUserName,
      email,
      passwordHash,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: seedWorkspaceId },
    update: {
      currency: "PLN",
      inviteCode: seedInviteCode,
      locale: "ru-RU",
      name: seedAppName,
    },
    create: {
      currency: "PLN",
      id: seedWorkspaceId,
      inviteCode: seedInviteCode,
      locale: "ru-RU",
      name: seedAppName,
    },
  });

  await prisma.workspaceMembership.upsert({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id,
      },
    },
    update: {
      role: "OWNER",
    },
    create: {
      role: "OWNER",
      userId: user.id,
      workspaceId: workspace.id,
    },
  });

  for (const member of members) {
    await prisma.member.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: member.name,
        },
      },
      update: {
        color: member.color,
        sortOrder: member.sortOrder,
        userId: user.id,
      },
      create: {
        userId: user.id,
        workspaceId: workspace.id,
        name: member.name,
        color: member.color,
        sortOrder: member.sortOrder,
      },
    });
  }

  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: category.name,
        },
      },
      update: {
        color: category.color,
        kind: category.kind,
        userId: user.id,
        workspaceId: workspace.id,
      },
      create: {
        userId: user.id,
        workspaceId: workspace.id,
        ...category,
      },
    });
  }

  for (const [index, category] of defaultCategories.entries()) {
    await prisma.starterCategory.upsert({
      where: {
        workspaceId_name: {
          name: category.name,
          workspaceId: workspace.id,
        },
      },
      update: {
        color: category.color,
        kind: category.kind,
        sortOrder: index,
      },
      create: {
        color: category.color,
        kind: category.kind,
        name: category.name,
        sortOrder: index,
        workspaceId: workspace.id,
      },
    });
  }

  const [foodCategory, rentCategory, salaryCategory] = await Promise.all([
    prisma.category.findFirstOrThrow({
      where: { name: "Еда", workspaceId: workspace.id },
    }),
    prisma.category.findFirstOrThrow({
      where: { name: "Аренда", workspaceId: workspace.id },
    }),
    prisma.category.findFirstOrThrow({
      where: { name: "Зарплата", workspaceId: workspace.id },
    }),
  ]);

  const [youMember, partnerMember] = await Promise.all([
    prisma.member.findFirstOrThrow({
      where: { name: "Вы", workspaceId: workspace.id },
    }),
    prisma.member.findFirstOrThrow({
      where: { name: "Партнер", workspaceId: workspace.id },
    }),
  ]);

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1);
  endOfMonth.setUTCDate(0);
  endOfMonth.setUTCHours(23, 59, 59, 999);

  if (includeSampleData) {
    await prisma.budget.upsert({
      where: { id: `${sampleKey}-rent-budget` },
      update: {},
      create: {
        amount: 1500,
        categoryId: rentCategory.id,
        endDate: endOfMonth,
        id: `${sampleKey}-rent-budget`,
        name: "Аренда на месяц",
        startDate: startOfMonth,
        userId: user.id,
        workspaceId: workspace.id,
      },
    });

    await prisma.savingsGoal.upsert({
      where: { id: `${sampleKey}-emergency-goal` },
      update: {},
      create: {
        currentAmount: 2600,
        id: `${sampleKey}-emergency-goal`,
        name: "Финансовая подушка",
        notes: "Запас на три месяца расходов.",
        targetAmount: 8000,
        userId: user.id,
        workspaceId: workspace.id,
      },
    });
  }

  const transactionCount = await prisma.transaction.count({
    where: { workspaceId: workspace.id },
  });

  if (includeSampleData && !transactionCount) {
    await prisma.transaction.createMany({
      data: [
        {
          amount: 4200,
          categoryId: salaryCategory.id,
          description: "Основная зарплата",
          memberId: youMember.id,
          transactionDate: new Date(),
          userId: user.id,
          workspaceId: workspace.id,
        },
        {
          amount: 86.5,
          categoryId: foodCategory.id,
          description: "Продукты",
          memberId: partnerMember.id,
          transactionDate: new Date(),
          userId: user.id,
          workspaceId: workspace.id,
        },
        {
          amount: 1450,
          categoryId: rentCategory.id,
          description: "Апрельская аренда",
          memberId: youMember.id,
          transactionDate: new Date(),
          userId: user.id,
          workspaceId: workspace.id,
        },
      ],
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
