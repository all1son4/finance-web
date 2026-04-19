const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const includeSampleData = process.env.SEED_INCLUDE_SAMPLE_DATA !== "false";
const seedEmail = process.env.SEED_EMAIL ?? "demo@finance.app";
const seedPassword = process.env.SEED_PASSWORD ?? "demo12345";
const seedUserName = process.env.SEED_USER_NAME ?? "Демо";
const seedAppName = process.env.SEED_APP_NAME ?? "Household Finance";

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

  for (const member of members) {
    await prisma.member.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name: member.name,
        },
      },
      update: {
        color: member.color,
        sortOrder: member.sortOrder,
      },
      create: {
        userId: user.id,
        name: member.name,
        color: member.color,
        sortOrder: member.sortOrder,
      },
    });
  }

  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name: category.name,
        },
      },
      update: {
        color: category.color,
        kind: category.kind,
      },
      create: {
        userId: user.id,
        ...category,
      },
    });
  }

  const userSettings = await prisma.userSettings.upsert({
    where: {
      userId: user.id,
    },
    update: {
      appName: seedAppName,
      currency: "PLN",
      locale: "ru-RU",
    },
    create: {
      appName: seedAppName,
      currency: "PLN",
      locale: "ru-RU",
      userId: user.id,
    },
  });

  for (const [index, category] of defaultCategories.entries()) {
    await prisma.starterCategory.upsert({
      where: {
        userSettingsId_name: {
          name: category.name,
          userSettingsId: userSettings.id,
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
        userSettingsId: userSettings.id,
      },
    });
  }

  const [foodCategory, rentCategory, salaryCategory] = await Promise.all([
    prisma.category.findFirstOrThrow({
      where: { name: "Еда", userId: user.id },
    }),
    prisma.category.findFirstOrThrow({
      where: { name: "Аренда", userId: user.id },
    }),
    prisma.category.findFirstOrThrow({
      where: { name: "Зарплата", userId: user.id },
    }),
  ]);

  const [youMember, partnerMember] = await Promise.all([
    prisma.member.findFirstOrThrow({
      where: { name: "Вы", userId: user.id },
    }),
    prisma.member.findFirstOrThrow({
      where: { name: "Партнер", userId: user.id },
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
      },
    });
  }

  const transactionCount = await prisma.transaction.count({
    where: { userId: user.id },
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
        },
        {
          amount: 86.5,
          categoryId: foodCategory.id,
          description: "Продукты",
          memberId: partnerMember.id,
          transactionDate: new Date(),
          userId: user.id,
        },
        {
          amount: 1450,
          categoryId: rentCategory.id,
          description: "Апрельская аренда",
          memberId: youMember.id,
          transactionDate: new Date(),
          userId: user.id,
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
